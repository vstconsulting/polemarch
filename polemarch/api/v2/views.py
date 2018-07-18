# pylint: disable=unused-argument,protected-access,too-many-ancestors
from collections import OrderedDict
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from rest_framework import exceptions as excepts, status
from rest_framework.authtoken import views as token_views
from drf_yasg.utils import swagger_auto_schema
from vstutils.api.permissions import StaffPermission
from vstutils.api import base, views, decorators as deco
from vstutils.utils import KVExchanger

from . import filters
from . import serializers as sers
from ...main import utils

yes = True
no = False


class OwnedView(base.ModelViewSetSet):
    POST_WHITE_LIST = []

    @deco.action(methods=["post"], detail=True, serializer_class=sers.SetOwnerSerializer)
    def set_owner(self, request, pk=None):
        '''
        Change instance owner.
        '''
        # pylint: disable=unused-argument
        serializer = sers.SetOwnerSerializer(
            self.get_object(), data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(True)
        serializer.save()
        return base.Response(serializer.data, status.HTTP_201_CREATED).resp


class __VarsViewSet(base.ModelViewSetSet):
    model = sers.models.Variable
    serializer_class = sers.VariableSerializer
    filter_class = filters.VariableFilter


class __ProjectVarsViewSet(__VarsViewSet):
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


class UserViewSet(views.UserViewSet):
    serializer_class = sers.UserSerializer
    serializer_class_one = sers.OneOwnerSerializer

    @deco.action(
        ["post", "delete", "get"], url_path="settings",
        detail=yes, serializer_class=sers.DataSerializer
    )
    def user_settings(self, request, *args, **kwargs):
        obj = self.get_object()
        method = request.method
        if method != "GET":
            obj.settings.data = request.data if method == "POST" else {}
            obj.settings.save()
        return base.Response(obj.settings.data, status.HTTP_200_OK).resp


@deco.nested_view('user', 'id', allow_append=yes, manager_name='users', view=UserViewSet)
class TeamViewSet(OwnedView):
    model = sers.models.UserGroup
    serializer_class = sers.TeamSerializer
    serializer_class_one = sers.OneTeamSerializer
    filter_class = filters.TeamFilter


class __HistoryLineViewSet(base.ReadOnlyModelViewSet):
    schema = None
    model = sers.models.HistoryLines
    serializer_class = sers.HistoryLinesSerializer
    filter_class = filters.HistoryLinesFilter


@method_decorator(name='lines_list', decorator=swagger_auto_schema(auto_schema=None))
@deco.nested_view('lines', manager_name='raw_history_line', view=__HistoryLineViewSet)
class HistoryViewSet(base.HistoryModelViewSet):
    model = sers.models.History
    serializer_class = sers.HistorySerializer
    serializer_class_one = sers.OneHistorySerializer
    filter_class = filters.HistoryFilter
    POST_WHITE_LIST = ['cancel']

    @swagger_auto_schema(auto_schema=None)
    @deco.action(["get"], detail=yes, serializer_class=sers.DataSerializer)
    def raw(self, request, *args, **kwargs):
        result = self.get_serializer(self.get_object()).get_raw(request)
        return HttpResponse(result, content_type="text/plain")

    @deco.action(["post"], detail=yes, serializer_class=sers.DataSerializer)
    def cancel(self, request, *args, **kwargs):
        obj = self.get_object()
        exch = KVExchanger(utils.CmdExecutor.CANCEL_PREFIX + str(obj.id))
        exch.send(True, 60)
        return base.Response("Task canceled: {}".format(obj.id), status.HTTP_200_OK).resp

    @deco.action(["get"], detail=yes, serializer_class=sers.DataSerializer)
    def facts(self, request, *args, **kwargs):
        objs = self.get_serializer(self.get_object()).get_facts(request)
        return base.Response(objs, status.HTTP_200_OK).resp

    @deco.action(["delete"], detail=yes, serializer_class=sers.DataSerializer)
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


@deco.nested_view('variables', 'id', view=__VarsViewSet)
class HostViewSet(OwnedView):
    model = sers.models.Host
    serializer_class = sers.HostSerializer
    serializer_class_one = sers.OneHostSerializer
    filter_class = filters.HostFilter


@deco.nested_view('variables', 'id', view=__VarsViewSet)
class _BaseGroupViewSet(base.ModelViewSetSet):
    model = sers.models.Group
    serializer_class = sers.GroupSerializer
    serializer_class_one = sers.OneGroupSerializer
    filter_class = filters.GroupFilter


@deco.nested_view(
    'host', 'id', manager_name='hosts', allow_append=yes, view=HostViewSet
)
@deco.nested_view(
    'group', 'id', manager_name='groups', allow_append=yes, view=_BaseGroupViewSet
)
class _GroupMixin(OwnedView):
    '''
    Instance with groups and hosts.
    '''


class GroupViewSet(_BaseGroupViewSet, _GroupMixin):

    def nested_allow_check(self):
        exception = _BaseGroupViewSet.serializer_class_one.ValidationException
        if not self.nested_parent_object.children and self.nested_name == 'group':
            raise exception("Group is not children.")
        if self.nested_parent_object.children and self.nested_name == 'host':
            raise exception("Group is children.")


@deco.nested_view('all_groups', 'id', methods=['get'], view=GroupViewSet, subs=None)
@deco.nested_view('all_hosts', 'id', methods=['get'], view=HostViewSet, subs=None)
@deco.nested_view('variables', 'id', view=__VarsViewSet)
class InventoryViewSet(_GroupMixin):
    model = sers.models.Inventory
    serializer_class = sers.InventorySerializer
    serializer_class_one = sers.OneInventorySerializer
    filter_class = filters.InventoryFilter


class __PlaybookViewSet(base.ReadOnlyModelViewSet):
    lookup_field = 'id'
    model = sers.models.Task
    serializer_class = sers.PlaybookSerializer
    serializer_class_one = sers.OnePlaybookSerializer
    filter_class = filters.TaskFilter


class __ModuleViewSet(base.ReadOnlyModelViewSet):
    lookup_field = 'id'
    model = sers.models.Module
    serializer_class = sers.ModuleSerializer
    serializer_class_one = sers.OneModuleSerializer
    filter_class = filters.ModuleFilter


@deco.nested_view('variables', 'id', view=__VarsViewSet)
class __PeriodicTaskViewSet(base.ModelViewSetSet):
    lookup_field = 'id'
    model = sers.models.PeriodicTask
    serializer_class = sers.PeriodictaskSerializer
    serializer_class_one = sers.OnePeriodictaskSerializer
    filter_class = filters.PeriodicTaskFilter

    @deco.action(methods=["post"], detail=yes)
    def execute(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute().resp


@method_decorator(name='execute', decorator=swagger_auto_schema(
    operation_description='Execute template.',
    responses={
        status.HTTP_201_CREATED: sers.ExecuteResponseSerializer(),
    }
))
class __TemplateViewSet(base.ModelViewSetSet):
    model = sers.models.Template
    serializer_class = sers.TemplateSerializer
    serializer_class_one = sers.OneTemplateSerializer
    filter_class = filters.TemplateFilter
    POST_WHITE_LIST = ['execute']

    @deco.action(["post"], detail=yes, serializer_class=sers.TemplateExecSerializer)
    def execute(self, request, *args, **kwargs):
        obj = self.get_object()
        return self.get_serializer(obj).execute(request).resp


@method_decorator(name='execute_module', decorator=swagger_auto_schema(
    operation_description='Execute ansible module.',
    responses={status.HTTP_201_CREATED: sers.ExecuteResponseSerializer(),}
))
@method_decorator(name='execute_playbook', decorator=swagger_auto_schema(
    operation_description='Execute ansible module.',
    responses={status.HTTP_201_CREATED: sers.ExecuteResponseSerializer(),}
))
@method_decorator(name='sync', decorator=swagger_auto_schema(
    operation_description='Sync project repository.',
    responses={status.HTTP_200_OK: sers.ActionResponseSerializer(),}
))
@deco.nested_view(
    'inventory', 'id', manager_name='inventories',
    allow_append=yes, view=InventoryViewSet
)
@deco.nested_view('playbook', 'id', view=__PlaybookViewSet, methods=['get'])
@deco.nested_view('module', 'id', view=__ModuleViewSet, methods=['get'])
@deco.nested_view('template', 'id', manager_name='template', view=__TemplateViewSet)
@deco.nested_view('periodic_task', 'id', view=__PeriodicTaskViewSet)
@deco.nested_view('history', 'id', manager_name='history', view=HistoryViewSet)
@deco.nested_view('variables', 'id', view=__ProjectVarsViewSet)
class ProjectViewSet(_GroupMixin):
    model = sers.models.Project
    serializer_class = sers.ProjectSerializer
    serializer_class_one = sers.OneProjectSerializer
    filter_class = filters.ProjectFilter
    POST_WHITE_LIST = ['sync', 'execute_playbook', 'execute_module']

    @deco.action(methods=["post"], detail=yes, serializer_class=sers.EmptySerializer)
    def sync(self, request, *args, **kwargs):
        return self.get_serializer(self.get_object()).sync().resp

    @deco.action(
        ["post"], url_path="execute-playbook", detail=yes,
        serializer_class=sers.AnsiblePlaybookSerializer
    )
    def execute_playbook(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_playbook(request).resp

    @deco.action(
        ["post"], url_path="execute-module", detail=yes,
        serializer_class=sers.AnsibleModuleSerializer
    )
    def execute_module(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_module(request).resp


class HookViewSet(base.ModelViewSetSet):
    model = sers.models.Hook
    serializer_class = sers.HookSerializer
    filter_class = filters.HookFilter
    permission_classes = (StaffPermission,)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_description='Dashboard statistic.',
    responses={status.HTTP_200_OK: sers.DashboardStatisticSerializer(),}
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
