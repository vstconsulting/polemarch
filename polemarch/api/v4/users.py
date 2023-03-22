import re
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.exceptions import ParseError
from rest_framework import fields as drffields
from vstutils.api.responses import HTTP_204_NO_CONTENT
from vstutils.api.auth import (
    UserViewSet as VSTUserViewSet,
    UserSerializer as VSTUserSerializer,
    CreateUserSerializer as VSTCreateUserSerializer,
    OneUserSerializer as VSTOneUserSerializer,
)
from vstutils.api import fields as vstfields
from vstutils.api.base import CopyMixin
from vstutils.api.actions import SimpleAction
from vstutils.api.serializers import BaseSerializer
from ..permissions import CreateUsersPermission, SetOwnerPermission


class UserSerializer(VSTUserSerializer):  # noee
    is_staff = None

    def update(self, instance, validated_data):
        validated_data['is_staff'] = True
        return super().update(instance, validated_data)

    class Meta(VSTUserSerializer.Meta):
        fields = tuple(field for field in VSTUserSerializer.Meta.fields if field != 'is_staff')


class CreateUserSerializer(VSTCreateUserSerializer):  # noee
    is_staff = None

    def create(self, validated_data):
        validated_data['is_staff'] = True
        return super().create(validated_data)

    class Meta(VSTCreateUserSerializer.Meta):
        fields = tuple(filter(lambda field: field != 'is_staff', VSTCreateUserSerializer.Meta.fields))


class OneUserSerializer(UserSerializer):
    email = drffields.EmailField(required=False)

    class Meta(VSTOneUserSerializer.Meta):
        fields = tuple(filter(lambda field: field != 'is_staff', VSTOneUserSerializer.Meta.fields))


class UserViewSet(VSTUserViewSet, CopyMixin):
    """
    Manage users.

    retrieve:
        Return a user instance.

    list:
        Return all users.

    create:
        Create a new user.

    destroy:
        Remove an existing user.

    partial_update:
        Update one or more fields on an existing user.

    update:
        Update a user.
    """
    serializer_class = UserSerializer
    serializer_class_one = OneUserSerializer
    serializer_class_create = CreateUserSerializer
    permission_classes = VSTUserViewSet.permission_classes + (CreateUsersPermission,)

    copy_related = ['groups']
    copy_field_name = 'username'


class TokenView(ObtainAuthToken):
    schema = None

    def delete(self, request, *args, **kwargs):
        token = request.auth
        if token:
            key = token.key
            token.delete()
            return HTTP_204_NO_CONTENT(f'Token {key} removed.')
        raise ParseError('Token not found.')


class OwnerSerializerMixin:
    def create(self, validated_data):
        if 'owner' not in validated_data:
            validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class SetOwnerSerializer(BaseSerializer):
    owner = vstfields.FkModelField(select=UserSerializer, autocomplete_represent='username')


class OwnerViewMixin:
    __ref_name_regex__ = re.compile('Serializer')

    def get_serializer_class(self, *args, **kwargs):
        serializer_class = super().get_serializer_class(*args, **kwargs)

        if serializer_class in (
            getattr(self, 'serializer_class_one', None),
            getattr(self, 'serializer_class_create', None),
        ):
            Meta = getattr(serializer_class, 'Meta', object)  # pylint: disable=invalid-name
            ref_name = getattr(Meta, 'ref_name', self.__ref_name_regex__.sub('', serializer_class.__name__))

            return type(
                serializer_class.__name__,
                (OwnerSerializerMixin, serializer_class),
                {'Meta': type('Meta', (Meta,), {'ref_name': ref_name})}
            )

        return serializer_class

    @SimpleAction(
        serializer_class=SetOwnerSerializer,
        permission_classes=(SetOwnerPermission,),
        methods=['patch']
    )
    def set_owner(self, request, *args, **kwargs):
        """
        Change instance owner.
        """
        return self.get_object()
