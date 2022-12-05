# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

from typing import Any, Dict, List, Iterable, Optional, TypeVar, Text
import logging
from collections import OrderedDict
from datetime import timedelta, datetime
import json

import re
from celery.schedules import crontab
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from django.db.models import functions as dbfunc, Count
from django.utils.timezone import now

from vstutils.custom_model import ListModel, CustomQuerySet
from vstutils.utils import translate as _
from . import Inventory
from ..exceptions import DataNotReady, NotApplicable
from .base import ForeignKeyACL, BModel, ACLModel, BQuerySet, models, BaseModel
from .vars import AbstractModel, AbstractVarsQuerySet
from .projects import Project, HISTORY_ID
from ..constants import CYPHER, HiddenArgumentsEnum


logger = logging.getLogger("polemarch")
InvOrString = TypeVar('InvOrString', str, int, Inventory, None)
User = get_user_model()


# Block of real models
class Template(ACLModel):
    name          = models.CharField(max_length=512)
    kind          = models.CharField(max_length=32)
    template_data = models.TextField(default="{}")
    options_data  = models.TextField(default="{}")
    inventory     = models.CharField(max_length=128, default=None, blank=True, null=True)
    project       = ForeignKeyACL(Project, on_delete=models.CASCADE,
                                  default=None, blank=True, null=True)

    class Meta:
        default_related_name = 'template'

    template_fields = OrderedDict()
    template_fields["Task"] = ["playbook", "vars", "inventory"]
    template_fields["Module"] = [
        "inventory", "module", "group", "args", "vars"
    ]

    excepted_execution_fields = ['inventory']
    _exec_types = {
        "Task": "playbook",
        "Module": "module",
    }
    kinds = list(template_fields.keys())

    def get_option_data(self, option) -> Dict:
        return self.options.get(option, {})

    def get_options_data(self) -> Dict:
        return json.loads(self.options_data or '{}')

    def get_data(self) -> Dict:
        data = json.loads(self.template_data)
        if self.inventory is not None:
            try:
                data['inventory'] = int(self.inventory)
            except ValueError:
                data['inventory'] = self.inventory
        return data

    @property
    def inventory_object(self) -> InvOrString:
        try:
            if 'inventory' not in self.data:
                return None
            return self.project.inventories.get(pk=int(self.data['inventory']))
        except (ValueError, Inventory.DoesNotExist):
            self.project.check_path(self.data['inventory'])
            return self.data['inventory']

    def get_data_with_options(self, option: Optional[str], **extra) -> Dict[str, Any]:
        data = self.get_data()
        option_data = self.get_option_data(option)
        option_vars = option_data.pop("vars", {})
        vars = data.pop("vars", {})
        vars.update(option_vars)
        data.update(option_data)
        data.update(vars)
        data.update(extra)
        return data

    def get_plugin(self):
        plugin = self.kind.upper()
        if self.kind in self._exec_types:
            plugin = self._exec_types[self.kind].upper()
        return plugin

    def execute(self, user: User, option: Optional[str] = None, **kwargs):
        from ...main.executions import PLUGIN_HANDLERS  # pylint: disable=import-outside-toplevel

        return PLUGIN_HANDLERS.execute(
            self.get_plugin(),
            project=self.project,
            execute_args=self.get_data_with_options(option, **kwargs),
            executor=user,
            initiator=self.id,
            initiator_type='template',
            template_option=option,
        )

    def ci_run(self):
        self.execute(self.project.owner)

    def _convert_to_data(self, value):
        if isinstance(value, str):
            return json.loads(value)  # nocv
        elif isinstance(value, (dict, OrderedDict, list)):
            return value
        raise ValueError("Unknown data type set.")  # nocv

    def __encrypt(self, new_vars: Dict, data_name: Text = 'data') -> Dict:
        old_vars = getattr(self, data_name).get('vars', {})
        for key in filter(lambda k: new_vars[k] == CYPHER, new_vars.keys()):
            new_vars[key] = old_vars.get(key, new_vars[key])
        return new_vars

    def keep_encrypted_data(self, new_vars: Dict) -> Dict:
        if self.template_data == '{}':
            return new_vars
        return self.__encrypt(new_vars)

    def _validate_option_data(self, data: Dict) -> None:
        excepted = self.excepted_execution_fields
        errors = {
            name: ['Disallowed to override {}.'.format(name)]
            for name in data.keys() if name in excepted
        }
        if errors:
            raise ValidationError(errors)

    def set_options_data(self, value: Any) -> None:
        options_data = self._convert_to_data(value)
        new = {}
        for option, data in options_data.items():
            self._validate_option_data(data)
            if data.get('vars', None):
                data['vars'] = self.__encrypt(data['vars'], 'options')
            new[option] = data
        self.options_data = json.dumps(new)

    def set_data(self, value) -> None:
        data = self._convert_to_data(value)
        data['vars'] = self.keep_encrypted_data(data.get('vars', {}))
        self.template_data = json.dumps(data)

    @property
    def data(self) -> Dict:
        return self.get_data()

    @data.setter
    def data(self, value) -> None:
        self.set_data(value)

    @data.deleter
    def data(self) -> None:  # nocv
        self.template_data = ""
        self.inventory = None
        self.project = None

    @property
    def options(self) -> Dict[str, Dict]:
        return self.get_options_data()

    @options.setter
    def options(self, value) -> None:
        self.set_options_data(value)

    @options.deleter
    def options(self) -> None:  # nocv
        self.options_data = ''

    @property
    def options_list(self) -> List[str]:
        return list(self.options.keys())

    @property
    def options_qs(self):
        return TemplateOption.objects.prepare_related(self)


