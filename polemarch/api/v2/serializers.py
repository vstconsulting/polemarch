# pylint: disable=no-member,unused-argument,too-many-lines
from __future__ import unicode_literals
import json
from collections import OrderedDict
import six
from django.contrib.auth.models import User
from django.utils.functional import cached_property
from django.db import transaction
from rest_framework import serializers, exceptions, status
from rest_framework.exceptions import PermissionDenied
from vstutils.api import serializers as vst_serializers, fields as vst_fields
from vstutils.api.serializers import DataSerializer, EmptySerializer
from vstutils.api.base import Response
from ...main.utils import AnsibleArgumentsReference, AnsibleInventoryParser

from ...main.models import Inventory
from ...main import models
from ..signals import api_post_save, api_pre_save


# NOTE: we can freely remove that because according to real behaviour all our
#  models always have queryset at this stage, so this code actually doing
# nothing
#
# Serializers field for usability
class ModelRelatedField(serializers.PrimaryKeyRelatedField):
    def __init__(self, **kwargs):  # nocv
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

    def to_internal_value(self, data):  # nocv
        return (
            data
            if (
                    isinstance(data, (six.string_types, six.text_type)) or
                    isinstance(data, (dict, list))
            )
            else self.fail("Unknown type.")
        )

    def to_representation(self, value):  # nocv
        return (
            json.loads(value)
            if not isinstance(value, (dict, list))
            else value
        )


class MultiTypeField(serializers.CharField):
    def to_internal_value(self, data):
        return data

    def to_representation(self, value):
        return (
            value if not isinstance(value, six.class_types)
            else str(value)
        )


class InventoryDependEnumField(vst_fields.DependEnumField):
    def to_representation(self, value):
        if isinstance(value, models.Inventory):
            value = value.id  # nocv
        return super(InventoryDependEnumField, self).to_representation(value)


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
class ActionResponseSerializer(DataSerializer, EmptySerializer):
    detail = vst_fields.VSTCharField()


class ExecuteResponseSerializer(ActionResponseSerializer):
    history_id = vst_fields.RedirectIntegerField(default=None, allow_null=True)
    executor = serializers.IntegerField(default=None, allow_null=True)


class SetOwnerSerializer(DataSerializer):
    user_id = vst_fields.Select2Field(required=True, select='User',
                                      label='New owner',
                                      autocomplete_represent='username')

    def update(self, instance, validated_data):
        if not self.instance.acl_handler.owned_by(self.current_user()):  # noce
            raise PermissionDenied(self.perms_msg)
        user = self.get_user(validated_data)
        self.instance.acl_handler.set_owner(user)
        return user

    def get_user(self, validated_data):
        return User.objects.get(**validated_data)

    def current_user(self):
        return self.context['request'].user

    def to_representation(self, value):
        return dict(user_id=value.id)

    def to_internal_value(self, data):
        return dict(pk=data['user_id'])


class ChangePasswordSerializer(DataSerializer):
    old_password = serializers.CharField(required=True)
    password = serializers.CharField(required=True, label='New password')
    password2 = serializers.CharField(required=True, label='Confirm new password')

    def update(self, instance, validated_data):
        if not instance.check_password(validated_data['old_password']):
            raise exceptions.PermissionDenied('Password is not correct.')
        if validated_data['password'] != validated_data['password2']:
            raise exceptions.ValidationError("New passwords' values are not equal.")
        instance.set_password(validated_data['password'])
        instance.save()
        return instance

    def to_representation(self, value):
        return dict(
            old_password='***',
            password='***',
            password2='***',
        )


class _SignalSerializer(serializers.ModelSerializer):
    @cached_property
    def _writable_fields(self):
        writable_fields = super(_SignalSerializer, self)._writable_fields
        fields = []
        attrs = [
            'field_name', 'source_attrs', 'source',
            'read_only', 'required', 'write_only', 'default'
        ]
        for field in writable_fields:
            if not isinstance(field, DataSerializer):
                fields.append(field)
                continue
            field_object = serializers.DictField()
            for attr in attrs:
                setattr(field_object, attr, getattr(field, attr, None))
            fields.append(field_object)
        return fields

    @with_signals
    def create(self, validated_data):
        return super(_SignalSerializer, self).create(validated_data)

    @with_signals
    def update(self, instance, validated_data):
        return super(_SignalSerializer, self).update(instance, validated_data)


