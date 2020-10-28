# pylint: disable=no-member,unused-argument,too-many-lines,c-extension-no-member
from __future__ import unicode_literals
from typing import Dict, List
import json
import uuid
from pathlib import Path
from collections import OrderedDict
from django.contrib.auth import get_user_model
from django.utils.functional import cached_property
from django.db import transaction
from rest_framework import serializers, exceptions, status, fields
from vstutils.api import serializers as vst_serializers, fields as vst_fields
from vstutils.api import auth as vst_auth
from vstutils.api.serializers import DataSerializer, EmptySerializer
from vstutils.api.base import Response
from ...main.utils import AnsibleArgumentsReference
from ...main.settings import LANGUAGES
from ...main.validators import path_validator

from ...main import models
from ..signals import api_post_save, api_pre_save


User = get_user_model()

LANG_CHOICES = [item[0] for item in LANGUAGES]


# NOTE: we can freely remove that because according to real behaviour all our
#  models always have queryset at this stage, so this code actually doing
# nothing
#
# Serializers field for usability
class DictField(serializers.CharField):

    def to_internal_value(self, data):  # nocv
        return (
            data
            if isinstance(data, (str, dict, list))
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
            value if not isinstance(value, type)
            else str(value)
        )


class InventoryDependEnumField(vst_fields.DependEnumField):
    def to_representation(self, value):
        if isinstance(value, models.Inventory):
            value = value.id  # nocv
        return super(InventoryDependEnumField, self).to_representation(value)


class InventoryAutoCompletionField(vst_fields.AutoCompletionField):

    def to_internal_value(self, data):
        inventory = super(InventoryAutoCompletionField, self).to_internal_value(data)
        try:
            inventory = models.Inventory.objects.get(id=int(inventory))
            user = self.context['request'].user
            if not inventory.acl_handler.viewable_by(user):
                raise exceptions.PermissionDenied(
                    "You don't have permission to inventory."
                )  # noce
        except (ValueError, KeyError):
            self.check_path(inventory)
        return inventory

    def check_path(self, inventory):
        if not hasattr(self.root, 'project'):  # nocv
            return
        self.root.project.check_path(inventory)


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
    perms_msg = 'Permission denied. Only owner can change owner.'
    user_id = vst_fields.FkField(required=True, select='User',
                                 label='New owner',
                                 autocomplete_represent='username')

    def update(self, instance, validated_data):
        if not self.instance.acl_handler.owned_by(self.current_user()):  # noce
            raise exceptions.PermissionDenied(self.perms_msg)
        user = self.get_user(validated_data)
        self.instance.acl_handler.set_owner(user)
        return user

    def get_user(self, validated_data: dict):
        return User.objects.get(**validated_data)

    def current_user(self) -> User:
        return self.context['request'].user

    def to_representation(self, value: User):
        return dict(user_id=value.pk)

    def to_internal_value(self, data: dict):
        return dict(pk=data['user_id'])


class _SignalSerializer(serializers.ModelSerializer):
    @cached_property
    def _writable_fields(self) -> List:
        writable_fields = super(_SignalSerializer, self)._writable_fields
        fields_of_serializer = []
        attrs = [
            'field_name', 'source_attrs', 'source',
            'read_only', 'required', 'write_only', 'default'
        ]
        for field in writable_fields:
            if not isinstance(field, DataSerializer):
                fields_of_serializer.append(field)
                continue
            field_object = serializers.DictField()
            for attr in attrs:
                setattr(field_object, attr, getattr(field, attr, None))
            fields_of_serializer.append(field_object)
        return fields_of_serializer

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
        if not hasattr(self, 'instance') or self.instance is None:  # noce
            self.validated_data['owner'] = self.validated_data.get(
                'owner', self.current_user()
            )
        return result

    def current_user(self) -> User:
        return self.context['request'].user  # noce


class UserSerializer(vst_auth.UserSerializer):
    is_staff = serializers.HiddenField(default=True, label='Staff')

    @with_signals
    def update(self, instance: User, validated_data: Dict):
        return super(UserSerializer, self).update(instance, validated_data)


class CreateUserSerializer(vst_auth.CreateUserSerializer):

    @with_signals
    def create(self, validated_data: Dict) -> User:
        return super().create(validated_data)


class ChangePasswordSerializer(vst_auth.ChangePasswordSerializer):

    @with_signals
    def update(self, instance: User, validated_data: Dict) -> User:
        return super(ChangePasswordSerializer, self).update(instance, validated_data)


