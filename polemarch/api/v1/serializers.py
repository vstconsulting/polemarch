# pylint: disable=no-member,unused-argument
from __future__ import unicode_literals
import json

import six
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q

from rest_framework import serializers
from rest_framework import exceptions
# from rest_framework.response import Response

from ...main import models
from ..base import Response


# NOTE: we can freely remove that because according to real behaviour all our
#  models always have queryset at this stage, so this code actually doing
# nothing
#
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
class TemplateSerializer(serializers.ModelSerializer):
    data = DictField(required=True, write_only=True)

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'data',
        )


class OneTemplateSerializer(TemplateSerializer):
    data = DictField(required=True)

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'data',
        )


class UserSerializer(serializers.ModelSerializer):

    class UserExist(exceptions.ValidationError):
        status_code = 409

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'is_staff',
                  'url',)
        read_only_fields = ('is_superuser',)

    def create(self, data):
        if not self.context['request'].user.is_staff:
            raise exceptions.PermissionDenied
        valid_fields = ['username', 'password', 'is_active', 'is_staff',
                        "email", "first_name", "last_name"]
        creditals = {d: data[d] for d in valid_fields
                     if data.get(d, None) is not None}
        raw_passwd = self.initial_data.get("raw_password", "False")
        user = super(UserSerializer, self).create(creditals)
        if not raw_passwd == "True":
            user.set_password(creditals['password'])
            user.save()
        user.related_objects.get_or_create()
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
        if not self.context['request'].user.is_staff and \
                        instance.id != self.context['request'].user.id:
            # can't be tested because PATCH from non privileged user to other
            # user fails at self.get_object() in View
            raise exceptions.PermissionDenied  # nocv
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
        instance.is_staff = validated_data.get('is_staff',
                                               instance.is_staff)
        if validated_data.get('password', False):
            instance.set_password(validated_data.get('password', None))
        instance.save()
        return instance


class OneUserSerializer(UserSerializer):
    raw_password = serializers.HiddenField(default=False, initial=False)

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'password',
                  'raw_password',
                  'is_active',
                  'is_staff',
                  'first_name',
                  'last_name',
                  'email',
                  'url',)
        read_only_fields = ('is_superuser',
                            'date_joined',)


class HistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.History
        fields = ("id",
                  "project",
                  "mode",
                  "kind",
                  "status",
                  "inventory",
                  "start_time",
                  "stop_time",
                  "initiator",
                  "initiator_type",
                  "url")


class OneHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.History
        fields = ("id",
                  "project",
                  "mode",
                  "kind",
                  "status",
                  "start_time",
                  "stop_time",
                  "inventory",
                  "raw_inventory",
                  "raw_args",
                  "raw_stdout",
                  "initiator",
                  "initiator_type",
                  "url")

    def get_facts(self, request):
        return self.instance.facts


class HistoryLinesSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.HistoryLines
        fields = ("line_number",
                  "line",)


class VariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Variable
        fields = ('key',
                  'value',)

    def to_representation(self, instance):
        # we are not using that. This function here just in case.
        return {instance.key: instance.value}  # nocv


class _WithVariablesSerializer(serializers.ModelSerializer):
    operations = dict(DELETE="remove",
                      POST="add",
                      PUT="set",
                      GET="all")

    def _get_objects(self, model, objs_id):
        user = self.context['request'].user
        qs = model.objects.all()
        if not user.is_staff:
            projs = user.related_objects.values_list('projects', flat=True)
            qs = qs.filter(
                Q(related_objects__user=user) |
                Q(related_objects__projects__in=projs)
            )
        return list(qs.filter(id__in=objs_id))

    def get_operation(self, method, data, attr):
        tp = getattr(self.instance, attr)
        obj_list = self._get_objects(tp.model, data)
        return self._operate(method, data, attr, obj_list)

    def _response(self, total, found, code=200):
        data = dict(total=len(total))
        data["operated"] = len(found)
        data["not_found"] = data["total"] - data["operated"]
        return Response(data, status=code)

    @transaction.atomic
    def _do_with_vars(self, method_name, *args, **kwargs):
        method = getattr(super(_WithVariablesSerializer, self), method_name)
        instance = method(*args, **kwargs)
        if method.__name__ == "create":
            user = self.context['request'].user
            instance.related_objects.add(
                models.TypesPermissions.objects.get_or_create(user=user)[0]
            )
        return instance

    @transaction.atomic()
    def _operate(self, method, data, attr, obj_list):
        action = self.operations[method]
        tp = getattr(self.instance, attr)
        if action == "all":
            if attr == "related_objects":
                answer = tp.values_list("user__id", flat=True)
            else:
                answer = tp.values_list("id", flat=True)
            return Response(answer, status=200)
        elif action == "set":
            # Because django<=1.9 does not support .set()
            getattr(tp, "clear")()
            action = "add"
        getattr(tp, action)(*obj_list)
        return self._response(data, obj_list)

    def create(self, validated_data):
        return self._do_with_vars("create", validated_data=validated_data)

    def update(self, instance, validated_data):
        if "children" in validated_data:
            raise exceptions.ValidationError("Children not allowed to update.")
        return self._do_with_vars("update", instance,
                                  validated_data=validated_data)

    def permissions(self, request):
        pms = models.TypesPermissions.objects.filter(user__id__in=request.data)
        return self._operate(request.method, request.data,
                             "related_objects", pms)


