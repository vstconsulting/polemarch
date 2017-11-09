from django.conf import settings
from .base import models, BModel, BQuerySet
from django.contrib.auth.models import User as BaseUser


def first_staff_user():
    return BaseUser.objects.filter(is_staff=True).first().id


class ACLPermissionQuerySet(BQuerySet):
    use_for_related_fields = True


class ACLPermission(BModel):
    objects = ACLPermissionQuerySet.as_manager()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
    uagroup = models.ForeignKey('UserGroup', blank=True, null=True)
    role = models.CharField(max_length=10)


class ACLQuerySet(BQuerySet):
    use_for_related_fields = True

    def user_filter(self, user, only_leads=False):
        return self


class ACLPermissionSubclass(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              default=first_staff_user,
                              related_name="polemarch_%(class)s_set")
    permissions = models.ManyToManyField("ACLPermission",
                                         blank=True, null=True)

    class Meta:
        abstract = True

    def set_owner(self, user):
        pass

    def owned_by(self, user):
        return True

    def manageable_by(self, user):
        return True

    def editable_by(self, user):
        return True

    def viewable_by(self, user):
        return True


class ACLGroupSubclass(object):
    pass


class ACLModel(BModel, ACLPermissionSubclass):
    objects = ACLQuerySet.as_manager()

    class Meta:
        abstract = True