class OneUserSerializer(UserSerializer):
    email = serializers.EmailField(required=False)

    class Meta(vst_auth.OneUserSerializer.Meta):
        pass


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


class UserSettingsSerializer(vst_serializers.JsonObjectSerializer):
    lang = serializers.ChoiceField(choices=LANG_CHOICES, default=LANG_CHOICES[0])
    autoupdateInterval = serializers.IntegerField(default=15000)
    chartLineSettings = ChartLineSettingsSerializer()
    widgetSettings = WidgetSettingsSerializer()
    selectedSkin = serializers.CharField(required=False)
    skinsSettings = vst_serializers.DataSerializer(required=False)


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
    status = serializers.ChoiceField(choices=models.History.statuses, required=False)

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
    status = serializers.ChoiceField(choices=models.History.statuses, required=False)
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

    def get_raw(self, request) -> str:
        return self.instance.get_raw(request.query_params.get("color", "no") == "yes")

    def get_raw_stdout(self, obj: models.History):
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

    def to_representation(self, instance: models.Variable):
        result = super(VariableSerializer, self).to_representation(instance)
        if instance.key in getattr(instance.content_object, 'HIDDEN_VARS', []):
            result['value'] = "[~~ENCRYPTED~~]"
        elif instance.key in getattr(instance.content_object, 'BOOLEAN_VARS', []):
            result['value'] = instance.value == 'True'
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
    key = vst_fields.AutoCompletionField(
        required=True,
        autocomplete=models.Project.VARS_KEY+['ci_template']
    )
    value = vst_fields.DependEnumField(allow_blank=True, field='key', choices={
        'repo_type': list(models.Project.repo_handlers.keys()),
        'repo_sync_on_run': [True, False]
    }, types={
        'repo_password': 'password',
        'repo_key': 'secretfile',
        'repo_sync_on_run_timeout': 'uptime',
        'ci_template': 'fk'
    })


class _WithVariablesSerializer(_WithPermissionsSerializer):
    @transaction.atomic
    def _do_with_vars(self, method_name: str, *args, **kwargs):
        method = getattr(super(_WithVariablesSerializer, self), method_name)
        instance = method(*args, **kwargs)
        return instance

    def create(self, validated_data: Dict):
        return self._do_with_vars("create", validated_data=validated_data)

    def update(self, instance, validated_data: Dict):
        return self._do_with_vars("update", instance, validated_data=validated_data)

    def get_vars(self, representation):
        return representation.get('vars', None)

    def to_representation(self, instance, hidden_vars: List[str] = None):
        rep = super(_WithVariablesSerializer, self).to_representation(instance)
        hv = hidden_vars
        hv = getattr(instance, 'HIDDEN_VARS', []) if hidden_vars is None else hidden_vars
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
    from_project = serializers.BooleanField(read_only=True, label='Project Based')

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',
                  'from_project')


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
    data = fields.JSONField(read_only=True)

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
        allow_blank=True,
        required=False,
        allow_null=True,
        field='kind',
        types={
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
            'PLAYBOOK': 'fk_autocomplete',
            'MODULE': 'fk_autocomplete',
            'TEMPLATE': 'hidden',
        }
    )

    inventory = InventoryDependEnumField(
        allow_blank=True, required=False, field='kind', types={
            'PLAYBOOK': 'fk_autocomplete',
            'MODULE': 'fk_autocomplete',
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

    def execute(self) -> Response:
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

    def set_opts_vars(self, rep, hidden_vars: List[str]):
        if not rep.get('vars', None):
            return rep
        var = rep['vars']
        for mask_key in hidden_vars:
            if mask_key in var.keys():
                var[mask_key] = "[~~ENCRYPTED~~]"
        return rep

    def repr_options(self, instance: models.Template, data: Dict, hidden_vars: List):
        hv = hidden_vars
        hv = instance.HIDDEN_VARS if hv is None else hv
        for name, rep in data.get('options', {}).items():
            data['options'][name] = self.set_opts_vars(rep, hv)

    def to_representation(self, instance, hidden_vars: List[str] = None) -> OrderedDict:
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
        return self.instance.execute(request.user, request.data.get('option', None))


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
    from_project = serializers.BooleanField(read_only=True, label='Project Based')

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'children',
                  'from_project')


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
    from_project = serializers.BooleanField(read_only=True, label='Project Based')

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'from_project',)


class OneInventorySerializer(InventorySerializer, _InventoryOperations):
    owner = UserSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'notes',
                  'owner',)


