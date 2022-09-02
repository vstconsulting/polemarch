from typing import Dict, List

from django.db import transaction
from django.utils.functional import cached_property
from django.contrib.auth import get_user_model
from rest_framework import serializers
from vstutils.api import auth as vst_auth
from vstutils.api import serializers as vst_serializers

from ..signals import api_post_save, api_pre_save

User = get_user_model()


def with_signals(func):
    """
    Decorator for send api_pre_save and api_post_save signals from serializers.
    """
    def func_wrapper(*args, **kwargs):
        user = args[0].context['request'].user
        with transaction.atomic():
            instance = func(*args, **kwargs)
            api_pre_save.send(
                sender=instance.__class__, instance=instance, user=user
            )
        with transaction.atomic():
            api_post_save.send(
                sender=instance.__class__, instance=instance, user=user
            )
        return instance

    return func_wrapper


class UserSerializer(vst_auth.UserSerializer):  # noee
    is_staff = None

    @with_signals
    def update(self, instance: User, validated_data: Dict):
        validated_data['is_staff'] = True
        return super().update(instance, validated_data)

    class Meta(vst_auth.UserSerializer.Meta):
        fields = tuple(filter(lambda field: field != 'is_staff', vst_auth.UserSerializer.Meta.fields))


class _SignalSerializer(vst_serializers.VSTSerializer):
    @cached_property
    def _writable_fields(self) -> List:  # pylint: disable=invalid-overridden-method
        writable_fields = super()._writable_fields
        fields_of_serializer = []
        attrs = [
            'field_name', 'source_attrs', 'source',
            'read_only', 'required', 'write_only', 'default'
        ]
        for field in writable_fields:
            if not isinstance(field, vst_serializers.DataSerializer):
                fields_of_serializer.append(field)
                continue
            field_object = serializers.DictField()
            for attr in attrs:
                setattr(field_object, attr, getattr(field, attr, None))
            fields_of_serializer.append(field_object)
        return fields_of_serializer

    @with_signals
    def create(self, validated_data):
        return super().create(validated_data)

    @with_signals
    def update(self, instance, validated_data):
        return super().update(instance, validated_data)


class _WithPermissionsSerializer(_SignalSerializer):
    perms_msg = "You do not have permission to perform this action."

    def is_valid(self, *args, **kwargs):
        result = super().is_valid(*args, **kwargs)
        if not hasattr(self, 'instance') or self.instance is None:  # noce
            self.validated_data['owner'] = self.validated_data.get(
                'owner', self.current_user()
            )
        return result

    def current_user(self) -> User:
        return self.context['request'].user  # noce
