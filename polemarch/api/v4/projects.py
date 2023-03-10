from uuid import uuid1
from functools import partial
from django.db import transaction
from django.db.models import F, Value
from django.db.models.functions import Concat
from rest_framework import fields as drffields
from django_filters import CharFilter
from vstutils.utils import create_view, lazy_translate as __, translate as _
from vstutils.api import fields as vstfields
from vstutils.api.filter_backends import VSTFilterBackend
from vstutils.api.filters import extra_filter
from vstutils.api.actions import EmptyAction, Action
from vstutils.api.serializers import DataSerializer, BaseSerializer
from ...main.models import Project, ProjectCommunityTemplate, ExecutionTemplateOption
from ...main.constants import ProjectStatus, ProjectType, ProjectRepoAuthType, ProjectVariablesEnum
from .base import (
    VariablesCopyViewMixin,
    ExecuteResponseSerializer,
    ResponseSerializer,
    _VariableViewSet,
    _VariableSerializer,
)
from .users import OwnerViewMixin, UserSerializer
from ...main.executions import PLUGIN_HANDLERS
from .ansible import AnsiblePlaybookViewSet, AnsibleModuleViewSet
from .hosts import InventoryViewSet, ImportInventorySerializer
from .history import HistoryViewSet
from .execution_templates import ExecutionTemplateViewSet


class CreateProjectSerializer(BaseSerializer):
    id = drffields.IntegerField(read_only=True)
    name = drffields.CharField()
    type = drffields.ChoiceField(
        choices=ProjectType.to_choices(),
        default=ProjectType.MANUAL,
        label=__('Repo type')
    )
    repository = vstfields.DependEnumField(
        field='type',
        default=ProjectType.MANUAL,
        label=__('Repo url'),
        types={
            ProjectType.MANUAL.value: 'hidden',
            ProjectType.TAR.value: drffields.CharField(),
            ProjectType.GIT.value: drffields.CharField(),
        },
    )
    repo_auth = vstfields.DependEnumField(
        field='type',
        default=ProjectRepoAuthType.NONE,
        types={
            ProjectType.MANUAL.value: 'hidden',
            ProjectType.TAR.value: 'hidden',
            ProjectType.GIT.value: drffields.ChoiceField(
                choices=ProjectRepoAuthType.to_choices(),
                default=ProjectRepoAuthType.NONE,
            ),
        },
        label=__('Repo auth type'),
        write_only=True
    )
    auth_data = vstfields.DependEnumField(
        allow_blank=True,
        write_only=True,
        default='',
        field='repo_auth',
        label=__('Repo auth data'),
        types={
            ProjectRepoAuthType.NONE.value: 'hidden',
            ProjectRepoAuthType.KEY.value: vstfields.SecretFileInString(),
            ProjectRepoAuthType.PASSWORD.value: vstfields.PasswordField(),
        }
    )
    branch = vstfields.DependEnumField(
        allow_blank=True,
        required=False,
        allow_null=True,
        label=__('Branch for GIT (branch/tag/SHA) or TAR (subdir)'),
        field='type',
        types={
            ProjectType.MANUAL.value: 'hidden',
            ProjectType.GIT.value: drffields.CharField(),
            ProjectType.TAR.value: drffields.CharField(),
        }
    )
    additional_playbook_path = drffields.CharField(
        required=False,
        allow_null=True,
        label=__('Directory with playbooks')
    )
    status = drffields.CharField(read_only=True, default=ProjectStatus.NEW)

    @transaction.atomic
    def create(self, validated_data):
        repo_type = validated_data.pop('type')
        repo_auth_type = validated_data.pop('repo_auth')
        repo_auth_data = validated_data.pop('auth_data')
        repo_branch = validated_data.pop('branch', None)
        playbook_path = validated_data.pop('additional_playbook_path', '')

        instance = Project.objects.create(**validated_data)
        instance.variables.create(key='repo_type', value=repo_type)
        if repo_auth_type != ProjectRepoAuthType.NONE:
            key = f'repo_{repo_auth_type.lower()}'
            instance.variables.create(key=key, value=repo_auth_data)
        if repo_branch:
            instance.variables.create(key='repo_branch', value=repo_branch)
        if playbook_path:
            instance.variables.create(key='playbook_path', value=playbook_path)
        return instance

    _schema_properties_groups = {
        'General': (
            'name',
            'type',
            'additional_playbook_path',
        ),
        'Repository': (
            'repository',
            'branch',
            'repo_auth',
            'auth_data',
        ),
    }


