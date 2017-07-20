# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

import logging

from django.conf import settings
from django.utils import timezone

from . import hosts as hosts_models
from .vars import _AbstractModel, _AbstractVarsQuerySet, BManager, models
from ..exceptions import PMException
from ..utils import ModelHandlers


logger = logging.getLogger("polemarch")
PROJECTS_DIR = getattr(settings, "PROJECTS_DIR")


class ProjectQuerySet(_AbstractVarsQuerySet):
    handlers = ModelHandlers("REPO_BACKENDS", "'repo_type' variable needed!")

    def create(self, **kwargs):
        project = super(ProjectQuerySet, self).create(**kwargs)
        project.start_repo_task("clone")
        return project


class Project(_AbstractModel):
    objects     = BManager.from_queryset(ProjectQuerySet)()
    handlers    = objects._queryset_class.handlers
    repository  = models.CharField(max_length=2*1024)
    status      = models.CharField(max_length=32, default="NEW")
    inventories = models.ManyToManyField(hosts_models.Inventory,
                                         blank=True, null=True)
    hosts       = models.ManyToManyField(hosts_models.Host,
                                         blank=True, null=True)
    groups      = models.ManyToManyField(hosts_models.Group,
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

    def _prepare_task(self, playbook_name, inventory_id, **extra):
        if not playbook_name:
            raise PMException("Empty playbook name.")
        from .tasks import History
        inventory = hosts_models.Inventory.objects.get(id=inventory_id)
        history_kwargs = dict(playbook=playbook_name,
                              start_time=timezone.now(),
                              inventory=inventory,
                              project=self,
                              raw_stdout="")
        history = History.objects.create(status="DELAY", **history_kwargs)
        kwargs = dict(project=self, playbook=playbook_name,
                      inventory=inventory, history=history)
        kwargs.update(extra)
        return kwargs

    def execute(self, playbook_name, inventory_id, **extra):
        # pylint: disable=no-member
        from ..tasks import ExecuteAnsibleTask
        sync = extra.pop("sync", False)
        kwargs = self._prepare_task(playbook_name, inventory_id, **extra)
        history = kwargs['history']
        if sync:
            ExecuteAnsibleTask(**kwargs)
        else:
            ExecuteAnsibleTask.delay(**kwargs)
        return history.id

    def set_status(self, status):
        self.status = status
        self.save()

    def start_repo_task(self, operation='sync'):
        from ..tasks import RepoTask
        self.set_status("WAIT_SYNC")
        return RepoTask.delay(self, operation)

    def clone(self, *args, **kwargs):
        return self.repo_class.clone()

    def sync(self, *args, **kwargs):
        return self.repo_class.get()
