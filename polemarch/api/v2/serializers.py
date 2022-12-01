# pylint: disable=no-member,unused-argument,too-many-lines,c-extension-no-member
from __future__ import unicode_literals

from collections import OrderedDict

import json
import uuid
from pathlib import Path
from typing import Dict

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers, exceptions

from vstutils.api import auth as vst_auth
from vstutils.api import serializers as vst_serializers, fields as vst_fields
from vstutils.api.serializers import DataSerializer, EmptySerializer

from .base_serializers import with_signals, UserSerializer, _WithPermissionsSerializer, _SignalSerializer
from ...main import models
from ...main.settings import LANGUAGES
from ...main.utils import AnsibleArgumentsReference
from ...main.validators import path_validator
from ...main.constants import (
    InventoryVariablesEnum,
    HiddenArgumentsEnum,
    HiddenVariablesEnum,
    ProjectVariablesEnum,
    CYPHER,
)

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


class InventoryAutoCompletionField(vst_fields.VSTCharField):

    def to_internal_value(self, data):
        inventory = super().to_internal_value(data)
        try:
            inventory = models.Inventory.objects.get(id=int(inventory))
            user = self.context['request'].user
            if not inventory.acl_handler.viewable_by(user):
                raise exceptions.PermissionDenied(
                    "You don't have permission to inventory."
                )  # noce
        except (ValueError, KeyError):
            if ',' not in inventory:
                path_validator(inventory)
        return inventory


# Serializers
class FactsSerializer(DataSerializer):
    facts = serializers.JSONField(read_only=True)


class ActionResponseSerializer(DataSerializer, EmptySerializer):
    detail = vst_fields.VSTCharField()


class ExecuteResponseSerializer(ActionResponseSerializer):
    history_id = vst_fields.RedirectIntegerField(default=None, allow_null=True, operation_name='history')
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

    def to_representation(self, value: User):  # pylint: disable=arguments-renamed
        return dict(user_id=value.pk)

    def to_internal_value(self, data: dict):
        return dict(pk=data['user_id'])


class CreateUserSerializer(vst_auth.CreateUserSerializer):  # noee
    is_staff = None

    @with_signals
    def create(self, validated_data: Dict) -> User:
        validated_data['is_staff'] = True
        return super().create(validated_data)

    class Meta(vst_auth.CreateUserSerializer.Meta):
        fields = tuple(filter(lambda field: field != 'is_staff', vst_auth.CreateUserSerializer.Meta.fields))


class ChangePasswordSerializer(vst_auth.ChangePasswordSerializer):

    @with_signals
    def update(self, instance: User, validated_data: Dict) -> User:
        return super().update(instance, validated_data)


class OneUserSerializer(UserSerializer):
    email = serializers.EmailField(required=False)

    class Meta(vst_auth.OneUserSerializer.Meta):
        fields = tuple(filter(lambda field: field != 'is_staff', vst_auth.OneUserSerializer.Meta.fields))


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
    executor = vst_fields.DependEnumField(field='initiator_type', types={
        'project': vst_fields.FkModelField(select=UserSerializer,
                                           autocomplete_property='id',
                                           autocomplete_represent='username'),
        'template': vst_fields.FkModelField(select=UserSerializer,
                                            autocomplete_property='id',
                                            autocomplete_represent='username'),
        'scheduler': {
            'type': 'string',
            'x-format': 'static_value',
            'x-options': {
                'staticValue': 'system',
                'realField': 'string',
            }
        },
    })

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


class OneHistorySerializer(HistorySerializer):
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

    def get_raw_stdout(self, obj: models.History):
        return self.context.get('request').build_absolute_uri("raw/")


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
    hidden_enum = HiddenVariablesEnum

    class Meta:
        model = models.Variable
        fields = (
            'id',
            'key',
            'value',
        )

    def to_representation(self, instance: models.Variable):
        result = super().to_representation(instance)
        if instance.key in self.hidden_enum.get_values():
            result['value'] = CYPHER
        elif instance.key in getattr(instance.content_object, 'BOOLEAN_VARS', []):
            result['value'] = instance.value == 'True'
        return result


class InventoryVariableSerializer(VariableSerializer):
    key = vst_fields.AutoCompletionField(autocomplete=InventoryVariablesEnum.get_values_list())
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
    hidden_enum = HiddenArgumentsEnum


class ProjectVariableSerializer(VariableSerializer):
    key = vst_fields.AutoCompletionField(
        required=True,
        autocomplete=ProjectVariablesEnum.get_values_list()
    )
    value = vst_fields.DependEnumField(allow_blank=True, field='key', choices={
        'repo_type': list(models.Project.repo_handlers.keys()),
        'repo_sync_on_run': [True, False]
    }, types={
        'repo_password': 'password',
        'repo_key': 'secretfile',
        'repo_sync_on_run_timeout': vst_fields.UptimeField(default=0),
        'ci_template': vst_fields.FkField(select='ExecutionTemplate')
    })


