# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import uuid

from .base import BModel, models
from . import hosts as hosts_models

logger = logging.getLogger("polemarch")


class Project(BModel):
    name        = models.CharField(max_length=256, default=uuid.uuid1)
    repository  = models.CharField(max_length=512)
    inventories = models.ManyToManyField(hosts_models.Inventory,
                                         blank=True, null=True)
    hosts       = models.ManyToManyField(hosts_models.Host,
                                         blank=True, null=True)
    groups      = models.ManyToManyField(hosts_models.Group,
                                         blank=True, null=True)

    class Meta:
        default_related_name = "projects"

    def __unicode__(self):
        return str(self.name)

    def __str__(self):
        return self.__unicode__()