class _WithPermissionsSerializer(_SignalSerializer):
    perms_msg = "You do not have permission to perform this action."

    def is_valid(self, *args, **kwargs):
        result = super(_WithPermissionsSerializer, self).is_valid(*args, **kwargs)
        self.validated_data['owner'] = self.validated_data.get(
            'owner', self.current_user()
        )
        return result

    def current_user(self):
        return self.context['request'].user


class UserSerializer(vst_serializers.UserSerializer):
    is_staff = serializers.HiddenField(default=True, label='Staff')

    @with_signals
    def create(self, data):
        return super(UserSerializer, self).create(data)

    @with_signals
    def update(self, instance, validated_data):
        return super(UserSerializer, self).update(instance, validated_data)


class OneUserSerializer(UserSerializer):
    email = serializers.EmailField(required=False)

    class Meta(vst_serializers.OneUserSerializer.Meta):
        fields = tuple(
            field for field in vst_serializers.OneUserSerializer.Meta.fields
            if field not in ['password']
        )


class CreateUserSerializer(OneUserSerializer):
    password = vst_fields.VSTCharField(write_only=True)
    password2 = vst_fields.VSTCharField(write_only=True, label='Repeat password')

    class Meta(OneUserSerializer.Meta):
        fields = list(OneUserSerializer.Meta.fields) + ['password', 'password2']

    def run_validation(self, data=serializers.empty):
        validated_data = super(CreateUserSerializer, self).run_validation(data)
        if validated_data['password'] != validated_data.pop('password2', None):
            raise exceptions.ValidationError('Passwords do not match.')
        return validated_data


class ChartLineSettingSerializer(vst_serializers.JsonObjectSerializer):
    active = serializers.BooleanField(default=True)


class ChartLineSettingsSerializer(vst_serializers.JsonObjectSerializer):
    # pylint: disable=invalid-name
    all_tasks = ChartLineSettingSerializer()
    delay = ChartLineSettingSerializer()
    ok = ChartLineSettingSerializer()
    error = ChartLineSettingSerializer()
    interrupted = ChartLineSettingSerializer()
    offline = ChartLineSettingSerializer()


class WidgetSettingSerializer(vst_serializers.JsonObjectSerializer):
    active = serializers.BooleanField(default=True)
    collapse = serializers.BooleanField(default=False)
    sort = serializers.IntegerField(default=0)


class CounterWidgetSettingSerializer(WidgetSettingSerializer):
    collapse = serializers.BooleanField(default=False, read_only=True)


class WidgetSettingsSerializer(vst_serializers.JsonObjectSerializer):
    pmwUsersCounter = CounterWidgetSettingSerializer()
    pmwProjectsCounter = CounterWidgetSettingSerializer()
    pmwTemplatesCounter = CounterWidgetSettingSerializer()
    pmwInventoriesCounter = CounterWidgetSettingSerializer()
    pmwGroupsCounter = CounterWidgetSettingSerializer()
    pmwHostsCounter = CounterWidgetSettingSerializer()
    pmwChartWidget = WidgetSettingSerializer()
    pmwAnsibleModuleWidget = WidgetSettingSerializer()


class UserSettingsSerializer(vst_serializers.JsonObjectSerializer):
    autoupdateInterval = serializers.IntegerField(default=15000)
    chartLineSettings = ChartLineSettingsSerializer()
    widgetSettings = WidgetSettingsSerializer()


class TeamSerializer(_WithPermissionsSerializer):

    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name",
        )


class OneTeamSerializer(TeamSerializer):
    owner = UserSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name",
            "notes",
            "owner",
        )


class HistorySerializer(_SignalSerializer):
    class Meta:
        model = models.History
        fields = (
            "id",
            "start_time",
            "executor",
            "initiator",
            "initiator_type",
            "project",
            "inventory",
            "kind",
            "mode",
            "options",
            "status",
            "stop_time",
        )


