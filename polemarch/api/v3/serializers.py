from rest_framework import fields, serializers
from vstutils.api.fields import DependEnumField, AutoCompletionField
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
    playbook = AutoCompletionField(
        autocomplete='Playbook',
        autocomplete_property='playbook',
        autocomplete_represent='playbook',
    )
    vars = TaskTemplateVariablesSerializer(required=False)


class ModuleTemplateParameters(BaseSerializer):
    group = fields.CharField()
    module = AutoCompletionField(
        autocomplete='Module',
        autocomplete_property='name',
        autocomplete_represent='path'
    )
    args = fields.CharField(label=__('Arguments'))
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
    data = DependEnumField(field='kind', types={
        ExecutionTypes.Task.value: TaskTemplateParameters(),
        ExecutionTypes.Module.value: ModuleTemplateParameters(),
    })

    class Meta(ExecutionTemplateSerializer.Meta):
        fields = ExecutionTemplateSerializer.Meta.fields + ['notes', 'inventory', 'data']

    def create(self, validated_data):
        data = validated_data['data']
        inventory = validated_data.get('inventory', None)

        if inventory and not data.get('inventory'):
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
    vars = DependEnumField(field='kind', types={
        ExecutionTypes.Task.value: AnsiblePlaybookSerializer(),
        ExecutionTypes.Module.value: AnsibleModuleSerializer(),
    })
