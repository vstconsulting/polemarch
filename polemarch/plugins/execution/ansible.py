import os
import re
import contextlib
from uuid import uuid1
from functools import lru_cache
from typing import Type, Mapping, Optional
from django.conf import settings
from rest_framework import fields
from vstutils.api.serializers import BaseSerializer
from vstutils.api.fields import VSTCharField, SecretFileInString, AutoCompletionField
from ...main.constants import ANSIBLE_REFERENCE, HiddenArgumentsEnum, HiddenVariablesEnum, HistoryStatus
from ...main.models import Inventory
from ...api.fields import InventoryAutoCompletionField
from .base import BasePlugin
from ...plugins.inventory.ansible import BaseAnsiblePlugin as BaseAnsibleInventoryPlugin


class BaseAnsiblePlugin(BasePlugin):
    __slots__ = ('inventory', 'inventory_path')

    reference = {}
    base_command = settings.EXECUTOR
    raw_inventory_hidden_vars = HiddenVariablesEnum.get_values()
    hide_passwords_regex = re.compile(r'|'.join((
        r"(?<=" + hidden_var + r":\s).{1,}?(?=[\n\t\s])"
        for hidden_var in raw_inventory_hidden_vars
    )), re.MULTILINE)

    error_codes = {
        4: HistoryStatus.OFFLINE,
        -9: HistoryStatus.INTERRUPTED,
        -15: HistoryStatus.INTERRUPTED,
    }

    arg_shown_on_history_as_inventory = 'inventory'

    def __init__(self, options=None, output_handler=None):
        super().__init__(options, output_handler)
        self.inventory = None
        self.inventory_path = None

    @lru_cache()
    def get_serializer_class(self, exclude_fields=()) -> Type[BaseSerializer]:
        class AnsibleSerializer(super().get_serializer_class(exclude_fields=exclude_fields)):
            def to_representation(self, instance):
                representation = super().to_representation(instance)
                HiddenArgumentsEnum.hide_values(representation)
                return representation

        AnsibleSerializer.__name__ = f'{AnsibleSerializer.Meta.ref_name}Serializer'
        return AnsibleSerializer

    def get_env_vars(self, project_data) -> Mapping[str, str]:
        env_vars = super().get_env_vars(project_data)
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

    def _get_inventory_arg_value(self, inventory):
        self.inventory = inventory

        if isinstance(inventory, Inventory):
            self.inventory_path, self.secret_files = inventory.plugin_object.render_inventory(
                instance=inventory,
                execution_dir=self.execution_dir,
            )
            return str(self.inventory_path)

        if isinstance(inventory, str):
            inventory_file = None
            inventory_is_file = False
            with contextlib.suppress(OSError):
                inventory_file = self.execution_dir / inventory
                inventory_is_file = inventory_file.is_file()

            if inventory_is_file:
                return str(inventory_file)

        return inventory

    def get_raw_inventory(self):
        if isinstance(self.inventory, str):
            return BaseAnsibleInventoryPlugin.get_raw_inventory(self.inventory)
        if isinstance(self.inventory, Inventory):
            return self.inventory.plugin_object.get_raw_inventory(self.inventory_path.read_text())
        return super().get_raw_inventory()

    def _process_arg(self, key: str, value) -> Optional[str]:
        key = key.replace('_', '-')
        if key in self.reference:
            if key == 'inventory' and value:
                return f'--{key}={self._get_inventory_arg_value(value)}'
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

    def _get_serializer_fields(self, exclude_fields=()):
        serializer_fields = super()._get_serializer_fields(exclude_fields=exclude_fields)
        for field_name, field_def in self.reference.items():
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
                kwargs.update({'min_value': 0, 'max_value': 4})
            if field_name in HiddenArgumentsEnum.get_values():
                field = SecretFileInString
            if field_name == 'inventory':
                field = InventoryAutoCompletionField
                inventory_filters = self.options.get('COMPATIBLE_INVENTORY_PLUGINS', {}).get('inventory', ())
                inventory_filters = ','.join(inventory_filters) or None
                kwargs['filters'] = {'plugin': inventory_filters}
            if field_name == 'group':
                kwargs['default'] = 'all'

            if field is None:
                continue
            if 'default' not in kwargs:
                kwargs['default'] = fields.empty

            serializer_fields[field_name.replace('-', '_')] = field(**kwargs)

        return serializer_fields


class AnsiblePlaybook(BaseAnsiblePlugin):
    __slots__ = ()

    reference = ANSIBLE_REFERENCE.raw_dict['playbook']
    arg_shown_on_history_as_mode = 'playbook'
    serializer_fields = {
        'playbook': AutoCompletionField(
            autocomplete='AnsiblePlaybook',
            autocomplete_property='playbook',
            autocomplete_represent='playbook',
        )
    }

    @property
    def base_command(self):
        return super().base_command + ['ansible-playbook']

    def _process_arg(self, key, value):
        if key == 'playbook':
            return value
        return super()._process_arg(key, value)


class AnsibleModule(BaseAnsiblePlugin):
    __slots__ = ('group', 'module')

    reference = ANSIBLE_REFERENCE.raw_dict['module']
    serializer_fields = {
        'module': AutoCompletionField(
            autocomplete='AnsibleModule',
            autocomplete_property='path',
            autocomplete_represent='path',
        )
    }
    arg_shown_on_history_as_mode = 'module'

    @property
    def base_command(self):
        return super().base_command + ['ansible', self.group, '-m', self.module]

    def get_args(self, raw_args):
        self.group = raw_args.pop('group', 'all')
        self.module = self.get_module_value(raw_args.pop('module'))
        return super().get_args(raw_args)

    def get_module_value(self, value):
        return value.rsplit('.', maxsplit=1)[-1]
