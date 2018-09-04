# pylint: disable=no-name-in-module
from __future__ import unicode_literals

from django.db import models
from django.conf import settings
from django.contrib.auth.models import User as BaseUser
from vstutils.utils import import_class, classproperty
from vstutils.models import BQuerySet as _BQSet, BaseModel as _BM, Manager as _BManager


def first_staff_user():
    return BaseUser.objects.filter(is_staff=True).first().id


class BQuerySet(_BQSet):
    use_for_related_fields = True

    def __decorator(self, func):  # noce
        def wrapper(*args, **kwargs):
            return func(self, *args, **kwargs)
        return wrapper

    def __getattribute__(self, item):
        try:
            return super(BQuerySet, self).__getattribute__(item)
        except:
            model = super(BQuerySet, self).__getattribute__("model")
            if model and item in model.acl_handler.qs_methods:  # noce
                return self.__decorator(getattr(model.acl_handler, "qs_{}".format(item)))
            raise

    def create(self, **kwargs):
        return self.model.acl_handler.qs_create(super(BQuerySet, self).create, **kwargs)

    def user_filter(self, user, *args, **kwargs):
        # pylint: disable=unused-argument
        return self.model.acl_handler.user_filter(self, user, *args, **kwargs)


class Manager(_BManager.from_queryset(BQuerySet)):
    '''
    Polemarch model manager.
    '''


class BaseModel(_BM):
    # pylint: disable=no-member
    objects    = BQuerySet.as_manager()

    class Meta:
        abstract = True

    @staticmethod
    def get_acl(cls, obj=None):
        # pylint: disable=bad-staticmethod-argument
        handler_class_name = settings.ACL['MODEL_HANDLERS'].get(
            cls.__name__, settings.ACL['MODEL_HANDLERS'].get("Default")
        )
        return import_class(handler_class_name)(cls, obj)

    @classproperty
    def acl_handler(self):
        if isinstance(self, BaseModel):
            classObj = self.__class__
            return classObj.get_acl(classObj, self)
        return self.get_acl(self)


class BModel(BaseModel):
    id         = models.AutoField(primary_key=True, max_length=20)
    hidden     = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __unicode__(self):
        return "<{}>".format(self.id)  # nocv


class BGroupedModel(BModel):
    parent     = models.ForeignKey('self', blank=True, null=True)
    group      = models.BooleanField(default=False)

    class Meta:
        abstract = True


class AccessExtendsFieldMixin(object):
    access_to_related = True


class ManyToManyFieldACL(models.ManyToManyField, AccessExtendsFieldMixin):
    pass


class ForeignKeyACL(models.ForeignKey, AccessExtendsFieldMixin):
    pass


class ReverseAccessExtendsFieldMixin(object):
    reverse_access_to_related = True


class ManyToManyFieldACLReverse(models.ManyToManyField,
                                ReverseAccessExtendsFieldMixin):
    pass


class ForeignKeyACLReverse(models.ForeignKey,
                           ReverseAccessExtendsFieldMixin):
    pass


class ACLModel(BModel):
    notes = models.TextField(default="")
    acl   = models.ManyToManyField("main.ACLPermission", blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=None,
                              default=first_staff_user,
                              related_name="polemarch_%(class)s_set")

    class Meta:
        abstract = True
