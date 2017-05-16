# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import json
import logging

import six

from .base import BModel, BManager, BQuerySet, models
from .vars import _AbstractModel, _AbstractInventoryQuerySet
from ...main import exceptions as ex
from ..utils import ModelHandlers

logger = logging.getLogger("polemarch")


# Block of models
class EnvironmentManager(BManager.from_queryset(BQuerySet)):
    # pylint: disable=no-member
    def get_integrations(self):
        data = dict()
        handler = ModelHandlers("INTEGRATIONS")
        for integ_name in handler.list():
            data[integ_name] = handler.backend(integ_name).required_fields()
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

    def __unicode__(self):  # pragma: no cover
        return "{}:{}".format(self.name,
                              self.type)

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
                raise ex.PMException("{}. Data: {}".format(err, value))
        else:
            raise ex.PMException("Unknown `data` field type.")

    @property
    def integration(self):
        return ModelHandlers("INTEGRATIONS").get_object(self.type, self)

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

    @property
    def integration(self):
        env = self.environment or Environment(name="NullEnv")
        return ModelHandlers("INTEGRATIONS").get_object(env.type, env)

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


class Inventory(_AbstractModel):
    objects     = BManager.from_queryset(_AbstractInventoryQuerySet)()
    hosts       = models.ManyToManyField(Host)
    groups      = models.ManyToManyField(Group)

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.name)  # pragma: no cover
