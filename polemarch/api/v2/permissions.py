from vstutils.api.base import action
from .serializers import SetOwnerSerializer, Response, status


class LimitedPermissionMixin(object):
    POST_WHITE_LIST = []

    def get_extra_queryset(self):
        return self.queryset.user_filter(self.request.user)


class PermissionMixin(LimitedPermissionMixin):
    @action(methods=["post"], detail=True, serializer_class=SetOwnerSerializer)
    def set_owner(self, request, pk=None):
        '''
        Change instance owner.
        '''
        # pylint: disable=unused-argument
        serializer = SetOwnerSerializer(
            self.get_object(), data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(True)
        serializer.save()
        return Response(serializer.data, status.HTTP_201_CREATED).resp
