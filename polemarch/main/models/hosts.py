# pylint: disable=protected-access,no-member
from __future__ import unicode_literals
from typing import Any, List, Tuple, Dict, Text
import logging
from django.db.models import Q
from django.db import transaction
try:
    from yaml import dump as to_yaml, CDumper as Dumper, ScalarNode
except ImportError:  # nocv
    from yaml import dump as to_yaml, Dumper, ScalarNode

from .base import models
from .base import ManyToManyFieldACL, ManyToManyFieldACLReverse
from .vars import AbstractModel, AbstractVarsQuerySet
from ...main import exceptions as ex, utils
from ..validators import RegexValidator


logger = logging.getLogger("polemarch")


def _delete_not_existing_objects(queryset, object_dict):
    queryset.exclude(name__in=[n['name'] for n in object_dict]).delete()


# Helpfull methods
def _get_dict(objects: AbstractVarsQuerySet, keys: List = None, tmp_dir: Text = '/tmp') -> Tuple[Dict, List]:
    keys = keys if keys else list()
    result = dict()
    for obj in objects:
        result[obj.name], obj_keys = obj.toDict(tmp_dir)
        keys += obj_keys
    return result, keys


class InventoryDumper(Dumper):
    """
    Yaml Dumper class for PyYAML
    """
    yaml_representers = getattr(Dumper, 'yaml_representers', {}).copy()
    yaml_representers[type(None)] = lambda dumper, value: (
        ScalarNode(tag=u'tag:yaml.org,2002:null', value='')
    )
    yaml_representers[str] = lambda dumper, value: (
        ScalarNode(tag=u'tag:yaml.org,2002:str', value=value)
    )


# Helpfull exceptions
class CiclicDependencyError(ex.PMException):
    _def_message = "A cyclic dependence was found. {}"

    def __init__(self, tp: Text = ""):
        msg = self._def_message.format(tp)
        super(CiclicDependencyError, self).__init__(msg)


# Block of models
class InventoryItems(AbstractModel):
    master_project = models.ForeignKey(blank=True, default=None, null=True,
                                       on_delete=models.CASCADE,
                                       related_name='slave_%(class)s',
                                       to='main.Project')

    class Meta:
        abstract = True

    @property
    def from_project(self):
        return bool(self.master_project)


class HostQuerySet(AbstractVarsQuerySet):
    # pylint: disable=no-member
    pass


class Host(InventoryItems):
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

    def toDict(self, tmp_dir: Text = '/tmp') -> Tuple[Any, List]:
        hvars, keys = self.get_generated_vars(tmp_dir)
        return hvars or None, keys


class GroupQuerySet(AbstractVarsQuerySet):
    # pylint: disable=no-member

    def get_subgroups_id(self, accumulated: AbstractVarsQuerySet = None, tp: Text = "parents") -> AbstractVarsQuerySet:
        accumulated = accumulated if accumulated else self.none()
        list_id = self.exclude(id__in=accumulated).values_list("id", flat=True)
        accumulated = (accumulated | list_id)
        kw = {tp + "__id__in": list_id}
        subs = self.model.objects.filter(**kw)
        subs_id = subs.values_list("id", flat=True)
        if subs_id:
            accumulated = (accumulated | subs.get_subgroups_id(accumulated, tp))
        return accumulated

    def get_subgroups(self) -> AbstractVarsQuerySet:
        return self.model.objects.filter(id__in=self.get_subgroups_id(tp="parents"))

    def get_parents(self) -> AbstractVarsQuerySet:
        return self.model.objects.filter(id__in=self.get_subgroups_id(tp="childrens"))


class Group(InventoryItems):
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

    def toDict(self, tmp_dir: Text = '/tmp') -> Tuple[Dict, List]:
        result = dict()
        hvars, keys = self.get_generated_vars(tmp_dir)
        if self.children:
            objs = self.groups
            key_name = 'children'
        else:
            objs = self.hosts
            key_name = 'hosts'
        objs_dict, obj_keys = _get_dict(objs.all(), keys, tmp_dir)
        if objs_dict:
            result[key_name] = objs_dict
        if self.vars:
            result['vars'] = hvars
        keys += obj_keys
        return result, keys


class Inventory(InventoryItems):
    hosts       = ManyToManyFieldACL(Host)
    groups      = ManyToManyFieldACL(Group)

    _to_yaml_kwargs = dict(
        Dumper=InventoryDumper,
        indent=2,
        explicit_start=True,
        default_flow_style=False,
        allow_unicode=True
    )
    parser_class = utils.AnsibleInventoryParser

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.id)  # pragma: no cover

    @property
    def groups_list(self) -> GroupQuerySet:
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
    def hosts_list(self) -> HostQuerySet:
        '''
        :return:HostQuerySet: Mixed queryset with all hosts
        '''
        return self.hosts.all().order_by("name")

    def get_inventory(self, tmp_dir='/tmp/') -> Tuple[Text, List]:
        inv = dict(all=dict())
        hvars, keys = self.get_generated_vars(tmp_dir)
        hosts = self.hosts.all().order_by("name")
        groups = self.groups.all().order_by("name")
        hosts_dicts, keys = _get_dict(hosts, keys, tmp_dir)
        groups_dicts, keys = _get_dict(groups, keys, tmp_dir)
        if hosts_dicts:
            inv['all']['hosts'] = hosts_dicts
        if groups_dicts:
            inv['all']['children'] = groups_dicts
        if hvars:
            inv['all']['vars'] = hvars
        return to_yaml(inv, **self._to_yaml_kwargs), keys

    @property
    def all_groups(self) -> GroupQuerySet:
        return self.groups_list.distinct()

    @property
    def all_hosts(self) -> HostQuerySet:
        return Host.objects.filter(
            Q(groups__in=self.groups_list) | Q(pk__in=self.hosts_list)
        ).distinct()

    @classmethod
    def parse_inventory_from_str(cls, data):
        return cls.parser_class().get_inventory_data(data)

    @classmethod
    @transaction.atomic()
    def import_inventory_from_string(cls, name, raw_data, **kwargs):
        inv_json = cls.parse_inventory_from_str(raw_data)

        inventory = kwargs.pop('inventory_instance', None)
        if inventory is None:
            inventory = cls.objects.create(name=name, **kwargs)

        inventory.vars = inv_json['vars']
        created_hosts, created_groups = dict(), dict()

        _delete_not_existing_objects(inventory.hosts, inv_json['hosts'])
        for host in inv_json['hosts']:
            inv_host, _ = inventory.hosts.get_or_create(name=host['name'], **kwargs)
            inv_host.vars = host['vars']
            created_hosts[inv_host.name] = inv_host

        _delete_not_existing_objects(inventory.groups, inv_json['groups'])
        for group in inv_json['groups']:
            children = not len(group['groups']) == 0
            inv_group, _ = inventory.groups.get_or_create(name=group['name'], children=children, **kwargs)
            inv_group.vars = group['vars']
            created_groups[inv_group.name] = inv_group

        for group in inv_json['groups']:
            inv_group = created_groups[group['name']]
            if inv_group.children:
                inv_group.groups.set((created_groups[n] for n in group['groups']))
            else:
                inv_group.hosts.set((created_hosts[n] for n in group['hosts']))

        inventory.raw_data = raw_data
        return inventory
