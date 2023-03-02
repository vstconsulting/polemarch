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
from ...main.constants import HistoryStatus
from .users import UserSerializer
from ..fields import InventoryAutoCompletionField
from .base import ResponseSerializer


class FactsResponseSerializer(BaseSerializer):
    facts = drffields.JSONField(read_only=True)


class RawHistoryQuerySerializer(BaseSerializer):
    colored = drffields.BooleanField()


class HistoryViewMixin(HistoryModelViewSet):
    @EmptyAction(
        methods=['patch'],
        result_serializer_class=ResponseSerializer,
    )
    def cancel(self, request, *args, **kwargs):
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
    def raw(self, request, *args, **kwargs):
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
    def facts(self, request, *args, **kwargs):
        """
        Get facts from "setup" ansible module execution.
        """
        return {'facts': self.get_object().facts}

    @SimpleAction(methods=['delete'])
    def clear(self, request, *args, **kwargs):
        """
        Clear execution output.
        """
        return {'detail': 'Output truncated.\n'}

    @clear.deleter
    def clear(self, instance, request, *args, **kwargs):
        msg = instance['detail']
        obj = self.get_object()
        if obj.status in HistoryStatus.get_working_statuses() or \
                obj.raw_stdout == msg:
            raise NotAcceptable('Job is running or already truncated.')
        obj.raw_stdout = msg

    def get_raw(self, colored=False):
        return self.get_object().get_raw(colored)


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
        'executor': vstfields.DependEnumField(field='initiator_type', types={
            'project': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
            'template': vstfields.FkModelField(
                select=UserSerializer,
                read_only=True,
                autocomplete_represent='username'
            ),
            'scheduler': {
                'type': 'string',
                'format': 'static_value',
                'x-options': {'staticValue': 'system', 'realField': 'string'}
            }
        })
    },
    'override_detail_fields': {
        'raw_stdout': drffields.SerializerMethodField(read_only=True),
        'execution_time': vstfields.UptimeField(),
        'status': drffields.ChoiceField(choices=HistoryStatus.to_choices()),
        'executor': vstfields.DependEnumField(field='initiator_type', types={
            'project': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
            'template': vstfields.FkModelField(
                select=UserSerializer,
                read_only=True,
                autocomplete_represent='username'
            ),
            'scheduler': {
                'type': 'string',
                'format': 'static_value',
                'x-options': {'staticValue': 'system', 'realField': 'string'}
            }
        })
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
            'manager_name': 'raw_history_line',
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
