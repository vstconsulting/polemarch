# pylint: disable=protected-access,no-member
from __future__ import unicode_literals
from typing import NoReturn, Dict, Text
import logging
import json

from django.contrib.auth.models import Group as BaseGroup
from django.contrib.auth import get_user_model
from .base import models, BModel, ACLModel, BQuerySet


logger = logging.getLogger("polemarch")


class ACLPermission(BModel):
    role    = models.CharField(max_length=10)
    uagroup = models.ForeignKey('main.UserGroup',
                                on_delete=models.CASCADE, blank=True, null=True)
    user    = models.ForeignKey(get_user_model(),
                                on_delete=models.CASCADE, blank=True, null=True)

    @property
    def member(self) -> int:  # noce
        # pylint: disable=no-member
        if self.user is not None:
            return self.user.id
        return self.uagroup.id

    @member.setter
    def member(self, value) -> NoReturn:  # nocv
        pass

    @property
    def member_type(self) -> Text:  # noce
        if self.user is not None:
            return "user"
        return "team"

    @member_type.setter
    def member_type(self, value) -> NoReturn:  # nocv
        pass


class UserGroup(BaseGroup, ACLModel):
    objects = BQuerySet.as_manager()
    parent = models.OneToOneField(BaseGroup, on_delete=models.CASCADE, parent_link=True)
    users = BaseGroup.user_set


class UserSettings(BModel):
    settings = models.TextField(default="{}")
    user     = models.OneToOneField(get_user_model(), on_delete=models.CASCADE,
                                    related_query_name="settings",
                                    related_name="settings")

    def get_settings_copy(self) -> Dict:
        return self.data

    @property
    def data(self) -> Dict:
        return json.loads(self.settings)

    @data.setter
    def data(self, value) -> NoReturn:
        self.settings = json.dumps(value)

    @data.deleter
    def data(self) -> NoReturn:
        self.settings = '{}'
