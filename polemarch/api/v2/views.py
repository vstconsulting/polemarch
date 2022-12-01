# pylint: disable=unused-argument,protected-access,too-many-ancestors
from collections import OrderedDict

from django.db import transaction
from django.http.response import HttpResponse
from django.utils.decorators import method_decorator
from rest_framework import exceptions as excepts, status
from rest_framework.authtoken import views as token_views
from drf_yasg.utils import swagger_auto_schema
from vstutils.api import auth as vst_auth
from vstutils.api.permissions import StaffPermission
from vstutils.api import base, serializers as vstsers, decorators as deco, responses
from vstutils.utils import KVExchanger, deprecated, translate as _
from vstutils.api.responses import HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT

from . import filters
from .permissions import InventoryItemsPermission, CreateUsersPermission
from . import serializers as sers
from ..v3 import serializers as sers3
from ...main import utils

yes = True
no = False
default_action = {'methods': ["post"], 'detail': yes}
action_kw = {**default_action}
action_kw.update({'response_serializer': sers.ActionResponseSerializer, 'response_code': status.HTTP_200_OK})
execute_kw = default_action.copy()
execute_kw.update({
    'serializer_class': sers.EmptySerializer,
    'response_serializer': sers.ExecuteResponseSerializer,
    'response_code': status.HTTP_201_CREATED
})


def concat_classes(*args):
    concated_object = []
    for arg in args:
        if isinstance(arg, (list, tuple)):
            concated_object += arg
        else:
            concated_object.append(arg)
    return concated_object


class _VariablesCopyMixin(base.CopyMixin):
    def copy_instance(self, instance):
        new_instance = super().copy_instance(instance)
        new_instance.variables.bulk_create([
            sers.models.Variable(key=key, value=value, content_object=new_instance)
            for key, value in instance.vars.items()
        ])
        return new_instance


