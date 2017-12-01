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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
    uagroup = models.ForeignKey('main.UserGroup', blank=True, null=True)

    class Meta:
        abstract = True


class ACLQuerySet(BQuerySet):
    use_for_related_fields = True

    def user_filter(self, user, only_leads=False):
        return self


class ACLHistoryQuerySet(ACLQuerySet):
    use_for_related_fields = True


class ACLPermissionSubclass(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              default=first_staff_user,
                              related_name="polemarch_%(class)s_set")
    acl = models.ManyToManyField("main.ACLPermission",
                                 blank=True, null=True)

    class Meta:
        abstract = True

    def set_owner(self, user):  # nocv
        pass

    def owned_by(self, user):  # nocv
        return True

    def manageable_by(self, user):  # nocv
        return True

    def editable_by(self, user):  # nocv
        return True

    def viewable_by(self, user):
        return True


class ACLGroupSubclass(object):
    pass


class ACLModel(BModel, ACLPermissionSubclass):
    objects = ACLQuerySet.as_manager()

    class Meta:
        abstract = True