class ProjectHistorySerializer(HistorySerializer):
    class Meta(HistorySerializer.Meta):
        fields = (
            "id",
            "start_time",
            "executor",
            "initiator",
            "initiator_type",
            "revision",
            "inventory",
            "kind",
            "mode",
            "options",
            "status",
            "stop_time",
        )


class OneHistorySerializer(_SignalSerializer):
    raw_stdout = serializers.SerializerMethodField(read_only=True)
    execution_time = vst_fields.UptimeField()

    class Meta:
        model = models.History
        fields = ("id",
                  "status",
                  "executor",
                  "project",
                  "revision",
                  "inventory",
                  "kind",
                  "mode",
                  "execute_args",
                  "execution_time",
                  "start_time",
                  "stop_time",
                  "initiator",
                  "initiator_type",
                  "options",
                  "raw_args",
                  "raw_stdout",
                  "raw_inventory",)

    def get_raw(self, request):
        return self.instance.get_raw(request.query_params.get("color", "no") == "yes")

    def get_raw_stdout(self, obj):
        return self.context.get('request').build_absolute_uri("raw/")

    def get_facts(self, request):
        return self.instance.facts


class HistoryLinesSerializer(_SignalSerializer):
    class Meta:
        model = models.HistoryLines
        fields = ("line_number",
                  "line_gnumber",
                  "line",)


class HookSerializer(serializers.ModelSerializer):
    when = serializers.ChoiceField(
        choices=list(models.Hook.handlers.when_types_names.items()),
        required=False, allow_blank=True, default=None
    )
    type = serializers.ChoiceField(
        choices=[(type, type) for type in models.Hook.handlers.list()]
    )

    class Meta:
        model = models.Hook
        fields = (
            'id',
            'name',
            'type',
            'when',
            'enable',
            'recipients'
        )


class VariableSerializer(_SignalSerializer):
    value = MultiTypeField(default="", allow_blank=True)

    class Meta:
        model = models.Variable
        fields = (
            'id',
            'key',
            'value',
        )

    def to_representation(self, instance):
        result = super(VariableSerializer, self).to_representation(instance)
        if instance.key in getattr(instance.content_object, 'HIDDEN_VARS', []):
            result['value'] = "[~~ENCRYPTED~~]"
        elif instance.key in getattr(instance.content_object, 'BOOLEAN_VARS', []):
            result['value'] = True if instance.value == 'True' else False
        return result


class InventoryVariableSerializer(VariableSerializer):
    key = vst_fields.AutoCompletionField(autocomplete=models.Variable.variables_keys)
    value = vst_fields.DependEnumField(
        allow_blank=True, field='key',
        types={
            'ansible_ssh_pass': 'password',
            'ansible_ssh_private_key_file': 'secretfile',
            'ansible_become': 'boolean',
            'ansible_port': 'integer',
            'ansible_become_pass': 'password',
        }
    )


class PeriodicTaskVariableSerializer(VariableSerializer):
    pass


class ProjectVariableSerializer(VariableSerializer):
    project_keys = (
        ('repo_type', 'Types of repo. Default="MANUAL".'),
        ('repo_sync_on_run', "Sync project by every execution."),
        ('repo_branch', "[Only for GIT repos] Checkout branch on sync."),
        ('repo_password', "[Only for GIT repos] Password to fetch access."),
        ('repo_key', "[Only for GIT repos] Key to fetch access."),
    )
    key = serializers.ChoiceField(choices=project_keys)
    value = vst_fields.DependEnumField(allow_blank=True, field='key', choices={
        'repo_type': list(models.Project.repo_handlers.keys()),
        'repo_sync_on_run': [True, False]
    }, types={
        'repo_password': 'password',
        'repo_key': 'secretfile'
    })


