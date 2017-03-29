from __future__ import unicode_literals

from django.db import models

from ihservice.main.utils import Paginator


class BaseManager(models.Manager):
    pass


class BaseQuerySet(models.QuerySet):

    def paged(self, *args, **kwargs):
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        return Paginator(self, *args, **kwargs)

    def _find(self, field_name, tp_name, *args, **kwargs):
        field = kwargs.get(field_name, None) or (list(args)[0:1]+[None])[0]
        if field is None:
            return self  # pragma: no cover
        if isinstance(field, list):
            return getattr(self, tp_name)(**{field_name+"__in": field})
        return getattr(self, tp_name)(**{field_name: field})


class BaseModel(models.Model):
    id         = models.AutoField(primary_key=True,
                                  max_length=20)

    def __init__(self, *args, **kwargs):
        super(BaseModel, self).__init__(*args, **kwargs)
        self.no_signal = False

    class Meta:
        abstract = True
