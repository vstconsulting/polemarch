import os
import re
from uuid import uuid1
from functools import lru_cache
from typing import Type, Mapping, Optional, Union, Tuple
from django.conf import settings
from rest_framework import fields
from vstutils.api.serializers import BaseSerializer
from vstutils.api.fields import VSTCharField, SecretFileInString, AutoCompletionField
from ..main.constants import ANSIBLE_REFERENCE, CYPHER, HiddenArgumentsEnum, HiddenVariablesEnum
from ..main.models import Inventory
from ..api.v2.serializers import InventoryAutoCompletionField
from .base import BasePlugin


class BaseAnsiblePlugin(BasePlugin):
    __slots__ = ('files',)

    reference = {}
    base_command = settings.EXECUTOR
    raw_inventory_hidden_vars = HiddenVariablesEnum.get_values()
    supports_inventory = True
    hide_passwords_regex = re.compile(r'|'.join((
        r"(?<=" + hidden_var + r":\s).{1,}?(?=[\n\t\s])"
        for hidden_var in raw_inventory_hidden_vars
    )), re.MULTILINE)

    error_codes = {
        4: 'OFFLINE',
        -9: 'INTERRUPTED',
        -15: 'INTERRUPTED',
    }

    @classmethod
    @lru_cache()
    def get_serializer_class(cls, exclude_fields=()) -> Type[BaseSerializer]:
        class AnsibleSerializer(super().get_serializer_class(exclude_fields=exclude_fields)):
            def to_representation(self, instance):
                representation = super().to_representation(instance)
                HiddenArgumentsEnum.hide_values(representation)
                return representation

        AnsibleSerializer.__name__ = f'{AnsibleSerializer.Meta.ref_name}Serializer'
        return AnsibleSerializer

    def get_env_vars(self) -> Mapping[str, str]:
        env_vars = super().get_env_vars()
        ansible_config = env_vars.pop('ANSIBLE_CONFIG', None)

        if ansible_config is not None:
            ansible_config = str(self.execution_dir / ansible_config)
        elif (self.execution_dir / 'ansible.cfg').is_file():
            ansible_config = str(self.execution_dir / 'ansible.cfg')
        elif os.getenv('ANSIBLE_CONFIG'):
            ansible_config = os.getenv('ANSIBLE_CONFIG')

        if ansible_config is not None:
            env_vars['ANSIBLE_CONFIG'] = ansible_config

        return env_vars

    def get_inventory(self, inventory: Optional[Union[Inventory, str, int]]) -> Tuple[Optional[str], str]:
        if inventory is None:
            return inventory, ''

        if isinstance(inventory, int) or (isinstance(inventory, str) and inventory.isdigit()):
            inventory = Inventory.objects.get(id=int(inventory))

        if isinstance(inventory, Inventory):
            text, self.files = inventory.get_inventory(tmp_dir=self.execution_dir)
            inventory_file = self.execution_dir / self.inventory_filename
            inventory_file.write_text(text)
            return str(inventory_file), self._get_raw_inventory(text)

        if (self.execution_dir / inventory).is_file():
            inventory_file = (self.execution_dir / inventory)
            self._inventory_filename = inventory_file.name
            text = inventory_file.read_text()
            return str(inventory_file), self._get_raw_inventory(text)

        return inventory, self._get_raw_inventory(inventory)

    def get_verbose_level(self, raw_args: dict) -> int:
        return int(raw_args.get('verbose', 0))

    def _get_raw_inventory(self, raw_inventory: str) -> str:
        return self.hide_passwords_regex.sub(CYPHER, raw_inventory, 0)

    def _process_arg(self, key: str, value) -> Optional[str]:
        key = key.replace('_', '-')
        if key in self.reference:
            if not value:
                return None
            if key == 'verbose':
                return '-' + 'v' * int(value) if value else ''
            argtype = self.reference[key]['type']
            if argtype is None and value:
                return f'--{key}'
            if argtype == 'inner':
                value = self._put_into_tmpfile(value)
            return super()._process_arg(key, value)

    def _put_into_tmpfile(self, value) -> str:
        tmpfile = self.execution_dir / f'inner_arg_{uuid1()}'
        tmpfile.write_text(value)
        tmpfile.chmod(0o600)
        return str(tmpfile)

    @classmethod
    def _get_serializer_fields(cls, exclude_fields=()):
        serializer_fields = super()._get_serializer_fields(exclude_fields=exclude_fields)
        for field_name, field_def in cls.reference.items():
            if field_name in ('help', 'version', *exclude_fields):
                continue
            field_type = field_def.get('type')
            kwargs = {'help_text': field_def.get('help', ''), 'required': False}
            field = None
            if field_type is None:
                field = fields.BooleanField
            elif field_type == 'int':
                field = fields.IntegerField
            elif field_type in ('string', 'choice'):
                field = VSTCharField
                kwargs['allow_blank'] = True

            if field_name == 'verbose':
                field = fields.IntegerField
                kwargs.update({'max_value': 4})
            if field_name in HiddenArgumentsEnum.get_values():
                field = SecretFileInString
            if field_name == 'inventory':
                field = InventoryAutoCompletionField
            if field_name == 'group':
                kwargs['default'] = 'all'

            if field is None:
                continue
            if 'default' not in kwargs:
                kwargs['default'] = fields.empty

            serializer_fields[field_name.replace('-', '_')] = field(**kwargs)

        return serializer_fields


class Playbook(BaseAnsiblePlugin):
    __slots__ = ()

    reference = ANSIBLE_REFERENCE.raw_dict['playbook']
    arg_shown_on_history_as_mode = 'playbook'
    serializer_fields = {
        'playbook': AutoCompletionField(autocomplete='Playbook', autocomplete_property='playbook')
    }

    @property
    def base_command(self):
        return super().base_command + ['ansible-playbook']

    def _process_arg(self, key, value):
        if key == 'playbook':
            return value
        return super()._process_arg(key, value)


class Module(BaseAnsiblePlugin):
    __slots__ = ('group', 'module')

    reference = ANSIBLE_REFERENCE.raw_dict['module']
    serializer_fields = {
        'module': AutoCompletionField(
            autocomplete='Module',
            autocomplete_property='name',
            autocomplete_represent='path',
        )
    }
    arg_shown_on_history_as_mode = 'module'

    @property
    def base_command(self):
        return super().base_command + ['ansible', self.group, '-m', self.module]

    def get_args(self, raw_args):
        self.group = raw_args.pop('group', 'all')
        self.module = raw_args.pop('module')
        return super().get_args(raw_args)