class _WithVariablesSerializer(_WithPermissionsSerializer):
    @transaction.atomic
    def _do_with_vars(self, method_name, *args, **kwargs):
        method = getattr(super(_WithVariablesSerializer, self), method_name)
        instance = method(*args, **kwargs)
        return instance

    def create(self, validated_data):
        return self._do_with_vars("create", validated_data=validated_data)

    def update(self, instance, validated_data):
        return self._do_with_vars("update", instance, validated_data=validated_data)

    def get_vars(self, representation):
        return representation.get('vars', None)

    def to_representation(self, instance, hidden_vars=None):
        rep = super(_WithVariablesSerializer, self).to_representation(instance)
        hv = hidden_vars
        hv = getattr(instance, 'HIDDEN_VARS', []) if hv is None else hv
        vars = self.get_vars(rep)
        if vars is not None:
            for mask_key in hv:
                if mask_key in vars.keys():
                    vars[mask_key] = "[~~ENCRYPTED~~]"
        return rep


class HostSerializer(_WithVariablesSerializer):
    type = serializers.ChoiceField(
        choices=list(dict(HOST='One host.', RANGE='Range of hosts.').items()),
        required=False,
        default='HOST'
    )

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',)


class OneHostSerializer(HostSerializer):
    owner = UserSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'notes',
                  'type',
                  'owner',)


class PlaybookSerializer(_WithVariablesSerializer):
    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',)


class OnePlaybookSerializer(PlaybookSerializer):
    playbook = vst_fields.VSTCharField(read_only=True)

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',)


class ModuleSerializer(vst_serializers.VSTSerializer):
    class Meta:
        model = models.Module
        fields = (
            'id',
            'path',
            'name',
        )


class OneModuleSerializer(ModuleSerializer):
    data = DataSerializer()

    class Meta:
        model = models.Module
        fields = (
            'id',
            'path',
            'name',
            'data',
        )


class PeriodictaskSerializer(_WithVariablesSerializer):
    kind = serializers.ChoiceField(
        choices=[(k, k) for k in models.PeriodicTask.kinds],
        required=False,
        default=models.PeriodicTask.kinds[0],
        label='Task type'
    )
    type = serializers.ChoiceField(
        choices=[(k, k) for k in models.PeriodicTask.types],
        required=False,
        default=models.PeriodicTask.types[0],
        label='Interval type'
    )

    template_opt = vst_fields.DependEnumField(
        allow_blank=True, required=False, field='kind', types={
            'PLAYBOOK': 'hidden',
            'MODULE': 'hidden',
            'TEMPLATE': 'autocomplete',
        }
    )

    schedule = vst_fields.DependEnumField(
        allow_blank=True, field='type', types={
            'CRONTAB': 'crontab',
            'INTERVAL': 'integer',
        }
    )

    mode = vst_fields.DependEnumField(
        allow_blank=True, required=False, field='kind', types={
            'PLAYBOOK': 'autocomplete',
            'MODULE': 'autocomplete',
            'TEMPLATE': 'hidden',
        }
    )

    inventory = InventoryDependEnumField(
        allow_blank=True, required=False, field='kind', types={
            'PLAYBOOK': 'select2',
            'MODULE': 'select2',
            'TEMPLATE': 'hidden',
        }
    )

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'name',
                  'kind',
                  'mode',
                  'inventory',
                  'save_result',
                  'template',
                  'template_opt',
                  'enabled',
                  'type',
                  'schedule',)

    @transaction.atomic
    def _do_with_vars(self, *args, **kwargs):
        kw = kwargs['validated_data']
        if kw.get('kind', None) == 'TEMPLATE':
            kw['inventory'] = ''
            kw['mode'] = ''
            kwargs['validated_data'] = kw
        return super(PeriodictaskSerializer, self)._do_with_vars(*args, **kwargs)


class OnePeriodictaskSerializer(PeriodictaskSerializer):
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'name',
                  'kind',
                  'mode',
                  'inventory',
                  'save_result',
                  'template',
                  'template_opt',
                  'enabled',
                  'type',
                  'schedule',
                  'notes',)

    def execute(self):
        inventory = self.instance.inventory
        rdata = ExecuteResponseSerializer(data=dict(
            detail="Started at inventory {}.".format(inventory),
            history_id=self.instance.execute(sync=False)
        ))
        rdata.is_valid(True)
        return Response(rdata.data, status.HTTP_201_CREATED)