class ProjectCreateMasterSerializer(vst_serializers.VSTSerializer, _WithPermissionsSerializer):
    types = models.list_to_choices(models.Project.repo_handlers.keys())
    auth_types = ['NONE', 'KEY', 'PASSWORD']
    branch_auth_types = {t: "hidden" for t in models.Project.repo_handlers.keys()}
    branch_auth_types['GIT'] = 'string'
    branch_types = dict(**branch_auth_types)
    branch_types['TAR'] = 'string'

    status = vst_fields.VSTCharField(read_only=True)
    type = serializers.ChoiceField(choices=types, default='MANUAL', label='Repo type')
    repository = vst_fields.VSTCharField(default='MANUAL', label='Repo url')
    repo_auth = vst_fields.DependEnumField(default='NONE',
                                           field='type',
                                           choices={"GIT": auth_types},
                                           types=branch_auth_types,
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
                                               'NONE': 'hidden'
                                           })
    branch = vst_fields.DependEnumField(allow_blank=True,
                                        required=False,
                                        allow_null=True,
                                        label='Branch for GIT(branch/tag/SHA) or TAR(subdir)',
                                        field='type',
                                        types=branch_types)
    additional_playbook_path = vst_fields.VSTCharField(required=False,
                                                       allow_null=True,
                                                       label='Directory with playbooks')

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
            'branch',
            'additional_playbook_path',
        )
        extra_kwargs = {
            'name': {'required': True}
        }

    @transaction.atomic
    def create(self, validated_data: Dict) -> models.Project:
        repo_type = validated_data.pop('type')
        repo_auth_type = validated_data.pop('repo_auth')
        repo_auth_data = validated_data.pop('auth_data')
        repo_branch = validated_data.pop('branch', None)
        playbook_path = validated_data.pop('additional_playbook_path', '')

        instance = super(ProjectCreateMasterSerializer, self).create(validated_data)
        instance.variables.create(key='repo_type', value=repo_type)
        if repo_auth_type != 'NONE':  # nocv
            key = 'repo_{}'.format(repo_auth_type.lower())
            instance.variables.create(key=key, value=repo_auth_data)
        if repo_branch:  # nocv
            instance.variables.create(key='repo_branch', value=repo_branch)
        if playbook_path:
            instance.variables.create(key='playbook_path', value=playbook_path)
        return instance


class ProjectTemplateSerializer(vst_serializers.VSTSerializer):

    class Meta:
        model = models.ProjectTemplate
        fields = (
            'id',
            'name',
            'type',
        )


class OneProjectTemplateSerializer(ProjectTemplateSerializer):

    class Meta:
        model = models.ProjectTemplate
        fields = (
            'id',
            'name',
            'description',
            'type',
            'repository',
        )


class ProjectTemplateCreateSerializer(vst_serializers.VSTSerializer):
    project_id = vst_fields.RedirectIntegerField(read_only=True,
                                                 default=None,
                                                 allow_null=True)
    name = serializers.CharField(required=False)

    class Meta:
        model = models.ProjectTemplate
        fields = (
            'project_id',
            'name',
        )

    def update(self, instance: models.ProjectTemplate, validated_data) -> models.Project:
        validated_data['name'] = validated_data.get(
            'name', '{} {}'.format(instance.name, uuid.uuid1())
        )
        data = dict(
            name=validated_data['name'],
            repository=instance.repository,
            type=instance.type,
            repo_auth=instance.repo_auth,
            auth_data=instance.auth_data or '',
        )
        serializer = ProjectCreateMasterSerializer(data=data, context=self.context)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return serializer.instance

    def to_representation(self, instance: models.Project) -> Dict:
        return {
            'name': instance.name,
            'project_id': instance.id
        }


