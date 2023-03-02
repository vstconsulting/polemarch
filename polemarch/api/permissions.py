from rest_framework import permissions
from vstutils.utils import lazy_translate as __


class SetOwnerPermission(permissions.IsAuthenticated):
    message = __('Only owner can change owner.')

    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or obj.owner == request.user


class InventoryItemsPermission(permissions.IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        if request.method.lower() == 'get':
            return True
        elif obj.master_project is None:
            return True
        return False


class CreateUsersPermission(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        if view.action == 'create':
            return request.user.is_staff or request.user.is_superuser
        return super().has_permission(request, view)
