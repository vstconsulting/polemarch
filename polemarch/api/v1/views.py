# pylint: disable=unused-argument,protected-access,too-many-ancestors
from django.db import transaction
from rest_framework import permissions, exceptions as excepts
from rest_framework.decorators import detail_route, list_route
from rest_framework.response import Response

from .. import base
from . import filters
from . import serializers


class UserViewSet(base.ModelViewSetSet):
    model = serializers.User
    serializer_class = serializers.UserSerializer
    serializer_class_one = serializers.OneUserSerializer
    filter_class = filters.UserFilter

    @detail_route(methods=['post'],
                  permission_classes=[permissions.IsAuthenticated])
    def set_password(self, request, pk=None):
        user = self.get_object()
        if not self.request.user.is_superuser and user != request.user:
            raise excepts.PermissionDenied  # pragma: no cover
        data = request.data
        user.set_password(data['password'])
        user.save()
        return Response({"status": user.password})

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


class EnvironmentViewSet(base.ModelViewSetSet):
    model = serializers.models.Environment
    serializer_class = serializers.EnvironmentSerializer
    filter_class = filters.EnvironmentsFilter

    @list_route(methods=['post'])
    def additionals(self, request):
        return Response(self.model(**request.data).additionals)

    @list_route(methods=['get'])
    def types(self, request):
        return Response(self.model.objects.get_integrations())


class HostViewSet(base.ModelViewSetSet):
    model = serializers.models.Host
    serializer_class = serializers.HostSerializer
    serializer_class_one = serializers.OneHostSerializer
    filter_class = filters.HostFilter


class GroupViewSet(base.ModelViewSetSet):
    model = serializers.models.Group
    serializer_class = serializers.GroupSerializer
    serializer_class_one = serializers.OneGroupSerializer
    filter_class = filters.GroupFilter

    @detail_route(methods=["post", "put", "delete", "get"])
    def hosts(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.hosts_operations(request)

    @detail_route(methods=["post", "put", "delete", "get"])
    def groups(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.groups_operations(request)


class InventoryViewSet(base.ModelViewSetSet):
    model = serializers.models.Inventory
    serializer_class = serializers.InventorySerializer
    serializer_class_one = serializers.OneInventorySerializer
    filter_class = filters.InventoryFilter

    @detail_route(methods=["post", "put", "delete", "get"])
    def hosts(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.hosts_operations(request)

    @detail_route(methods=["post", "put", "delete", "get"])
    def groups(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.groups_operations(request)


class ProjectViewSet(base.ModelViewSetSet):
    model = serializers.models.Project
    serializer_class = serializers.ProjectSerializer
    serializer_class_one = serializers.OneProjectSerializer
    filter_class = filters.ProjectFilter

    @list_route(methods=["get"], url_path="supported-repos")
    def supported_repos(self, request):
        return Response(self.get_queryset().repo_types().keys())

    @detail_route(methods=["post", "put", "delete", "get"])
    def hosts(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.hosts_operations(request)

    @detail_route(methods=["post", "put", "delete", "get"])
    def groups(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.groups_operations(request)

    @detail_route(methods=["post", "put", "delete", "get"])
    def inventories(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return serializer.inventories_operations(request)

    @detail_route(methods=["post"])
    def sync(self, request, *args, **kwargs):
        return self.get_serializer(self.get_object()).sync()


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
