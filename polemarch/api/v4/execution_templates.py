from django.db import transaction
from rest_framework import fields as drffields
from django_filters import ChoiceFilter
from vstutils.utils import create_view, lazy_translate as __
from vstutils.api import fields as vstfields
from vstutils.api.serializers import BaseSerializer, EmptySerializer
from vstutils.api.actions import Action
from ...main.executions import PLUGIN_HANDLERS
from ...main.models import (
    ExecutionTemplate,
    ExecutionTemplateOption,
    TemplatePeriodicTask,
    History,
)
from ...main.constants import PeriodicTaskScheduleType, HistoryInitiatorType
from .base import ExecuteResponseSerializer
from .history import HistoryViewSet
from .base import PLUGIN_ARGUMENT_TYPES


class CreateExecutionTemplateSerializer(BaseSerializer):
    id = drffields.IntegerField(read_only=True)
    name = drffields.CharField()
    plugin = drffields.ChoiceField(choices=tuple((k, k) for k in PLUGIN_HANDLERS.keys()))
    arguments = vstfields.DependEnumField(field='plugin', types=PLUGIN_ARGUMENT_TYPES, write_only=True)

    @transaction.atomic()
    def create(self, validated_data):
        arguments = validated_data.pop('arguments', {})
        template = ExecutionTemplate.objects.create(**validated_data)
        ExecutionTemplateOption.objects.create(
            template=template,
            name='default',
            arguments=arguments,
        )
        return template


class ExecuteTemplateSerializer(BaseSerializer):
    option = vstfields.FkModelField(select=ExecutionTemplateOption)


template_periodic_task_viewset_data = {
    'model': TemplatePeriodicTask,
    'list_fields': (
        'id',
        'name',
        'schedule',
        'enabled',
        'save_result',
    ),
    'detail_fields': (
        'id',
        'name',
        'type',
        'schedule',
        'enabled',
        'save_result',
        'notes',
    ),
    'override_list_fields': {
        'schedule': vstfields.DependEnumField(field='type', types={
            PeriodicTaskScheduleType.INTERVAL.value: vstfields.UptimeField(),
            PeriodicTaskScheduleType.CRONTAB.value: vstfields.CrontabField(),
        }),
    },
    'override_detail_fields': {
        'schedule': vstfields.DependEnumField(field='type', types={
            PeriodicTaskScheduleType.INTERVAL.value: vstfields.UptimeField(),
            PeriodicTaskScheduleType.CRONTAB.value: vstfields.CrontabField(),
        }),
        'type': drffields.ChoiceField(choices=PeriodicTaskScheduleType.to_choices()),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
    },
}


class TemplatePeriodicTaskViewSet(create_view(**template_periodic_task_viewset_data)):
    """
    Manage periodic tasks of execution template's option.

    retrieve:
        Return a periodic task instance.

    list:
        Return all periodic tasks in option.

    create:
        Create a new periodic task.

    destroy:
        Remove an existing periodic task.

    partial_update:
        Update one or more fields on an existing periodic task.

    update:
        Update a periodic task.
    """


class ExecuteTemplateResponseSerializer(ExecuteResponseSerializer):
    history_id = vstfields.RedirectIntegerField(
        default=None,
        allow_null=True,
        operation_name='project_execution_templates_history',
        read_only=True,
    )


class ExecuteViewMixin:
    @Action(result_serializer_class=ExecuteTemplateResponseSerializer)
    def execute(self, request, *args, **kwargs):
        """
        Execute template with option.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.get_object()
        history = instance.execute(
            request.user,
            **self._get_execution_data(serializer),
        )
        return {
            'history_id': getattr(history, 'id', None),
            'executor': request.user.id,
            'detail': __('{} plugin was executed.').format(instance.plugin)  # pylint: disable=no-member
        }


execution_template_option_viewset_data = {
    'model': ExecutionTemplateOption,
    'view_class': (ExecuteViewMixin, None),
    'list_fields': (
        'id',
        'name',
    ),
    'detail_fields': (
        'id',
        'name',
        'notes',
        'arguments',
    ),
    'override_detail_fields': {
        'id': drffields.UUIDField(read_only=True),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
        'arguments': vstfields.DependEnumField(
            field='plugin',
            source_view='/project/{id}/execution_templates/{execution_templates_id}/',
            types=PLUGIN_ARGUMENT_TYPES,
        )
    },
    'extra_serializer_classes': {
        'serializer_class_execute': EmptySerializer,
    },
    'nested': {
        'periodic_tasks': {
            'view': TemplatePeriodicTaskViewSet,
            'arg': 'id',
        },
    },
}


class ExecutionTemplateOptionViewSet(create_view(**execution_template_option_viewset_data)):
    """
    Manage options of execution template.

    retrieve:
        Return an option instance.

    list:
        Return all options in execution template.

    create:
        Create a new option.

    destroy:
        Remove an existing option.

    partial_update:
        Update one or more fields on an existing option.

    update:
        Update an option.
    """

    def _get_execution_data(self, serializer):
        return {'arguments': self.get_object().arguments}  # noee


class ExecutionTemplateViewMixin:
    def get_manager_history(self, parent_object):
        return History.objects.filter(
            initiator_type=HistoryInitiatorType.TEMPLATE,
            initiator=parent_object.id,
        )


execution_template_viewset_data = {
    'model': ExecutionTemplate,
    'view_class': (ExecutionTemplateViewMixin, ExecuteViewMixin, None),
    'list_fields': (
        'id',
        'name',
        'plugin',
    ),
    'detail_fields': (
        'id',
        'name',
        'notes',
        'plugin',
    ),
    'override_detail_fields': {
        'plugin': drffields.CharField(read_only=True),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
    },
    'extra_serializer_classes': {
        'serializer_class_create': CreateExecutionTemplateSerializer,
        'serializer_class_execute': ExecuteTemplateSerializer,
    },
    'filterset_fields': {
        'id': None,
        'name': None,
        'plugin': ChoiceFilter(choices=tuple((t, t) for t in PLUGIN_ARGUMENT_TYPES.keys())),
    },
    'nested': {
        'options': {
            'view': ExecutionTemplateOptionViewSet,
            'arg': 'id',
            'arg_regexp': '[a-zA-Z0-9-_]',
        },
        'history': {
            'view': HistoryViewSet,
            'arg': 'id',
        },
    },
}


class ExecutionTemplateViewSet(create_view(**execution_template_viewset_data)):
    """
    Manage execution templates of project.

    retrieve:
        Return an execution template instance.

    list:
        Return all execution templates in project.

    create:
        Create a new execution template.

    destroy:
        Remove an existing execution template.

    partial_update:
        Update one or more fields on an existing execution template.

    update:
        Update an execution template.
    """

    def _get_execution_data(self, serializer):
        return {'option': serializer.validated_data['option']}  # noee
