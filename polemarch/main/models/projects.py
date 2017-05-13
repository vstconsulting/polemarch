# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

import logging

from django.conf import settings
from django.db import transaction

from . import hosts as hosts_models
from ._utils import get_class, get_classes, get_class_opts
from .vars import _AbstractModel, _AbstractInventoryQuerySet, BManager, models


logger = logging.getLogger("polemarch")
PROJECTS_DIR = getattr(settings, "PROJECTS_DIR")


def get_repo_types():
    return get_classes("REPO_BACKENDS")


def get_repo_type(name):
    return get_class("REPO_BACKENDS", name)


def get_repo_type_opts(name):
    return get_class_opts("REPO_BACKENDS", name)


class ProjectQuerySet(_AbstractInventoryQuerySet):
    def create(self, **kwargs):
        project = super(ProjectQuerySet, self).create(**kwargs)
        project.start_task("clone")
        return project

    def repo_types(self):
        return get_repo_types()


class Project(_AbstractModel):
    objects     = BManager.from_queryset(ProjectQuerySet)()
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
        rtype = self.vars.get("repo_type", "Null")
        return get_repo_type(rtype)(self, **get_repo_type_opts(rtype))

    def set_status(self, status):
        self.status = status
        self.save()

    def start_task(self, operation='sync'):
        from ..tasks import RepoTask
        return RepoTask.delay(self, operation)

    @transaction.atomic
    def clone(self, *args, **kwargs):
        return self.repo_class.clone()

    @transaction.atomic
    def sync(self, *args, **kwargs):
        return self.repo_class.get()
