from __future__ import unicode_literals

from django.db import models

from ...main.utils import Paginator


class BQuerySet(models.QuerySet):

    def paged(self, *args, **kwargs):  # nocv
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):  # nocv
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
    id         = models.AutoField(primary_key=True,
                                  max_length=20)

    def __init__(self, *args, **kwargs):
        super(BModel, self).__init__(*args, **kwargs)
        self.no_signal = False

    class Meta:
        abstract = True

    def __unicode__(self):
        return "<{}>".format(self.id)  # nocv

    def __str__(self):
        return self.__unicode__()


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
