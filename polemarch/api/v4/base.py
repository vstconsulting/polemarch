from django.contrib.auth import get_user_model
from rest_framework import fields as drffields
from vstutils.api import fields as vstfields
from vstutils.api.serializers import BaseSerializer, VSTSerializer
from vstutils.api.base import CopyMixin, ModelViewSet
from ...main.models import Variable
from ...main.constants import HiddenVariablesEnum, CYPHER
from ..filters import VariableFilter
from ...main.executions import PLUGIN_HANDLERS


User = get_user_model()


PLUGIN_ARGUMENT_TYPES = {
    plugin: PLUGIN_HANDLERS.get_serializer_class(plugin)()
    for plugin in PLUGIN_HANDLERS.keys()
}


class VariablesCopyViewMixin(CopyMixin):
    def copy_instance(self, instance):
        new_instance = super().copy_instance(instance)
        new_instance.variables.bulk_create([
            Variable(key=key, value=value, content_object=new_instance)
            for key, value in instance.vars.items()
        ])
        return new_instance


class CopySerializer(VSTSerializer):
    class Meta:
        fields = ('name',)


class _VariableSerializer(VSTSerializer):
    hidden_enum = HiddenVariablesEnum

    class Meta:
        model = Variable
        fields = ('id', 'key', 'value')

    def to_representation(self, instance: Variable):
        result = super().to_representation(instance)
        if instance.key in self.hidden_enum.get_values():
            result['value'] = CYPHER
        elif instance.key in getattr(instance.content_object, 'BOOLEAN_VARS', []):
            result['value'] = instance.value == 'True'
        return result


class _VariableViewSet(ModelViewSet):
    model = Variable
    serializer_class = _VariableSerializer
    filterset_class = VariableFilter
    optimize_get_by_values = False


class ResponseSerializer(BaseSerializer):
    detail = drffields.CharField(read_only=True)


class ExecuteResponseSerializer(ResponseSerializer):
    history_id = vstfields.RedirectIntegerField(
        default=None,
        allow_null=True,
        read_only=True,
    )
    executor = vstfields.FkField(select='User', default=None, allow_null=True, read_only=True)
