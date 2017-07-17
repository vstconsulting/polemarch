# pylint: disable=unused-argument,protected-access,too-many-ancestors
from django.db import transaction
from django.http import HttpResponse
from rest_framework import exceptions as excepts, views as rest_views
from rest_framework.authtoken import views as token_views
from rest_framework.decorators import detail_route, list_route

from .. import base
from ..permissions import SuperUserPermission, StaffPermission
from . import filters
from . import serializers


class TokenView(token_views.ObtainAuthToken):
    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return base.Response("Token {} removed.".format(key), 204).resp
        raise excepts.ParseError("Token not found.")


class UserViewSet(base.ModelViewSetSet):
    model = serializers.User
    serializer_class = serializers.UserSerializer
    serializer_class_one = serializers.OneUserSerializer
    filter_class = filters.UserFilter
    permission_classes = (SuperUserPermission,)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return base.Response("Could not remove youself.", 409).resp
        else:
            return super(UserViewSet, self).destroy(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self.update(request, partial=True)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance,
                                         data=request.data,
                                         partial=partial)
        if not serializer.is_valid(raise_exception=False):
            raise Exception("Invalid data was sended.")
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return base.Response(serializer.data, 200).resp


class HostViewSet(base.ModelViewSetSet):
    model = serializers.models.Host
    serializer_class = serializers.HostSerializer
    serializer_class_one = serializers.OneHostSerializer
    filter_class = filters.HostFilter


class _GroupedViewSet(object):
    # pylint: disable=no-member

    @detail_route(methods=["post", "put", "delete", "get"])
    def hosts(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.hosts_operations(request)

    @detail_route(methods=["post", "put", "delete", "get"])
    def groups(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.groups_operations(request)


class GroupViewSet(base.ModelViewSetSet, _GroupedViewSet):
    model = serializers.models.Group
    serializer_class = serializers.GroupSerializer
    serializer_class_one = serializers.OneGroupSerializer
    filter_class = filters.GroupFilter


class InventoryViewSet(base.ModelViewSetSet, _GroupedViewSet):
    model = serializers.models.Inventory
    serializer_class = serializers.InventorySerializer
    serializer_class_one = serializers.OneInventorySerializer
    filter_class = filters.InventoryFilter


class ProjectViewSet(base.ModelViewSetSet, _GroupedViewSet):
    model = serializers.models.Project
    serializer_class = serializers.ProjectSerializer
    serializer_class_one = serializers.OneProjectSerializer
    filter_class = filters.ProjectFilter

    @list_route(methods=["get"], url_path="supported-repos")
    def supported_repos(self, request):
        return base.Response(self.model.handlers.keys(), 200).resp

    @detail_route(methods=["post", "put", "delete", "get"])
    def inventories(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.inventories_operations(request)

    @detail_route(methods=["post"])
    def sync(self, request, *args, **kwargs):
        return self.get_serializer(self.get_object()).sync()

    @detail_route(methods=["post"])
    def execute(self, request, *args, **kwargs):
        return self.get_serializer(self.get_object()).execute(request)


class TaskViewSet(base.ReadOnlyModelViewSet):
    model = serializers.models.Task
    serializer_class = serializers.TaskSerializer
    serializer_class_one = serializers.OneTaskSerializer
    filter_class = filters.TaskFilter


class PeriodicTaskViewSet(base.ModelViewSetSet):
    model = serializers.models.PeriodicTask
    serializer_class = serializers.PeriodictaskSerializer
    serializer_class_one = serializers.OnePeriodictaskSerializer
    filter_class = filters.PeriodicTaskFilter


class HistoryViewSet(base.HistoryModelViewSet):
    model = serializers.models.History
    serializer_class = serializers.HistorySerializer
    serializer_class_one = serializers.OneHistorySerializer
    filter_class = filters.HistoryFilter

    @detail_route(methods=["get"])
    def raw(self, request, *args, **kwargs):
        obj = self.get_object()
        return HttpResponse(obj.raw_stdout, content_type="text/plain")

    @detail_route(methods=["get"])
    def lines(self, request, *args, **kwargs):
        return self.get_paginated_route_response(
            self.get_object().raw_history_line.order_by("-line_number"),
            serializers.HistoryLinesSerializer
        )


class BulkViewSet(rest_views.APIView):
    permission_classes = (StaffPermission,)

    _op_types = {
        "add": "perform_create",
        "set": "perform_update",
        "del": "perform_delete"
    }
    _allowed_types = [
        'host', 'group', 'inventory', 'project', 'periodictask'
    ]

    def get_serializer_class(self, item):
        if item not in self._allowed_types:
            raise excepts.UnsupportedMediaType(media_type=item)
        item = "One{}Serializer".format(item.title())
        return getattr(serializers, item)

    def get_serializer(self, *args, **kwargs):
        kwargs["context"] = {'request': self.request}
        return self.get_serializer_class(kwargs.pop("item"))(*args, **kwargs)

    def get_object(self, item, pk):
        serializer_class = self.get_serializer_class(item)
        model = serializer_class.Meta.model
        return model.objects.get(pk=pk)

    def perform_create(self, item, data):
        serializer = self.get_serializer(data=data, item=item)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return base.Response(serializer.data, 201).resp_dict

    def perform_update(self, item, pk, data):
        instance = self.get_object(item, pk)
        serializer = self.get_serializer(instance, data=data, partial=True,
                                         item=item)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return base.Response(serializer.data, 200).resp_dict

    def perform_delete(self, item, pk):
        instance = self.get_object(item, pk)
        instance.delete()
        return base.Response("Ok", 200).resp_dict

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        operations = request.data
        results = []
        for operation in operations:
            perf_method = getattr(self, self._op_types[operation.pop("type")])
            results.append(perf_method(**operation))
        return base.Response(results, 200).resp

    def get(self, request):
        response = {
            "allowed_types": self._allowed_types,
            "operations_types": self._op_types.keys(),
        }
        return base.Response(response, 200).resp
