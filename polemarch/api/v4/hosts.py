from rest_framework import fields as drffields
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django_filters import CharFilter, ChoiceFilter
from vstutils.utils import create_view
from vstutils.api.actions import Action
from vstutils.api import fields as vstfields
from vstutils.api.serializers import VSTSerializer, BaseSerializer
from vstutils.utils import translate as _, lazy_translate as __
from ...main.models import Host, Group, Inventory
from .base import (
    VariablesCopyViewMixin,
    CopySerializer,
    _VariableViewSet,
    _VariableSerializer,
)
from .users import OwnerViewMixin, UserSerializer
from ...main.constants import HostType
from ..permissions import InventoryItemsPermission
from ...main.constants import InventoryVariablesEnum
from ..filters import variables_filter, vars_help


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
        'from_project',
    ),
    'detail_fields': (
        'id',
        'name',
        'notes',
        'type',
        'owner',
    ),
    'override_list_fields': {
        'from_project': drffields.BooleanField(read_only=True, label=__('Project based')),
    },
    'override_detail_fields': {
        'type': drffields.ChoiceField(choices=HostType.to_choices(), required=False, default=HostType.HOST),
        'owner': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
    },
    'permission_classes': (InventoryItemsPermission,),
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
    'permission_classes': (InventoryItemsPermission,),
    'list_fields': (
        'id',
        'name',
        'children',
        'from_project',
    ),
    'detail_fields': (
        'id',
        'name',
        'notes',
        'children',
        'owner',
    ),
    'override_list_fields': {
        'from_project': drffields.BooleanField(label=__('Project based')),
    },
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
    """
    Manage inventory groups.

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


class ImportInventorySerializer(BaseSerializer):
    inventory_id = vstfields.RedirectIntegerField(read_only=True, operation_name='inventory')
    name = drffields.CharField(write_only=True)
    raw_data = vstfields.FileInStringField(write_only=True)


class InventoryViewMixin:
    @Action(
        detail=False,
        serializer_class=ImportInventorySerializer,
    )
    def import_inventory(self, request, *args, **kwargs):
        """
        Import inventory from file.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inventory = self._perform_import_inventory(serializer.validated_data)
        return {**serializer.validated_data, 'inventory_id': inventory.id}

    def _perform_import_inventory(self, data):
        return Inventory.import_inventory_from_string(**data)


inventory_viewset_data = {
    'model': Inventory,
    'view_class': (InventoryViewMixin, OwnerViewMixin, VariablesCopyViewMixin, None),
    'permission_classes': (InventoryItemsPermission,),
    'list_fields': ('id', 'name', 'from_project'),
    'detail_fields': ('id', 'name', 'notes', 'owner'),
    'override_list_fields': {
        'from_project': drffields.BooleanField(label=__('Project based')),
    },
    'override_detail_fields': {
        'owner': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
    },
    'extra_serializer_classes': {
        'serializer_class_copy': CopySerializer,
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
        'variables': CharFilter(method=variables_filter, help_text=vars_help)
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
