# pylint: disable=no-member,unused-argument
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
from vstutils.api.serializers import DataSerializer
from vstutils.api.base import Response
from ...main.utils import AnsibleArgumentsReference

from ...main.models import Inventory
from ...main import models
from ..signals import api_post_save, api_pre_save


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
class ActionResponseSerializer(DataSerializer):
    detail = serializers.CharField()


class ExecuteResponseSerializer(ActionResponseSerializer):
    history_id = serializers.IntegerField(default=None, allow_null=True)
    executor = serializers.IntegerField(default=None, allow_null=True)


class SetOwnerSerializer(DataSerializer):
    user_id = vst_fields.Select2Field(required=True, select='Owner',
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

    def create(self, validated_data):
        validated_data["owner"] = self.current_user()
        return super(_WithPermissionsSerializer, self).create(validated_data)

    def current_user(self):
        return self.context['request'].user


class OwnerSerializer(vst_serializers.UserSerializer):
    is_staff = serializers.HiddenField(default=True)

    @with_signals
    def create(self, data):
        return super(OwnerSerializer, self).create(data)

    @with_signals
    def update(self, instance, validated_data):
        return super(OwnerSerializer, self).update(instance, validated_data)


class OneOwnerSerializer(OwnerSerializer):
    password = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(required=False)

    class Meta(vst_serializers.OneUserSerializer.Meta):
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
    pmwInventoriesCounter = CounterWidgetSettingSerializer()
    pmwGroupsCounter = CounterWidgetSettingSerializer()
    pmwHostsCounter = CounterWidgetSettingSerializer()
    pmwChartWidget = WidgetSettingSerializer()
    pmwAnsibleModuleWidget = WidgetSettingSerializer()


class UserSettingsSerializer(vst_serializers.JsonObjectSerializer):
    chartLineSettings = ChartLineSettingsSerializer()
    widgetSettings = WidgetSettingsSerializer()


class TeamSerializer(_WithPermissionsSerializer):

    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name",
            'url',
        )


class OneTeamSerializer(TeamSerializer):
    owner = OwnerSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name",
            "notes",
            "owner",
            'url',
        )


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
                  "executor",
                  "revision",
                  "options",
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
                  "execution_time",
                  "inventory",
                  "raw_inventory",
                  "raw_args",
                  "raw_stdout",
                  "initiator",
                  "initiator_type",
                  "executor",
                  "execute_args",
                  "revision",
                  "options",
                  "url")

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
        return result


class InventoryVariableSerializer(VariableSerializer):
    key = vst_fields.AutoCompletionField(autocomplete=models.Variable.variables_keys)


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
        'repo_key': 'file'
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
        children_instance = getattr(instance, "children", False)
        if validated_data.get("children", children_instance) != children_instance:
            raise exceptions.ValidationError("Children not allowed to update.")
        return self._do_with_vars(
            "update", instance, validated_data=validated_data
        )

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
                  'type',
                  'url',)


class OneHostSerializer(HostSerializer):
    owner = OwnerSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'notes',
                  'type',
                  'owner',
                  'url',)


class PlaybookSerializer(_WithVariablesSerializer):
    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',)


class OnePlaybookSerializer(PlaybookSerializer):
    playbook = serializers.CharField(read_only=True)

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
        default=models.PeriodicTask.kinds[0]
    )
    type = serializers.ChoiceField(
        choices=[(k, k) for k in models.PeriodicTask.types],
        required=False,
        default=models.PeriodicTask.types[0]
    )
    schedule = serializers.CharField(allow_blank=True)
    inventory = serializers.CharField(required=False)
    mode = serializers.CharField(required=False)

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'name',
                  'type',
                  'schedule',
                  'mode',
                  'kind',
                  'inventory',
                  'save_result',
                  'template',
                  'template_opt',
                  'enabled',)

    @transaction.atomic
    def _do_with_vars(self, *args, **kwargs):
        kw = kwargs['validated_data']
        if kw.get('kind', None) == 'TEMPLATE':
            kw['inventory'] = ''
            kw['mode'] = ''
            kwargs['validated_data'] = kw
        return super(PeriodictaskSerializer, self)._do_with_vars(*args, **kwargs)


