from rest_framework import fields as drffields
from django_filters import CharFilter
from vstutils.utils import create_view, lazy_translate as __
from vstutils.api.filters import name_filter
from ...main.models import AnsiblePlaybook, Module
from ..filters import playbook_filter, filter_name_endswith


ansible_playbook_viewset_data = {
    'model': AnsiblePlaybook,
    'view_class': 'read_only',
    'list_fields': (
        'id',
        'name',
        'playbook',
    ),
    'detail_fields': (
        'id',
        'name',
        'playbook',
    ),
    'filterset_fields': {
        'playbook': CharFilter(
            method=name_filter,
            help_text=__('Playbook filename.')
        ),
        'playbook__not': CharFilter(
            method=name_filter,
            help_text=__('Playbook filename.')
        ),
        'pb_filter': CharFilter(
            method=playbook_filter,
            help_text=__('Playbook filename - filter for prefetch.'),
        ),
    },
}


class AnsiblePlaybookViewSet(create_view(**ansible_playbook_viewset_data)):
    """
    Ansible playbooks for project.

    retrieve:
        Return a playbook of project instance.

    list:
        Return all playbooks of project.
    """


ansible_module_viewset_data = {
    'model': Module,
    'view_class': 'read_only',
    'list_fields': (
        'id',
        'path',
    ),
    'detail_fields': (
        'id',
        'path',
        'data',
    ),
    'override_detail_fields': {
        'data': drffields.JSONField(),
    },
    'filterset_fields': {
        'path': CharFilter(method=name_filter, help_text=__('Full path to module.')),
        'path__not': CharFilter(method=name_filter, help_text=__('Full path to module.')),
        'name': CharFilter(method=filter_name_endswith, help_text=__('Full path to module.')),
    },
}


class AnsibleModuleViewSet(create_view(**ansible_module_viewset_data)):
    """
    Ansible modules for project.

    retrieve:
        Return a module details of project instance.

    list:
        Return all available modules of project.
    """
