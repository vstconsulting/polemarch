# pylint: disable=unused-argument,protected-access,too-many-ancestors
from collections import OrderedDict
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from rest_framework import exceptions as excepts, status
from rest_framework.authtoken import views as token_views
from drf_yasg.utils import swagger_auto_schema
from vstutils.api.permissions import StaffPermission
from vstutils.api import base, views, serializers as vstsers, decorators as deco
from vstutils.utils import KVExchanger

from . import filters
from . import serializers as sers
from ...main import utils

yes = True
no = False
default_action = dict(methods=["post"], detail=yes)
action_kw = dict(**default_action)
action_kw.update(dict(
    response_serializer=sers.ActionResponseSerializer,
    response_code=status.HTTP_200_OK
))
execute_kw = dict(**default_action)
execute_kw.update(dict(
    response_serializer=sers.ExecuteResponseSerializer,
    response_code=status.HTTP_201_CREATED
))


class _VariablesCopyMixin(base.CopyMixin):
    def copy_instance(self, instance):
        new_instance = super(_VariablesCopyMixin, self).copy_instance(instance)
        new_instance.variables.bulk_create([
            sers.models.Variable(key=key, value=value, content_object=new_instance)
            for key, value in instance.vars.items()
        ])
        return new_instance


class OwnedView(base.ModelViewSetSet, base.CopyMixin):
    POST_WHITE_LIST = []

    @deco.action(methods=["post"], detail=True, serializer_class=sers.SetOwnerSerializer)
    def set_owner(self, request, **kwargs):
        # pylint: disable=unused-argument
        '''
        Change instance owner.
        '''
        serializer = sers.SetOwnerSerializer(
            self.get_object(), data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(True)
        serializer.save()
        return base.Response(serializer.data, status.HTTP_201_CREATED).resp


class __VarsViewSet(base.ModelViewSetSet):
    '''
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
    '''
    model = sers.models.Variable
    serializer_class = sers.VariableSerializer
    filter_class = filters.VariableFilter


class __InvVarsViewSet(__VarsViewSet):
    '''
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
    '''
    serializer_class = sers.InventoryVariableSerializer


class __PeriodicTaskVarsViewSet(__VarsViewSet):
    '''
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
    '''
    serializer_class = sers.PeriodicTaskVariableSerializer


class __ProjectVarsViewSet(__VarsViewSet):
    '''
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
    '''
    serializer_class = sers.ProjectVariableSerializer


class TokenView(token_views.ObtainAuthToken):
    schema = None

    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return base.Response(
                "Token {} removed.".format(key), status.HTTP_204_NO_CONTENT
            ).resp
        raise excepts.ParseError("Token not found.")


class UserViewSet(views.UserViewSet, base.CopyMixin):
    '''
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
    '''
    serializer_class = sers.UserSerializer
    serializer_class_one = sers.OneUserSerializer
    action_serializers = {
        'create': sers.CreateUserSerializer,
        'change_password': sers.ChangePasswordSerializer
    }

    copy_related = ['groups']
    copy_field_name = 'username'

    def copy_instance(self, instance):
        new_instance = super(UserViewSet, self).copy_instance(instance)
        new_instance.settings.data = instance.settings.get_settings_copy()
        new_instance.settings.save()
        return new_instance

    @deco.action(
        ["post", "delete", "get"], url_path="settings",
        detail=yes, serializer_class=sers.UserSettingsSerializer
    )
    def user_settings(self, request, *args, **kwargs):
        '''
        Return user settings.
        '''
        obj = self.get_object()
        method = request.method
        if method != "GET":
            obj.settings.data = request.data if method == "POST" else {}
            obj.settings.save()
        return base.Response(obj.settings.data, status.HTTP_200_OK).resp

    @deco.action(["post"], detail=yes)
    def change_password(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return base.Response(serializer.data, status.HTTP_201_CREATED).resp


@deco.nested_view('user', 'id', allow_append=yes, manager_name='users', view=UserViewSet)
class TeamViewSet(OwnedView):
    '''
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
    '''
    model = sers.models.UserGroup
    serializer_class = sers.TeamSerializer
    serializer_class_one = sers.OneTeamSerializer
    filter_class = filters.TeamFilter
    copy_related = ['users']


class __HistoryLineViewSet(base.ReadOnlyModelViewSet):
    schema = None
    model = sers.models.HistoryLines
    serializer_class = sers.HistoryLinesSerializer
    filter_class = filters.HistoryLinesFilter


@method_decorator(name='lines_list', decorator=swagger_auto_schema(auto_schema=None))
@method_decorator(name='raw', decorator=swagger_auto_schema(auto_schema=None))
@deco.nested_view('lines', manager_name='raw_history_line', view=__HistoryLineViewSet)
class HistoryViewSet(base.HistoryModelViewSet):
    '''

    retrieve:
        Return a execution history instance.

    list:
        Return all history of executions.

    destroy:
        Remove an existing history record.

    '''
    model = sers.models.History
    serializer_class = sers.HistorySerializer
    serializer_class_one = sers.OneHistorySerializer
    filter_class = filters.HistoryFilter
    POST_WHITE_LIST = ['cancel']

    @deco.action(["get"], detail=yes, serializer_class=sers.EmptySerializer)
    def raw(self, request, *args, **kwargs):
        '''
        RAW executions output.
        '''
        result = self.get_serializer(self.get_object()).get_raw(request)
        return HttpResponse(result, content_type="text/plain")

    @deco.subaction(serializer_class=sers.EmptySerializer, **action_kw)
    def cancel(self, request, *args, **kwargs):
        '''
        Cencel working task.
        '''
        obj = self.get_object()
        exch = KVExchanger(utils.CmdExecutor.CANCEL_PREFIX + str(obj.id))
        exch.send(True, 60) if obj.working else None
        return base.Response("Task canceled: {}".format(obj.id), status.HTTP_200_OK).resp

    @deco.action(["get"], detail=yes, serializer_class=sers.DataSerializer)
    def facts(self, request, *args, **kwargs):
        '''
        Get compilated history facts (only for execution 'module' with module 'setup').
        '''
        objs = self.get_serializer(self.get_object()).get_facts(request)
        return base.Response(objs, status.HTTP_200_OK).resp

    @deco.subaction(["delete"], detail=yes, serializer_class=sers.EmptySerializer)
    def clear(self, request, *args, **kwargs):
        '''
        Clear history output.
        '''
        default_message = "Output trancated.\n"
        obj = self.get_object()
        if obj.status in ["RUN", "DELAY"] or obj.raw_stdout == default_message:  # nocv
            raise excepts.NotAcceptable(
                "Job is running or already trancated"
            )
        obj.raw_stdout = default_message
        result = self.get_serializer(obj).get_raw(request)
        return base.Response(result, status.HTTP_204_NO_CONTENT).resp


@deco.nested_view('variables', 'id', view=__InvVarsViewSet)
class HostViewSet(OwnedView, _VariablesCopyMixin):
    '''
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
    '''
    model = sers.models.Host
    serializer_class = sers.HostSerializer
    serializer_class_one = sers.OneHostSerializer
    filter_class = filters.HostFilter


@deco.nested_view('variables', 'id', view=__InvVarsViewSet)
class _BaseGroupViewSet(OwnedView, base.ModelViewSetSet):
    '''
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
    '''
    model = sers.models.Group
    serializer_class = sers.GroupSerializer
    serializer_class_one = sers.OneGroupSerializer
    filter_class = filters.GroupFilter
    action_serializers = {
        'create': sers.GroupCreateMasterSerializer
    }


@deco.nested_view(
    'host', 'id', manager_name='hosts', allow_append=yes, view=HostViewSet
)
@deco.nested_view(
    'group', 'id', manager_name='groups', allow_append=yes, view=_BaseGroupViewSet
)
class _GroupMixin(OwnedView, _VariablesCopyMixin):
    '''
    Instance with groups and hosts.
    '''
    copy_related = ['hosts', 'groups']


class GroupViewSet(_BaseGroupViewSet, _GroupMixin):
    __doc__ = _BaseGroupViewSet.__doc__

    def nested_allow_check(self):
        exception = _BaseGroupViewSet.serializer_class_one.ValidationException
        if not self.nested_parent_object.children and self.nested_name == 'group':
            raise exception("Group is not children.")
        if self.nested_parent_object.children and self.nested_name == 'host':
            raise exception("Group is children.")


@deco.nested_view('all_groups', 'id', methods=['get'], view=GroupViewSet, subs=None)
@deco.nested_view('all_hosts', 'id', methods=['get'], view=HostViewSet, subs=None)
@deco.nested_view('variables', 'id', view=__InvVarsViewSet)
class InventoryViewSet(_GroupMixin):
    '''
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
    '''
    model = sers.models.Inventory
    serializer_class = sers.InventorySerializer
    serializer_class_one = sers.OneInventorySerializer
    filter_class = filters.InventoryFilter
    copy_related = ['hosts', 'groups']
    action_serializers = {
        'import_inventory': sers.InventoryImportSerializer
    }

    @deco.action(methods=["post"], detail=no)
    def import_inventory(self, request, **kwargs):
        serializer = sers.InventoryImportSerializer(data=request.data)
        serializer.is_valid(True)
        serializer.save()
        return base.Response(serializer.data, status.HTTP_201_CREATED).resp


class __PlaybookViewSet(base.ReadOnlyModelViewSet):
    '''
    Ansible playbook for project.

    retrieve:
        Return a playbook of project instance.

    list:
        Return all playbooks of project.
    '''
    lookup_field = 'id'
    model = sers.models.Task
    serializer_class = sers.PlaybookSerializer
    serializer_class_one = sers.OnePlaybookSerializer
    filter_class = filters.TaskFilter


class __ModuleViewSet(base.ReadOnlyModelViewSet):
    '''
    Ansible module for project.

    retrieve:
        Return a module details of project instance.

    list:
        Return all available modules of project.
    '''
    lookup_field = 'id'
    model = sers.models.Module
    serializer_class = sers.ModuleSerializer
    serializer_class_one = sers.OneModuleSerializer
    filter_class = filters.ModuleFilter


@deco.nested_view('variables', 'id', view=__PeriodicTaskVarsViewSet)
class __PeriodicTaskViewSet(base.ModelViewSetSet):
    '''
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

    '''
    lookup_field = 'id'
    model = sers.models.PeriodicTask
    serializer_class = sers.PeriodictaskSerializer
    serializer_class_one = sers.OnePeriodictaskSerializer
    filter_class = filters.PeriodicTaskFilter

    @deco.subaction(serializer_class=sers.EmptySerializer, **execute_kw)
    def execute(self, request, *args, **kwargs):
        '''
        Ad-hoc execute periodic task.
        '''
        serializer = self.get_serializer(self.get_object())
        return serializer.execute().resp


class __TemplateViewSet(base.ModelViewSetSet):
    '''
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
    '''
    model = sers.models.Template
    serializer_class = sers.TemplateSerializer
    serializer_class_one = sers.OneTemplateSerializer
    filter_class = filters.TemplateFilter
    POST_WHITE_LIST = ['execute']

    @deco.subaction(serializer_class=sers.TemplateExecSerializer, **execute_kw)
    def execute(self, request, *args, **kwargs):
        '''
        Execute template with option.
        '''
        obj = self.get_object()
        return self.get_serializer(obj).execute(request).resp


class __ProjectHistoryViewSet(HistoryViewSet):
    serializer_class = sers.ProjectHistorySerializer


@deco.nested_view(
    'inventory', 'id', manager_name='inventories',
    allow_append=yes, view=InventoryViewSet
)
@deco.nested_view('playbook', 'id', view=__PlaybookViewSet, methods=['get'])
@deco.nested_view('module', 'id', view=__ModuleViewSet, methods=['get'])
@deco.nested_view('template', 'id', manager_name='template', view=__TemplateViewSet)
@deco.nested_view('periodic_task', 'id', view=__PeriodicTaskViewSet)
@deco.nested_view('history', 'id', manager_name='history', view=__ProjectHistoryViewSet)
@deco.nested_view('variables', 'id', view=__ProjectVarsViewSet)
class ProjectViewSet(_GroupMixin):
    '''
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
    '''
    model = sers.models.Project
    serializer_class = sers.ProjectSerializer
    serializer_class_one = sers.OneProjectSerializer
    filter_class = filters.ProjectFilter
    POST_WHITE_LIST = ['sync', 'execute_playbook', 'execute_module']
    copy_related = _GroupMixin.copy_related + ['inventories']
    action_serializers = {
        'create': sers.ProjectCreateMasterSerializer
    }

    def copy_instance(self, instance):
        instance.status = instance.__class__._meta.get_field('status').default
        return super(ProjectViewSet, self).copy_instance(instance)

    @deco.subaction(serializer_class=vstsers.EmptySerializer, **action_kw)
    def sync(self, request, *args, **kwargs):
        '''
        Sync project with repository.
        '''
        return self.get_serializer(self.get_object()).sync().resp

    @deco.subaction(serializer_class=sers.AnsiblePlaybookSerializer, **execute_kw)
    def execute_playbook(self, request, *args, **kwargs):
        '''
        Execute `ansible-playbook` with arguments.
        '''
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_playbook(request).resp

    @deco.subaction(serializer_class=sers.AnsibleModuleSerializer, **execute_kw)
    def execute_module(self, request, *args, **kwargs):
        '''
        Execute `ansible -m [module]` with arguments.
        '''
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_module(request).resp


class HookViewSet(base.ModelViewSetSet):
    '''
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
    '''
    model = sers.models.Hook
    serializer_class = sers.HookSerializer
    filter_class = filters.HookFilter
    permission_classes = (StaffPermission,)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_description='Dashboard statistic.',
    responses={status.HTTP_200_OK: sers.DashboardStatisticSerializer(), }
))
class StatisticViewSet(base.ListNonModelViewSet):
    base_name = "stats"

    def _get_count_by_user(self, model):
        user = self.request.user
        filter_models = (sers.User,)
        if model not in filter_models:
            return model.objects.all().user_filter(user).count()
        return model.objects.all().count()

    def _get_history_stats(self, request):
        qs = sers.models.History.objects.all()
        qs = qs.user_filter(self.request.user)
        return qs.stats(int(request.query_params.get("last", "14")))

    def list(self, request, *args, **kwargs):
        # pylint: disable=unused-argument
        stats = OrderedDict(
            projects=self._get_count_by_user(sers.models.Project),
            templates=self._get_count_by_user(sers.models.Template),
            inventories=self._get_count_by_user(sers.models.Inventory),
            groups=self._get_count_by_user(sers.models.Group),
            hosts=self._get_count_by_user(sers.models.Host),
            teams=self._get_count_by_user(sers.models.UserGroup),
            users=self._get_count_by_user(sers.User),
        )
        stats['jobs'] = self._get_history_stats(request)
        return base.Response(stats, status.HTTP_200_OK).resp


class BulkViewSet(views.BulkViewSet):
    pass