class TemplateSerializer(_WithVariablesSerializer):
    data = DataSerializer(required=True, write_only=True)
    options = DataSerializer(write_only=True)
    options_list = serializers.ListField(read_only=True)
    kind = serializers.ChoiceField(
        choices=[(k, k) for k in models.Template.kinds],
        required=False,
        default=models.Template.kinds[0],
        label='Type'
    )

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'data',
            'options',
            'options_list',
        )

    def get_vars(self, representation):
        try:
            return representation['data']['vars']
        except KeyError:  # nocv
            return None

    def set_opts_vars(self, rep, hidden_vars):
        if not rep.get('vars', None):
            return rep
        var = rep['vars']
        for mask_key in hidden_vars:
            if mask_key in var.keys():
                var[mask_key] = "[~~ENCRYPTED~~]"
        return rep

    def repr_options(self, instance, data, hidden_vars):
        hv = hidden_vars
        hv = instance.HIDDEN_VARS if hv is None else hv
        for name, rep in data.get('options', {}).items():
            data['options'][name] = self.set_opts_vars(rep, hv)

    def to_representation(self, instance):
        data = OrderedDict()
        if instance.kind in ["Task", "Module"]:
            hidden_vars = models.PeriodicTask.HIDDEN_VARS
            data = super(TemplateSerializer, self).to_representation(
                instance, hidden_vars=hidden_vars
            )
            self.repr_options(instance, data, hidden_vars)
        return data


class OneTemplateSerializer(TemplateSerializer):
    data = DataSerializer(required=True)
    options = DataSerializer(required=False)
    options_list = serializers.ListField(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'notes',
            'kind',
            'data',
            'options',
            'options_list',
        )

    def execute(self, request):
        serializer = OneProjectSerializer(self.instance.project)
        return self.instance.execute(
            serializer, request.user, request.data.get('option', None)
        )


class TemplateExecSerializer(DataSerializer):
    option = vst_fields.VSTCharField(
        help_text='Option name from template options.',
        min_length=0, allow_blank=True,
        required=False
    )


###################################
# Subclasses for operations
# with hosts and groups
class _InventoryOperations(_WithVariablesSerializer):
    pass


###################################

class GroupSerializer(_WithVariablesSerializer):
    children = serializers.BooleanField(read_only=True)

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'children',)


class OneGroupSerializer(GroupSerializer, _InventoryOperations):
    owner = UserSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'notes',
                  'children',
                  'owner',)

    class ValidationException(exceptions.ValidationError):
        status_code = 409


class GroupCreateMasterSerializer(OneGroupSerializer):
    children = serializers.BooleanField(write_only=True,
                                        label='Contains groups',
                                        default=False)


class InventorySerializer(_WithVariablesSerializer):

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',)


class OneInventorySerializer(InventorySerializer, _InventoryOperations):
    owner = UserSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'notes',
                  'owner',)


def list_to_choices(items_list):
    def handler(item):
        return (item, item)

    return list(map(handler, items_list))


class ProjectCreateMasterSerializer(vst_serializers.VSTSerializer):
    types = list_to_choices(models.Project.repo_handlers.keys())
    auth_types = list_to_choices(['NONE', 'KEY', 'PASSWORD'])

    status = vst_fields.VSTCharField(read_only=True)
    type = serializers.ChoiceField(choices=types, default='MANUAL', label='Repo type')
    repository = vst_fields.VSTCharField(default='MANUAL', label='Repo url')
    repo_auth = serializers.ChoiceField(choices=auth_types,
                                        default='NONE',
                                        label='Repo auth type',
                                        write_only=True)
    auth_data = vst_fields.DependEnumField(allow_blank=True,
                                           write_only=True,
                                           default='',
                                           field='repo_auth',
                                           label='Repo auth data',
                                           types={
                                               'KEY': 'secretfile',
                                               'PASSWORD': 'password',
                                               'NONE': 'disabled'
                                           })

    class Meta:
        model = models.Project
        fields = (
            'id',
            'name',
            'status',
            'type',
            'repository',
            'repo_auth',
            'auth_data',
        )
        extra_kwargs = {
            'name': {'required': True}
        }

    def create(self, validated_data):
        repo_type = validated_data.pop('type')
        repo_auth_type = validated_data.pop('repo_auth')
        repo_auth_data = validated_data.pop('auth_data')

        instance = super(ProjectCreateMasterSerializer, self).create(validated_data)
        instance.variables.create(key='repo_type', value=repo_type)
        if repo_auth_type != 'NONE':  # nocv
            key = 'repo_{}'.format(repo_auth_type.lower())
            instance.variables.create(key=key, value=repo_auth_data)
        return instance


