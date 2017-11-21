# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

import logging

from django.conf import settings
from django.utils import timezone

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

    def __unicode__(self):
        return str(self.name)  # pragma: no cover

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
            kind=kind, raw_stdout="", initiator=initiator
        )
        return History.objects.create(status="DELAY", **history_kwargs), extra

    def _prepare_kw(self, kind, mod_name, inventory, **extra):
        if not mod_name:
            raise PMException("Empty playbook/module name.")
        history, extra = self._get_history(kind, mod_name, inventory, **extra)
        kwargs = dict(
            target=mod_name, inventory=inventory, history=history, project=self
        )
        kwargs.update(extra)
        return kwargs

    def _send_hook(self, when, kind, kwargs):
        msg = dict(execution_type=kind)
        inventory = dict(
            id=kwargs['inventory'].id,
            name=kwargs['inventory'].name,
        )
        project = dict(
            id=kwargs['project'].id,
            name=kwargs['project'].name,
            type=kwargs['project'].type,
            repository=kwargs['project'].repository,
        )
        msg['target'] = dict(
            name=kwargs['target'], inventory=inventory, project=project
        )
        if kwargs['history'] is not None:
            msg['history'] = dict(
                id=kwargs['history'].id,
                start_time=kwargs['history'].start_time.isoformat(),
            )
            if when == "after_execution":
                msg['history']['stop_time'] = (
                    kwargs['history'].stop_time.isoformat()
                )
            msg['history']['initiator'] = dict(
                initiator_type=kwargs['history'].initiator_type,
                initiator_id=kwargs['history'].initiator,
            )
        else:
            msg['history'] = None
        SendHook.delay(when, **msg)

    def _execute(self, kind, *args, **extra):
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

    def execute_ansible_playbook(self, playbook, inventory, **extra):
        return self._execute("PLAYBOOK", playbook, inventory, **extra)

    def execute_ansible_module(self, module, inventory, **extra):
        return self._execute("MODULE", module, inventory, **extra)

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