class ProjectImportInventorySerializer(ImportInventorySerializer):
    inventory_id = vstfields.RedirectIntegerField(read_only=True, operation_name='project_inventory')


class ProjectInventoryViewMixin:
    serializer_class_import_inventory = ProjectImportInventorySerializer  # pylint: disable=invalid-name

    def _perform_import_inventory(self, instance, data):
        inventory = super()._perform_import_inventory(instance, data)
        self.nested_manager.add(inventory)
        return inventory


class ProjectInventoryViewSet(ProjectInventoryViewMixin, InventoryViewSet):
    pass


class ProjectTemplateOptionsFilterBackend(VSTFilterBackend):
    def filter_queryset(self, request, queryset, view):
        return queryset.annotate(
            extended_name=Concat(F('template__name'), Value(' ('), F('name'), Value(')'))
        )


project_template_options_viewset_data = {
    'model': ExecutionTemplateOption,
    'view_class': 'list_only',
    'list_fields': (
        'id',
        'template',
        'extended_name',
    ),
    'override_list_fields': {
        'extended_name': drffields.CharField(),
    },
    'filter_backends': (ProjectTemplateOptionsFilterBackend,),
    'serializer_class_name': 'ProjectTemplateOption',
}


_ProjectTemplateOptionsViewSet = create_view(**project_template_options_viewset_data)


class ProjectVariableSerializer(_VariableSerializer):
    key = vstfields.AutoCompletionField(autocomplete=ProjectVariablesEnum.get_values())
    value = vstfields.DependEnumField(allow_blank=True, field='key', types={
        'repo_branch': drffields.CharField(),
        'repo_password': vstfields.PasswordField(),
        'repo_key': vstfields.SecretFileInString(),
        'repo_sync_on_run_timeout': vstfields.UptimeField(default=0),
        'repo_sync_on_run': drffields.BooleanField(),
        'ci_template': vstfields.FkField(
            select=_ProjectTemplateOptionsViewSet.serializer_class.__name__,
            autocomplete_represent='extended_name',
            field_type=str,
        ),
        'repo_type': drffields.ChoiceField(choices=ProjectType.to_choices()),
    })


class ProjectVariableViewSet(_VariableViewSet):
    serializer_class = ProjectVariableSerializer


class ProjectExecuteResponseSerializer(ExecuteResponseSerializer):
    history_id = vstfields.RedirectIntegerField(
        default=None,
        allow_null=True,
        read_only=True,
        operation_name='project_history',
    )


