# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import uuid

from django.contrib.contenttypes.fields import (GenericForeignKey,
                                                GenericRelation)
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from .base import BModel, BManager, BQuerySet, models


logger = logging.getLogger("polemarch")


class Variable(BModel):
    content_type   = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id      = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    key            = models.CharField(max_length=128)
    value          = models.CharField(max_length=2*1024)

    def __unicode__(self):  # pragma: no cover
        return "{}={}".format(self.key, self.value)


class _AbstractInventoryQuerySet(BQuerySet):
    use_for_related_fields = True

    @transaction.atomic
    def create(self, **kwargs):
        variables = kwargs.pop("vars", {})
        obj = super(_AbstractInventoryQuerySet, self).create(**kwargs)
        for key, value in variables.items():
            obj.variables.create(key=key, value=value)
        return obj

    def var_filter(self, **kwargs):
        qs = self
        for key, value in kwargs.items():
            qs = qs.filter(variables__key=key, variables__value=value)
        return qs


class _AbstractModel(BModel):
    objects     = BManager.from_queryset(_AbstractInventoryQuerySet)
    name        = models.CharField(max_length=512,
                                   default=uuid.uuid1)
    variables   = GenericRelation(Variable, related_query_name="variables",
                                  object_id_field="object_id")

    class Meta:
        abstract = True

    def __unicode__(self):  # pragma: no cover
        _vars = " ".join(["{}={}".format(k, v)
                          for k, v in self.vars.items()])
        return "{} {}".format(self.name, _vars)

    @transaction.atomic()
    def set_vars(self, variables):
        self.variables.all().delete()
        for key, value in variables.items():
            self.variables.create(key=key, value=value)

    @property
    def vars(self):
        return dict(self.variables.all().values_list('key', 'value'))