class TemplateOptionQueryset(CustomQuerySet):
    def prepare_related(self, template):
        return self.setup_custom_queryset_kwargs(template=template)._chain(
            field=[f for f in self.model._meta.fields if f.name == 'template'][0],
            instance=template,
        )


class TemplateOption(ListModel):
    objects = TemplateOptionQueryset.as_manager()

    template = models.ForeignKey(Template, on_delete=models.DO_NOTHING)
    id = models.SlugField(max_length=256, primary_key=True)
    name = models.CharField(max_length=256)
    data = models.JSONField(default=dict)

    class Meta:
        managed = False

    def get_pk_value(self):
        return slugify(self.name)

    def set_pk_value(self, value):
        pass

    @classmethod
    def _get_data(cls, template: Template, **kwargs):
        return [
            {'id': slugify(key), 'name': key, 'data': value, 'template': template}
            for key, value in template.options.items()
        ]

    def save(self, **kwargs):
        # TODO: Make this code transaction atomic
        if kwargs.get('force_insert', False) and slugify(self.name) in map(slugify, self.template.options.keys()):
            raise IntegrityError(_('Template option name should be unique'))
        self.template.set_options_data({
            **self.template.options,
            self.name: self.data,
        })
        self.template.save()

    def delete(self, **kwargs):
        options = self.template.options
        del options[self.name]
        self.template.set_options_data(options)
        self.template.save()

    @property
    def kind(self):
        return self.template.kind


class PeriodicTaskQuerySet(AbstractVarsQuerySet):
    use_for_related_fields = True


# noinspection PyTypeChecker
class PeriodicTask(AbstractModel):
    objects     = PeriodicTaskQuerySet.as_manager()
    project        = models.ForeignKey(Project, on_delete=models.CASCADE,
                                       related_query_name="periodic_task")
    mode           = models.CharField(max_length=256)
    kind           = models.CharField(max_length=50, default="PLAYBOOK")
    _inventory     = models.ForeignKey(Inventory, on_delete=models.CASCADE,
                                       related_query_name="periodic_task",
                                       null=True, blank=True)
    inventory_file = models.CharField(max_length=2*1024, null=True, blank=True)
    schedule       = models.CharField(max_length=768)
    type           = models.CharField(max_length=10)
    save_result    = models.BooleanField(default=True)
    enabled        = models.BooleanField(default=True)
    template       = models.ForeignKey(Template, on_delete=models.CASCADE,
                                       related_query_name="periodic_task",
                                       null=True, blank=True)
    template_opt   = models.CharField(max_length=256, null=True, blank=True)

    kinds = ["PLAYBOOK", "MODULE", "TEMPLATE"]
    types = ["CRONTAB", "INTERVAL"]

    class Meta:
        default_related_name = "periodic_task"

    time_types = {
        'minute': {"max_": 60},
        'hour': {"max_": 24},
        'day_of_week': {"max_": 7},
        'day_of_month': {"max_": 31, "min_": 1},
        'month_of_year': {"max_": 12, "min_": 1}}
    time_types_list = [
        'minute', 'hour', 'day_of_month', 'month_of_year', "day_of_week"
    ]

    @property
    def inventory(self) -> InvOrString:
        return self._inventory or self.inventory_file

    @inventory.setter
    def inventory(self, inventory: InvOrString) -> None:
        if isinstance(inventory, Inventory):
            self._inventory = inventory
            self.inventory_file = None
        elif isinstance(inventory, str):
            self.inventory_file = inventory
            self._inventory = None

    @property
    def crontab_kwargs(self) -> Dict:
        kwargs, index, fields = {}, 0, self.schedule.split(" ")
        for field_name in self.time_types_list:
            if index < len(fields) and len(fields[index]) > 0:
                kwargs[field_name] = fields[index]
            else:
                kwargs[field_name] = "*"
            index += 1
        return kwargs

    def get_vars(self) -> OrderedDict:
        qs = self.variables.order_by("key")
        return OrderedDict(qs.values_list('key', 'value'))

    def get_schedule(self) -> Any:
        if self.type == "CRONTAB":
            return crontab(**self.crontab_kwargs)
        return float(self.schedule)

    def execute(self, sync: bool = True) -> HISTORY_ID:
        from ...main.executions import PLUGIN_HANDLERS  # pylint: disable=import-outside-toplevel

        execute_args = {}
        kwargs = dict(
            sync=sync, save_result=self.save_result,
            initiator=self.id, initiator_type="scheduler"
        )
        if self.kind == 'PLAYBOOK':
            execute_args['playbook'] = self.mode
        elif self.kind == 'MODULE':
            execute_args['module'] = self.mode

        if self.kind != 'TEMPLATE':
            plugin = self.kind
            execute_args['inventory'] = self.inventory
            execute_args.update(self.vars)
        else:
            data = self.template.get_data_with_options(self.template_opt)
            data.pop('inventory', None)
            data['inventory'] = self.template.inventory_object
            plugin = self.template.get_plugin()
            execute_args.update(data)

        return PLUGIN_HANDLERS.execute(plugin, self.project, execute_args, **kwargs)


