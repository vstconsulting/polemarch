from django.db import transaction
from rest_framework import fields, serializers
from vstutils.api import fields as vst_fields
from vstutils.api.serializers import BaseSerializer
from vstutils.utils import lazy_translate as __

from ...main import models
from ..v2.serializers import (
    _WithVariablesSerializer,
    InventoryAutoCompletionField,
    ModuleSerializer,
    ExecuteResponseSerializer,
    OneProjectSerializer as V2OneProjectSerializer,
)
from ...main.executions import PLUGIN_HANDLERS


class TaskTemplateParameters(BaseSerializer):
    playbook = vst_fields.AutoCompletionField(
        autocomplete='Playbook',
        autocomplete_property='playbook',
        autocomplete_represent='playbook',
    )
    vars = PLUGIN_HANDLERS.backend('PLAYBOOK').get_serializer_class(
        exclude_fields=('inventory', 'playbook')
    )(required=False)


class ModuleTemplateParameters(BaseSerializer):
    group = fields.CharField(default='all')
    module = vst_fields.AutoCompletionField(
        autocomplete='Module',
        autocomplete_property='name',
        autocomplete_represent='path'
    )
    args = fields.CharField(label=__('Arguments'), required=False, default='', allow_blank=True)
    vars = PLUGIN_HANDLERS.backend('MODULE').get_serializer_class(
        exclude_fields=('args', 'group', 'inventory', 'module')
    )(required=False)


template_kinds = (
    ('Task', 'Task'),
    ('Module', 'Module'),
) + tuple(
    (plugin, plugin) for plugin in PLUGIN_HANDLERS.keys()
    if plugin not in {'PLAYBOOK', 'MODULE'}
)

template_data_types = {
    'Task': TaskTemplateParameters(),
    'Module': ModuleTemplateParameters(),
}
template_data_types.update({
    plugin: backend.get_serializer_class(exclude_fields=('inventory',))(required=False)
    for plugin, backend in PLUGIN_HANDLERS.items()
    if plugin not in ('PLAYBOOK, MODULE')
})


class ExecutionTemplateSerializer(_WithVariablesSerializer):
    kind = fields.ChoiceField(
        choices=template_kinds,
        required=False,
        default=template_kinds[0][0],
        label=__('Type'),
    )

    class Meta:
        model = models.Template
        fields = ['id', 'name', 'kind']


template_inventory_types = {
    'Task': InventoryAutoCompletionField(allow_blank=True, required=False),
    'Module': InventoryAutoCompletionField(allow_blank=True, required=False),
}
template_inventory_types.update({
    plugin: InventoryAutoCompletionField(allow_blank=True, required=False) if backend.supports_inventory else 'hidden'
    for plugin, backend in PLUGIN_HANDLERS.items()
    if plugin not in ('PLAYBOOK', 'MODULE')
})


class CreateExecutionTemplateSerializer(ExecutionTemplateSerializer):
    data = vst_fields.DependEnumField(field='kind', types=template_data_types)
    inventory = vst_fields.DependEnumField(field='kind', types=template_inventory_types, required=False)

    class Meta(ExecutionTemplateSerializer.Meta):
        fields = ExecutionTemplateSerializer.Meta.fields + ['notes', 'inventory', 'data']

    def validate_inventory(self, value):
        if isinstance(value, models.Inventory):
            return value.id
        return value

    def create(self, validated_data):
        data = validated_data['data']

        if not data.get('vars'):
            data['vars'] = {}
        return super().create(validated_data)


class OneExecutionTemplateSerializer(CreateExecutionTemplateSerializer):
    kind = fields.ChoiceField(
        choices=template_kinds,
        label=__('Type'),
        read_only=True,
    )


class OneModuleSerializer(ModuleSerializer):
    data = fields.JSONField(read_only=True)

    class Meta:
        model = models.Module
        fields = (
            'id',
            'path',
            'name',
            'data',
        )


class PeriodictaskSerializer(_WithVariablesSerializer):
    kind = serializers.ChoiceField(
        choices=[(k, k) for k in models.PeriodicTask.kinds],
        required=False,
        default=models.PeriodicTask.kinds[0],
        label='Task type'
    )
    type = serializers.ChoiceField(
        choices=[(k, k) for k in models.PeriodicTask.types],
        required=False,
        default=models.PeriodicTask.types[0],
        label='Interval type'
    )
    template = vst_fields.DependEnumField(
        allow_blank=True,
        required=False,
        allow_null=True,
        field='kind',
        types={
            'PLAYBOOK': 'hidden',
            'MODULE': 'hidden',
            'TEMPLATE': vst_fields.FkModelField(select=ExecutionTemplateSerializer),
        }
    )
    template_opt = vst_fields.DependEnumField(
        allow_blank=True,
        required=False,
        allow_null=True,
        field='template'
    )
    schedule = vst_fields.DependEnumField(
        allow_blank=True,
        field='type',
        types={
            'CRONTAB': {'type': 'string', 'format': 'crontab', 'default': '* * * * *', 'required': True},
            'INTERVAL': vst_fields.UptimeField(default=0),
        }
    )
    mode = vst_fields.DependEnumField(
        allow_blank=True,
        required=False,
        field='kind',
        types={
            'PLAYBOOK': vst_fields.AutoCompletionField(
                autocomplete='Playbook',
                autocomplete_property='playbook',
                autocomplete_represent='playbook',
            ),
            'MODULE': vst_fields.AutoCompletionField(
                autocomplete='Module',
                autocomplete_property='name',
                autocomplete_represent='path',
            ),
            'TEMPLATE': 'hidden',
        }
    )
    inventory = InventoryAutoCompletionField(allow_blank=True, required=False)

    class Meta:
        model = models.PeriodicTask
        fields = (
            'id',
            'name',
            'kind',
            'mode',
            'inventory',
            'save_result',
            'template',
            'template_opt',
            'enabled',
            'type',
            'schedule',
        )

    @transaction.atomic
    def _do_with_vars(self, *args, **kwargs):
        kw = kwargs['validated_data']
        if kw.get('kind', None) == 'TEMPLATE':
            kw['inventory'] = ''
            kw['mode'] = ''
            kwargs['validated_data'] = kw
        return super()._do_with_vars(*args, **kwargs)


class OnePeriodictaskSerializer(PeriodictaskSerializer):
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.PeriodicTask
        fields = (
            'id',
            'name',
            'kind',
            'mode',
            'inventory',
            'save_result',
            'template',
            'template_opt',
            'enabled',
            'type',
            'schedule',
            'notes',
        )

    def execute(self):
        rdata = ExecuteResponseSerializer(data=dict(
            detail=f"Started at inventory {self.instance.inventory}.",
            history_id=self.instance.execute(sync=False)
        ))
        rdata.is_valid(raise_exception=True)
        return rdata.data


class OneProjectSerializer(V2OneProjectSerializer):
    branch = vst_fields.VSTCharField(read_only=True, source='project_branch', allow_blank=True)