class HostSerializer(_WithVariablesSerializer):
    vars = DictField(required=False, write_only=True)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',
                  'vars',
                  'url',)


class OneHostSerializer(HostSerializer):
    vars = DictField(required=False)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',
                  'vars',
                  'url',)


class TaskSerializer(_WithVariablesSerializer):
    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',
                  'project',
                  'url',)


class OneTaskSerializer(TaskSerializer):
    project = ModelRelatedField(read_only=True)
    playbook = serializers.CharField(read_only=True)

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',
                  'project',
                  'url',)


class PeriodictaskSerializer(_WithVariablesSerializer):
    vars = DictField(required=False, write_only=True)
    schedule = serializers.CharField(allow_blank=True)

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'name',
                  'type',
                  'schedule',
                  'mode',
                  'kind',
                  'project',
                  'inventory',
                  'vars',
                  'url',)


class OnePeriodictaskSerializer(PeriodictaskSerializer):
    vars = DictField(required=False)

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'name',
                  'type',
                  'schedule',
                  'mode',
                  'kind',
                  'project',
                  'inventory',
                  'vars',
                  'url',)


###################################
# Subclasses for operations
# with hosts and groups


class _InventoryOperations(_WithVariablesSerializer):

    def hosts_operations(self, method, data):
        return self.get_operation(method, data, attr="hosts")

    def groups_operations(self, method, data):
        return self.get_operation(method, data, attr="groups")


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


class OneGroupSerializer(GroupSerializer, _InventoryOperations):
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

    def hosts_operations(self, method, data):
        if self.instance.children:
            raise self.ValidationException("Group is children.")
        return super(OneGroupSerializer, self).hosts_operations(method, data)

    def groups_operations(self, method, data):
        if not self.instance.children:
            raise self.ValidationException("Group is not children.")
        return super(OneGroupSerializer, self).groups_operations(method, data)


class InventorySerializer(_WithVariablesSerializer):
    vars = DictField(required=False, write_only=True)

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'vars',
                  'url',)


class OneInventorySerializer(InventorySerializer, _InventoryOperations):
    vars   = DictField(required=False)
    hosts  = HostSerializer(read_only=True, many=True, source="hosts_list")
    groups = GroupSerializer(read_only=True, many=True, source="groups_list")

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'hosts',
                  "groups",
                  'vars',
                  'url',)


class ProjectSerializer(_InventoryOperations):
    status = serializers.CharField(read_only=True)
    type   = serializers.CharField(read_only=True)
    vars   = DictField(required=False, write_only=True)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'status',
                  'type',
                  'vars',
                  'url',)

    @transaction.atomic
    def _do_with_vars(self, *args, **kw):
        instance = super(ProjectSerializer, self)._do_with_vars(*args, **kw)
        return instance if instance.repo_class else None


class OneProjectSerializer(ProjectSerializer, _InventoryOperations):
    vars        = DictField(required=False)
    hosts       = HostSerializer(read_only=True, many=True)
    groups      = GroupSerializer(read_only=True, many=True)
    inventories = InventorySerializer(read_only=True, many=True)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'status',
                  'repository',
                  'hosts',
                  "groups",
                  'inventories',
                  'vars',
                  'url',)

    def inventories_operations(self, method, data):
        return self.get_operation(method, data, attr="inventories")

    @transaction.atomic()
    def sync(self):
        self.instance.start_repo_task("sync")
        data = dict(detail="Sync with {}.".format(self.instance.repository))
        return Response(data, 200)

    def _execution(self, kind, request):
        data = dict(request.data)
        inventory_id = int(data.pop("inventory"))
        target = str(data.pop(kind))
        action = getattr(self.instance, "execute_ansible_{}".format(kind))
        history_id = action(
            target, inventory_id, initiator=request.user.id, **data
        )
        rdata = dict(detail="Started at inventory {}.".format(inventory_id),
                     history_id=history_id)
        return Response(rdata, 201)

    def execute_playbook(self, request):
        return self._execution("playbook", request)

    def execute_module(self, request):
        return self._execution("module", request)