class HistoryQuerySet(BQuerySet):
    use_for_related_fields = True

    def create(self, **kwargs) -> BModel:
        raw_stdout = kwargs.pop("raw_stdout", None)
        history = super().create(**kwargs)
        if raw_stdout:
            history.raw_stdout = raw_stdout
        return history

    def _get_history_stats_by(self, qs, grouped_by='day') -> List:
        sum_by_date, values = {}, []
        qs = qs.values(grouped_by, 'status').annotate(sum=Count('id'))
        for hist_stat in qs.order_by(grouped_by):
            sum_by_date[hist_stat[grouped_by]] = (
                sum_by_date.get(hist_stat[grouped_by], 0) + hist_stat['sum']
            )
        for hist_stat in qs.order_by(grouped_by, 'status'):
            hist_stat.update({'all': sum_by_date[hist_stat[grouped_by]]})
            values.append(hist_stat)
        return values

    def stats(self, last: int) -> OrderedDict:
        qs = self.filter(start_time__gte=timezone.now()-timedelta(days=last))
        qs = qs.annotate(
            day=dbfunc.TruncDay('start_time'),
            month=dbfunc.TruncMonth('start_time'),
            year=dbfunc.TruncYear('start_time'),
        )
        result = OrderedDict()
        result['day'] = self._get_history_stats_by(qs, 'day')
        result['month'] = self._get_history_stats_by(qs, 'month')
        result['year'] = self._get_history_stats_by(qs, 'year')
        return result


