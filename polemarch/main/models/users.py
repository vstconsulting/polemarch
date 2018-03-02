# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import json

from django.contrib.auth.models import Group as BaseGroup
from django.contrib.auth.models import User as BaseUser
from .base import models, BModel
from . import acl


logger = logging.getLogger("polemarch")


class ACLPermission(acl.ACLPermissionAbstract):
    role = models.CharField(max_length=10)


class UserGroup(BaseGroup, acl.ACLGroupSubclass, acl.ACLPermissionSubclass):
    objects = acl.ACLUserGroupsQuerySet.as_manager()
    parent = models.OneToOneField(BaseGroup, parent_link=True)
    users = BaseGroup.user_set

    def __unicode__(self):
        return super(UserGroup, self).__unicode__()

    @property
    def users_list(self):
        return list(self.users.values_list("id", flat=True))

    @users_list.setter
    def users_list(self, value):
        self.users.set(BaseUser.objects.filter(id__in=value))


class UserSettings(BModel):
    user     = models.OneToOneField(BaseUser,
                                    related_query_name="settings",
                                    related_name="settings")
    settings = models.TextField(default="{}")

    @property
    def data(self):
        return json.loads(self.settings)

    @data.setter
    def data(self, value):
        self.settings = json.dumps(value)

    @data.deleter
    def data(self):
        self.settings = '{}'
