from rest_framework import fields, status
from vstutils.api.base import GenericViewSetMeta
from vstutils.api.decorators import nested_view, subaction
from vstutils.api.fields import CharField, DependEnumField
from vstutils.api.filters import CharFilter
from vstutils.api.responses import HTTP_201_CREATED
from vstutils.utils import create_view, translate as _

from ...main.models import TemplateOption, Group, Project
from ...main.executions import PLUGIN_HANDLERS
from ..v2.filters import variables_filter, vars_help
from ..v2.views import (
    HostViewSet,
    InventoryItemsPermission,
    InventoryViewSet as _InventoryViewSet,
    ProjectViewSet as ProjectViewSetV2,
    _GroupMixin,
    __InvVarsViewSet,
    __ProjectInventoryViewSet,
    __TemplateViewSet,
    concat_classes,
    _BaseGroupViewSet,
    nested_allow_check,
)
from .serializers import (
    ExecutionTemplateSerializer,
    OneExecutionTemplateSerializer,
    CreateExecutionTemplateSerializer,
    TaskTemplateParameters,
    ModuleTemplateParameters,
    OneProjectSerializer,
    ExecuteResponseSerializer,
)


GroupViewSet = create_view(
    Group,
    view_class=_GroupMixin,
    permission_classes=concat_classes(
        _BaseGroupViewSet.permission_classes,
        _GroupMixin.permission_classes,
        InventoryItemsPermission
    ),
    filterset_fields={
        'id': None,
        'name': None,
        'variables': CharFilter(method=variables_filter, help_text=vars_help)
    },
    extra_view_attributes={
        'nested_allow_check': nested_allow_check,
    },
    nested={
        'variables': {
            'view': __InvVarsViewSet,
            'arg': 'id',
        },
        'hosts': {
            'allow_append': True,
            'view': HostViewSet,
            'arg': 'id',
        },
    },
)


class InventoryViewSet(_InventoryViewSet):
    __doc__ = _InventoryViewSet.__doc__


class _ProjectInventoryViewSet(InventoryViewSet, __ProjectInventoryViewSet):
    __doc__ = InventoryViewSet.__doc__


option_data = {
    'Task': TaskTemplateParameters(),
    'Module': ModuleTemplateParameters(),
}
option_data.update({
    plugin: backend.get_serializer_class()()
    for plugin, backend in PLUGIN_HANDLERS.items()
    if plugin not in ('PLAYBOOK, MODULE')
})


class CreateTemplateOptionSerializer(TemplateOption.generated_view.serializer_class_one):  # pylint: disable=no-member
    id = fields.CharField(read_only=True)
    name = CharField(max_length=256)
    data = DependEnumField(field='kind', types=option_data)

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
        'kind': fields.CharField(read_only=True),
        'data': DependEnumField(field='kind', types=option_data),
    }
)


@nested_view('option', 'id', arg_regexp='[a-zA-Z0-9-_]', manager_name='options_qs', view=TemplateOptionViewSet)
class ExecutionTemplateViewSet(__TemplateViewSet):
    serializer_class = ExecutionTemplateSerializer
    serializer_class_one = OneExecutionTemplateSerializer
    serializer_class_create = CreateExecutionTemplateSerializer


class ProjectViewSetMeta(GenericViewSetMeta):
    def __new__(mcs, name, bases, attrs):
        for plugin, backend in PLUGIN_HANDLERS.items():
            action_name = f'execute_{plugin.lower()}'

            def action(self, request, plugin=plugin, *args, **kwargs):
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                project: Project = self.get_object()

                data = serializer.validated_data
                history_id = project.execute(plugin, executor=request.user, execute_args=data)

                response_serializer = ExecuteResponseSerializer(instance={
                    'history_id': history_id,
                    'executor': request.user.id,
                    'detail': _('{} plugin was executed.').format(plugin),
                })
                return HTTP_201_CREATED(response_serializer.data)

            action.__name__ = action_name
            attrs[action_name] = subaction(
                detail=True,
                methods=['post'],
                serializer_class=backend.get_serializer_class(),
                response_serializer=ExecuteResponseSerializer,
                response_code=status.HTTP_201_CREATED,
                description=f'Execute {plugin.lower()} plugin.',
            )(action)

        return super().__new__(mcs, name, bases, attrs)


@nested_view('inventory', 'id', manager_name='inventories', allow_append=True, view=_ProjectInventoryViewSet)
@nested_view('execution_templates', 'id', manager_name='template', view=ExecutionTemplateViewSet)
@nested_view('template', 'id', manager_name='template', view=__TemplateViewSet, schema=None)
class ProjectViewSet(ProjectViewSetV2, metaclass=ProjectViewSetMeta):
    __doc__ = ProjectViewSetV2.__doc__
    serializer_class_one = OneProjectSerializer
