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
    # on_delete = None, fix for django 2.0, dont break on django 1.11
    parent = models.OneToOneField(BaseGroup, on_delete=None, parent_link=True)
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
    # on_delete = None, fix for django 2.0, dont break on django 1.11
    user     = models.OneToOneField(BaseUser,
                                    on_delete=None,
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
