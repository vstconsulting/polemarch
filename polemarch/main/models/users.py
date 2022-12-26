# pylint: disable=protected-access,no-member
from __future__ import unicode_literals
from typing import Text
import logging

from django.contrib.auth.models import Group as BaseGroup
from django.contrib.auth import get_user_model
from django.db import models
from vstutils.models import BModel, BQuerySet
from .base import ACLModel
from ..constants import MemberType


logger = logging.getLogger("polemarch")

User = get_user_model()


class UserGroup(BaseGroup, ACLModel):
    objects = BQuerySet.as_manager()
    parent = models.OneToOneField(BaseGroup, on_delete=models.CASCADE, parent_link=True)
    users = BaseGroup.user_set


class ACLPermissionQuerySet(BQuerySet):
    def filter_by_user(self, user):  # noce
        return self.filter(models.Q(user=user) | models.Q(uagroup__id__in=user.groups.values('id')))


class ACLPermission(BModel):
    objects = ACLPermissionQuerySet.as_manager()

    role = models.CharField(max_length=10)
    uagroup = models.ForeignKey(
        UserGroup,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )

    @property
    def member(self) -> int:  # noce
        # pylint: disable=no-member
        if self.user is not None:
            return self.user.id
        return self.uagroup.id

    @property
    def member_type(self) -> Text:  # noce
        if self.user is not None:
            return MemberType.USER
        return MemberType.TEAM
