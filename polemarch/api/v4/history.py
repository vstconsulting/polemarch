from django.http.response import HttpResponse
from rest_framework import fields as drffields
from rest_framework.exceptions import NotAcceptable
from django_filters import CharFilter, IsoDateTimeFilter, NumberFilter, ChoiceFilter
from vstutils.utils import create_view, lazy_translate as __
from vstutils.api import fields as vstfields
from vstutils.api.serializers import BaseSerializer, VSTSerializer
from vstutils.api.base import HistoryModelViewSet
from vstutils.api.actions import SimpleAction, EmptyAction
from vstutils.api.decorators import subaction
from ...main.models import History, HistoryLines
from ...main.models.utils import HistoryPluginHandler
from ...main.constants import HistoryStatus
from ...main.exceptions import DataNotReady
from .users import UserSerializer
from ..fields import InventoryAutoCompletionField
from .base import ResponseSerializer, PLUGIN_ARGUMENT_TYPES


class FactsResponseSerializer(BaseSerializer):
    facts = drffields.JSONField(read_only=True)


class RawHistoryQuerySerializer(BaseSerializer):
    colored = drffields.BooleanField()


class HistoryViewMixin(HistoryModelViewSet):
    plugin_handler = HistoryPluginHandler()

    def get_manager_lines(self, history):
        return self.plugin_handler.get_reader(history).get_lines()

    @EmptyAction(
        methods=['patch'],
        result_serializer_class=ResponseSerializer,
    )
    def cancel(self, *_, **__):
        """
        Cancel working task.
        """
        instance = self.get_object()
        if instance.status in HistoryStatus.get_stopped_statuses():
            raise Exception('Task is already stopped.')
        instance.cancel()
        return {'detail': f'Task {instance.id} canceled.'}

    @subaction(
        detail=True,
        methods=['get'],
        query_serializer=RawHistoryQuerySerializer,
        schema=None,
    )
    def raw(self, request, *_, **__):
        """
        Get raw output of execution.
        """
        query_data = self.get_query_serialized_data(request, RawHistoryQuerySerializer)
        return HttpResponse(
            self.get_raw(query_data['colored']),
            content_type="text/plain",
            status=200,
        )

    @SimpleAction(serializer_class=FactsResponseSerializer)
    def facts(self, *_, **__):
        """
        Get facts from "setup" ansible module execution.
        """
        history = self.get_object()
        if history.status not in HistoryStatus.get_stopped_statuses():
            raise DataNotReady("Execution still in process.")
        if history.kind != 'ANSIBLE_MODULE' or history.mode != 'system.setup' or history.status != 'OK':
            raise history.NoFactsAvailableException()
        return {'facts': self.plugin_handler.get_reader(history).get_facts()}

    @SimpleAction(methods=['delete'])
    def clear(self, request, *args, **kwargs):
        """
        Clear execution output.
        """
        return {'detail': 'Output truncated.\n'}

    @clear.deleter
    def clear(self, instance, *_, **__):
        msg = instance['detail']
        obj = self.get_object()
        reader_plugin = self.plugin_handler.get_reader(obj)
        if obj.status in HistoryStatus.get_working_statuses() or reader_plugin.get_lines().last().line == msg:
            raise NotAcceptable('Job is running or already truncated.')
        reader_plugin.clear(msg)

    def get_raw(self, colored=False):
        return self.plugin_handler.get_reader(self.get_object()).get_raw(colored)


class OneHistorySerializer(VSTSerializer):
    def get_raw_stdout(self, obj):
        return self.context['request'].build_absolute_uri('raw/')

    class Meta:
        __inject_from__ = 'detail'


history_line_viewset_data = {
    'model': HistoryLines,
    'view_class': 'list_only',
    'list_fields': (
        'line_number',
        'line_gnumber',
        'line',
    ),
    'filterset_fields': {
        'id': None,
        'after': NumberFilter(field_name="line_gnumber", lookup_expr=('gt')),
        'before': NumberFilter(field_name="line_gnumber", lookup_expr=('lt')),
    },
}


_HistoryLineViewSet = create_view(**history_line_viewset_data)


history_executor_field_types = {
    'project': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
    'template': vstfields.FkModelField(
        select=UserSerializer,
        read_only=True,
        autocomplete_represent='username',
    ),
    'scheduler': {
        'type': 'string',
        'format': 'static_value',
        'x-options': {'staticValue': 'system', 'realField': 'string'},
    },
}


history_viewset_data = {
    'model': History,
    'view_class': (HistoryViewMixin,),
    'list_fields': (
        'id',
        'start_time',
        'executor',
        'initiator',
        'initiator_type',
        'project',
        'inventory',
        'kind',
        'mode',
        'options',
        'status',
        'stop_time',
    ),
    'detail_fields': (
        'id',
        'status',
        'executor',
        'project',
        'revision',
        'inventory',
        'kind',
        'mode',
        'execute_args',
        'execution_time',
        'start_time',
        'stop_time',
        'initiator',
        'initiator_type',
        'options',
        'raw_args',
        'raw_stdout',
        'raw_inventory',
    ),
    'extra_serializer_classes': {
        'serializer_class_one': OneHistorySerializer,
    },
    'override_list_fields': {
        'inventory': InventoryAutoCompletionField(read_only=True),
        'status': drffields.ChoiceField(choices=HistoryStatus.to_choices()),
        'executor': vstfields.DependEnumField(field='initiator_type', types=history_executor_field_types)
    },
    'override_detail_fields': {
        'raw_stdout': drffields.SerializerMethodField(read_only=True),
        'execution_time': vstfields.UptimeField(),
        'status': drffields.ChoiceField(choices=HistoryStatus.to_choices()),
        'executor': vstfields.DependEnumField(field='initiator_type', types=history_executor_field_types),
        'execute_args': vstfields.DependEnumField(field='kind', types=PLUGIN_ARGUMENT_TYPES),
    },
    'filterset_fields': {
        'id': None,
        'status': ChoiceFilter(choices=HistoryStatus.to_choices(), help_text=__('Status of execution.')),
        'mode': CharFilter(help_text=__('Module or playbook name.')),
        'kind': CharFilter(help_text=__('Kind of execution.')),
        'older': IsoDateTimeFilter(
            field_name='start_time',
            lookup_expr='lt',
            help_text=__('Older then this time')
        ),
        'newer': IsoDateTimeFilter(
            field_name='start_time',
            lookup_expr='gt',
            help_text=__('Newer then this time')
        ),
    },
    'nested': {
        'lines': {
            'view': _HistoryLineViewSet,
            'schema': None,
        }
    },
}


class HistoryViewSet(create_view(**history_viewset_data)):
    """
    View previous executions.

    retrieve:
        Return an execution history instance.

    list:
        Return all history instances of executions.

    destroy:
        Remove an existing history record.
    """
