# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import json
import logging
import six

from .base import BModel, BManager, BQuerySet, models
from .vars import _AbstractModel, _AbstractInventoryQuerySet
from ...main import exceptions as ex
from ..utils import ModelHandlers, get_render, tmp_file

logger = logging.getLogger("polemarch")


# Helpfull methods
def _get_strings(objects, keys=None, strings=None):
    keys = keys if keys else list()
    strings = strings if strings else list()
    for obj in objects:
        string, obj_keys = obj.toString()
        if obj_keys:
            keys += obj_keys
        strings.append(string)
    return strings, keys


# Helpfull exceptions
class CiclicDependencyError(ex.PMException):
    _def_message = "A cyclic dependence was found. {}"

    def __init__(self, tp=""):
        msg = self._def_message.format(tp)
        super(CiclicDependencyError, self).__init__(msg)


# Block of models
class EnvironmentManager(BManager.from_queryset(BQuerySet)):
    # pylint: disable=no-member
    handlers = ModelHandlers("INTEGRATIONS")

    def get_integrations(self):
        return {name: integ.required_fields() for name, integ in self.handlers}

    def create(self, **kwargs):
        kwargs.pop("id", None)
        service_env = self.model(**kwargs)
        service_env.integration.is_valid()
        service_env.integration.prepare_environment()
        service_env.save()
        return service_env


class Environment(BModel):
    objects    = EnvironmentManager()
    handlers   = ModelHandlers("INTEGRATIONS")
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
        return self.handlers(self.type, self)

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
        return "{}".format(self.name)

    @property
    def integration(self):
        env = self.environment or Environment(name="NullEnv")
        return ModelHandlers("INTEGRATIONS").get_object(env.type, env)

    def prepare(self):
        self.integration.prepare_service(self)

    def toString(self, var_sep=" "):
        hvars, key = self.get_generated_vars()
        key = [key] if key is not None else []
        return "{} {}".format(self.name,
                              self.vars_string(hvars, var_sep)), key


class GroupQuerySet(_AbstractInventoryQuerySet):
    # pylint: disable=no-member

    def get_subgroups_id(self, accumulated=None, tp="parents"):
        accumulated = accumulated if accumulated else self.none()
        list_id = self.exclude(id__in=accumulated).values_list("id", flat=True)
        accumulated = (accumulated | list_id)
        kw = {tp + "__id__in": list_id}
        subs = self.model.objects.filter(**kw)
        subs_id = subs.values_list("id", flat=True)
        if subs_id:
            accumulated = (
                accumulated | subs.get_subgroups_id(accumulated, tp)
            )
        return accumulated

    def get_subgroups(self):
        subgroups_id = self.get_subgroups_id(tp="parents")
        subgroups = self.model.objects.filter(id__in=subgroups_id)
        return subgroups

    def get_parents(self):
        subgroups_id = self.get_subgroups_id(tp="childrens")
        subgroups = self.model.objects.filter(id__in=subgroups_id)
        return subgroups


class Group(_AbstractModel):
    CiclicDependencyError = CiclicDependencyError
    objects     = BManager.from_queryset(GroupQuerySet)()
    hosts       = models.ManyToManyField(Host)
    parents     = models.ManyToManyField('Group', blank=True, null=True,
                                         related_query_name="childrens")
    children    = models.BooleanField(default=False)

    class Meta:
        default_related_name = "groups"
        index_together = [
            ["children"],
            ["children", "id"],
        ]

    def toString(self, var_sep="\n"):
        hvars, key = self.get_generated_vars()
        keys = [key] if key is not None else []
        if self.children:
            objects = "\n".join(self.groups.values_list("name", flat=True))
        else:
            hosts_strings, keys = _get_strings(self.hosts.all(), keys)
            objects = "\n".join(hosts_strings)
        data = dict(vars=self.vars_string(hvars, var_sep),
                    objects=objects, group=self)
        return get_render("models/group", data), keys


class Inventory(_AbstractModel):
    objects     = BManager.from_queryset(_AbstractInventoryQuerySet)()
    hosts       = models.ManyToManyField(Host)
    groups      = models.ManyToManyField(Group)

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.name)  # pragma: no cover

    @property
    def groups_list(self):
        groups_list = self.groups.filter(children=False) | \
                      self.groups.filter(children=True).get_subgroups()
        groups_list = groups_list.distinct().prefetch_related("variables",
                                                              "hosts")
        return groups_list.order_by("-children", "id")

    @property
    def hosts_list(self):
        return self.hosts.all()

    def get_inventory(self):
        hvars, key = self.get_generated_vars()
        hosts_strings, keys = _get_strings(list(self.hosts_list), [key])
        groups_strings, keys = _get_strings(list(self.groups_list), keys)
        inv = get_render("models/inventory",
                         dict(groups=groups_strings, hosts=hosts_strings,
                              vars=self.vars_string(hvars, "\n")))
        return inv, keys

    def get_files(self):
        inventory_text, key_files = self.get_inventory()
        inventory_file = tmp_file()
        inventory_file.write(inventory_text)
        return inventory_file, key_files
