# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
from collections import OrderedDict
from datetime import timedelta
from functools import partial
import json

import re
import six
from celery.schedules import crontab
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import functions as dbfunc, Count
from django.utils.timezone import now
from rest_framework.exceptions import UnsupportedMediaType

from ..utils import AnsibleArgumentsReference
from . import Inventory
from ..exceptions import DataNotReady, NotApplicable
from .base import ForeignKeyACL, BModel, ACLModel, BQuerySet, models
from .vars import AbstractModel, AbstractVarsQuerySet
from .projects import Project


logger = logging.getLogger("polemarch")


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
        index_together = [
            ["id", "name", "kind", "inventory", "project"]
        ]

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

    def get_option_data(self, option):
        return self.options.get(option, {})

    def get_options_data(self):
        return json.loads(self.options_data or '{}')

    def get_data(self):
        data = json.loads(self.template_data)
        if "inventory" in self.template_fields[self.kind] and self.inventory:
            try:
                data['inventory'] = int(self.inventory)
            except ValueError:
                data['inventory'] = self.inventory
        return data

    @property
    def inventory_object(self):
        try:
            return self.project.inventories.get(pk=int(self.data['inventory']))
        except (ValueError, Inventory.DoesNotExist):
            self.project.check_path(self.data['inventory'])
            return self.data['inventory']

    def get_data_with_options(self, option, **extra):
        data = self.get_data()
        option_data = self.get_option_data(option)
        option_vars = option_data.pop("vars", {})
        vars = data.pop("vars", {})
        vars.update(option_vars)
        data.update(option_data)
        data.update(vars)
        data.update(extra)
        return data

    def execute(self, serializer, user, option=None, **extra):
        # pylint: disable=protected-access
        tp = self._exec_types.get(self.kind, None)
        if tp is None:
            raise UnsupportedMediaType(media_type=self.kind)  # nocv
        return serializer._execution(
            tp, self.get_data_with_options(option, **extra), user,
            template=self.id, template_option=option
        )

    def _convert_to_data(self, value):
        if isinstance(value, (six.string_types, six.text_type)):
            return json.loads(value)  # nocv
        elif isinstance(value, (dict, OrderedDict, list)):
            return value
        else:
            raise ValueError("Unknown data type set.")  # nocv

    def __encrypt(self, new_vars, data_name='data'):
        old_vars = getattr(self, data_name).get('vars', {})
        secrets = filter(lambda key: new_vars[key] == '[~~ENCRYPTED~~]', new_vars.keys())
        for key in secrets:
            new_vars[key] = old_vars.get(key, new_vars[key])
        return new_vars

    def keep_encrypted_data(self, new_vars):
        if self.template_data == '{}':
            return new_vars
        return self.__encrypt(new_vars)

    def _validate_option_data(self, data):
        excepted = self.excepted_execution_fields
        errors = {
            name: ['Disallowed to override {}.'.format(name)]
            for name in data.keys() if name in excepted
        }
        if errors:
            raise ValidationError(errors)

    def set_options_data(self, value):
        options_data = self._convert_to_data(value)
        new = dict()
        for option, data in options_data.items():
            self._validate_option_data(data)
            if data.get('vars', None):
                data['vars'] = self.__encrypt(data['vars'], 'options')
            new[option] = data
        self.options_data = json.dumps(new)

    def set_data(self, value):
        data = self._convert_to_data(value)
        inventory_id = data.pop('inventory', None)
        if "inventory" in self.template_fields[self.kind]:
            try:
                self.inventory = self.project.inventories.get(pk=int(inventory_id)).id
            except (ValueError, TypeError, Inventory.DoesNotExist):
                self.inventory = inventory_id
        data['vars'] = self.keep_encrypted_data(data.get('vars', None))
        self.template_data = json.dumps(data)

    @property
    def data(self):
        return self.get_data()

    @data.setter
    def data(self, value):
        self.set_data(value)

    @data.deleter
    def data(self):  # nocv
        self.template_data = ""
        self.inventory = None
        self.project = None

    @property
    def options(self):
        return self.get_options_data()

    @options.setter
    def options(self, value):
        self.set_options_data(value)

    @options.deleter
    def options(self):  # nocv
        self.options_data = ''

    @property
    def options_list(self):
        return list(self.options.keys())


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
    schedule       = models.CharField(max_length=4*1024)
    type           = models.CharField(max_length=10)
    save_result    = models.BooleanField(default=True)
    enabled        = models.BooleanField(default=True)
    template       = models.ForeignKey(Template, on_delete=models.CASCADE,
                                       related_query_name="periodic_task",
                                       null=True, blank=True)
    template_opt   = models.CharField(max_length=256, null=True, blank=True)

    kinds = ["PLAYBOOK", "MODULE", "TEMPLATE"]
    types = ["CRONTAB", "INTERVAL"]
    HIDDEN_VARS = [
        'key-file',
        'key_file',
        'private-key',
        'private_key',
        'vault-password-file',
        'vault_password_file',
        'new-vault-password-file',
        'new_vault_password_file',
    ]

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
    def inventory(self):
        return self._inventory or self.inventory_file

    @inventory.setter
    def inventory(self, inventory):
        if isinstance(inventory, Inventory):
            self._inventory = inventory  # nocv
        elif isinstance(inventory, (six.string_types, six.text_type, int)):
            try:
                self._inventory = self.project.inventories.get(pk=int(inventory))
            except (ValueError, Inventory.DoesNotExist):
                self.project.check_path(inventory)
                self.inventory_file = inventory

    @property
    def crontab_kwargs(self):
        kwargs, index, fields = dict(), 0, self.schedule.split(" ")
        for field_name in self.time_types_list:
            if index < len(fields) and len(fields[index]) > 0:
                kwargs[field_name] = fields[index]
            else:
                kwargs[field_name] = "*"
            index += 1
        return kwargs

    def get_vars(self):
        qs = self.variables.order_by("key")
        return OrderedDict(qs.values_list('key', 'value'))

    def get_schedule(self):
        if self.type == "CRONTAB":
            return crontab(**self.crontab_kwargs)
        return float(self.schedule)

    def execute(self, sync=True):
        kwargs = dict(
            sync=sync, save_result=self.save_result,
            initiator=self.id, initiator_type="scheduler"
        )
        if self.kind != 'TEMPLATE':
            args = [self.kind, self.mode, self.inventory]
            kwargs.update(self.vars)
        else:
            data = self.template.get_data_with_options(self.template_opt)
            data.pop('inventory', None)
            kind = self.template._exec_types[self.template.kind]
            args = [
                kind.upper(),
                data.pop(kind),
                self.template.inventory_object
            ]
            kwargs.update(data)
        return self.project.execute(*args, **kwargs)


