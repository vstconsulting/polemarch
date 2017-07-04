# pylint: disable=unused-argument,protected-access,too-many-ancestors
from django.db import transaction
from rest_framework import exceptions as excepts
from rest_framework.authtoken import views as token_views
from rest_framework.decorators import detail_route, list_route
from rest_framework.response import Response

from .. import base
from . import filters
from . import serializers


class TokenView(token_views.ObtainAuthToken):
    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return Response(dict(detail="Token {} removed.".format(key)),
                            status=204)
        raise excepts.ParseError("Token not found.")


class UserViewSet(base.ModelViewSetSet):
    model = serializers.User
    serializer_class = serializers.UserSerializer
    serializer_class_one = serializers.OneUserSerializer
    filter_class = filters.UserFilter

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({"details": "Could not remove youself."},
                            status=409)
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
        return Response(serializer.data)


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
        return Response(self.model.handlers.keys())

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
    serializer_class = serializers.PeriodicTaskSerializer
    serializer_class_one = serializers.OnePeriodicTaskSerializer
    filter_class = filters.PeriodicTaskFilter


class HistoryViewSet(base.HistoryModelViewSet):
    model = serializers.models.History
    serializer_class = serializers.HistorySerializer
    serializer_class_one = serializers.OneHistorySerializer
    filter_class = filters.HistoryFilter