class OwnedView(base.ModelViewSet, base.CopyMixin):
    POST_WHITE_LIST = []

    @deco.action(methods=["post"], detail=True, serializer_class=sers.SetOwnerSerializer)
    def set_owner(self, request, **kwargs):
        # pylint: disable=unused-argument
        """
        Change instance owner.
        """
        serializer = sers.SetOwnerSerializer(
            self.get_object(), data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return HTTP_201_CREATED(serializer.data)


class __VarsViewSet(base.ModelViewSet):
    """
    Instance execution variables.

    list:
        Return all variables of instance.

    create:
        Create a new variable of instance.

    retrieve:
        Return a variable of instance.

    partial_update:
        Update one or more fields on an existing variable.

    update:
        Update variable value.

    destroy:
        Remove an existing variable.
    """
    model = sers.models.Variable
    serializer_class = sers.VariableSerializer
    filterset_class = filters.VariableFilter
    optimize_get_by_values = False


class __InvVarsViewSet(__VarsViewSet):
    """
    Inventory hosts variables.

    retrieve:
        Return a variable of instance.

    list:
        Return all variables of instance.

    create:
        Create a new variable of instance.

    destroy:
        Remove an existing variable.

    partial_update:
        Update one or more fields on an existing variable.

    update:
        Update variable value.
    """
    serializer_class = sers.InventoryVariableSerializer


class __PeriodicTaskVarsViewSet(__VarsViewSet):
    """
    Periodic task additional execute variables.

    retrieve:
        Return a variable of periodic task.

    list:
        Return all variables of periodic task.

    create:
        Create a new variable of periodic task.

    destroy:
        Remove an existing variable.

    partial_update:
        Update one or more fields on an existing variable.

    update:
        Update variable value.
    """
    serializer_class = sers.PeriodicTaskVariableSerializer


class __ProjectVarsViewSet(__VarsViewSet):
    """
    Project settings variables.

    retrieve:
        Return a variable of instance.

    list:
        Return all variables of instance.

    create:
        Create a new variable of instance.

    destroy:
        Remove an existing variable.

    partial_update:
        Update one or more fields on an existing variable.

    update:
        Update variable value.
    """
    serializer_class = sers.ProjectVariableSerializer


class TokenView(token_views.ObtainAuthToken):
    schema = None

    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return HTTP_204_NO_CONTENT(f"Token {key} removed.")
        raise excepts.ParseError("Token not found.")


class UserViewSet(vst_auth.UserViewSet, base.CopyMixin):
    """
    retrieve:
        Return a user instance.

    list:
        Return all users.

    create:
        Create a new user.

    destroy:
        Remove an existing user.

    partial_update:
        Update one or more fields on an existing user.

    update:
        Update a user.
    """
    serializer_class = sers.UserSerializer
    serializer_class_one = sers.OneUserSerializer
    serializer_class_create = sers.CreateUserSerializer
    serializer_class_change_password = sers.ChangePasswordSerializer  # pylint: disable=invalid-name
    permission_classes = vst_auth.UserViewSet.permission_classes + (CreateUsersPermission, )

    copy_related = ['groups']
    copy_field_name = 'username'


@deco.nested_view('user', 'id', allow_append=yes, manager_name='users', view=UserViewSet)
class TeamViewSet(OwnedView):
    """
    retrieve:
        Return a team instance.

    list:
        Return all teams.

    create:
        Create a new team.

    destroy:
        Remove an existing team.

    partial_update:
        Update one or more fields on an existing team.

    update:
        Update a team.
    """
    model = sers.models.UserGroup
    serializer_class = sers.TeamSerializer
    serializer_class_one = sers.OneTeamSerializer
    filterset_class = filters.TeamFilter
    copy_related = ['users']


class __HistoryLineViewSet(base.ReadOnlyModelViewSet):
    schema = None
    model = sers.models.HistoryLines
    serializer_class = sers.HistoryLinesSerializer
    filterset_class = filters.HistoryLinesFilter


@method_decorator(name='lines_list', decorator=swagger_auto_schema(auto_schema=None))
@method_decorator(name='raw', decorator=swagger_auto_schema(auto_schema=None))
@deco.nested_view('lines', manager_name='raw_history_line', view=__HistoryLineViewSet)
class HistoryViewSet(base.HistoryModelViewSet):
    """

    retrieve:
        Return a execution history instance.

    list:
        Return all history of executions.

    destroy:
        Remove an existing history record.

    """
    model = sers.models.History
    serializer_class = sers.HistorySerializer
    serializer_class_one = sers.OneHistorySerializer
    filterset_class = filters.HistoryFilter
    POST_WHITE_LIST = ['cancel']

    @deco.action(detail=yes, serializer_class=sers.EmptySerializer)
    def raw(self, request, *args, **kwargs):
        """
        RAW executions output.
        """
        return HttpResponse(self.get_raw(request), content_type="text/plain", status=200)

    @deco.subaction(serializer_class=sers.EmptySerializer, **action_kw)
    def cancel(self, request, *args, **kwargs):
        """
        Cencel working task.
        """
        obj = self.get_object()
        exch = KVExchanger(utils.CmdExecutor.CANCEL_PREFIX + str(obj.id))
        exch.send(True, 60) if obj.working else None
        return HTTP_200_OK(f"Task canceled: {obj.id}")

    @deco.action(["get", "head"], detail=yes, serializer_class=sers.FactsSerializer)
    def facts(self, request, *args, **kwargs):
        """
        Get compilated history facts (only for execution 'module' with module 'setup').
        """
        serializer = self.get_serializer(instance=self.get_object().facts)
        return HTTP_200_OK({'facts': serializer.data})

    @deco.subaction(methods=["delete"], detail=yes, serializer_class=sers.EmptySerializer)
    def clear(self, request, *args, **kwargs):
        """
        Clear history output.
        """
        default_message = "Output trancated.\n"
        obj = self.get_object()
        if obj.status in ["RUN", "DELAY"] or obj.raw_stdout == default_message:  # nocv
            raise excepts.NotAcceptable(
                "Job is running or already trancated"
            )
        obj.raw_stdout = default_message
        return HTTP_204_NO_CONTENT(self.get_raw(request))

    def get_raw(self, request):
        return self.get_object().get_raw(request.query_params.get("color", "no") == "yes")


@deco.nested_view('variables', 'id', view=__InvVarsViewSet)
class HostViewSet(OwnedView, _VariablesCopyMixin):
    """
    retrieve:
        Return a host instance.

    list:
        Return all hosts.

    create:
        Create a new host.

    destroy:
        Remove an existing host.

    partial_update:
        Update one or more fields on an existing host.

    update:
        Update a host.
    """
    model = sers.models.Host
    serializer_class = sers.HostSerializer
    serializer_class_one = sers.OneHostSerializer
    filterset_class = filters.HostFilter
    permission_classes = concat_classes(
        OwnedView.permission_classes,
        _VariablesCopyMixin.permission_classes,
        InventoryItemsPermission
    )


@deco.nested_view('variables', 'id', view=__InvVarsViewSet)
class _BaseGroupViewSet(OwnedView, sers.models.Group.generated_view):  # pylint: disable=inherit-non-class
    """
    retrieve:
        Return a group instance.

    list:
        Return all groups.

    create:
        Create a new group.

    destroy:
        Remove an existing group.

    partial_update:
        Update one or more fields on an existing group.

    update:
        Update a group.
    """
    filterset_class = filters.GroupFilter

    class ValidationException(excepts.ValidationError):
        status_code = 409


@deco.nested_view('hosts', 'id', allow_append=yes, view=HostViewSet)
class _GroupMixin(OwnedView, _VariablesCopyMixin):
    """
    Instance with groups and hosts.
    """
    copy_related = ['hosts', 'groups']


def nested_allow_check(view):
    # pylint: disable=no-member
    exception = _BaseGroupViewSet.ValidationException
    if not view.nested_parent_object.children and view.nested_name == 'groups':
        raise exception("Group is not children.")
    if view.nested_parent_object.children and view.nested_name == 'hosts':
        raise exception("Group is children.")


class GroupViewSet(_BaseGroupViewSet, _GroupMixin):
    __doc__ = _BaseGroupViewSet.__doc__
    permission_classes = concat_classes(
        _BaseGroupViewSet.permission_classes,
        _GroupMixin.permission_classes,
        InventoryItemsPermission
    )

    nested_allow_check = nested_allow_check


@deco.nested_view('all_groups', 'id', methods=['get'], view=GroupViewSet, subs=None)
@deco.nested_view('all_hosts', 'id', methods=['get'], view=HostViewSet, subs=None)
@deco.nested_view('group', 'id', manager_name='groups', allow_append=True, view=GroupViewSet)
@deco.nested_view('variables', 'id', view=__InvVarsViewSet)
class InventoryViewSet(_GroupMixin):
    """
    retrieve:
        Return a inventory instance.

    list:
        Return all inventories.

    create:
        Create a new inventory.

    destroy:
        Remove an existing inventory.

    partial_update:
        Update one or more fields on an existing inventory.

    update:
        Update a inventory.
    """
    model = sers.models.Inventory
    serializer_class = sers.InventorySerializer
    serializer_class_one = sers.OneInventorySerializer
    serializer_class_import_inventory = sers.InventoryImportSerializer  # pylint: disable=invalid-name
    filterset_class = filters.InventoryFilter
    permission_classes = concat_classes(
        _GroupMixin.permission_classes,
        InventoryItemsPermission
    )

    @deco.action(methods=["post"], detail=no)
    def import_inventory(self, request, **kwargs):
        # pylint: disable=no-member
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        if hasattr(self, 'nested_manager'):
            self.nested_manager.add(instance)

        return responses.HTTP_201_CREATED(serializer.data)


class __ProjectInventoryViewSet(InventoryViewSet):
    __doc__ = InventoryViewSet.__doc__
    serializer_class_file_import_inventory = sers.InventoryFileImportSerializer  # pylint: disable=invalid-name

    @deco.action(methods=['post'], detail=no)
    def file_import_inventory(self, request, **kwargs):
        # pylint: disable=no-member

        serializer = self.get_serializer(
            self.nested_parent_object,
            data=dict(name=request.data.get('name', ''))
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        self.nested_manager.add(instance)

        return responses.HTTP_201_CREATED(serializer.data)


class __PlaybookViewSet(base.ReadOnlyModelViewSet):
    """
    Ansible playbook for project.

    retrieve:
        Return a playbook of project instance.

    list:
        Return all playbooks of project.
    """
    lookup_field = 'id'
    model = sers.models.Task
    serializer_class = sers.PlaybookSerializer
    serializer_class_one = sers.OnePlaybookSerializer
    filterset_class = filters.TaskFilter


class __ModuleViewSet(base.ReadOnlyModelViewSet):
    """
    Ansible module for project.

    retrieve:
        Return a module details of project instance.

    list:
        Return all available modules of project.
    """
    lookup_field = 'id'
    model = sers.models.Module
    serializer_class = sers.ModuleSerializer
    serializer_class_one = sers3.OneModuleSerializer
    filterset_class = filters.ModuleFilter


@deco.nested_view('variables', 'id', view=__PeriodicTaskVarsViewSet)
class __PeriodicTaskViewSet(base.ModelViewSet):
    """
    retrieve:
        Return a perodic task instance.

    list:
        Return all periodic tasks in project.

    create:
        Create a new periodic task.

    destroy:
        Remove an existing periodic task.

    partial_update:
        Update one or more fields on an existing periodic task.

    update:
        Update a periodic task.

    """
    lookup_field = 'id'
    model = sers.models.PeriodicTask
    serializer_class = sers3.PeriodictaskSerializer
    serializer_class_one = sers3.OnePeriodictaskSerializer
    filterset_class = filters.PeriodicTaskFilter

    @deco.subaction(**{
        **execute_kw,
        'response_serializer': sers.ExecuteResponseSerializer,
        'serializer_class': sers.EmptySerializer
    })
    def execute(self, request, *args, **kwargs):
        """
        Ad-hoc execute periodic task.
        """
        return HTTP_201_CREATED(sers3.OnePeriodictaskSerializer(self.get_object()).execute())


class __TemplateViewSet(base.ModelViewSet):
    """
    retrieve:
        Return a execute template instance.

    list:
        Return all execute templates in project.

    create:
        Create a new execute template.

    destroy:
        Remove an existing execute template.

    partial_update:
        Update one or more fields on an existing execute template.

    update:
        Update a execute template.
    """
    model = sers.models.Template
    serializer_class = sers.TemplateSerializer
    serializer_class_one = sers.OneTemplateSerializer
    filterset_class = filters.TemplateFilter
    POST_WHITE_LIST = ['execute']

    @deco.subaction(**{
        **execute_kw,
        'serializer_class': sers.TemplateExecSerializer,
        'response_serializer': sers.ExecuteResponseSerializer
    })
    def execute(self, request, *args, **kwargs):
        """
        Execute template with option.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template = self.get_object()
        history_id = template.execute(request.user, **serializer.validated_data)

        response_serializer = sers.ExecuteResponseSerializer(instance={
            'history_id': history_id,
            'executor': request.user.id,
            'detail': _('{} plugin was executed.').format(template.get_plugin())
        })
        return HTTP_201_CREATED(response_serializer.data)


class __ProjectHistoryViewSet(HistoryViewSet):
    serializer_class = sers.ProjectHistorySerializer


@deco.nested_view('inventory', 'id', manager_name='inventories', allow_append=yes, view=__ProjectInventoryViewSet)
@deco.nested_view('playbook', 'id', view=__PlaybookViewSet, methods=['get'])
@deco.nested_view('module', 'id', view=__ModuleViewSet, methods=['get'])
@deco.nested_view('template', 'id', manager_name='template', view=__TemplateViewSet)
@deco.nested_view('periodic_task', 'id', view=__PeriodicTaskViewSet)
@deco.nested_view('history', 'id', manager_name='history', view=__ProjectHistoryViewSet)
@deco.nested_view('variables', 'id', view=__ProjectVarsViewSet)
class ProjectViewSet(OwnedView, _VariablesCopyMixin):
    """
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
    model = sers.models.Project
    serializer_class = sers.ProjectSerializer
    serializer_class_one = sers.OneProjectSerializer
    serializer_class_create = sers.ProjectCreateMasterSerializer
    filterset_class = filters.ProjectFilter
    POST_WHITE_LIST = ['sync', 'execute_playbook', 'execute_module']
    copy_related = ['inventories']

    def copy_instance(self, instance):
        instance.status = instance.__class__._meta.get_field('status').default
        return super().copy_instance(instance)

    @deco.subaction(serializer_class=vstsers.EmptySerializer, **action_kw)
    @transaction.atomic()
    def sync(self, request, *args, **kwargs):
        """
        Sync project with repository.
        """
        instance = self.get_object()
        instance.start_repo_task("sync")
        serializer = sers.ActionResponseSerializer(
            data=dict(detail=f"Sync with {instance.repository}.")
        )
        serializer.is_valid(raise_exception=True)
        return HTTP_200_OK(serializer.data)

    @deco.subaction(**{
        **execute_kw,
        'serializer_class': sers.AnsiblePlaybookSerializer,
        'response_serializer': sers.ExecuteResponseSerializer
    })
    def execute_playbook(self, request, *args, **kwargs):
        """
        Execute `ansible-playbook` with arguments.
        """
        return self._execution("playbook", dict(request.data), request.user)

    @deco.subaction(**{
        **execute_kw,
        'serializer_class': sers.AnsibleModuleSerializer,
        'response_serializer': sers.ExecuteResponseSerializer
    })
    def execute_module(self, request, *args, **kwargs):
        """
        Execute `ansible -m [module]` with arguments.
        """
        return self._execution("module", dict(request.data), request.user)

    @deprecated
    def _execution(self, kind, data, user, **kwargs):
        inventory = data.get("inventory", None)
        msg = "Started in the inventory {}.".format(
            inventory if inventory else 'specified in the project configuration.'
        )
        instance = self.get_object()
        serializer = self._get_ansible_serializer(kind.lower())
        data = {
            k: v for k, v in serializer.to_internal_value(data).items()
            if k in data.keys() or v
        }
        target = data.pop(kind)
        try:
            target = str(target)
        except UnicodeEncodeError:  # nocv
            target = target.encode('utf-8')
        data[kind] = target
        history_id = instance.execute(
            kind.upper(), executor=user, execute_args=data
        )
        rdata = sers.ExecuteResponseSerializer(data=dict(
            detail=msg,
            history_id=history_id, executor=user.id
        ))
        rdata.is_valid(raise_exception=True)
        return HTTP_201_CREATED(rdata.data)

    def _get_ansible_serializer(self, kind):
        exec_method = getattr(self, 'execute_{}'.format(kind), None)
        if exec_method is None:  # nocv
            raise Exception('Unknown kind')
        serializer: sers.serializers.Serializer = self.get_serializer()
        serializer.project = self.get_object()
        return serializer


class ProjectTemplateViewSet(base.ReadOnlyModelViewSet):
    """
    retrieve:
        Return a community project template instance.

    list:
        List of community project templates.
    """
    model = sers.models.ProjectTemplate
    serializer_class = sers.ProjectTemplateSerializer
    serializer_class_one = sers.OneProjectTemplateSerializer
    serializer_class_use_it = sers.ProjectTemplateCreateSerializer

    @deco.subaction(
        serializer_class=sers.ProjectTemplateCreateSerializer,
        response_code=status.HTTP_201_CREATED,
        **default_action
    )
    def use_it(self, request, *args, **kwargs):
        """
        Create project based on this template.
        """
        serializer = self.get_serializer(self.get_object(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return HTTP_201_CREATED(serializer.data)


class HookViewSet(base.ModelViewSet):
    """
    retrieve:
        Return a hook instance.

    list:
        Return all hooks.

    create:
        Create a new hook.

    destroy:
        Remove an existing hook.

    partial_update:
        Update one or more fields on an existing hook.

    update:
        Update a hook.
    """
    model = sers.models.Hook
    serializer_class = sers.HookSerializer
    filterset_class = filters.HookFilter
    permission_classes = (StaffPermission,)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_description='Dashboard statistic.',
    responses={status.HTTP_200_OK: sers.DashboardStatisticSerializer(), }
))
class StatisticViewSet(base.ListNonModelViewSet):
    base_name = "stats"

    def _get_by_user(self, model):
        user = self.request.user
        filter_models = (sers.User,)
        if model not in filter_models:
            return model.objects.all().user_filter(user)
        return model.objects.all()

    def _get_history_stats(self, request):
        qs = sers.models.History.objects.all()
        qs = qs.user_filter(self.request.user)
        return qs.stats(int(request.query_params.get("last", "14")))

    def _get_by_user_projects(self, model):
        return model.objects.filter(project__in=self._get_by_user(sers.models.Project).values('id'))

    def list(self, request, *args, **kwargs):
        # pylint: disable=unused-argument
        stats = OrderedDict()
        stats['projects'] = self._get_by_user(sers.models.Project).count()
        stats['templates'] = self._get_by_user_projects(sers.models.Template).count()
        stats['inventories'] = self._get_by_user(sers.models.Inventory).count()
        stats['groups'] = self._get_by_user(sers.models.Group).count()
        stats['hosts'] = self._get_by_user(sers.models.Host).count()
        stats['teams'] = self._get_by_user(sers.models.UserGroup).count()
        stats['users'] = self._get_by_user(sers.User).count()
        stats['jobs'] = self._get_history_stats(request)
        return HTTP_200_OK(stats)
