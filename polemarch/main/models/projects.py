# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

import os
import logging
from collections import OrderedDict

import six
from django.conf import settings
from django.utils import timezone
from django.core.validators import ValidationError

from .. import utils
from . import hosts as hosts_models
from .vars import AbstractModel, AbstractVarsQuerySet, BManager, models
from ..exceptions import PMException
from ..utils import ModelHandlers
from .base import ManyToManyFieldACL
from ..tasks import SendHook


logger = logging.getLogger("polemarch")
PROJECTS_DIR = getattr(settings, "PROJECTS_DIR")


class ProjectQuerySet(AbstractVarsQuerySet):
    handlers = ModelHandlers("REPO_BACKENDS", "'repo_type' variable needed!")
    task_handlers = ModelHandlers("TASKS_HANDLERS", "Unknown execution type!")

    def create(self, **kwargs):
        project = super(ProjectQuerySet, self).create(**kwargs)
        project.start_repo_task("clone")
        return project


class Project(AbstractModel):
    objects       = BManager.from_queryset(ProjectQuerySet)()
    handlers      = objects._queryset_class.handlers
    task_handlers = objects._queryset_class.task_handlers
    repository    = models.CharField(max_length=2*1024)
    status        = models.CharField(max_length=32, default="NEW")
    inventories   = ManyToManyFieldACL(hosts_models.Inventory,
                                       blank=True, null=True)
    hosts         = ManyToManyFieldACL(hosts_models.Host,
                                       blank=True, null=True)
    groups        = ManyToManyFieldACL(hosts_models.Group,
                                       blank=True, null=True)

    class Meta:
        default_related_name = "projects"

    HIDDEN_VARS = [
        'repo_password',
    ]

    def __unicode__(self):
        return str(self.name)  # pragma: no cover

    def get_hook_data(self, when):
        data = super(Project, self).get_hook_data(when)
        data['type'] = self.type
        data['repository'] = self.repository
        return data

    @property
    def path(self):
        return "{}/{}".format(PROJECTS_DIR, self.id)

    @property
    def repo_class(self):
        repo_type = self.vars.get("repo_type", "Null")
        return self.handlers(repo_type, self)

    @property
    def type(self):
        return self.variables.get(key="repo_type").value

    def _get_history(self, kind, mod_name, inventory, **extra):
        initiator = extra.pop("initiator", 0)
        initiator_type = extra.pop("initiator_type", "users")
        save_result = extra.pop("save_result", True)
        command = kind.lower()
        ansible_args = dict(extra)
        utils.AnsibleArgumentsReference().validate_args(command, ansible_args)
        if not save_result:
            return None, extra
        from .tasks import History
        history_kwargs = dict(
            mode=mod_name, start_time=timezone.now(),
            inventory=inventory, project=self,
            kind=kind, raw_stdout="", execute_args=extra,
            initiator=initiator, initiator_type=initiator_type,
        )
        if isinstance(inventory, (six.string_types, six.text_type)):
            history_kwargs['inventory'] = None
        return History.objects.create(status="DELAY", **history_kwargs), extra

    def check_path(self, inventory):
        if not isinstance(inventory, (six.string_types, six.text_type)):
            return
        path = "{}/{}".format(self.path, inventory)
        path = os.path.abspath(os.path.expanduser(path))
        if self.path not in path:
            errors = dict(inventory="Inventory should be in project dir.")
            raise ValidationError(errors)

    def _prepare_kw(self, kind, mod_name, inventory, **extra):
        self.check_path(inventory)
        if not mod_name:
            raise PMException("Empty playbook/module name.")
        history, extra = self._get_history(kind, mod_name, inventory, **extra)
        kwargs = dict(
            target=mod_name, inventory=inventory, history=history, project=self
        )
        kwargs.update(extra)
        return kwargs

    def _send_hook(self, when, kind, kwargs):
        msg = OrderedDict(execution_type=kind, when=when)
        inventory = kwargs['inventory']
        if isinstance(inventory, hosts_models.Inventory):
            inventory = inventory.get_hook_data(when)
        msg['target'] = OrderedDict(
            name=kwargs['target'],
            inventory=inventory,
            project=kwargs['project'].get_hook_data(when)
        )
        if kwargs['history'] is not None:
            msg['history'] = kwargs['history'].get_hook_data(when)
        else:
            msg['history'] = None
        SendHook.delay(when, msg)

    def execute(self, kind, *args, **extra):
        kind = kind.upper()
        task_class = self.task_handlers.backend(kind)
        sync = extra.pop("sync", False)

        kwargs = self._prepare_kw(kind, *args, **extra)
        history = kwargs['history']
        if sync:
            self._send_hook('on_execution', kind, kwargs)
            task_class(**kwargs)
            self._send_hook('after_execution', kind, kwargs)
        else:
            task_class.delay(**kwargs)
        return history.id if history is not None else history

    def set_status(self, status):
        self.status = status
        self.save()

    def start_repo_task(self, operation='sync'):
        self.set_status("WAIT_SYNC")
        return self.task_handlers.backend("REPO").delay(self, operation)

    def clone(self, *args, **kwargs):
        return self.repo_class.clone()

    def sync(self, *args, **kwargs):
        return self.repo_class.get()

    def revision(self):
        return self.repo_class.revision()
