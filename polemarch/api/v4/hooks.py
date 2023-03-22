from rest_framework import fields as drffields
from django_filters import ChoiceFilter
from vstutils.utils import create_view, lazy_translate as __
from vstutils.api.permissions import StaffPermission
from ...main.models import Hook


hook_viewset_data = {
    'model': Hook,
    'list_fields': (
        'id',
        'name',
        'type',
        'when',
        'enable',
        'recipients',
    ),
    'detail_fields': (
        'id',
        'name',
        'type',
        'when',
        'enable',
        'recipients',
    ),
    'override_detail_fields': {
        'when': drffields.ChoiceField(
            choices=tuple(Hook.handlers.when_types_names.items()),
        ),
        'type': drffields.ChoiceField(
            choices=tuple((t, t) for t in Hook.handlers.keys())
        ),
        'recipients': drffields.CharField(help_text=__(
            '<b>HTTP</b>: list of URLs, separated by "|".<br><b>SCRIPT</b>: script files, separated by "|" '
            'Files must be in HOOKS_DIR directory.'
        ),),
    },
    'permission_classes': (StaffPermission,),
    'filterset_fields': {
        'id': None,
        'name': None,
        'when': ChoiceFilter(choices=tuple(Hook.handlers.when_types_names.items())),
        'type': ChoiceFilter(choices=tuple((t, t) for t in Hook.handlers.keys()), help_text=__('Instance type.')),
    },
}


class HookViewSet(create_view(**hook_viewset_data)):
    """
    Manage hooks.

    retrieve:
        Return a hook instance.

    list:
        Return all hooks.

    create:
        Create a new hook.

    destroy:
        Remove an existing hook.

    partial_update:
        Update one or more fields on an existing hook.

    update:
        Update a hook.
    """
