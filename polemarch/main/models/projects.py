# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

import logging
from django.conf import settings

from . import hosts as hosts_models
from .vars import _AbstractModel, _AbstractInventoryQuerySet, BManager, models
from ..utils import ModelHandlers


logger = logging.getLogger("polemarch")
PROJECTS_DIR = getattr(settings, "PROJECTS_DIR")


class ProjectQuerySet(_AbstractInventoryQuerySet):
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
        return "{}/{}".format(PROJECTS_DIR, self.name)

    @property
    def repo_class(self):
        repo_type = self.vars.get("repo_type", "Null")
        return self.handlers(repo_type, self)

    def set_status(self, status):
        self.status = status
        self.save()

    def start_repo_task(self, operation='sync'):
        from ..tasks import RepoTask
        return RepoTask.delay(self, operation)

    def clone(self, *args, **kwargs):
        return self.repo_class.clone()

    def sync(self, *args, **kwargs):
        return self.repo_class.get()
