# pylint: disable=no-name-in-module
from __future__ import unicode_literals

from typing import Any

from django.contrib.auth import get_user_model
from django.db import models
from vstutils.models import BModel

User = get_user_model()


def first_staff_user() -> int:
    return User.objects.filter(is_staff=True).first().id


class BGroupedModel(BModel):
    parent = models.ForeignKey('self', null=True, on_delete=models.CASCADE)
    group = models.BooleanField(default=False)

    class Meta:
        abstract = True


class AccessExtendsFieldMixin(object):
    access_to_related = True


class ManyToManyFieldACL(models.ManyToManyField, AccessExtendsFieldMixin):  # pylint: disable=abstract-method
    through: Any


class ForeignKeyACL(models.ForeignKey, AccessExtendsFieldMixin):  # pylint: disable=abstract-method
    pass


class ReverseAccessExtendsFieldMixin(object):
    reverse_access_to_related = True


class ManyToManyFieldACLReverse(
    models.ManyToManyField,
    ReverseAccessExtendsFieldMixin,
):  # pylint: disable=abstract-method
    through: Any


class ForeignKeyACLReverse(models.ForeignKey, ReverseAccessExtendsFieldMixin):  # pylint: disable=abstract-method
    pass


class ACLModel(BModel):
    notes = models.TextField(default="")
    acl = models.ManyToManyField("main.ACLPermission", blank=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_DEFAULT,
        default=first_staff_user,
        related_name="polemarch_%(class)s_set"
    )

    class Meta:
        abstract = True