class ProjectSerializer(_InventoryOperations):
    status = vst_fields.VSTCharField(read_only=True)
    type   = vst_fields.VSTCharField(read_only=True)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'type',
                  'status',)

    @transaction.atomic
    def _do_with_vars(self, *args, **kw):
        instance = super(ProjectSerializer, self)._do_with_vars(*args, **kw)
        return instance if instance.repo_class else None


class OneProjectSerializer(ProjectSerializer, _InventoryOperations):
    repository  = vst_fields.VSTCharField(default='MANUAL')
    owner = UserSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)
    readme_content = vst_fields.HtmlField(read_only=True, label='Information')
    execute_view_data = vst_serializers.DataSerializer(read_only=True, allow_null=True)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'repository',
                  'status',
                  'revision',
                  'branch',
                  'owner',
                  'notes',
                  'readme_content',
                  'execute_view_data',)

    @transaction.atomic()
    def sync(self):
        self.instance.start_repo_task("sync")
        serializer = ActionResponseSerializer(
            data=dict(detail="Sync with {}.".format(self.instance.repository))
        )
        serializer.is_valid(True)
        return Response(serializer.data, status.HTTP_200_OK)

    def _get_execution_inventory(self, template, inventory, user):
        if template or inventory is None:
            return inventory
        try:
            inventory = Inventory.objects.get(id=int(inventory))
            if not inventory.acl_handler.viewable_by(user):  # nocv
                raise PermissionDenied(
                    "You don't have permission to inventory."
                )
        except ValueError:
            pass
        return inventory

    def _execution(self, kind, data, user, **kwargs):
        template = kwargs.pop("template", None)
        inventory = self._get_execution_inventory(
            template, data.pop("inventory", None), user
        )
        msg = "Started in the inventory {}.".format(
            inventory if inventory else 'specified in the project configuration.'
        )
        if template is not None:
            init_type = "template"
            obj_id = template
            data['template_option'] = kwargs.get('template_option', None)
            msg = 'Start template [id={}].'.format(template)
        else:
            init_type = "project"
            obj_id = self.instance.id
            if kind.lower() == 'module':
                serializer = AnsibleModuleSerializer()
            elif kind.lower() == 'playbook':
                serializer = AnsiblePlaybookSerializer()
            else:  # nocv
                raise Exception('Unknown kind')
            data = {
                k: v for k, v in serializer.to_internal_value(data).items()
                if k in data.keys() or v
            }
        history_id = self.instance.execute(
            kind, str(data.pop(kind)), inventory,
            initiator=obj_id, initiator_type=init_type, executor=user, **data
        )
        rdata = ExecuteResponseSerializer(data=dict(
            detail=msg,
            history_id=history_id, executor=user.id
        ))
        rdata.is_valid(raise_exception=True)
        return Response(rdata.data, status.HTTP_201_CREATED)

    def execute_playbook(self, request):
        return self._execution("playbook", dict(request.data), request.user)

    def execute_module(self, request):
        return self._execution("module", dict(request.data), request.user)


ansible_reference = AnsibleArgumentsReference()


def generate_fileds(ansible_type):
    if ansible_type is None:
        return OrderedDict()

    fields = OrderedDict()

    for ref, settings in ansible_reference.raw_dict[ansible_type].items():
        if ref in ['help', 'version', ]:
            continue
        ref_type = settings.get('type', None)
        kwargs = dict(help_text=settings.get('help', ''), required=False)
        field = None
        if ref_type is None:
            field = serializers.BooleanField
            kwargs['default'] = False
        elif ref_type == 'int':
            field = serializers.IntegerField
        elif ref_type == 'string' or 'choice':
            field = vst_fields.VSTCharField
            kwargs['allow_blank'] = True

        if ref == 'verbose':
            field = serializers.IntegerField
            kwargs.update(dict(max_value=4, default=0))
        if ref in models.PeriodicTask.HIDDEN_VARS:
            field = vst_fields.SecretFileInString
        if ref == 'inventory':
            kwargs['autocomplete'] = 'Inventory'
            field = vst_fields.AutoCompletionField

        if field is None:  # nocv
            continue

        if ansible_type == 'module':
            if ref == 'group':
                kwargs['default'] = 'all'

        field_name = ref.replace('-', '_')
        fields[field_name] = field(**kwargs)

    return fields


