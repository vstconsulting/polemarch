# pylint: disable=no-member,unused-argument
import json

import six
from django.contrib.auth.models import User

from rest_framework import serializers
from rest_framework import exceptions

from ...main import models


# Serializers field for usability
class ModelRelatedField(serializers.PrimaryKeyRelatedField):
    def __init__(self, **kwargs):
        model = kwargs.pop("model", None)
        assert not ((model is not None or self.queryset is not None) and
                    kwargs.get('read_only', None)), (
            'Relational fields should not provide a `queryset` or `model`'
            ' argument, when setting read_only=`True`.'
        )
        if model is not None:
            kwargs["queryset"] = model.objects.all()
        super(ModelRelatedField, self).__init__(**kwargs)


class DictField(serializers.CharField):
    def to_internal_value(self, data):
        tstr = isinstance(data, (six.string_types, six.text_type))
        tdict = isinstance(data, dict)
        return data if tdict or tstr else self.fail("Unknown type.")

    def to_representation(self, value):
        return json.loads(value) if not isinstance(value, dict) else value


# Serializers
class UserSerializer(serializers.ModelSerializer):
    raw_password = serializers.HiddenField(default=False, initial=False)

    class UserExist(exceptions.ValidationError):
        status_code = 409

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'password',
                  'raw_password',
                  'is_active',
                  'first_name',
                  'last_name',
                  'email',
                  'url',)
        read_only_fields = ('is_staff',
                            'is_superuser',
                            'date_joined',)

    def create(self, data):
        valid_fields = ['username', 'password',
                        "email", "first_name", "last_name"]
        creditals = {d: data[d] for d in valid_fields if data.get(d, False)}
        raw_passwd = self.initial_data.get("raw_password", "False")
        user = super(UserSerializer, self).create(creditals)
        if not raw_passwd == "True":
            user.set_password(creditals['password'])
            user.save()
        return user

    def is_valid(self, raise_exception=False):
        if self.instance is None:
            try:
                User.objects.get(username=self.initial_data['username'])
                raise self.UserExist({'username': ["Already exists."]})
            except User.DoesNotExist:
                pass
        return super(UserSerializer, self).is_valid(raise_exception)

    def update(self, instance, validated_data):
        instance.username = validated_data.get('username',
                                               instance.username)
        instance.is_active = validated_data.get('is_active',
                                                instance.is_active)
        instance.email = validated_data.get('email',
                                            instance.email)
        instance.first_name = validated_data.get('first_name',
                                                 instance.first_name)
        instance.last_name = validated_data.get('last_name',
                                                instance.last_name)
        if validated_data.get('password', False):
            instance.set_password(validated_data.get('password', None))
        instance.save()
        return instance


class EnvironmentSerializer(serializers.ModelSerializer):
    data = DictField(required=False)
    hosts = serializers.HyperlinkedRelatedField(many=True,
                                                read_only=True,
                                                view_name='host-detail')

    class Meta:
        model = models.Environment
        fields = ('id',
                  'name',
                  'type',
                  'key',
                  'data',
                  'hosts')


class FullHostSerializer(serializers.ModelSerializer):
    nodeid    = serializers.CharField(read_only=True)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'address',
                  'auth_user',
                  'auth_type',
                  'auth_data',
                  'environment',
                  'nodeid',
                  'group',
                  'parent',
                  'url',)


class HostSerializer(FullHostSerializer):
    auth_data = serializers.CharField(write_only=True, required=False,
                                      style={'input_type': 'password'})
    environment = ModelRelatedField(required=False, model=models.Environment)

    class Meta(FullHostSerializer.Meta):
        model = models.Host
        fields = ('id',
                  'name',
                  'address',
                  'auth_user',
                  'auth_type',
                  'auth_data',
                  'environment',
                  'group',
                  'parent',
                  'url',)


class OneHostSerializer(HostSerializer):

    class Meta(FullHostSerializer.Meta):
        pass


class TaskSerializer(serializers.ModelSerializer):

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'group',
                  'parent',
                  'url',)


class OneTaskSerializer(TaskSerializer):

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'group',
                  'parent',
                  'data',)


class ScenarioSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = models.Scenario
        fields = ('id',
                  'name',
                  'tasks',
                  'group',
                  'parent',
                  'url',)


class OneScenarioSerializer(ScenarioSerializer):
    tasks = OneTaskSerializer(many=True, read_only=True)

    class Meta:
        model = models.Scenario
        fields = ('id',
                  'name',
                  'tasks',
                  'group',
                  'parent',
                  'url',)

    def set_tasks(self, tasks):
        return self.instance.set_tasks(tasks)
