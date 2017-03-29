# pylint: disable=protected-access
from __future__ import unicode_literals

import json
import logging
import uuid
from importlib import import_module

import six
from django.conf import settings
from django.db import models

from .base import BaseModel, BaseManager, BaseQuerySet
from ...main import exceptions as ex

logger = logging.getLogger("ihservice")


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


# Block of models
class EnvironmentManager(BaseManager.from_queryset(BaseQuerySet)):
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


class Environment(BaseModel):
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


class HostQuerySet(BaseQuerySet):
    # pylint: disable=no-member
    def set_status(self, status):
        return self.update(status=status)


class HostManager(BaseManager.from_queryset(HostQuerySet)):
    # pylint: disable=no-member
    pass


class Host(BaseModel):
    objects = HostManager()
    host        = models.CharField(max_length=64,
                                   unique=True,
                                   default=uuid.uuid1)
    auth_user   = models.CharField(max_length=64,
                                   default="")
    auth_type   = models.CharField(max_length=6,
                                   default="PASSWD")
    auth_data   = models.CharField(max_length=4096,
                                   default="")
    nodeid      = models.CharField(max_length=256,
                                   blank=True,
                                   null=True)
    environment = models.ForeignKey(Environment,
                                    blank=True,
                                    null=True)
