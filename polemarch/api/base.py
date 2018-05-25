from vstutils.api.base import action


class LimitedPermissionMixin(object):
    def get_extra_queryset(self):
        return self.queryset.user_filter(self.request.user)


class PermissionMixin(LimitedPermissionMixin):  # nocv
    @action(methods=["put", "get"], detail=True)
    def owner(self, request, pk=None):
        # pylint: disable=unused-argument
        serializer = self.get_serializer(self.get_object())
        return serializer.owner(request).resp

    @action(methods=["post", "put", "delete", "get"], detail=True)
    def permissions(self, request, pk=None):
        # pylint: disable=unused-argument
        serializer = self.get_serializer(self.get_object())
        return serializer.permissions(request).resp
