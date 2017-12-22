# pylint: disable=no-member,unused-argument
from __future__ import unicode_literals
import json

import re
import six
from django import dispatch
from django.contrib.auth.models import User
from django.db import transaction

from rest_framework import serializers
from rest_framework import exceptions
from rest_framework.exceptions import PermissionDenied

from ...main.models import Inventory
from ...main import models, exceptions as main_exceptions
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
        return (
            data
            if (
                isinstance(data, (six.string_types, six.text_type)) or
                isinstance(data, (dict, list))
            )
            else self.fail("Unknown type.")
        )

    def to_representation(self, value):
        return (
            json.loads(value)
            if not isinstance(value, (dict, list))
            else value
        )


api_pre_save = dispatch.Signal(providing_args=["instance", "user"])
api_post_save = dispatch.Signal(providing_args=["instance", "user"])


def with_signals(func):
    '''
    Decorator for send api_pre_save and api_post_save signals from serializers.
    '''
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


# Serializers
class _SignalSerializer(serializers.ModelSerializer):
    @with_signals
    def create(self, validated_data):
        return super(_SignalSerializer, self).create(validated_data)

    @with_signals
    def update(self, instance, validated_data):
        return super(_SignalSerializer, self).update(instance, validated_data)


class _WithPermissionsSerializer(_SignalSerializer):
    perms_msg = "You do not have permission to perform this action."

    def _get_objects(self, model, objs_id):
        user = self.context['request'].user
        qs = model.objects.all().user_filter(user)
        return list(qs.filter(id__in=objs_id))

    def create(self, validated_data):
        validated_data["owner"] = self.current_user()
        return super(_WithPermissionsSerializer, self).create(validated_data)

    def current_user(self):
        return self.context['request'].user

    def __get_all_permission_serializer(self):  # noce
        return PermissionsSerializer(
            self.instance.acl.all(), many=True
        )

    def __duplicates_check(self, data):
        without_role = [
            frozenset({e['member'], e['member_type']}) for e in data
        ]
        if len(without_role) != len(list(set(without_role))):
            raise ValueError("There is duplicates in your permissions set.")

    def __permission_set(self, data, remove_old=True):  # noce
        self.__duplicates_check(data)
        for permission_args in data:
            if remove_old:
                self.instance.acl.extend().filter(
                    member=permission_args['member'],
                    member_type=permission_args['member_type']
                ).delete()
            self.instance.acl.create(**permission_args)

    @transaction.atomic
    def permissions(self, request):  # noce
        user = self.current_user()
        if request.method != "GET" and not self.instance.manageable_by(user):
            raise PermissionDenied(self.perms_msg)
        if request.method == "DELETE":
            self.instance.acl.filter_by_data(request.data).delete()
        elif request.method == "POST":
            self.__permission_set(request.data)
        elif request.method == "PUT":
            self.instance.acl.clear()
            self.__permission_set(request.data, False)
        return Response(self.__get_all_permission_serializer().data, 200)

    def _change_owner(self, request):  # noce
        if not self.instance.owned_by(self.current_user()):
            raise PermissionDenied(self.perms_msg)
        self.instance.set_owner(User.objects.get(pk=request.data))
        return Response("Owner changed", 200)

    def owner(self, request):  # noce
        if request.method == "GET":
            return Response(self.instance.owner.id, 200)
        elif request.method == "PUT":
            return self._change_owner(request)


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

    @with_signals
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
        return user

    def is_valid(self, raise_exception=False):
        if self.instance is None:
            try:
                User.objects.get(username=self.initial_data['username'])
                raise self.UserExist({'username': ["Already exists."]})
            except User.DoesNotExist:
                pass
        return super(UserSerializer, self).is_valid(raise_exception)

    @with_signals
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


class TeamSerializer(_WithPermissionsSerializer):
    users_list = DictField(required=False, write_only=True)

    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name",
            "users_list",
            'url',
        )


class OneTeamSerializer(TeamSerializer):
    users = UserSerializer(many=True, required=False)
    users_list = DictField(required=False)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name",
            "users",
            "users_list",
            "owner",
            'url',
        )


class OneUserSerializer(UserSerializer):
    groups = TeamSerializer(read_only=True, many=True)
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
                  'groups',
                  'url',)
        read_only_fields = ('is_superuser',
                            'date_joined',)


class HistorySerializer(_SignalSerializer):
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