class HistoryQuerySet(BQuerySet):
    use_for_related_fields = True

    def create(self, **kwargs):
        raw_stdout = kwargs.pop("raw_stdout", None)
        history = super(HistoryQuerySet, self).create(**kwargs)
        if raw_stdout:
            history.raw_stdout = raw_stdout
        return history

    def _get_history_stats_by(self, qs, grouped_by='day'):
        sum_by_date, values = {}, []
        qs = qs.values(grouped_by, 'status').annotate(sum=Count('id'))
        for hist_stat in qs.order_by(grouped_by):
            sum_by_date[hist_stat[grouped_by]] = (
                sum_by_date.get(hist_stat[grouped_by], 0) + hist_stat['sum']
            )
        for hist_stat in qs.order_by(grouped_by):
            hist_stat.update({'all': sum_by_date[hist_stat[grouped_by]]})
            values.append(hist_stat)
        return values

    def stats(self, last):
        qs = self.filter(start_time__gte=now()-timedelta(days=last))
        qs = qs.annotate(
            day=dbfunc.TruncDay('start_time'),
            month=dbfunc.TruncMonth('start_time'),
            year=dbfunc.TruncYear('start_time'),
        )
        return OrderedDict(
            day=self._get_history_stats_by(qs, 'day'),
            month=self._get_history_stats_by(qs, 'month'),
            year=self._get_history_stats_by(qs, 'year')
        )

    def __check_ansible_args(self, command, ansible_args):
        AnsibleArgumentsReference().validate_args(command.lower(), dict(ansible_args))

    def __get_extra_options(self, extra, options):
        return {opt: extra.pop(opt, options[opt]) for opt in options}

    def __get_additional_options(self, extra_options):
        options = dict()
        if extra_options['template_option'] is not None:
            options['template_option'] = extra_options['template_option']
        return options

    def start(self, project, kind, mod_name, inventory, **extra):
        extra_options = self.__get_extra_options(extra, project.EXTRA_OPTIONS)
        self.__check_ansible_args(kind, extra)
        if not extra_options['save_result']:
            return None, extra
        history_kwargs = dict(
            mode=mod_name, start_time=timezone.now(),
            inventory=inventory, project=project,
            kind=kind, raw_stdout="", execute_args=extra,
            initiator=extra_options['initiator'],
            initiator_type=extra_options['initiator_type'],
            executor=extra_options['executor'], hidden=project.hidden,
            options=self.__get_additional_options(extra_options)
        )
        if isinstance(inventory, (six.string_types, six.text_type)):
            history_kwargs['inventory'] = None
        elif isinstance(inventory, int):
            history_kwargs['inventory'] = project.inventories.get(pk=inventory)  # nocv
        return self.create(status="DELAY", **history_kwargs), extra


