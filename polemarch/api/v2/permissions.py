from rest_framework import permissions


class ModelPermission(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        # pylint: disable=useless-super-delegation
        return super(ModelPermission, self).has_permission(request, view)

    def get_user_permission(self, request, view, obj):  # nocv
        # pylint: disable=unused-argument
        if hasattr(obj, 'owner') and obj.owner == request.user:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return self.get_user_permission(request, view, obj)  # nocv


class InventoryItemsPermission(permissions.IsAuthenticated):

    def has_object_permission(self, request, view, obj):
        if request.method.lower() == 'get':
            return True
        elif obj.master_project is None:
            return True
        return False