class OneHistorySerializer(_SignalSerializer):
    raw_stdout = serializers.SerializerMethodField(read_only=True)

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
                  "execute_args",
                  "revision",
                  "url")

    def get_raw(self, request):
        params = request.query_params
        color = params.get("color", "no")
        if color == "yes":
            return self.instance.raw_stdout
        else:
            ansi_escape = re.compile(r'\x1b[^m]*m')
            return ansi_escape.sub('', self.instance.raw_stdout)

    def get_raw_stdout(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri("raw/")

    def get_facts(self, request):
        return self.instance.facts


class HistoryLinesSerializer(_SignalSerializer):
    class Meta:
        model = models.HistoryLines
        fields = ("line_number",
                  "line",)


class HookSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Hook
        fields = (
            'id',
            'name',
            'type',
            'when',
            'recipients'
        )


class VariableSerializer(_SignalSerializer):
    class Meta:
        model = models.Variable
        fields = ('key',
                  'value',)

    def to_representation(self, instance):
        # we are not using that. This function here just in case.
        return {instance.key: instance.value}  # nocv


class _WithVariablesSerializer(_WithPermissionsSerializer):
    operations = dict(DELETE="remove",
                      POST="add",
                      PUT="set",
                      GET="all")

    def get_operation(self, method, data, attr):
        tp = getattr(self.instance, attr)
        obj_list = self._get_objects(tp.model, data)
        return self._operate(method, data, attr, obj_list)

    def _response(self, total, found, code=200):
        data = dict(total=len(total))
        data["operated"] = len(found)
        data["not_found"] = data["total"] - data["operated"]
        found_ids = [item.id for item in found]
        data["failed_list"] = [i for i in total if i not in found_ids]
        return Response(data, status=code)

    @transaction.atomic
    def _do_with_vars(self, method_name, *args, **kwargs):
        method = getattr(super(_WithVariablesSerializer, self), method_name)
        instance = method(*args, **kwargs)
        return instance

    @transaction.atomic()
    def _operate(self, method, data, attr, obj_list):
        action = self.operations[method]
        tp = getattr(self.instance, attr)
        if action == "all":
            answer = tp.values_list("id", flat=True)
            return Response(answer, status=200)
        elif action == "set":
            getattr(tp, "clear")()
            action = "add"
        getattr(tp, action)(*obj_list)
        return self._response(data, obj_list)

    def create(self, validated_data):
        return self._do_with_vars("create", validated_data=validated_data)

    def update(self, instance, validated_data):
        if "children" in validated_data:
            raise exceptions.ValidationError("Children not allowed to update.")
        return self._do_with_vars(
            "update", instance, validated_data=validated_data
        )

    def get_vars(self, representation):
        return representation.get('vars', None)

    def to_representation(self, instance, hidden_vars=None):
        rep = super(_WithVariablesSerializer, self).to_representation(instance)
        hv = hidden_vars
        hv = instance.HIDDEN_VARS if hv is None else hv
        vars = self.get_vars(rep)
        if vars is not None:
            for mask_key in hv:
                if mask_key in vars.keys():
                    vars[mask_key] = "[~~ENCRYPTED~~]"
        return rep


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
    owner = UserSerializer(read_only=True)
    vars = DictField(required=False)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',
                  'vars',
                  'owner',
                  'url',)


class TaskSerializer(_WithVariablesSerializer):
    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',
                  'project',
                  'url',)

    def to_representation(self, instance):
        return super(TaskSerializer, self).to_representation(
            instance, hidden_vars=[]
        )


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
    inventory = serializers.CharField()

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
                  'save_result',
                  'enabled',
                  'vars',
                  'url',)

    @transaction.atomic
    def permissions(self, request):  # noce
        raise main_exceptions.NotApplicable("See project permissions.")

    def owner(self, request):  # noce
        raise main_exceptions.NotApplicable("See project owner.")


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
                  'save_result',
                  'enabled',
                  'vars',
                  'url',)

    def execute(self):
        inventory = self.instance.inventory
        history_id = self.instance.execute(sync=False)
        rdata = dict(detail="Started at inventory {}.".format(inventory),
                     history_id=history_id)
        return Response(rdata, 201)


class TemplateSerializer(_WithVariablesSerializer):
    data = DictField(required=True, write_only=True)

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'data',
        )

    def get_vars(self, representation):
        try:
            return representation['data']['vars']
        except KeyError:
            return None

    def to_representation(self, instance):
        if instance.kind in ["Task", "PeriodicTask", "Module"]:
            return super(TemplateSerializer, self).to_representation(
                instance, hidden_vars=models.PeriodicTask.HIDDEN_VARS
            )
        elif instance.kind in ["Host", "Group"]:
            return super(TemplateSerializer, self).to_representation(
                instance, hidden_vars=models.Inventory.HIDDEN_VARS
            )


class OneTemplateSerializer(TemplateSerializer):
    data = DictField(required=True)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'owner',
            'data',
        )

    def execute(self, request):
        serializer = OneProjectSerializer(self.instance.project)
        return self.instance.execute(serializer, request.user)


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
    owner = UserSerializer(read_only=True)

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'hosts',
                  "groups",
                  'vars',
                  'children',
                  'owner',
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
    all_hosts  = HostSerializer(read_only=True, many=True)
    hosts  = HostSerializer(read_only=True, many=True, source="hosts_list")
    groups = GroupSerializer(read_only=True, many=True, source="groups_list")
    owner = UserSerializer(read_only=True)

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'hosts',
                  'all_hosts',
                  "groups",
                  'vars',
                  'owner',
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
    owner = UserSerializer(read_only=True)

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
                  'owner',
                  'revision',
                  'url',)

    def inventories_operations(self, method, data):
        return self.get_operation(method, data, attr="inventories")

    @transaction.atomic()
    def sync(self):
        self.instance.start_repo_task("sync")
        data = dict(detail="Sync with {}.".format(self.instance.repository))
        return Response(data, 200)

    def _execution(self, kind, data, user):
        inventory = data.pop("inventory")
        try:
            inventory = Inventory.objects.get(id=int(inventory))
            if not inventory.viewable_by(user):  # nocv
                raise PermissionDenied(
                    "You don't have permission to inventory."
                )
        except ValueError:
            pass
        history_id = self.instance.execute(
            kind, str(data.pop(kind)), inventory,
            initiator=user.id, **data
        )
        rdata = dict(detail="Started at inventory {}.".format(inventory),
                     history_id=history_id)
        return Response(rdata, 201)

    def execute_playbook(self, request):
        return self._execution("playbook", dict(request.data), request.user)

    def execute_module(self, request):
        return self._execution("module", dict(request.data), request.user)


class PermissionsSerializer(_SignalSerializer):
    member = serializers.IntegerField()
    member_type = serializers.CharField()

    class Meta:
        model = models.ACLPermission
        fields = ("member",
                  "role",
                  "member_type")
