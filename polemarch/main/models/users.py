# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging

from django.contrib.auth.models import User as BaseUser

from .base import models, BModel
from .projects import Project
from .tasks import Task, PeriodicTask, History, Template
from . import hosts as hosts_models

logger = logging.getLogger("polemarch")
def_rel_name = 'related_objects'


class TypesPermissions(BModel):
    user           = models.ForeignKey(BaseUser,
                                       related_query_name=def_rel_name)
    projects       = models.ManyToManyField(Project,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    inventories    = models.ManyToManyField(hosts_models.Inventory,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    hosts          = models.ManyToManyField(hosts_models.Host,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    groups         = models.ManyToManyField(hosts_models.Group,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    tasks          = models.ManyToManyField(Task,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    periodic_tasks = models.ManyToManyField(PeriodicTask,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    history        = models.ManyToManyField(History,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)
    template       = models.ManyToManyField(Template,
                                            related_query_name=def_rel_name,
                                            blank=True, null=True)

    class Meta:
        default_related_name = "related_objects"

    def __unicode__(self):
        return str(self.user)  # pragma: no cover