class AnsibleSerializerMetaclass(serializers.SerializerMetaclass):
    # pylint: disable=super-on-old-class
    @staticmethod
    def __new__(cls, name, bases, attrs):
        ansible_type = None
        if isinstance(attrs.get('playbook', None), serializers.CharField):
            ansible_type = 'playbook'
        elif isinstance(attrs.get('module', None), serializers.CharField):
            ansible_type = 'module'
        attrs.update(generate_fileds(ansible_type))
        return super(AnsibleSerializerMetaclass, cls).__new__(cls, name, bases, attrs)


@six.add_metaclass(AnsibleSerializerMetaclass)
class _AnsibleSerializer(serializers.Serializer):
    pass


class AnsiblePlaybookSerializer(_AnsibleSerializer):
    playbook = vst_fields.AutoCompletionField(required=True, autocomplete='Playbook',
                                              autocomplete_property='playbook')


class AnsibleModuleSerializer(_AnsibleSerializer):
    module = vst_fields.AutoCompletionField(required=True, autocomplete='Module',
                                            autocomplete_property='name',
                                            autocomplete_represent='path')


class BaseDashboardJobSerializer(DataSerializer):
    status = serializers.CharField()
    sum = serializers.IntegerField()
    all = serializers.IntegerField()


class DayDashboardJobSerializer(BaseDashboardJobSerializer):
    day = serializers.DateTimeField()


class MonthDashboardJobSerializer(BaseDashboardJobSerializer):
    month = serializers.DateTimeField()


class YearDashboardJobSerializer(BaseDashboardJobSerializer):
    year = serializers.DateTimeField()


class DashboardJobsSerializer(DataSerializer):
    day = DayDashboardJobSerializer(many=True)
    month = MonthDashboardJobSerializer(many=True)
    year = YearDashboardJobSerializer(many=True)


class DashboardStatisticSerializer(DataSerializer):
    projects = serializers.IntegerField()
    templates = serializers.IntegerField()
    inventories = serializers.IntegerField()
    groups = serializers.IntegerField()
    hosts = serializers.IntegerField()
    teams = serializers.IntegerField()
    users = serializers.IntegerField()
    jobs = DashboardJobsSerializer()


class InventoryImportSerializer(DataSerializer):
    inventory_id = vst_fields.RedirectIntegerField(default=None, allow_null=True)
    name = serializers.CharField(required=True)
    raw_data = vst_fields.VSTCharField()

    @transaction.atomic()
    def create(self, validated_data):
        parser = AnsibleInventoryParser()
        inv_json = parser.get_inventory_data(validated_data['raw_data'])

        inventory = Inventory.objects.create(name=validated_data['name'])
        inventory.vars = inv_json['vars']
        created_hosts, created_groups = dict(), dict()

        for host in inv_json['hosts']:
            inv_host = inventory.hosts.create(name=host['name'])
            inv_host.vars = host['vars']
            created_hosts[inv_host.name] = inv_host

        for group in inv_json['groups']:
            children = False if len(group['groups']) == 0 else True
            inv_group = inventory.groups.create(name=group['name'], children=children)
            inv_group.vars = group['vars']
            created_groups[inv_group.name] = inv_group

        for group in inv_json['groups']:
            inv_group = created_groups[group['name']]
            g_subs = list()
            if inv_group.children:
                for name in group['groups']:
                    g_subs.append(created_groups[name])
                inv_group.groups.add(*g_subs)
            else:
                for name in group['hosts']:
                    g_subs.append(created_hosts[name])
                inv_group.hosts.add(*g_subs)

        return dict(
            inventory_id=inventory.id,
            name=inventory.name,
            raw_data=validated_data['raw_data']
        )