class ProjectSerializer(_InventoryOperations):
    status = serializers.ChoiceField(read_only=True, choices=models.Project.STATUSES)
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
    def sync(self) -> Response:
        self.instance.start_repo_task("sync")
        serializer = ActionResponseSerializer(
            data=dict(detail="Sync with {}.".format(self.instance.repository))
        )
        serializer.is_valid(True)
        return Response(serializer.data, status.HTTP_200_OK)

    def _get_ansible_serializer(self, kind: str) -> serializers.Serializer:
        view = self.context['view']
        exec_method = getattr(view, 'execute_{}'.format(kind), None)
        if exec_method is None:  # nocv
            raise Exception('Unknown kind')
        serializer_class = exec_method.kwargs['serializer_class']
        serializer = serializer_class(context=self.context)
        serializer.project = self.instance
        return serializer

    def _execution(self, kind: str, data: Dict, user: User, **kwargs) -> Response:
        template = data.pop("template", None)
        inventory = data.get("inventory", None)
        msg = "Started in the inventory {}.".format(
            inventory if inventory else 'specified in the project configuration.'
        )
        if template is not None:
            init_type = "template"
            obj_id = template
            msg = 'Start template [id={}].'.format(template)
        else:
            init_type = "project"
            obj_id = self.instance.id
            serializer = self._get_ansible_serializer(kind.lower())
            data = {
                k: v for k, v in serializer.to_internal_value(data).items()
                if k in data.keys() or v
            }
        target = data.pop(kind)
        try:
            target = str(target)
        except UnicodeEncodeError:  # nocv
            target = target.encode('utf-8')
        history_id = self.instance.execute(
            kind, str(target),
            initiator=obj_id, initiator_type=init_type, executor=user, **data
        )
        rdata = ExecuteResponseSerializer(data=dict(
            detail=msg,
            history_id=history_id, executor=user.id
        ))
        rdata.is_valid(raise_exception=True)
        return Response(rdata.data, status.HTTP_201_CREATED)

    def execute_playbook(self, request) -> Response:
        return self._execution("playbook", dict(request.data), request.user)

    def execute_module(self, request) -> Response:
        return self._execution("module", dict(request.data), request.user)


def generate_fileds(ansible_reference: AnsibleArgumentsReference, ansible_type: str) -> OrderedDict:
    if ansible_type is None:
        return OrderedDict()  # nocv

    fields_of_serializer = OrderedDict()

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
            field = InventoryAutoCompletionField

        if field is None:  # nocv
            continue

        if ansible_type == 'module':
            if ref == 'group':
                kwargs['default'] = 'all'

        field_name = ref.replace('-', '_')
        fields_of_serializer[field_name] = field(**kwargs)

    return fields_of_serializer


class AnsibleSerializerMetaclass(serializers.SerializerMetaclass):
    @staticmethod
    def __new__(cls, name, bases, attrs):
        ansible_reference = attrs.get('ansible_reference', None)
        if ansible_reference and name != '_AnsibleSerializer':
            ansible_type = None
            if isinstance(attrs.get('playbook', None), serializers.CharField):
                ansible_type = 'playbook'
            elif isinstance(attrs.get('module', None), serializers.CharField):
                ansible_type = 'module'
            attrs.update(generate_fileds(attrs['ansible_reference'], ansible_type))
        return super(AnsibleSerializerMetaclass, cls).__new__(cls, name, bases, attrs)


class _AnsibleSerializer(serializers.Serializer, metaclass=AnsibleSerializerMetaclass):
    # pylint: disable=abstract-method
    pass


class AnsiblePlaybookSerializer(_AnsibleSerializer):
    # pylint: disable=abstract-method
    ansible_reference = AnsibleArgumentsReference()
    playbook = vst_fields.AutoCompletionField(required=True, autocomplete='Playbook',
                                              autocomplete_property='playbook')


class AnsibleModuleSerializer(_AnsibleSerializer):
    # pylint: disable=abstract-method
    ansible_reference = AnsibleArgumentsReference()
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


class InventoryImportSerializer(serializers.Serializer):
    # pylint: disable=abstract-method
    inventory_id = vst_fields.RedirectIntegerField(default=None, allow_null=True, read_only=True)
    name = serializers.CharField(required=True)
    raw_data = vst_fields.VSTCharField()

    def create(self, validated_data: Dict) -> Dict:
        return models.Inventory.import_inventory_from_string(**validated_data)

    def to_representation(self, instance):
        return dict(
            inventory_id=instance.id,
            name=instance.name,
            raw_data=getattr(instance, 'raw_data', '')
        )


class InventoryFileImportSerializer(InventoryImportSerializer):
    name = serializers.CharField(required=True, validators=[path_validator])
    raw_data = vst_fields.VSTCharField(read_only=True)

    def update(self, instance, validated_data: Dict) -> Dict:
        inventory_path = Path(instance.path) / Path(validated_data['name'])
        inventory, _ = instance.slave_inventory.get_or_create(name=inventory_path.stem)
        inventory.variables.update_or_create(key='inventory_extension', value=inventory_path.suffix, hidden=True)
        inventory.import_inventory_from_string(
            raw_data=inventory_path.read_text(),
            master_project=instance,
            inventory_instance=inventory,
            **validated_data
        )
        return inventory