class OnePeriodictaskSerializer(PeriodictaskSerializer):
    project = ModelRelatedField(required=False, model=models.Project)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'name',
                  'notes',
                  'type',
                  'schedule',
                  'mode',
                  'kind',
                  'project',
                  'inventory',
                  'save_result',
                  'template',
                  'template_opt',
                  'enabled',)

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
        default=models.Template.kinds[0]
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
    option = serializers.CharField(
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

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'children',
                  'url',)


class OneGroupSerializer(GroupSerializer, _InventoryOperations):
    owner = OwnerSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',
                  'notes',
                  'children',
                  'owner',
                  'url',)

    class ValidationException(exceptions.ValidationError):
        status_code = 409


class InventorySerializer(_WithVariablesSerializer):

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'url',)


class OneInventorySerializer(InventorySerializer, _InventoryOperations):
    owner = OwnerSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',
                  'notes',
                  'owner',
                  'url',)


class ProjectSerializer(_InventoryOperations):
    status = serializers.CharField(read_only=True)
    type   = serializers.CharField(read_only=True)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'status',
                  'type',
                  'url',)

    @transaction.atomic
    def _do_with_vars(self, *args, **kw):
        instance = super(ProjectSerializer, self)._do_with_vars(*args, **kw)
        return instance if instance.repo_class else None


class OneProjectSerializer(ProjectSerializer, _InventoryOperations):
    repository  = serializers.CharField(default='MANUAL')
    owner = OwnerSerializer(read_only=True)
    notes = vst_fields.TextareaField(required=False, allow_blank=True)
    readme_content = vst_fields.HtmlField(read_only=True)
    readme_ext = serializers.CharField(read_only=True)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'notes',
                  'status',
                  'repository',
                  'owner',
                  'revision',
                  'branch',
                  'readme_content',
                  'readme_ext',
                  'url',)

    @transaction.atomic()
    def sync(self):
        self.instance.start_repo_task("sync")
        serializer = ActionResponseSerializer(
            data=dict(detail="Sync with {}.".format(self.instance.repository))
        )
        serializer.is_valid(True)
        return Response(serializer.data, status.HTTP_200_OK)

    def _execution(self, kind, data, user, **kwargs):
        template = kwargs.pop("template", None)
        inventory = data.pop("inventory")
        try:
            inventory = Inventory.objects.get(id=int(inventory))
            if not inventory.acl_handler.viewable_by(user):  # nocv
                raise PermissionDenied(
                    "You don't have permission to inventory."
                )
        except ValueError:
            pass
        if template is not None:
            init_type = "template"
            obj_id = template
            data['template_option'] = kwargs.get('template_option', None)
        else:
            init_type = "project"
            obj_id = self.instance.id
        history_id = self.instance.execute(
            kind, str(data.pop(kind)), inventory,
            initiator=obj_id, initiator_type=init_type, executor=user, **data
        )
        rdata = ExecuteResponseSerializer(data=dict(
            detail="Started at inventory {}.".format(inventory),
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
        if ref == 'verbose':
            field = serializers.IntegerField
            kwargs.update(dict(max_value=4, default=0))
        elif ref_type is None:
            field = serializers.BooleanField
            kwargs['default'] = False
        elif ref in models.PeriodicTask.HIDDEN_VARS:
            field = vst_fields.SecretFileInString
        elif ref_type == 'int':
            field = serializers.IntegerField
        elif ref == 'inventory':
            kwargs['required'] = True
            kwargs['autocomplete'] = 'Inventory'
            field = vst_fields.AutoCompletionField
        elif ref_type == 'string' or 'choice':
            field = serializers.CharField
        else:  # nocv
            continue
        field_name = ref.replace('-', '_')
        fields[field_name] = field(**kwargs)

    return fields


class AnsibleSerializerMetaclass(serializers.SerializerMetaclass):
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
class _AnsibleSerializer(DataSerializer):
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
