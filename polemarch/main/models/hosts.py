# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import six
from django.db.models import Q
from vstutils.utils import get_render
try:
    from yaml import dump as to_yaml, CDumper as Dumper
except ImportError:
    from yaml import dump as to_yaml, Dumper

from .base import models
from .base import ManyToManyFieldACL, ManyToManyFieldACLReverse
from .vars import AbstractModel, AbstractVarsQuerySet
from ...main import exceptions as ex
from ..validators import RegexValidator

logger = logging.getLogger("polemarch")


class InventoryDumper(Dumper):
    """
    Yaml Dumper class for PyYAML
    """


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


def _get_dict(objects, keys=None, dicts=None):
    keys = keys if keys else list()
    dicts = dicts if dicts else dict()
    for obj in objects:
        one_dict, obj_keys = obj.toDict()
        if obj_keys:
            keys += obj_keys
        isGroup = isinstance(obj, Group)
        one_dict = {obj.name: one_dict} if isGroup else one_dict
        dicts.update(one_dict)

    dicts = {'hosts': dicts} if not isGroup else {'children': dicts}
    return dicts, keys


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
    objects     = HostQuerySet.as_manager()
    type        = models.CharField(max_length=5, default="HOST")

    types = ["HOST", "RANGE"]

    range_validator = RegexValidator(
        regex=r'^[a-zA-Z0-9\-\._\[\]\:]*$',
        message='Name must be Alphanumeric'
    )

    class Meta:
        default_related_name = "hosts"

    def __unicode__(self):
        return "{}".format(self.name)  # nocv

    def toString(self, var_sep=" "):
        hvars, key = self.get_generated_vars()
        key = [key] if key is not None else []
        return "{} {}".format(self.name, self.vars_string(hvars, var_sep)), key

    def toDict(self):
        hvars, key = self.get_generated_vars()
        key = [key] if key is not None else []
        if hvars:
            data = {self.name: dict(hvars)}
        else:
            data = {self.name: None}
        return data, key


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
            accumulated = (accumulated | subs.get_subgroups_id(accumulated, tp))
        return accumulated

    def get_subgroups(self):
        return self.model.objects.filter(id__in=self.get_subgroups_id(tp="parents"))

    def get_parents(self):
        return self.model.objects.filter(id__in=self.get_subgroups_id(tp="childrens"))


class Group(AbstractModel):
    CiclicDependencyError = CiclicDependencyError
    objects     = GroupQuerySet.as_manager()
    hosts       = ManyToManyFieldACL(Host, related_query_name="groups")
    parents     = ManyToManyFieldACLReverse('Group', blank=True, null=True,
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
            groups = self.groups.values_list("name", flat=True).order_by("name")
            objects = "\n".join(groups)
        else:
            hosts = self.hosts.all().order_by("name")
            hosts_strings, keys = _get_strings(hosts, keys)
            objects = "\n".join(hosts_strings)
        data = dict(vars=self.vars_string(hvars, var_sep), objects=objects, group=self)
        return get_render("models/group", data), keys

    def toDict(self):
        hvars, key = self.get_generated_vars()
        keys = [key] if key is not None else []
        if self.children:
            objs = self.groups.all()
        else:
            objs = self.hosts.all()
        groups_dict, obj_keys = _get_dict(list(objs), keys)
        if self.vars:
            groups_dict['vars'] = dict(hvars)
        if keys:
            keys += obj_keys
        return groups_dict, keys


class Inventory(AbstractModel):
    hosts       = ManyToManyFieldACL(Host)
    groups      = ManyToManyFieldACL(Group)

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.id)  # pragma: no cover

    @property
    def groups_list(self):
        '''
        :return:GroupQuerySet: Mixed queryset with all groups
        '''
        groups_list = (
            self.groups.filter(children=False) |
            self.groups.filter(children=True).get_subgroups()
        )
        groups_list = groups_list.distinct().prefetch_related("variables", "hosts")
        return groups_list.order_by("-children", "id")

    @property
    def hosts_list(self):
        '''
        :return:HostQuerySet: Mixed queryset with all hosts
        '''
        return self.hosts.all().order_by("name")

    def _get_inventory(self):
        hvars, key = self.get_generated_vars()
        keys = [key] if key else list()
        hosts_strings, keys = _get_strings(list(self.hosts_list), keys)
        groups_strings, keys = _get_strings(list(self.groups_list), keys)
        inv = get_render(
            "models/inventory",
            dict(
                groups=groups_strings,
                hosts=hosts_strings,
                vars=self.vars_string(hvars, "\n")
            )
        )
        return inv, keys

    def get_inventory(self):
        inv = dict(all=dict())
        hvars, key = self.get_generated_vars()
        keys = [key] if key else list()
        hosts = self.hosts.all().order_by("name")
        groups = self.groups.all().order_by("name")
        hosts_dicts, keys = _get_dict(list(hosts), keys)
        groups_dicts, keys = _get_dict(list(groups), keys)
        inv['all']['hosts'] = hosts_dicts
        inv['all']['children'] = groups_dicts
        inv['all']['vars'] = dict(hvars)
        InventoryDumper.add_representer(
            type(None),
            lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
        )

        InventoryDumper.add_representer(
            type(six.text_type),
            lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:str', value)
        )
        to_yaml_kwargs = dict(
            Dumper=InventoryDumper,
            indent=4,
            explicit_start=True,
            default_flow_style=False,
        )
        inv_text = to_yaml(inv, **to_yaml_kwargs)
        return inv_text, keys

    @property
    def all_groups(self):
        return self.groups_list

    @property
    def all_hosts(self):
        return Host.objects.filter(
            Q(groups__in=self.groups_list) | Q(pk__in=self.hosts_list)
        )
