# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import json
import logging
import uuid
from importlib import import_module

import six
from django.conf import settings
from django.contrib.contenttypes.fields import (GenericForeignKey,
                                                GenericRelation)
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from .base import BModel, BManager, BQuerySet, models
from ...main import exceptions as ex

logger = logging.getLogger("polemarch")


def get_integrations():
    return getattr(settings, "INTEGRATIONS", {})


def get_integration(name):
    try:
        backend = get_integrations()[name].get('BACKEND', None)
        if backend is None:
            raise ex.IHSException("Backend is 'None'.")
        return import_module(backend).Integration
    except KeyError or ImportError:
        raise ex.UnknownIntegrationException(name)


def get_integ_opts(name):
    return get_integrations().get(name, {}).get('OPTIONS', {})


# Block of abstractions
class Variable(BModel):
    content_type   = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id      = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    key            = models.CharField(max_length=128)
    value          = models.CharField(max_length=2*1024)

    def __unicode__(self):
        return "{}={}".format(self.key, self.value)

    def __str__(self):
        return self.__unicode__()


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

    @transaction.atomic()
    def set_vars(self, variables):
        self.variables.all().delete()
        for key, value in variables.items():
            self.variables.create(key=key, value=value)

    @property
    def vars(self):
        return dict(self.variables.all().values_list('key', 'value'))


# Block of models
class EnvironmentManager(BManager.from_queryset(BQuerySet)):
    # pylint: disable=no-member
    def get_integrations(self):
        data = dict()
        for integ_name in get_integrations():
            data[integ_name] = get_integration(integ_name).required_fields()
        return data

    def create(self, **kwargs):
        kwargs.pop("id", None)
        service_env = self.model(**kwargs)
        service_env.integration.is_valid()
        service_env.integration.prepare_environment()
        service_env.save()
        return service_env


class Environment(BModel):
    objects    = EnvironmentManager()
    name       = models.CharField(max_length=40,
                                  unique=True)
    type       = models.CharField(max_length=20,
                                  default="Default")
    key        = models.CharField(max_length=2048,
                                  blank=True,
                                  null=True)
    _data      = models.CharField(max_length=2048,
                                  default="{}",
                                  db_column='data')

    def __unicode__(self):
        return "{}:{}".format(self.name,
                              self.type)

    def __str__(self):
        return self.__unicode__()

    @property
    def data(self):
        return self._data

    @data.setter
    def data(self, value):
        if isinstance(value, (list, dict, tuple)):
            self._data = json.dumps(value)
        elif isinstance(value, (six.text_type, six.string_types)):
            try:
                self._data = json.dumps(json.loads(value)) if value else '{}'
            except ValueError as err:
                raise ex.IHSException("{}. Data: {}".format(err, value))
        else:
            raise ex.IHSException("Unknown `data` field type.")

    @property
    def integration(self):
        return get_integration(self.type)(self, **get_integ_opts(self.type))

    @property
    def additionals(self):
        return self.integration.additionals()


class HostQuerySet(_AbstractInventoryQuerySet):
    # pylint: disable=no-member
    pass


class Host(_AbstractModel):
    objects     = BManager.from_queryset(HostQuerySet)()
    type        = models.CharField(max_length=5,
                                   default="HOST")
    environment = models.ForeignKey(Environment,
                                    blank=True,
                                    null=True)

    class Meta:
        default_related_name = "hosts"

    def __unicode__(self):
        return str(self.name)

    def __str__(self):
        return self.__unicode__()

    @property
    def integration(self):
        env = self.environment or Environment(name="NullEnv")
        return get_integration(env.type)(env, **get_integ_opts(env.type))

    def prepare(self):
        self.integration.prepare_service(self)


class GroupQuerySet(_AbstractInventoryQuerySet):
    # pylint: disable=no-member
    pass


class Group(_AbstractModel):
    objects     = BManager.from_queryset(GroupQuerySet)()
    hosts       = models.ManyToManyField(Host)
    groups      = models.ManyToManyField('self', blank=True, null=True)
    children    = models.BooleanField(default=False)

    class Meta:
        default_related_name = "groups"

    def __unicode__(self):
        return str(self.name)

    def __str__(self):
        return self.__unicode__()


class Inventory(_AbstractModel):
    objects     = BManager.from_queryset(_AbstractInventoryQuerySet)()
    hosts       = models.ManyToManyField(Host)
    groups      = models.ManyToManyField(Group)

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.name)

    def __str__(self):
        return self.__unicode__()
