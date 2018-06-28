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


class _VarsMixin(base.ModelViewSetSet):
    var_serializer_class = serializers.VariableSerializer
    var_filter_class = filters.VariableFilter

    @base.nested_action('variables', 'id')
    def variables(self, request):
        return self.dispatch_route_instance(
            self.var_serializer_class, self.var_filter_class, request
        )


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


class HostViewSet(_VarsMixin, PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.Host
    serializer_class = serializers.HostSerializer
    serializer_class_one = serializers.OneHostSerializer
    filter_class = filters.HostFilter


class _GroupMixin(base.ModelViewSetSet):

    @base.nested_action('host', 'id', manager_name='hosts', allow_append=True)
    def host(self, request):
        return self.dispatch_route_instance(
            (HostViewSet.serializer_class, HostViewSet.serializer_class_one),
            HostViewSet.filter_class, request
        )

    @base.nested_action('group', 'id', manager_name='groups',  allow_append=True)
    def group(self, request):
        return self.dispatch_route_instance(
            (GroupViewSet.serializer_class, GroupViewSet.serializer_class_one),
            GroupViewSet.filter_class, request
        )


class GroupViewSet(_VarsMixin, _GroupMixin, PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.Group
    serializer_class = serializers.GroupSerializer
    serializer_class_one = serializers.OneGroupSerializer
    filter_class = filters.GroupFilter

    def nested_allow_check(self):
        if not self.nested_parent_object.children and self.nested_name == 'group':
            raise excepts.ValidationError("Group is not children.")
        if self.nested_parent_object.children and self.nested_name == 'host':
            raise excepts.ValidationError("Group is children.")


class InventoryViewSet(_VarsMixin, _GroupMixin, PermissionMixin, base.ModelViewSetSet):
    model = serializers.models.Inventory
    serializer_class = serializers.InventorySerializer
    serializer_class_one = serializers.OneInventorySerializer
    filter_class = filters.InventoryFilter


class BulkViewSet(views.BulkViewSet):
    pass
