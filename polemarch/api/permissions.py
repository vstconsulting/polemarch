import re
from rest_framework import permissions
from rest_framework.exceptions import NotFound
from vstutils.utils import lazy_translate as __


class SetOwnerPermission(permissions.IsAuthenticated):
    message = __('Only owner can change owner.')

    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or obj.owner == request.user


class InventoryPluginPermission(permissions.IsAuthenticated):
    state_managed_actions_regex = re.compile(r'^state$')
    db_managed_actions_regex = re.compile('|'.join((
        r'^variables',
        r'^hosts',
        r'^group',
        r'^all_hosts',
        r'^all_groups',
    )))

    def has_object_permission(self, request, view, obj):
        if obj.plugin_object.state_managed and self.db_managed_actions_regex.match(view.action):
            raise NotFound
        if not obj.plugin_object.state_managed and self.state_managed_actions_regex.match(view.action):
            raise NotFound
        return super().has_object_permission(request, view, obj)


class CreateUsersPermission(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        if view.action == 'create':
            return request.user.is_staff or request.user.is_superuser
        return super().has_permission(request, view)
