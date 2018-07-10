# pylint: disable=unused-argument,protected-access,too-many-ancestors
from collections import OrderedDict
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from rest_framework import exceptions as excepts, status
from rest_framework.authtoken import views as token_views
from drf_yasg.utils import swagger_auto_schema
from vstutils.api.permissions import StaffPermission
from vstutils.api import base, views
from vstutils.utils import KVExchanger

from . import filters
from . import serializers
from ..base import PermissionMixin, LimitedPermissionMixin
from ...main import utils

yes = True
no = False


class __VarsViewSet(base.ModelViewSetSet):
    model = serializers.models.Variable
    serializer_class = serializers.VariableSerializer
    filter_class = filters.VariableFilter


class __ProjectVarsViewSet(__VarsViewSet):
    serializer_class = serializers.ProjectVariableSerializer


class TokenView(token_views.ObtainAuthToken):
    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return base.Response(
                "Token {} removed.".format(key), status.HTTP_204_NO_CONTENT
            ).resp
        raise excepts.ParseError("Token not found.")


class UserViewSet(views.UserViewSet):
    serializer_class = serializers.UserSerializer
    serializer_class_one = serializers.OneUserSerializer

    @base.action(
        ["post", "delete", "get"], url_path="settings",
        detail=yes, serializer_class=serializers.DataSerializer
    )
    def user_settings(self, request, *args, **kwargs):
        obj = self.get_object()
        method = request.method
        if method != "GET":
            obj.settings.data = request.data if method == "POST" else {}
            obj.settings.save()
        return base.Response(obj.settings.data, status.HTTP_200_OK).resp


