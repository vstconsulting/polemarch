from __future__ import unicode_literals

from django.db import models
from django.conf import settings

from ...main.utils import Paginator, classproperty, import_class


class BQuerySet(models.QuerySet):

    def cleared(self):
        return (
            self.filter(hidden=False) if hasattr(self.model, "hidden")
            else self
        )

    def paged(self, *args, **kwargs):
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        return Paginator(self, *args, **kwargs)

    def _find(self, field_name, tp_name, *args, **kwargs):  # nocv
        field = kwargs.get(field_name, None) or (list(args)[0:1]+[None])[0]
        if field is None:
            return self
        if isinstance(field, list):
            return getattr(self, tp_name)(**{field_name+"__in": field})
        return getattr(self, tp_name)(**{field_name: field})


class BManager(models.Manager.from_queryset(BQuerySet)):
    # pylint: disable=no-member
    pass


class BModel(models.Model):
    objects    = BManager()
    id         = models.AutoField(primary_key=True, max_length=20)
    hidden     = models.BooleanField(default=False)

    def __init__(self, *args, **kwargs):
        super(BModel, self).__init__(*args, **kwargs)
        self.no_signal = False

    class Meta:
        abstract = True

    def __unicode__(self):
        return "<{}>".format(self.id)  # nocv

    def __str__(self):
        return self.__unicode__()

    @staticmethod
    def get_acl(cls, obj=None):
        handler_class_name = settings.ACL['MODEL_HANDLERS'].get(
            cls.__name__, settings.ACL['MODEL_HANDLERS'].get("Default")
        )
        return import_class(handler_class_name)(cls, obj)

    @classproperty
    def acl_handler(self):
        classObj = self.__class__
        if isinstance(self, BModel):
            return classObj.get_acl(classObj, self)
        return self.get_acl(self)


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