class _WithVariablesSerializer(_WithPermissionsSerializer):
    @transaction.atomic
    def _do_with_vars(self, method_name: str, *args, **kwargs):
        method = getattr(super(), method_name)
        instance = method(*args, **kwargs)
        return instance

    def create(self, validated_data: Dict):
        return self._do_with_vars("create", validated_data=validated_data)

    def update(self, instance, validated_data: Dict):
        return self._do_with_vars("update", instance, validated_data=validated_data)

    def represent_vars(self, representation):
        HiddenVariablesEnum.hide_values(representation.get('vars'))

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        self.represent_vars(representation)
        return representation


class HostSerializer(_WithVariablesSerializer):
    type = serializers.ChoiceField(
        choices=list(dict(HOST='One host.', RANGE='Range of hosts.').items()),
        required=False,
        default='HOST'
    )
    from_project = serializers.BooleanField(read_only=True, label='Project based')

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


# NOTE: deprecated. Remove this with tests after breaking v2 api support
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

    def represent_vars(self, representation):
        if 'data' in representation:
            HiddenArgumentsEnum.hide_values(representation['data'].get('vars'))

    def to_representation(self, instance) -> OrderedDict:
        data = OrderedDict()
        if instance.kind in ["Task", "Module"]:
            data = super().to_representation(instance)
            for option in data.get('options', {}).values():
                HiddenArgumentsEnum.hide_values(option.get('vars'))
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


class TemplateExecSerializer(DataSerializer):
    option = vst_fields.FkField(
        select='TemplateOption',
        autocomplete_property='name',
        autocomplete_represent='name',
        allow_null=True,
    )


###################################
# Subclasses for operations
# with hosts and groups
class _InventoryOperations(_WithVariablesSerializer):
    pass


class InventorySerializer(_WithVariablesSerializer):
    from_project = serializers.BooleanField(read_only=True, label='Project based')

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


class ProjectCreateMasterSerializer(_WithPermissionsSerializer):
    types = models.list_to_choices(models.Project.repo_handlers.keys())

    status = vst_fields.VSTCharField(read_only=True)
    type = serializers.ChoiceField(choices=types, default='MANUAL', label='Repo type')
    repository = vst_fields.DependEnumField(
        field='type',
        default='MANUAL',
        label='Repo url',
        types={'MANUAL': 'hidden', 'GIT': 'string', 'TAR': 'string'},
    )
    repo_auth = vst_fields.DependEnumField(
        field='type',
        default='NONE',
        types={
            'MANUAL': {'type': 'string', 'format': 'hidden'},
            'TAR': {'type': 'string', 'format': 'hidden'},
            'GIT': {
                'type': 'string',
                'enum': ('NONE', 'KEY', 'PASSWORD'),
                'default': 'NONE',
            },
        },
        label='Repo auth type',
        write_only=True
    )
    auth_data = vst_fields.DependEnumField(
        allow_blank=True,
        write_only=True,
        default='',
        field='repo_auth',
        label='Repo auth data',
        types={
            'KEY': 'secretfile',
            'PASSWORD': 'password',
            'NONE': 'hidden'
        }
    )
    branch = vst_fields.DependEnumField(
        allow_blank=True,
        required=False,
        allow_null=True,
        label='Branch for GIT (branch/tag/SHA) or TAR (subdir)',
        field='type',
        types={
            'MANUAL': {'type': 'string', 'format': 'hidden'},
            'GIT': {'type': 'string'},
            'TAR': {'type': 'string'},
        }
    )
    additional_playbook_path = vst_fields.VSTCharField(
        required=False,
        allow_null=True,
        label='Directory with playbooks'
    )

    _schema_properties_groups = {
        'General': (
            'name',
            'type',
            'additional_playbook_path',
        ),
        'Repository': (
            'repository',
            'branch',
            'repo_auth',
            'auth_data',
        ),
    }

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
            'name': {'required': True},
        }

    @transaction.atomic
    def create(self, validated_data: Dict) -> models.Project:
        repo_type = validated_data.pop('type')
        repo_auth_type = validated_data.pop('repo_auth')
        repo_auth_data = validated_data.pop('auth_data')
        repo_branch = validated_data.pop('branch', None)
        playbook_path = validated_data.pop('additional_playbook_path', '')

        instance = super().create(validated_data)
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
        instance = super()._do_with_vars(*args, **kw)
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


def generate_fields(reference: dict, ansible_type: str, exclude=None) -> OrderedDict:
    fields_of_serializer = OrderedDict()
    exclude = exclude or set()
    for ref, settings in reference.items():
        if ref in {'help', 'version'} | exclude:
            continue
        ref_type = settings.get('type', None)
        kwargs = dict(help_text=settings.get('help', ''), required=False)
        field = None
        if ref_type is None:
            field = serializers.BooleanField
            kwargs['default'] = False
        elif ref_type == 'int':
            field = serializers.IntegerField
        elif ref_type in ('string', 'choice'):
            field = vst_fields.VSTCharField
            kwargs['allow_blank'] = True

        if ref == 'verbose':
            field = serializers.IntegerField
            kwargs.update(dict(max_value=4, default=0))
        if ref in HiddenArgumentsEnum.get_values():
            field = vst_fields.SecretFileInString
        if ref == 'inventory':
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
            attrs.update(generate_fields(
                attrs['ansible_reference'].raw_dict[ansible_type],
                ansible_type
            ))
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
    raw_data = vst_fields.FileInStringField()

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