@base.nested_view('user', 'id', allow_append=yes, manager_name='users', view=UserViewSet)
class TeamViewSet(PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.UserGroup
    serializer_class = serializers.TeamSerializer
    serializer_class_one = serializers.OneTeamSerializer
    filter_class = filters.TeamFilter

    def get_extra_queryset(self):
        return self.queryset


class __HistoryLineViewSet(base.ModelViewSetSet):
    model = serializers.models.HistoryLines
    serializer_class = serializers.HistoryLinesSerializer
    filter_class = filters.HistoryLinesFilter


@base.nested_view('lines', manager_name='raw_history_line', view=__HistoryLineViewSet)
class HistoryViewSet(LimitedPermissionMixin, base.HistoryModelViewSet):
    model = serializers.models.History
    serializer_class = serializers.HistorySerializer
    serializer_class_one = serializers.OneHistorySerializer
    filter_class = filters.HistoryFilter
    POST_WHITE_LIST = ['cancel']

    @base.action(["get"], detail=yes, serializer_class=serializers.DataSerializer)
    def raw(self, request, *args, **kwargs):
        result = self.get_serializer(self.get_object()).get_raw(request)
        return HttpResponse(result, content_type="text/plain")

    @base.action(["post"], detail=yes, serializer_class=serializers.DataSerializer)
    def cancel(self, request, *args, **kwargs):
        obj = self.get_object()
        exch = KVExchanger(utils.CmdExecutor.CANCEL_PREFIX + str(obj.id))
        exch.send(True, 60)
        return base.Response("Task canceled: {}".format(obj.id), status.HTTP_200_OK).resp

    @base.action(["get"], detail=yes, serializer_class=serializers.DataSerializer)
    def facts(self, request, *args, **kwargs):
        objs = self.get_serializer(self.get_object()).get_facts(request)
        return base.Response(objs, status.HTTP_200_OK).resp

    @base.action(["delete"], detail=yes, serializer_class=serializers.DataSerializer)
    def clear(self, request, *args, **kwargs):
        default_message = "Output trancated.\n"
        obj = self.get_object()
        if obj.status in ["RUN", "DELAY"] or obj.raw_stdout == default_message:  # nocv
            raise excepts.NotAcceptable(
                "Job is running or already trancated"
            )
        obj.raw_stdout = default_message
        result = self.get_serializer(obj).get_raw(request)
        return base.Response(result, status.HTTP_204_NO_CONTENT).resp


@base.nested_view('variables', 'id', view=__VarsViewSet)
class HostViewSet(PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.Host
    serializer_class = serializers.HostSerializer
    serializer_class_one = serializers.OneHostSerializer
    filter_class = filters.HostFilter


@base.nested_view('variables', 'id', view=__VarsViewSet)
class _BaseGroupViewSet(base.ModelViewSetSet):
    model = serializers.models.Group
    serializer_class = serializers.GroupSerializer
    serializer_class_one = serializers.OneGroupSerializer
    filter_class = filters.GroupFilter


@base.nested_view(
    'host', 'id', manager_name='hosts', allow_append=yes, view=HostViewSet
)
@base.nested_view(
    'group', 'id', manager_name='groups', allow_append=yes, view=_BaseGroupViewSet
)
class _GroupMixin(base.ModelViewSetSet):
    '''
    Instance with groups and hosts.
    '''


class GroupViewSet(_BaseGroupViewSet, _GroupMixin, PermissionMixin):

    def nested_allow_check(self):
        exception = _BaseGroupViewSet.serializer_class_one.ValidationException
        if not self.nested_parent_object.children and self.nested_name == 'group':
            raise exception("Group is not children.")
        if self.nested_parent_object.children and self.nested_name == 'host':
            raise exception("Group is children.")


@base.nested_view('all_groups', 'id', methods=['get'], view=GroupViewSet, subs=None)
@base.nested_view('all_hosts', 'id', methods=['get'], view=HostViewSet, subs=None)
@base.nested_view('variables', 'id', view=__VarsViewSet)
class InventoryViewSet(_GroupMixin, PermissionMixin):
    model = serializers.models.Inventory
    serializer_class = serializers.InventorySerializer
    serializer_class_one = serializers.OneInventorySerializer
    filter_class = filters.InventoryFilter


class __PlaybookViewSet(base.ReadOnlyModelViewSet):
    lookup_field = 'id'
    model = serializers.models.Task
    serializer_class = serializers.PlaybookSerializer
    serializer_class_one = serializers.OnePlaybookSerializer
    filter_class = filters.TaskFilter



class __ModuleViewSet(base.ReadOnlyModelViewSet):
    lookup_field = 'id'
    model = serializers.models.Module
    serializer_class = serializers.ModuleSerializer
    serializer_class_one = serializers.OneModuleSerializer
    filter_class = filters.ModuleFilter


@base.nested_view('variables', 'id', view=__VarsViewSet)
class __PeriodicTaskViewSet(base.ModelViewSetSet, LimitedPermissionMixin):
    lookup_field = 'id'
    model = serializers.models.PeriodicTask
    serializer_class = serializers.PeriodictaskSerializer
    serializer_class_one = serializers.OnePeriodictaskSerializer
    filter_class = filters.PeriodicTaskFilter

    @base.action(methods=["post"], detail=yes)
    def execute(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute().resp


@method_decorator(name='execute', decorator=swagger_auto_schema(
    operation_description='Execute template.',
    responses={
        status.HTTP_201_CREATED: serializers.ExecuteResponseSerializer(),
    }
))
class __TemplateViewSet(base.ModelViewSetSet):
    model = serializers.models.Template
    serializer_class = serializers.TemplateSerializer
    serializer_class_one = serializers.OneTemplateSerializer
    filter_class = filters.TemplateFilter
    POST_WHITE_LIST = ['execute']

    @base.action(["post"], detail=yes, serializer_class=serializers.TemplateExecSerializer)
    def execute(self, request, *args, **kwargs):
        obj = self.get_object()
        return self.get_serializer(obj).execute(request).resp


@method_decorator(name='execute_module', decorator=swagger_auto_schema(
    operation_description='Execute ansible module.',
    responses={
        status.HTTP_201_CREATED: serializers.ExecuteResponseSerializer(),
    }
))
@method_decorator(name='execute_playbook', decorator=swagger_auto_schema(
    operation_description='Execute ansible module.',
    responses={
        status.HTTP_201_CREATED: serializers.ExecuteResponseSerializer(),
    }
))
@method_decorator(name='sync', decorator=swagger_auto_schema(
    operation_description='Sync project repository.',
    responses={
        status.HTTP_200_OK: serializers.ActionResponseSerializer(),
    }
))
@base.nested_view(
    'inventory', 'id', manager_name='inventories',
    allow_append=yes, view=InventoryViewSet
)
@base.nested_view('periodic_task', 'id', allow_append=yes, view=__PeriodicTaskViewSet)
@base.nested_view('playbook', 'id', view=__PlaybookViewSet, methods=['get'])
@base.nested_view('module', 'id', view=__ModuleViewSet, methods=['get'])
@base.nested_view('template', 'id', manager_name='template', view=__TemplateViewSet)
@base.nested_view('history', 'id', manager_name='history', view=HistoryViewSet)
@base.nested_view('variables', 'id', view=__ProjectVarsViewSet)
class ProjectViewSet(_GroupMixin, PermissionMixin):
    model = serializers.models.Project
    serializer_class = serializers.ProjectSerializer
    serializer_class_one = serializers.OneProjectSerializer
    filter_class = filters.ProjectFilter
    POST_WHITE_LIST = ['sync', 'execute_playbook', 'execute_module']

    @base.action(
        methods=["post"], detail=yes, serializer_class=serializers.EmptySerializer
    )
    def sync(self, request, *args, **kwargs):
        return self.get_serializer(self.get_object()).sync().resp

    @base.action(
        ["post"], url_path="execute-playbook", detail=yes,
        serializer_class=serializers.AnsiblePlaybookSerializer
    )
    def execute_playbook(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_playbook(request).resp

    @base.action(
        ["post"], url_path="execute-module", detail=yes,
        serializer_class=serializers.AnsibleModuleSerializer
    )
    def execute_module(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_module(request).resp


class HookViewSet(base.ModelViewSetSet):
    model = serializers.models.Hook
    serializer_class = serializers.HookSerializer
    filter_class = filters.HookFilter
    permission_classes = (StaffPermission,)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_description='Dashboard statistic.',
    responses={
        status.HTTP_200_OK: serializers.DashboardStatisticSerializer(),
    }
))
class StatisticViewSet(base.ListNonModelViewSet):
    base_name = "stats"

    def _get_count_by_user(self, model):
        user = self.request.user
        filter_models = (serializers.User,)
        if model not in filter_models:
            return model.objects.all().user_filter(user).count()
        return model.objects.all().count()

    def _get_history_stats(self, request):
        qs = serializers.models.History.objects.all()
        qs = qs.user_filter(self.request.user)
        return qs.stats(int(request.query_params.get("last", "14")))

    def list(self, request, *args, **kwargs):
        # pylint: disable=unused-argument
        stats = OrderedDict(
            projects=self._get_count_by_user(serializers.models.Project),
            templates=self._get_count_by_user(serializers.models.Template),
            inventories=self._get_count_by_user(serializers.models.Inventory),
            groups=self._get_count_by_user(serializers.models.Group),
            hosts=self._get_count_by_user(serializers.models.Host),
            teams=self._get_count_by_user(serializers.models.UserGroup),
            users=self._get_count_by_user(serializers.User),
        )
        stats['jobs'] = self._get_history_stats(request)
        return base.Response(stats, status.HTTP_200_OK).resp


class BulkViewSet(views.BulkViewSet):
    pass
