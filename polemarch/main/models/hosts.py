# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging

from .base import BManager, models
from .vars import AbstractModel, AbstractVarsQuerySet
from ...main import exceptions as ex
from ..utils import get_render

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
class HostQuerySet(AbstractVarsQuerySet):
    # pylint: disable=no-member
    pass


class Host(AbstractModel):
    objects     = BManager.from_queryset(HostQuerySet)()
    type        = models.CharField(max_length=5,
                                   default="HOST")

    types = ["HOST", "RANGE"]

    class Meta:
        default_related_name = "hosts"

    def __unicode__(self):
        return "{}".format(self.name)

    def toString(self, var_sep=" "):
        hvars, key = self.get_generated_vars()
        key = [key] if key is not None else []
        return "{} {}".format(self.name,
                              self.vars_string(hvars, var_sep)), key


class GroupQuerySet(AbstractVarsQuerySet):
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


class Group(AbstractModel):
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
            groups = self.groups.values_list("name",
                                             flat=True).order_by("name")
            objects = "\n".join(groups)
        else:
            hosts = self.hosts.all().order_by("name")
            hosts_strings, keys = _get_strings(hosts, keys)
            objects = "\n".join(hosts_strings)
        data = dict(vars=self.vars_string(hvars, var_sep),
                    objects=objects, group=self)
        return get_render("models/group", data), keys


class Inventory(AbstractModel):
    objects     = BManager.from_queryset(AbstractVarsQuerySet)()
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
        return self.hosts.all().order_by("name")

    def get_inventory(self):
        hvars, key = self.get_generated_vars()
        keys = [key] if key else list()
        hosts_strings, keys = _get_strings(list(self.hosts_list), keys)
        groups_strings, keys = _get_strings(list(self.groups_list), keys)
        inv = get_render("models/inventory",
                         dict(groups=groups_strings, hosts=hosts_strings,
                              vars=self.vars_string(hvars, "\n")))
        return inv, keys
