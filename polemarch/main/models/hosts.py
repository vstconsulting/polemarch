# pylint: disable=protected-access,no-member
from __future__ import unicode_literals
from typing import Any, List, Tuple, Dict, Text
import logging
from django.db.models import Q
from django.db import transaction

from rest_framework import serializers, fields
from vstutils.api.serializers import VSTSerializer
from vstutils.utils import lazy_translate as __

from ...api.v2.base_serializers import UserSerializer, _WithPermissionsSerializer

try:
    from yaml import dump as to_yaml, CDumper as Dumper, ScalarNode
except ImportError:  # nocv
    from yaml import dump as to_yaml, Dumper, ScalarNode

from .base import models
from .base import ManyToManyFieldACL, ManyToManyFieldACLReverse
from .vars import AbstractModel, AbstractVarsQuerySet
from ...main import exceptions as ex
from ...main.utils import AnsibleInventoryParser
from ..validators import RegexValidator

logger = logging.getLogger("polemarch")


vars_help = 'List of variables to filter. Comma separated "key:value" list.'


def variables_filter(queryset, field, value):
    # filter applicable only to variables
    # pylint: disable=unused-argument
    items = value.split(",")
    kwargs = {item.split(":")[0]: item.split(":")[1] for item in items}
    return queryset.var_filter(**kwargs)


def _delete_not_existing_objects(queryset, object_dict):
    queryset.exclude(name__in=[n['name'] for n in object_dict]).delete()


# Helpfull methods
def _get_dict(objects: AbstractVarsQuerySet, keys: List = None, tmp_dir: Text = '/tmp') -> Tuple[Dict, List]:
    keys = keys if keys else []
    result = {}
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
        ScalarNode(tag='tag:yaml.org,2002:null', value='')
    )
    yaml_representers[str] = lambda dumper, value: (
        ScalarNode(tag='tag:yaml.org,2002:str', value=value)
    )


# Helpfull exceptions
class CyclicDependencyError(ex.PMException):
    _def_message = "A cyclic dependence was found. {}"

    def __init__(self, tp: Text = ""):
        msg = self._def_message.format(tp)
        super().__init__(msg)


# Block of models
class InventoryItems(AbstractModel):
    master_project = models.ForeignKey(
        null=True,
        on_delete=models.CASCADE,
        related_name='slave_%(class)s',
        to='main.Project'
    )

    class Meta:
        abstract = True

    @property
    def from_project(self):
        return bool(self.master_project)


class HostQuerySet(AbstractVarsQuerySet):
    # pylint: disable=no-member
    pass


class Host(InventoryItems):
    objects = HostQuerySet.as_manager()
    type = models.CharField(max_length=5, default="HOST")

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


class GroupCreateMasterSerializer(VSTSerializer):
    children = serializers.BooleanField(
        write_only=True,
        label='Contains groups',
        default=False
    )

    class Meta:
        __inject_from__ = 'detail'

    def create(self, validated_data):
        if 'owner' not in validated_data and 'request' in self.context:
            validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class GroupCopySerializer(VSTSerializer):
    class Meta:
        fields = ['name']


class Group(InventoryItems):
    """
    retrieve:
        Return a group instance.

    list:
        Return all groups.

    create:
        Create a new group.

    destroy:
        Remove an existing group.

    partial_update:
        Update one or more fields on an existing group.

    update:
        Update a group.
    """

    CyclicDependencyError = CyclicDependencyError

    hosts = ManyToManyFieldACL(Host, related_query_name="groups")
    parents = ManyToManyFieldACLReverse('Group', blank=True, related_query_name="childrens")
    children = models.BooleanField(default=False)

    deep_parent_field = 'parents'
    deep_parent_allow_append = True

    class Meta:
        default_related_name = "groups"
        indexes = [
            models.Index(fields=["children"]),
            models.Index(fields=["children", "id"]),
        ]
        _list_fields = (
            'id',
            'name',
            'children',
            'from_project',
        )
        _detail_fields = (
            'id',
            'name',
            'notes',
            'children',
            'owner',
        )
        _override_list_fields = {
            'from_project': fields.BooleanField(label=__('Project based')),
        }
        _override_detail_fields = {
            'owner': UserSerializer(read_only=True),
            'children': fields.BooleanField(read_only=True, label='Contains groups'),
        }
        _serializer_class = _WithPermissionsSerializer
        _extra_serializer_classes = {
            'serializer_class_create': GroupCreateMasterSerializer,
            'serializer_class_copy': GroupCopySerializer,
        }

    def toDict(self, tmp_dir: Text = '/tmp') -> Tuple[Dict, List]:
        result = {}
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
    hosts = ManyToManyFieldACL(Host)
    groups = ManyToManyFieldACL(Group)

    _to_yaml_kwargs = dict(
        Dumper=InventoryDumper,
        indent=2,
        explicit_start=True,
        default_flow_style=False,
        allow_unicode=True
    )
    parser_class = AnsibleInventoryParser

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.id)  # pragma: no cover

    @property
    def groups_list(self):
        '''
        :return:BQuerySet: Mixed queryset with all groups
        '''
        return self.groups\
            .get_children(with_current=True)\
            .distinct()\
            .prefetch_related("variables", "hosts")\
            .order_by("-children", "id")

    @property
    def hosts_list(self) -> HostQuerySet:
        '''
        :return:HostQuerySet: Mixed queryset with all hosts
        '''
        return self.hosts.all().order_by("name")

    def get_inventory(self, tmp_dir='/tmp/') -> Tuple[Text, List]:
        inv = {'all': {}}
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
    def all_groups(self):
        return self.groups_list

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
        created_hosts, created_groups = {}, {}

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
