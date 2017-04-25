from rest_framework import permissions


class ModelPermission(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        return super(ModelPermission, self).has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        elif request.user == obj:
            return True
        return bool(obj.related_objects.filter(user=request.user).count())
