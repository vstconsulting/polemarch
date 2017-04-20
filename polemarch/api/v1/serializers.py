# pylint: disable=no-member,unused-argument
from __future__ import unicode_literals
import json

import six
from django.contrib.auth.models import User

from rest_framework import serializers
from rest_framework import exceptions
from rest_framework.response import Response

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


class DictSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        return {item.key:item.value for item in data.all()}


class VariableSerializer(serializers.ModelSerializer):
    class Meta:
        list_serializer_class = DictSerializer
        model = models.Variable
        fields = ('key',
                  'value',)

    def to_representation(self, instance):
        return {instance.key: instance.value}


class _WithVariablesSerializer(serializers.ModelSerializer):
    def __do_with_vars(self, method, *args, **kwargs):
        variables = kwargs['validated_data'].pop("vars", None)
        instance = method(*args, **kwargs)
        if variables is not None:
            if isinstance(variables, (six.string_types, six.text_type)):
                variables = json.loads(variables)
            instance.set_vars(variables)
        return instance

    def create(self, validated_data):
        method = super(_WithVariablesSerializer, self).create
        return self.__do_with_vars(method, validated_data=validated_data)

    def update(self, instance, validated_data):
        method = super(_WithVariablesSerializer, self).update
        return self.__do_with_vars(method, instance,
                                   validated_data=validated_data)


class HostSerializer(_WithVariablesSerializer):
    vars = DictField(required=False, write_only=True)
    environment = ModelRelatedField(required=False,
                                    model=models.Environment)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',
                  'environment',
                  'vars',
                  'url',)


class OneHostSerializer(HostSerializer):
    vars = DictField(required=False)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',
                  'environment',
                  'vars',
                  'url',)

###################################
# Subclasses for operations
# with hosts and groups
class _InventoryOperations(_WithVariablesSerializer):
    default_operations = dict(DELETE="remove",
                              POST="add",
                              PUT="update")

    def _response(self, total, found, code):
        data = dict(total=len(total))
        data["operated"] = len(found)
        data["not_found"] = data["total"] - data["operated"]
        return Response(data, status=code)

    def _get_objects(self, model, objs_id):
        return list(model.objects.filter(id__in=objs_id))

    def _operate(self, action, model, attr, objects=None, code=200):
        tp = getattr(self.instance, attr)
        obj_list = self._get_objects(model, objects)
        if action == "set":
            getattr(tp, action)(obj_list)
        else:
            getattr(tp, action)(*obj_list)
        return self._response(objects, obj_list, code)

    def hosts_add(self, data):
        return self._operate("add", models.Host, "hosts", data)

    def hosts_remove(self, data):
        return self._operate("remove", models.Host, "hosts", data, 204)

    def hosts_update(self, data):
        return self._operate("set", models.Host, "hosts", data)

    def groups_add(self, data):
        return self._operate("add", models.Group, "groups", data)

    def groups_remove(self, data):
        return self._operate("remove", models.Group, "groups", data, 204)

    def groups_update(self, data):
        return self._operate("set", models.Group, "groups", data)

    def get_operation(self, request, tp):
        attr = "{}_{}".format(tp, self.default_operations[request.method])
        return getattr(self, attr)(request.data)

###################################
class GroupSerializer(_WithVariablesSerializer):
    vars = DictField(required=False, write_only=True)

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'vars',
                  'children',
                  'url',)

class OneGroupSerializer(HostSerializer, _InventoryOperations):
    vars   = DictField(required=False)
    hosts  = HostSerializer(read_only=True, many=True)
    groups = GroupSerializer(read_only=True, many=True)

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'hosts',
                  "groups",
                  'vars',
                  'children',
                  'url',)

    class ValidationException(exceptions.ValidationError):
        status_code = 409

    def hosts_operations(self, request):
        if self.instance.children:
            raise self.ValidationException("Group is children.")
        return self.get_operation(request, tp="hosts")

    def groups_operations(self, request):
        if not self.instance.children:
            raise self.ValidationException("Group is not children.")
        return self.get_operation(request, tp="groups")
