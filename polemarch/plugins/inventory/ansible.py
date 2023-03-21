import re
import base64
import mimetypes
from uuid import uuid1
from typing import Tuple, Any
from pathlib import Path
import orjson

try:
    from yaml import dump as to_yaml, CDumper as Dumper, ScalarNode
except ImportError:  # nocv
    from yaml import dump as to_yaml, Dumper, ScalarNode

from django.db import transaction
from rest_framework import fields as drffields
from vstutils.api import fields as vstfields
from .base import BasePlugin
from ...main.constants import HiddenVariablesEnum, CYPHER
from ...main.utils import AnsibleInventoryParser
from ...main.models.hosts import Host, Group
from ...main.models.vars import AbstractVarsQuerySet


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


class BaseAnsiblePlugin(BasePlugin):
    # pylint: disable=abstract-method
    __slots__ = ()

    raw_inventory_hidden_vars = HiddenVariablesEnum.get_values()
    hide_passwords_regex = re.compile(r'|'.join((
        r"(?<=" + hidden_var + r":\s).{1,}?(?=[\n\t\s])"
        for hidden_var in raw_inventory_hidden_vars
    )), re.MULTILINE)

    @classmethod
    def get_raw_inventory(cls, inventory_string: str) -> str:
        return cls.hide_passwords_regex.sub(CYPHER, inventory_string)


class PolemarchDB(BaseAnsiblePlugin):
    __slots__ = ()

    state_managed = False
    supports_import = True

    serializer_import_fields = {
        'body': vstfields.FileInStringField(),
    }

    _parser = AnsibleInventoryParser()
    _to_yaml_kwargs = {
        'Dumper': InventoryDumper,
        'indent': 2,
        'explicit_start': True,
        'default_flow_style': False,
        'allow_unicode': True,
    }

    def render_inventory(self, instance, execution_dir) -> Tuple[Path, list]:
        result = {'all': {}}
        hvars, keys = instance.get_generated_vars(execution_dir)
        hosts = instance.hosts.all().order_by("name")
        groups = instance.groups.all().order_by("name")
        hosts_dicts, keys = self._get_dict(hosts, execution_dir, keys)
        groups_dicts, keys = self._get_dict(groups, execution_dir, keys)

        if hosts_dicts:
            result['all']['hosts'] = hosts_dicts
        if groups_dicts:
            result['all']['children'] = groups_dicts
        if hvars:
            result['all']['vars'] = hvars

        filepath = (Path(execution_dir) / f'inventory_{uuid1()}')
        filepath.write_text(to_yaml(result, **self._to_yaml_kwargs))

        return filepath, keys

    @classmethod
    @transaction.atomic()
    def import_inventory(cls, instance, data: dict):
        inv_json = cls.parse_inventory_from_str(data['body'])

        instance.vars = inv_json['vars']
        created_hosts, created_groups = {}, {}

        cls._delete_not_existing_objects(instance.hosts, inv_json['hosts'])
        for host in inv_json['hosts']:
            inv_host, _ = instance.hosts.get_or_create(name=host['name'])
            inv_host.vars = host['vars']
            created_hosts[inv_host.name] = inv_host

        cls._delete_not_existing_objects(instance.groups, inv_json['groups'])
        for group in inv_json['groups']:
            children = not len(group['groups']) == 0
            inv_group, _ = instance.groups.get_or_create(name=group['name'], children=children)
            inv_group.vars = group['vars']
            created_groups[inv_group.name] = inv_group

        for group in inv_json['groups']:
            inv_group = created_groups[group['name']]
            if inv_group.children:
                inv_group.groups.set((created_groups[n] for n in group['groups']))
            else:
                inv_group.hosts.set((created_hosts[n] for n in group['hosts']))

        instance.raw_data = data['body']
        return instance

    @classmethod
    def parse_inventory_from_str(cls, data):
        return cls._parser.get_inventory_data(data)

    @classmethod
    def _delete_not_existing_objects(cls, queryset, object_dict):
        queryset.exclude(name__in=[n['name'] for n in object_dict]).delete()

    @classmethod
    def _get_dict(cls, objects: AbstractVarsQuerySet, tmp_dir, keys: list = None) -> Tuple[dict, list]:
        keys = keys if keys else []
        result = {}
        for obj in objects:
            if isinstance(obj, Group):
                result[obj.name], obj_keys = cls._group_to_dict(obj, tmp_dir)
            elif isinstance(obj, Host):
                result[obj.name], obj_keys = cls._host_to_dict(obj, tmp_dir)
            keys += obj_keys
        return result, keys

    @classmethod
    def _group_to_dict(cls, instance, tmp_dir) -> Tuple[dict, list]:
        result = {}
        hvars, keys = instance.get_generated_vars(tmp_dir)
        if instance.children:
            objs = instance.groups
            key_name = 'children'
        else:
            objs = instance.hosts
            key_name = 'hosts'
        objs_dict, obj_keys = cls._get_dict(objs.all(), tmp_dir, keys)
        if objs_dict:
            result[key_name] = objs_dict
        if instance.vars:
            result['vars'] = hvars
        keys += obj_keys
        return result, keys

    @classmethod
    def _host_to_dict(cls, instance, tmp_dir) -> Tuple[Any, list]:
        hvars, keys = instance.get_generated_vars(tmp_dir)
        return hvars or None, keys


class AnsibleFile(BaseAnsiblePlugin):
    # pylint: disable=abstract-method
    __slots__ = ()

    serializer_fields = {'path': drffields.CharField(default='')}
    defaults = {'path': ''}

    def render_inventory(self, instance, execution_dir) -> Tuple[Path, list]:
        filepath = Path(execution_dir) / instance.inventory_state.data['path']
        return filepath, []


class AnsibleString(BaseAnsiblePlugin):
    # pylint: disable=abstract-method
    __slots__ = ()

    supports_import = True

    serializer_fields = {
        'body': vstfields.FileInStringField(),
        'extension': vstfields.AutoCompletionField(autocomplete=('yaml', 'ini', 'json'), default='yaml'),
        'executable': drffields.BooleanField(default=False),
    }
    serializer_import_fields = {
        'file': vstfields.NamedBinaryFileInJsonField(),
    }
    defaults = {
        'body': '',
        'extension': 'yaml',
        'executable': False,
    }

    def render_inventory(self, instance, execution_dir) -> Tuple[Path, list]:
        state_data = instance.inventory_state.data
        filename = f'inventory_{uuid1()}'

        if state_data['extension']:
            filename += f'.{state_data["extension"]}'

        filepath = Path(execution_dir) / filename
        filepath.write_text(state_data['body'])
        if state_data['executable']:
            filepath.chmod(0o700)

        return filepath, []

    @classmethod
    def import_inventory(cls, instance, data):
        loaded = orjson.loads(data['file'])  # pylint: disable=no-member
        media_type = loaded['mediaType'] or ''
        extension = mimetypes.guess_extension(media_type, strict=False) or ''
        if extension != '':
            extension = extension.replace('.', '', 1)
        elif '.' in loaded['name']:
            extension = loaded['name'].rsplit('.', maxsplit=1)[-1]
        body = base64.b64decode(loaded['content']).decode('utf-8')
        instance.update_inventory_state(data={
            'body': body,
            'extension': extension,
            'executable': body.startswith('#!/'),
        })
        return instance
