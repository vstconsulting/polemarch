from django.db import transaction
from rest_framework import fields, serializers
from vstutils.api import fields as vst_fields
from vstutils.api.serializers import BaseSerializer
from vstutils.utils import lazy_translate as __

from ...main import models
from ...main.models import ExecutionTypes
from ...main.utils import AnsibleArgumentsReference
from ..v2.serializers import (
    _WithVariablesSerializer,
    AnsiblePlaybookSerializer,
    AnsibleModuleSerializer,
    generate_fileds,
    ModuleSerializer,
    InventoryDependEnumField,
    ExecuteResponseSerializer,
)


class TemplateVariablesMetaSerializer(serializers.SerializerMetaclass):
    ansible_reference = AnsibleArgumentsReference()

    @staticmethod
    def __new__(mcs, name, bases, attrs):
        template_type = attrs.get('type')
        if template_type:
            attrs.update(generate_fileds(mcs.ansible_reference, template_type, no_default=True))
        return super().__new__(mcs, name, bases, attrs)


class TemplateVariablesSerializer(BaseSerializer, metaclass=TemplateVariablesMetaSerializer):
    pass


class TaskTemplateVariablesSerializer(TemplateVariablesSerializer):
    type = 'playbook'


class ModuleTemplateVariablesSerializer(TemplateVariablesSerializer):
    type = 'module'


class TaskTemplateParameters(BaseSerializer):
    playbook = vst_fields.AutoCompletionField(
        autocomplete='Playbook',
        autocomplete_property='playbook',
        autocomplete_represent='playbook',
    )
    vars = TaskTemplateVariablesSerializer(required=False)


class ModuleTemplateParameters(BaseSerializer):
    group = fields.CharField(default='all')
    module = vst_fields.AutoCompletionField(
        autocomplete='Module',
        autocomplete_property='name',
        autocomplete_represent='path'
    )
    args = fields.CharField(label=__('Arguments'), required=False, default='', allow_blank=True)
    vars = ModuleTemplateVariablesSerializer(required=False)


class ExecutionTemplateSerializer(_WithVariablesSerializer):
    kind = fields.ChoiceField(
        choices=ExecutionTypes.to_choices(),
        required=False,
        default=ExecutionTypes.Task.value,
        label=__('Type'),
    )

    class Meta:
        model = models.Template
        fields = ['id', 'name', 'kind']


class CreateExecutionTemplateSerializer(ExecutionTemplateSerializer):
    data = vst_fields.DependEnumField(field='kind', types={
        ExecutionTypes.Task.value: TaskTemplateParameters(),
        ExecutionTypes.Module.value: ModuleTemplateParameters(),
    })

    class Meta(ExecutionTemplateSerializer.Meta):
        fields = ExecutionTemplateSerializer.Meta.fields + ['notes', 'inventory', 'data']

    def create(self, validated_data):
        data = validated_data['data']
        inventory = validated_data.get('inventory', None)

        if inventory and not data.get('inventory'):  # nocv
            data['inventory'] = inventory

        if not data.get('vars'):
            data['vars'] = {}
        return super().create(validated_data)


class OneExecutionTemplateSerializer(CreateExecutionTemplateSerializer):
    kind = fields.ChoiceField(
        choices=ExecutionTypes.to_choices(),
        label=__('Type'),
        read_only=True
    )


class ExecutionTemplateVariablesSerializer(BaseSerializer):
    kind = fields.CharField(read_only=True)
    vars = vst_fields.DependEnumField(field='kind', types={
        ExecutionTypes.Task.value: AnsiblePlaybookSerializer(),
        ExecutionTypes.Module.value: AnsibleModuleSerializer(),
    })


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
            'CRONTAB': 'crontab',
            'INTERVAL': 'integer',
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
    inventory = InventoryDependEnumField(allow_blank=True, required=False, field='kind')

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
        rdata.is_valid(True)
        return rdata.data
