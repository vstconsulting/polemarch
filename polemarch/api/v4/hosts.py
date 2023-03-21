from django.db import transaction
from rest_framework import fields as drffields
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django_filters import CharFilter, ChoiceFilter
from vstutils.utils import create_view
from vstutils.api.filters import extra_filter
from vstutils.api.actions import Action, SimpleAction
from vstutils.api import fields as vstfields
from vstutils.api.serializers import VSTSerializer, BaseSerializer
from vstutils.utils import translate as _, lazy_translate as __
from ...main.models import Host, Group, Inventory, InventoryState
from .base import (
    VariablesCopyViewMixin,
    CopySerializer,
    _VariableViewSet,
    _VariableSerializer,
)
from .users import OwnerViewMixin, UserSerializer
from ...main.constants import HostType
from ..permissions import InventoryPluginPermission
from ...main.constants import InventoryVariablesEnum
from ..filters import variables_filter, vars_help
from ..fields import DynamicPluginField


class NestedGroupError(ValidationError):
    status_code = status.HTTP_409_CONFLICT


def nested_group_allow_check(view):
    if not view.nested_parent_object.children and view.nested_name.startswith('groups'):
        raise NestedGroupError(_('Group cannot have child groups.'))
    if view.nested_parent_object.children and view.nested_name.startswith('hosts'):
        raise NestedGroupError(_('Group cannot have child hosts.'))


class InventoryVariableSerializer(_VariableSerializer):
    key = vstfields.AutoCompletionField(autocomplete=InventoryVariablesEnum.get_values())
    value = vstfields.DependEnumField(
        field='key',
        allow_blank=True,
        types=InventoryVariablesEnum.get_field_types(),
    )


class InventoryVariableViewSet(_VariableViewSet):
    """
    Inventory hosts variables.

    retrieve:
        Return a variable of inventory host.

    list:
        Return all variables of inventory host.

    create:
        Create a new variable of inventory host.

    destroy:
        Remove an existing variable.

    partial_update:
        Update one or more fields on an existing variable.

    update:
        Update variable value.
    """

    serializer_class = InventoryVariableSerializer


host_viewset_data = {
    'model': Host,
    'view_class': (OwnerViewMixin, VariablesCopyViewMixin, None),
    'list_fields': (
        'name',
        'type',
    ),
    'detail_fields': (
        'id',
        'name',
        'notes',
        'type',
        'owner',
    ),
    'override_detail_fields': {
        'type': drffields.ChoiceField(choices=HostType.to_choices(), required=False, default=HostType.HOST),
        'owner': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
    },
    'extra_serializer_classes': {
        'serializer_class_copy': CopySerializer,
    },
    'nested': {
        'variables': {
            'view': InventoryVariableViewSet,
            'arg': 'id',
        },
    },
    'filterset_fields': {
        'id': None,
        'name': None,
        'type': ChoiceFilter(choices=HostType.to_choices(), help_text=__('Instance type.')),
        'variables': CharFilter(method=variables_filter, help_text=vars_help)
    },
}


class HostViewSet(create_view(**host_viewset_data)):
    """
    Manage inventory hosts.

    retrieve:
        Return a host instance.

    list:
        Return all hosts.

    create:
        Create a new host.

    destroy:
        Remove an existing host.

    partial_update:
        Update one or more fields on an existing host.

    update:
        Update a host.
    """


class CreateGroupSerializer(VSTSerializer):
    children = drffields.BooleanField(
        write_only=True,
        label=__('Contains groups'),
        default=False,
    )

    class Meta:
        __inject_from__ = 'detail'


ansible_group_viewset_data = {
    'model': Group,
    'view_class': (OwnerViewMixin, VariablesCopyViewMixin, None),
    'list_fields': (
        'id',
        'name',
        'children',
    ),
    'detail_fields': (
        'id',
        'name',
        'notes',
        'children',
        'owner',
    ),
    'override_detail_fields': {
        'owner': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
        'children': drffields.BooleanField(read_only=True, label=__('Contains groups')),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
    },
    'filterset_fields': {
        'id': None,
        'name': None,
        'variables': CharFilter(method=variables_filter, help_text=vars_help)
    },
    'extra_serializer_classes': {
        'serializer_class_create': CreateGroupSerializer,
        'serializer_class_copy': CopySerializer,
    },
    'extra_view_attributes': {
        'nested_allow_check': nested_group_allow_check,
        'copy_related': ['hosts', 'groups'],
    },
    'nested': {
        'variables': {
            'view': InventoryVariableViewSet,
            'arg': 'id',
        },
        'hosts': {
            'allow_append': True,
            'view': HostViewSet,
            'arg': 'id',
        },
    },
}


class AnsibleGroupViewSet(create_view(**ansible_group_viewset_data)):
    pass


inventory_plugin_choices = tuple((p, p) for p in Inventory.plugin_handlers.keys())
inventory_import_data_types = {
    plugin: Inventory.plugin_handlers.get_serializer_import_class(plugin)()
    for plugin, backend in Inventory.plugin_handlers.items()
    if backend.supports_import
}
inventory_import_plugin_choices = tuple((k, k) for k in inventory_import_data_types)