class History(BModel):
    ansi_escape = re.compile(r'\x1b[^m]*m')
    objects        = HistoryQuerySet.as_manager()
    project        = models.ForeignKey(Project, on_delete=models.CASCADE,
                                       related_query_name="history", null=True)
    inventory      = models.ForeignKey(Inventory, on_delete=models.SET_NULL,
                                       related_query_name="history",
                                       blank=True, null=True, default=None)
    mode           = models.CharField(max_length=256)
    revision       = models.CharField(max_length=256, blank=True, null=True)
    kind           = models.CharField(max_length=50, default="PLAYBOOK", db_index=True)
    start_time     = models.DateTimeField(default=timezone.now)
    stop_time      = models.DateTimeField(blank=True, null=True)
    raw_args       = models.TextField(default="")
    json_args      = models.TextField(default="{}")
    raw_inventory  = models.TextField(default="")
    status         = models.CharField(max_length=50, db_index=True)
    initiator      = models.IntegerField(default=0)
    # Initiator type should be always as in urls for api
    initiator_type = models.CharField(max_length=50, default="project")
    executor       = models.ForeignKey(User, blank=True, null=True, default=None,
                                       on_delete=models.SET_NULL)
    json_options   = models.TextField(default="{}")

    working_statuses = ['DELAY', 'RUN']
    stoped_statuses = ['OK', 'ERROR', 'OFFLINE', 'INTERRUPTED']
    statuses = working_statuses + stoped_statuses

    def __init__(self, *args, **kwargs):
        execute_args = kwargs.pop('execute_args', None)
        super().__init__(*args, **kwargs)
        if execute_args:
            self.execute_args = execute_args

    class NoFactsAvailableException(NotApplicable):
        def __init__(self):
            msg = "Facts can be gathered only by setup module."
            super(History.NoFactsAvailableException, self).__init__(msg)

    class Meta:
        default_related_name = "history"
        ordering = ["-start_time"]

    @property
    def working(self) -> bool:
        return self.status in self.working_statuses

    def get_hook_data(self, when: str) -> OrderedDict:
        data = OrderedDict()
        data['id'] = self.id
        data['start_time'] = self.start_time.isoformat()
        if when == "after_execution":
            data['stop_time'] = self.stop_time.isoformat()
            data['status'] = self.status
        data["initiator"] = dict(
            initiator_type=self.initiator_type,
            initiator_id=self.initiator,
        )
        if self.initiator_type in ["template", "scheduler"]:
            data["initiator"]['name'] = self.initiator_object.name
        return data

    def _get_seconds_from_time(self, value: datetime) -> int:
        return int(value.total_seconds())

    @property
    def execution_time(self) -> int:
        if self.stop_time is None:
            return self._get_seconds_from_time(now() - self.start_time)  # nocv
        return self._get_seconds_from_time(self.stop_time - self.start_time)

    @property
    def execute_args(self) -> Dict[str, Any]:
        return json.loads(self.json_args)

    @execute_args.setter
    def execute_args(self, value: Dict) -> None:
        if not isinstance(value, dict):
            raise ValidationError(dict(args="Should be a dict."))
        data = {k: v for k, v in value.items() if k not in ['group']}
        HiddenArgumentsEnum.hide_values(data)
        self.json_args = json.dumps(data)

    # options
    @property
    def options(self) -> Dict:
        return json.loads(self.json_options)

    @options.setter
    def options(self, value: Dict) -> None:
        if not isinstance(value, dict):
            raise ValidationError(dict(args="Should be a dict."))  # nocv
        self.json_options = json.dumps(value)

    @property
    def initiator_object(self) -> Any:
        if self.initiator_type == "project" and self.initiator:
            return self
        elif self.initiator_type == "scheduler" and self.initiator:
            return PeriodicTask.objects.get(id=self.initiator)
        elif self.initiator_type == "template" and self.initiator:
            return Template.objects.get(id=self.initiator)
        return None

    @property
    def facts(self) -> Dict:
        if self.status not in self.stoped_statuses:
            raise DataNotReady("Execution still in process.")
        if self.kind != 'MODULE' or self.mode != 'setup' or self.status != 'OK':
            raise self.NoFactsAvailableException()
        data = self.get_raw(
            original=False,
            excludes=(
                Q(line__contains="No config file") | Q(line__contains="as config file"),
            )
        )
        regex = (
            r"^([\S]{1,})\s\|\s([\S]{1,}) \=>"
            r" \{\s([^\r]*?\"[\w]{1,}\"\: .*?\s)\}\s{0,1}"
        )
        subst = '"\\1": {\n\t"status": "\\2", \n\\3},'
        result = re.sub(regex, subst, data, 0, re.MULTILINE)
        result = re.findall(r'^".*":[\s\S]*$', result, re.MULTILINE)[0]
        result = "{" + result[:-1] + "\n}"
        return json.loads(result)

    def get_raw(self, original=True, filters=(), excludes=()) -> Text:
        qs = self.raw_history_line.filter(*filters).exclude(*excludes)
        qs = qs.order_by('line_gnumber', 'line_number')
        data = "".join(qs.values_list("line", flat=True))
        return data if original else self.ansi_escape.sub('', data)

    @property
    def raw_stdout(self) -> str:
        return self.get_raw()

    @raw_stdout.setter
    @transaction.atomic
    def raw_stdout(self, lines: Iterable) -> None:
        del self.raw_stdout
        self.check_output(lines)

    @raw_stdout.deleter
    def raw_stdout(self) -> None:
        self.raw_history_line.all().delete()

    def check_output(self, output: str) -> None:
        raw_count = self.raw_history_line.all().count()
        lines = re.findall(r'.+\n{0,}', output)
        counter = 0
        if raw_count >= len(lines):
            return  # nocv
        for line in lines[raw_count:]:
            counter += 1
            self.write_line(number=counter, value=line)

    def write_line(self, value: str, number: int, endl: Text = "") -> None:
        self.raw_history_line.bulk_create([
            HistoryLines(line_gnumber=number, line_number=1, line=value + endl, history=self)
        ])


class HistoryLines(BaseModel):
    id = models.BigAutoField(primary_key=True)
    line = models.TextField(default="")
    line_number = models.IntegerField(default=0)
    line_gnumber = models.IntegerField(default=0)
    history = models.ForeignKey(History, on_delete=models.CASCADE, related_query_name="raw_history_line")

    class Meta:
        default_related_name = "raw_history_line"
        ordering = ['-line_gnumber', '-line_number']
