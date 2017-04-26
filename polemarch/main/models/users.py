# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging

from django.contrib.auth.models import User as BaseUser

from .base import models, BModel
from .projects import Project
from . import hosts as hosts_models

logger = logging.getLogger("polemarch")


class TypesPermissions(BModel):
    user        = models.ForeignKey(BaseUser,
                                    related_query_name='related_objects')
    projects    = models.ManyToManyField(Project,
                                         blank=True, null=True)
    inventories = models.ManyToManyField(hosts_models.Inventory,
                                         blank=True, null=True)
    hosts       = models.ManyToManyField(hosts_models.Host,
                                         blank=True, null=True)
    groups      = models.ManyToManyField(hosts_models.Group,
                                         blank=True, null=True)

    class Meta:
        default_related_name = "related_objects"

    def __unicode__(self):
        return str(self.user)  # pragma: no cover