class ImportInventorySerializer(BaseSerializer):
    inventory_id = vstfields.RedirectIntegerField(read_only=True, operation_name='inventory')
    name = drffields.CharField(write_only=True)
    plugin = drffields.ChoiceField(choices=inventory_import_plugin_choices)
    data = vstfields.DependEnumField(field='plugin', types=inventory_import_data_types, write_only=True)


def get_inventory_state_data_field(source_view):
    return DynamicPluginField(
        field='plugin',
        source_view=source_view,
        types={
            plugin: Inventory.plugin_handlers.get_serializer_class(plugin)()
            for plugin in Inventory.plugin_handlers.keys()
        }
    )


class InventoryStateSerializer(BaseSerializer):
    data = get_inventory_state_data_field(source_view='<<parent>>')


class InventoryStateUpdateSerializer(BaseSerializer):
    data = get_inventory_state_data_field(source_view='<<parent>>.<<parent>>')


class InventoryViewMixin:
    def copy_instance(self, instance):
        # pylint: disable=protected-access
        if instance.state_managed:
            state = instance.inventory_state
            instance._inventory_state_id = None
            with transaction.atomic():
                new_instance = super().copy_instance(instance)
                new_instance._inventory_state = InventoryState.objects.create(data=state.data)
                new_instance.save(update_fields=('_inventory_state',))
            return new_instance

        return super().copy_instance(instance)

    @Action(detail=False, serializer_class=ImportInventorySerializer)
    @transaction.atomic()
    def import_inventory(self, request, *args, **kwargs):
        """
        Import inventory from file.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        instance = Inventory.objects.create(
            name=data['name'],
            plugin=data['plugin'],
        )
        if instance.state_managed:
            # pylint: disable=protected-access
            instance._inventory_state = InventoryState.objects.create(
                data=Inventory.plugin_handlers.backend(data['plugin']).defaults
            )
            instance.save(update_fields=('_inventory_state',))
        inventory = self._perform_import_inventory(
            instance=instance,
            data=data['data'],
        )
        return {**data, 'inventory_id': inventory.id}

    def _perform_import_inventory(self, instance: Inventory, data):
        return Inventory.import_inventory(instance, data)

    @SimpleAction(
        serializer_class=InventoryStateUpdateSerializer,
        result_serializer_class=InventoryStateSerializer,
        methods=['get', 'put'],
    )
    def state(self, request, *args, **kwargs):
        return self.get_object().inventory_state

    @state.setter
    def state(self, instance, request, serializer, *args, **kwargs):
        inventory = self.get_object()
        defaults = inventory.plugin_object.defaults
        data = serializer.validated_data.get('data', {})
        self.get_object().update_inventory_state(data={**defaults, **data})


class CreateInventorySerializer(VSTSerializer):
    plugin = drffields.ChoiceField(choices=inventory_plugin_choices)

    @transaction.atomic()
    def create(self, validated_data):
        instance: Inventory = super().create(validated_data)
        if instance.state_managed:
            # pylint: disable=protected-access
            instance._inventory_state = InventoryState.objects.create(data=instance.plugin_object.defaults)
            instance.save(update_fields=('_inventory_state',))
        return instance

    class Meta:
        __inject_from__ = 'detail'


inventory_viewset_data = {
    'model': Inventory,
    'view_class': (InventoryViewMixin, OwnerViewMixin, VariablesCopyViewMixin, None),
    'permission_classes': (InventoryPluginPermission,),
    'list_fields': (
        'id',
        'name',
        'plugin',
        'state_managed',
    ),
    'detail_fields': (
        'id',
        'name',
        'plugin',
        'owner',
        'notes',
        'state_managed',
    ),
    'override_list_fields': {
        'plugin': drffields.ChoiceField(choices=inventory_plugin_choices, read_only=True),
        'state_managed': drffields.BooleanField(read_only=True),
    },
    'override_detail_fields': {
        'owner': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
        'plugin': drffields.ChoiceField(choices=inventory_plugin_choices, read_only=True),
        'state_managed': drffields.BooleanField(read_only=True),
    },
    'extra_serializer_classes': {
        'serializer_class_copy': CopySerializer,
        'serializer_class_create': CreateInventorySerializer,
    },
    'extra_view_attributes': {
        'copy_related': ['hosts', 'groups'],
    },
    'nested': {
        'variables': {
            'view': InventoryVariableViewSet,
            'arg': 'id',
        },
        'hosts': {
            'view': HostViewSet,
            'allow_append': True,
            'arg': 'id',
        },
        'group': {
            'view': AnsibleGroupViewSet,
            'allow_append': True,
            'manager_name': 'groups',
            'arg': 'id',
        },
        'all_hosts': {
            'view': HostViewSet,
            'methods': ['get'],
            'subs': None,
            'arg': 'id',
        },
        'all_groups': {
            'view': AnsibleGroupViewSet,
            'methods': ['get'],
            'subs': None,
            'arg': 'id',
        },
    },
    'filterset_fields': {
        'id': None,
        'name': None,
        'variables': CharFilter(method=variables_filter, help_text=__(vars_help)),
        'plugin': CharFilter(method=extra_filter),
    },
}


class InventoryViewSet(create_view(**inventory_viewset_data)):
    """
    Manage inventories.

    retrieve:
        Return a inventory instance.

    list:
        Return all inventories.

    create:
        Create a new inventory.

    destroy:
        Remove an existing inventory.

    partial_update:
        Update one or more fields on an existing inventory.

    update:
        Update a inventory.
    """
