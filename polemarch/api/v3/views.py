from rest_framework import fields
from vstutils.api.decorators import nested_view
from vstutils.api.fields import CharField, DependEnumField
from vstutils.utils import create_view

from ...main.models import TemplateOption
from ..v2.views import ProjectViewSet as ProjectViewSetV2, __TemplateViewSet
from .serializers import (
    ExecutionTemplateSerializer,
    OneExecutionTemplateSerializer,
    CreateExecutionTemplateSerializer,
    TaskTemplateParameters,
    ModuleTemplateParameters,
)


class CreateTemplateOptionSerializer(TemplateOption.generated_view.serializer_class_one):  # pylint: disable=no-member
    name = CharField(max_length=256)

    class Meta:
        __inject_from__ = 'detail'


TemplateOptionViewSet = create_view(
    TemplateOption,
    extra_serializer_classes={
        'serializer_class_create': CreateTemplateOptionSerializer,
    },
    list_fields=['id', 'name'],
    detail_fields=['id', 'name', 'kind', 'data'],
    override_list_fields={
        'id': fields.CharField(read_only=True),
    },
    override_detail_fields={
        'id': fields.CharField(read_only=True),
        'name': fields.CharField(read_only=True),
        'kind': fields.CharField(read_only=True, source='template.kind'),
        'data': DependEnumField(field='kind', types={
            'Task': TaskTemplateParameters(),
            'Module': ModuleTemplateParameters(),
        }),
    }
)


@nested_view('option', 'id', arg_regexp='[a-zA-Z0-9-_]', manager_name='options_qs', view=TemplateOptionViewSet)
class ExecutionTemplateViewSet(__TemplateViewSet):
    serializer_class = ExecutionTemplateSerializer
    serializer_class_one = OneExecutionTemplateSerializer
    serializer_class_create = CreateExecutionTemplateSerializer


@nested_view('execution_templates', 'id', manager_name='template', view=ExecutionTemplateViewSet)
@nested_view('template', 'id', manager_name='template', view=__TemplateViewSet, schema=None)
class ProjectViewSet(ProjectViewSetV2):
    __doc__ = ProjectViewSetV2.__doc__