def generate_execute_actions(cls):
    def execute_action(self, request, plugin, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project: Project = self.get_object()

        history = project.execute(
            plugin,
            executor=request.user,
            execute_args=serializer.validated_data
        )

        return {
            'history_id': getattr(history, 'id', None),
            'executor': request.user.id,
            'detail': _('{} plugin was executed.').format(plugin),
        }

    for plugin in PLUGIN_HANDLERS.keys():
        action = partial(execute_action, plugin=plugin)
        action.__name__ = f'execute_{plugin.lower()}'
        action.__doc__ = f'Execute {plugin} plugin.'
        setattr(
            cls,
            action.__name__,
            Action(
                serializer_class=PLUGIN_HANDLERS.get_serializer_class(plugin),
                result_serializer_class=ProjectExecuteResponseSerializer,
            )(action)
        )

    return cls


@generate_execute_actions
class ProjectViewMixin(VariablesCopyViewMixin):
    def get_manager__project_template_options(self, parent_object):  # pylint: disable=invalid-name
        return ExecutionTemplateOption.objects.filter(template__project=parent_object)

    def copy_instance(self, instance):
        instance.status = instance.__class__._meta.get_field('status').default  # pylint: disable=protected-access
        return super().copy_instance(instance)

    def _make_sync(self, instance, request):
        instance.start_repo_task('sync')  # noee

    @EmptyAction(
        methods=['patch'],
        result_serializer_class=ResponseSerializer,
    )
    @transaction.atomic()
    def sync(self, request, *args, **kwargs):
        """
        Synchronize project with repository.
        """
        instance: Project = self.get_object()
        self._make_sync(instance, request)
        return {'detail': f'Sync with {instance.repository}.'}


project_viewset_data = {
    'model': Project,
    'view_class': (OwnerViewMixin, ProjectViewMixin, None),
    'list_fields': (
        'id',
        'name',
        'type',
        'status',
    ),
    'detail_fields': (
        'id',
        'name',
        'repository',
        'status',
        'revision',
        'branch',
        'owner',
        'notes',
        'readme_content',
        'execute_view_data',
    ),
    'override_list_fields': {
        'status': drffields.ChoiceField(read_only=True, choices=ProjectStatus.to_choices()),
        'type': drffields.CharField(read_only=True),
    },
    'override_detail_fields': {
        'status': drffields.ChoiceField(read_only=True, choices=ProjectStatus.to_choices()),
        'repository': drffields.CharField(default=ProjectType.MANUAL),
        'owner': vstfields.FkModelField(select=UserSerializer, read_only=True, autocomplete_represent='username'),
        'notes': vstfields.TextareaField(required=False, allow_blank=True),
        'readme_content': vstfields.HtmlField(read_only=True, label=' '),
        'execute_view_data': DataSerializer(read_only=True, allow_null=True),
        'branch': drffields.CharField(read_only=True, source='project_branch', allow_blank=True)
    },
    'extra_serializer_classes': {
        'serializer_class_create': CreateProjectSerializer,
    },
    'extra_view_attributes': {
        'copy_related': ['inventories'],
    },
    'filterset_fields': {
        'id': None,
        'name': None,
        'status': CharFilter(
            method=extra_filter,
            help_text=__('Project sync status.'),
        ),
        'status__not': CharFilter(
            method=extra_filter,
            help_text=__('Project sync status.'),
        )
    },
    'nested': {
        'ansible_modules': {
            'view': AnsibleModuleViewSet,
            'arg': 'id',
            'manager_name': 'all_ansible_modules',
        },
        'ansible_playbooks': {
            'view': AnsiblePlaybookViewSet,
            'arg': 'id',
        },
        'inventory': {
            'view': ProjectInventoryViewSet,
            'allow_append': True,
            'arg': 'id',
            'manager_name': 'inventories',
        },
        'history': {
            'view': HistoryViewSet,
            'arg': 'id',
        },
        'execution_templates': {
            'view': ExecutionTemplateViewSet,
            'arg': 'id',
        },
        'variables': {
            'view': ProjectVariableViewSet,
            'arg': 'id',
        },
        '_project_template_options': {
            'view': _ProjectTemplateOptionsViewSet,
            'arg': 'id',
        },
    },
}


class ProjectViewSet(create_view(**project_viewset_data)):
    """
    Manage projects.

    retrieve:
        Return a project instance.

    list:
        Return all projects.

    create:
        Create a new project.

    destroy:
        Remove an existing project.

    partial_update:
        Update one or more fields on an existing project.

    update:
        Update a project.
    """


class ProjectCommunityTemplateUseItSerializer(BaseSerializer):
    project_id = vstfields.RedirectIntegerField(
        read_only=True,
        allow_null=True,
        default=None,
    )
    name = drffields.CharField(required=False)


class ProjectCommunityTemplateViewMixin:
    @Action(serializer_class=ProjectCommunityTemplateUseItSerializer)
    def use_it(self, request, *args, **kwargs):
        """
        Create a project based on current template.
        """
        instance: ProjectCommunityTemplate = self.get_object()
        serializer = self.get_serializer(instance=instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        project_serializer = CreateProjectSerializer(data={
            'name': serializer.validated_data.get('name', f'{instance.name} {uuid1()}'),
            'repository': instance.repository,
            'type': instance.type,
            'repo_auth': instance.repo_auth,
            'auth_data': instance.auth_data or '',
        }, context=serializer.context)
        project_serializer.is_valid(raise_exception=True)
        project = project_serializer.save()
        return {'name': project.name, 'project_id': project.id}


project_community_template_viewset_data = {
    'model': ProjectCommunityTemplate,
    'view_class': (ProjectCommunityTemplateViewMixin, 'read_only'),
    'list_fields': (
        'id',
        'name',
        'type',
    ),
    'detail_fields': (
        'id',
        'name',
        'description',
        'type',
        'repository',
    ),
}


class ProjectCommunityTemplateViewSet(create_view(**project_community_template_viewset_data)):
    """
    View project templates made by community.

    retrieve:
        Return a community project template instance.

    list:
        List of community project templates.
    """