class History(BModel):
    ansi_escape = re.compile(r'\x1b[^m]*m')
    objects        = HistoryQuerySet.as_manager()
    project        = models.ForeignKey(Project, on_delete=models.CASCADE,
                                       related_query_name="history", null=True)
    inventory      = models.ForeignKey(Inventory, on_delete=models.CASCADE,
                                       related_query_name="history",
                                       blank=True, null=True, default=None)
    mode           = models.CharField(max_length=256)
    revision       = models.CharField(max_length=256, blank=True, null=True)
    kind           = models.CharField(max_length=50, default="PLAYBOOK")
    start_time     = models.DateTimeField(default=timezone.now)
    stop_time      = models.DateTimeField(blank=True, null=True)
    raw_args       = models.TextField(default="")
    json_args      = models.TextField(default="{}")
    raw_inventory  = models.TextField(default="")
    status         = models.CharField(max_length=50)
    initiator      = models.IntegerField(default=0)
    # Initiator type should be always as in urls for api
    initiator_type = models.CharField(max_length=50, default="project")
    executor       = models.ForeignKey(User, blank=True, null=True, default=None)
    json_options   = models.TextField(default="{}")

    working_statuses = ['DELAY', 'RUN']
    stoped_statuses = ['OK', 'ERROR', 'OFFLINE', 'INTERRUPTED']
    statuses = working_statuses + stoped_statuses

    def __init__(self, *args, **kwargs):
        execute_args = kwargs.pop('execute_args', None)
        super(History, self).__init__(*args, **kwargs)
        if execute_args:
            self.execute_args = execute_args

    class NoFactsAvailableException(NotApplicable):
        def __init__(self):
            msg = "Facts can be gathered only by setup module."
            super(History.NoFactsAvailableException, self).__init__(msg)

    class Meta:
        default_related_name = "history"
        ordering = ["-start_time"]
        index_together = [
            ["id", "project", "mode", "status", "inventory",
             "start_time", "stop_time", "initiator", "initiator_type"]
        ]

    @property
    def working(self):
        return self.status in self.working_statuses

    def get_hook_data(self, when):
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

    def _get_seconds_from_time(self, value):
        return int(value.total_seconds())

    @property
    def execution_time(self):
        if self.stop_time is None:
            return self._get_seconds_from_time(now() - self.start_time)  # nocv
        else:
            return self._get_seconds_from_time(self.stop_time - self.start_time)

    @property
    def execute_args(self):
        return json.loads(self.json_args)

    @execute_args.setter
    def execute_args(self, value):
        if not isinstance(value, dict):
            raise ValidationError(dict(args="Should be a dict."))
        data = {k: v for k, v in value.items() if k not in ['group']}
        for key in PeriodicTask.HIDDEN_VARS:
            if key in data:
                data[key] = "[~~ENCRYPTED~~]"
        self.json_args = json.dumps(data)

    # options
    @property
    def options(self):
        return json.loads(self.json_options)

    @options.setter
    def options(self, value):
        if not isinstance(value, dict):
            raise ValidationError(dict(args="Should be a dict."))  # nocv
        self.json_options = json.dumps(value)

    @property
    def initiator_object(self):
        if self.initiator_type == "project" and self.initiator:
            return self
        elif self.initiator_type == "scheduler" and self.initiator:
            return PeriodicTask.objects.get(id=self.initiator)
        elif self.initiator_type == "template" and self.initiator:
            return Template.objects.get(id=self.initiator)
        else:
            return None

    @property
    def facts(self):
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
        result = "{" + result[:-1] + "\n}"
        return json.loads(result)

    def get_raw(self, original=True, filters=(), excludes=()):
        qs = self.raw_history_line.filter(*filters).exclude(*excludes)
        qs = qs.order_by('line_gnumber', 'line_number')
        data = "".join(qs.values_list("line", flat=True))
        return data if original else self.ansi_escape.sub('', data)

    @property
    def raw_stdout(self):
        return self.get_raw()

    @raw_stdout.setter
    @transaction.atomic
    def raw_stdout(self, lines):
        del self.raw_stdout
        self.check_output(lines)

    @raw_stdout.deleter
    def raw_stdout(self):
        self.raw_history_line.all().delete()

    def check_output(self, output):
        raw_count = self.raw_history_line.all().count()
        lines = re.findall(r'.+\n{0,}', output)
        counter = 0
        if raw_count >= len(lines):
            return  # nocv
        for line in lines[raw_count:]:
            counter += 1
            self.write_line(number=counter, value=line)

    def __create_line(self, gnum, num, val, hidden=False):
        return HistoryLines(
            history=self, line_gnumber=gnum, line_number=num, line=val, hidden=hidden
        )

    def __bulking_lines(self, value, number, endl):
        out = six.StringIO(value)
        nline = 0
        for line in iter(partial(out.read, 2 * 1024 - 100), ''):
            nline += 1
            yield self.__create_line(number, nline, line)
        if endl:
            yield self.__create_line(number, nline, endl)

    def write_line(self, value, number, endl=""):
        self.raw_history_line.bulk_create(
            map(lambda l: l, self.__bulking_lines(value, number, endl))
        )


class HistoryLines(BModel):
    line         = models.CharField(default="", max_length=2*1024)
    line_number  = models.IntegerField(default=0)
    line_gnumber = models.IntegerField(default=0)
    history      = models.ForeignKey(History, on_delete=models.CASCADE,
                                     related_query_name="raw_history_line")

    class Meta:
        default_related_name = "raw_history_line"
        ordering = ['-line_gnumber', '-line_number']
        index_together = [
            ["history"], ["line_number"],
            ["history", "line_number"]
        ]
