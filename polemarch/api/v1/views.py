# pylint: disable=unused-argument,protected-access,too-many-ancestors
from collections import OrderedDict
from django.http import HttpResponse
from rest_framework import exceptions as excepts
from rest_framework.authtoken import views as token_views
from vstutils.api.permissions import StaffPermission
from vstutils.api import base, views
from vstutils.utils import KVExchanger

from . import filters
from . import serializers
from ..base import PermissionMixin, LimitedPermissionMixin
from ...main import utils


class TokenView(token_views.ObtainAuthToken):
    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return base.Response("Token {} removed.".format(key), 204).resp
        raise excepts.ParseError("Token not found.")


class UserViewSet(views.UserViewSet):
    serializer_class = serializers.UserSerializer
    serializer_class_one = serializers.OneUserSerializer

    @base.action(methods=["post", "delete", "get"], url_path="settings", detail=True)
    def user_settings(self, request, *args, **kwargs):
        obj = self.get_object()
        method = request.method
        if method != "GET":
            obj.settings.data = request.data if method == "POST" else {}
            obj.settings.save()
        return base.Response(obj.settings.data, 200).resp


class TeamViewSet(PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.UserGroup
    serializer_class = serializers.TeamSerializer
    serializer_class_one = serializers.OneTeamSerializer
    filter_class = filters.TeamFilter

    def get_extra_queryset(self):
        return self.queryset


class HostViewSet(PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.Host
    serializer_class = serializers.HostSerializer
    serializer_class_one = serializers.OneHostSerializer
    filter_class = filters.HostFilter


class _GroupedViewSet(object):
    # pylint: disable=no-member

    def _get_result(self, request, operation):
        return operation(request.method, request.data).resp

    @base.action(methods=["post", "put", "delete", "get"], detail=True)
    def hosts(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return self._get_result(request, serializer.hosts_operations)

    @base.action(methods=["post", "put", "delete", "get"], detail=True)
    def groups(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return self._get_result(request, serializer.groups_operations)


class GroupViewSet(PermissionMixin, base.ModelViewSetSet, _GroupedViewSet):
    model = serializers.models.Group
    serializer_class = serializers.GroupSerializer
    serializer_class_one = serializers.OneGroupSerializer
    filter_class = filters.GroupFilter


class InventoryViewSet(base.ModelViewSetSet, _GroupedViewSet):
    model = serializers.models.Inventory
    serializer_class = serializers.InventorySerializer
    serializer_class_one = serializers.OneInventorySerializer
    filter_class = filters.InventoryFilter


class ProjectViewSet(PermissionMixin, base.ModelViewSetSet, _GroupedViewSet):
    model = serializers.models.Project
    serializer_class = serializers.ProjectSerializer
    serializer_class_one = serializers.OneProjectSerializer
    filter_class = filters.ProjectFilter
    POST_WHITE_LIST = ['sync', 'execute_playbook', 'execute_module']

    @base.action(methods=["get"], url_path="supported-repos", detail=False)
    def supported_repos(self, request):
        return base.Response(self.model.handlers.keys(), 200).resp

    @base.action(methods=["post", "put", "delete", "get"], detail=True)
    def inventories(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return self._get_result(request, serializer.inventories_operations)

    @base.action(methods=["post"], detail=True)
    def sync(self, request, *args, **kwargs):
        return self.get_serializer(self.get_object()).sync().resp

    @base.action(methods=["post"], url_path="execute-playbook", detail=True)
    def execute_playbook(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_playbook(request).resp

    @base.action(methods=["post"], url_path="execute-module", detail=True)
    def execute_module(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute_module(request).resp


class TaskViewSet(LimitedPermissionMixin, base.ReadOnlyModelViewSet):
    model = serializers.models.Task
    serializer_class = serializers.TaskSerializer
    serializer_class_one = serializers.OneTaskSerializer
    filter_class = filters.TaskFilter


class PeriodicTaskViewSet(LimitedPermissionMixin, base.ModelViewSetSet):
    model = serializers.models.PeriodicTask
    serializer_class = serializers.PeriodictaskSerializer
    serializer_class_one = serializers.OnePeriodictaskSerializer
    filter_class = filters.PeriodicTaskFilter
    POST_WHITE_LIST = ['execute']

    @base.action(methods=["post"], detail=True)
    def execute(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.execute().resp


class HistoryViewSet(LimitedPermissionMixin, base.HistoryModelViewSet):
    model = serializers.models.History
    serializer_class = serializers.HistorySerializer
    serializer_class_one = serializers.OneHistorySerializer
    filter_class = filters.HistoryFilter
    POST_WHITE_LIST = ['cancel']

    @base.action(methods=["get"], detail=True)
    def raw(self, request, *args, **kwargs):
        result = self.get_serializer(self.get_object()).get_raw(request)
        return HttpResponse(result, content_type="text/plain")

    @base.action(methods=["get"], detail=True)
    def lines(self, request, *args, **kwargs):
        return self.get_paginated_route_response(
            self.get_object().raw_history_line.order_by("-line_number"),
            serializers.HistoryLinesSerializer,
            filters.HistoryLinesFilter
        )

    @base.action(methods=["post"], detail=True)
    def cancel(self, request, *args, **kwargs):
        obj = self.get_object()
        exch = KVExchanger(utils.CmdExecutor.CANCEL_PREFIX + str(obj.id))
        exch.send(True, 10)
        return base.Response("Task canceled: {}".format(obj.id), 200).resp

    @base.action(methods=["get"], detail=True)
    def facts(self, request, *args, **kwargs):
        objs = self.get_serializer(self.get_object()).get_facts(request)
        return base.Response(objs, 200).resp

    @base.action(methods=["delete"], detail=True)
    def clear(self, request, *args, **kwargs):
        default_message = "Output trancated.\n"
        obj = self.get_object()
        if obj.status in ["RUN", "DELAY"] or obj.raw_stdout == default_message:
            raise excepts.NotAcceptable(
                "Job is running or already trancated"
            )
        obj.raw_stdout = default_message
        result = self.get_serializer(obj).get_raw(request)
        return base.Response(result, 204).resp


class TemplateViewSet(PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.Template
    serializer_class = serializers.TemplateSerializer
    serializer_class_one = serializers.OneTemplateSerializer
    filter_class = filters.TemplateFilter
    POST_WHITE_LIST = ['execute']

    @base.action(methods=["get"], url_path="supported-kinds", detail=False)
    def supported_kinds(self, request):
        return base.Response(self.model.template_fields, 200).resp

    @base.action(methods=["post"], detail=True)
    def execute(self, request, *args, **kwargs):
        obj = self.get_object()
        return self.get_serializer(obj).execute(request).resp


class HookViewSet(base.ModelViewSetSet):
    model = serializers.models.Hook
    serializer_class = serializers.HookSerializer
    filter_class = filters.HookFilter
    permission_classes = (StaffPermission,)

    @base.action(['get'], detail=False)
    def types(self, request):
        data = dict(
            types=self.model.handlers.list().keys(),
            when=self.model.handlers.when_types_names
        )
        return base.Response(data, 200).resp


class BulkViewSet(views.BulkViewSet):
    type_to_bulk = {
        "host": "hosts",
        "group": "groups",
        "inventory": "inventories",
        "project": "projects",
        "periodictask": "periodic-tasks",
        "template": "templates",
        "user": "users",
        "team": "teams",
        "hook": "hooks",
    }


class AnsibleViewSet(base.ListNonModelViewSet):
    # pylint: disable=abstract-method
    base_name = "ansible"

    @base.action(methods=["get"], detail=False)
    def cli_reference(self, request):
        reference = utils.AnsibleArgumentsReference()
        return base.Response(reference.as_gui_dict(
            request.query_params.get("filter", "")
        ), 200).resp

    @base.action(methods=["get"], detail=False)
    def modules(self, request):
        detailed = int(request.query_params.get("detailed", "0"))
        fields = request.query_params.get("fields", "")
        _mods = utils.AnsibleModules(detailed, fields).get(
            request.query_params.get("filter", "")
        )
        return base.Response(_mods, 200).resp


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
        return base.Response(stats, 200).resp
