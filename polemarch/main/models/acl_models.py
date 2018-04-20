# pylint: disable=unused-argument
from django.conf import settings
from django.contrib.auth.models import User as BaseUser
from .base import models, BModel, BQuerySet


def first_staff_user():
    return BaseUser.objects.filter(is_staff=True).first().id


class ACLPermissionQuerySet(BQuerySet):
    use_for_related_fields = True


class ACLPermissionAbstract(BModel):
    objects = ACLPermissionQuerySet.as_manager()
    # on_delete = None, fix for django 2.0, dont break on django 1.11
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=None,
                             blank=True, null=True)
    uagroup = models.ForeignKey('main.UserGroup', on_delete=None, blank=True,
                                null=True)

    class Meta:
        abstract = True


class ACLHistoryQuerySet(BQuerySet):
    use_for_related_fields = True


class ACLPermissionSubclass(models.Model):
    # on_delete = None, fix for django 2.0, dont break on django 1.11
    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              on_delete=None,
                              default=first_staff_user,
                              related_name="polemarch_%(class)s_set")
    acl = models.ManyToManyField("main.ACLPermission",
                                 blank=True, null=True)

    class Meta:
        abstract = True
