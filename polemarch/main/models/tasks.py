# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import uuid
from collections import OrderedDict
from datetime import timedelta

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

from .base import ForeignKeyACL

from ..utils import AnsibleArgumentsReference
from . import Inventory
from ..exceptions import DataNotReady, NotApplicable
from .base import BModel, BQuerySet, models
from .vars import AbstractModel, AbstractVarsQuerySet
from .projects import Project
from .acl import ACLModel, ACLHistoryQuerySet

logger = logging.getLogger("polemarch")


class TaskFilterQuerySet(BQuerySet):
    use_for_related_fields = True

    def user_filter(self, user):
        return self.filter(project__in=Project.objects.all().user_filter(user))


# Block of real models
class Task(BModel):
    objects     = TaskFilterQuerySet.as_manager()
    project     = models.ForeignKey(Project, on_delete=models.CASCADE,
                                    related_query_name="tasks")
    name        = models.CharField(max_length=256, default=uuid.uuid1)
    playbook    = models.CharField(max_length=256)

    class Meta:
        default_related_name = "tasks"

    def __unicode__(self):
        return str(self.name)  # nocv

    def viewable_by(self, user):
        return self.project.viewable_by(user)  # nocv


class PeriodicTaskQuerySet(TaskFilterQuerySet, AbstractVarsQuerySet):
    use_for_related_fields = True


# noinspection PyTypeChecker
class PeriodicTask(AbstractModel):
    objects     = PeriodicTaskQuerySet.as_manager()
    project        = models.ForeignKey(Project, on_delete=models.CASCADE,
                                       related_query_name="periodic_tasks")
    mode           = models.CharField(max_length=256)
    kind           = models.CharField(max_length=50, default="PLAYBOOK")
    _inventory     = models.ForeignKey(Inventory, on_delete=models.CASCADE,
                                       related_query_name="periodic_tasks",
                                       null=True, blank=True)
    inventory_file = models.CharField(max_length=2*1024, null=True, blank=True)
    schedule       = models.CharField(max_length=4*1024)
    type           = models.CharField(max_length=10)
    save_result    = models.BooleanField(default=True)
    enabled        = models.BooleanField(default=True)

    kinds = ["PLAYBOOK", "MODULE"]
    types = ["CRONTAB", "INTERVAL"]
    HIDDEN_VARS = [
        'key-file',
        'private-key',
        'vault-password-file',
        'new-vault-password-file',
    ]

    class Meta:
        default_related_name = "periodic_tasks"

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
            self._inventory = inventory
        elif isinstance(inventory, (six.string_types, six.text_type)):
            try:
                self._inventory = Inventory.objects.get(pk=int(inventory))
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

    @transaction.atomic()
    def set_vars(self, variables):
        command = "playbook"
        if self.kind == "MODULE":
            command = "module"
        AnsibleArgumentsReference().validate_args(command, variables)
        return super(PeriodicTask, self).set_vars(variables)

    def get_schedule(self):
        if self.type == "CRONTAB":
            return crontab(**self.crontab_kwargs)
        return float(self.schedule)

    def execute(self, sync=True):
        return self.project.execute(
            self.kind, self.mode, self.inventory,
            sync=sync, save_result=self.save_result,
            initiator=self.id, initiator_type="scheduler",
            **self.vars
        )

    def editable_by(self, user):
        return self.project.editable_by(user)

    def viewable_by(self, user):
        return self.project.viewable_by(user)  # nocv


class Template(ACLModel):
    name          = models.CharField(max_length=512)
    kind          = models.CharField(max_length=32)
    template_data = models.TextField(default="")
    options_data  = models.TextField(default="")
    inventory     = models.CharField(max_length=128,
                                     default=None, blank=True, null=True)
    project       = ForeignKeyACL(Project,
                                  on_delete=models.SET_NULL,
                                  default=None, blank=True, null=True)

    class Meta:
        index_together = [
            ["id", "name", "kind", "inventory", "project"]
        ]

    template_fields = {}
    template_fields["Task"] = ["playbook", "vars", "inventory", "project"]
    template_fields["PeriodicTask"] = ["type", "name", "schedule", "inventory",
                                       "kind", "mode", "project", "vars"]
    template_fields["Module"] = ["inventory", "module", "group", "args",
                                 "vars", "project"]
    template_fields["Host"] = ["name", "vars"]
    template_fields["Group"] = template_fields["Host"] + ["children"]

    excepted_execution_fields = ['inventory', 'project']
    _exec_types = {
        "Task": "playbook",
        "Module": "module",
    }

    def get_option_data(self, option):
        return self.options.get(option, {})

    def get_options_data(self):
        return json.loads(self.options_data or '{}')

    def get_data(self):
        data = json.loads(self.template_data or '{}')
        if "project" in self.template_fields[self.kind] and self.project:
            data['project'] = self.project.id
        if "inventory" in self.template_fields[self.kind] and self.inventory:
            try:
                data['inventory'] = int(self.inventory)
            except ValueError:
                data['inventory'] = self.inventory
        return data

    def execute(self, serializer, user, option=None):
        # pylint: disable=protected-access
        tp = self._exec_types.get(self.kind, None)
        if tp is None:
            raise UnsupportedMediaType(media_type=self.kind)
        data = self.get_data()
        data.pop("project", None)
        option_data = self.get_option_data(option)
        option_vars = option_data.pop("vars", {})
        vars = data.pop("vars", {})
        vars.update(option_vars)
        data.update(option_data)
        data.update(vars)
        return serializer._execution(tp, data, user, template=self.id)

    def _convert_to_data(self, value):
        if isinstance(value, (six.string_types, six.text_type)):
            return json.loads(value)
        elif isinstance(value, (dict, OrderedDict, list)):
            return value
        else:
            raise ValueError("Unknown data type set.")

    def __encrypt(self, new_vars, data_name='data'):
        old_vars = getattr(self, data_name).get('vars', {})
        for key in new_vars.keys():
            if new_vars[key] == '[~~ENCRYPTED~~]':
                new_vars[key] = old_vars.get(key, new_vars[key])
        return new_vars

    def keep_encrypted_data(self, new_vars):
        if not self.template_data:
            return new_vars
        return self.__encrypt(new_vars)

    def _validate_option_data(self, data):
        errors = {}
        for name in data.keys():
            if name in self.excepted_execution_fields:
                errors['options'] = ['Disallowed to override {}.'.format(name)]
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
        project_id = data.pop('project', None)
        inventory_id = data.pop('inventory', None)
        if "project" in self.template_fields[self.kind]:
            self.project = (
                Project.objects.get(pk=project_id) if project_id
                else project_id
            )
        if "inventory" in self.template_fields[self.kind]:
            try:
                self.inventory = Inventory.objects.get(pk=int(inventory_id)).id
            except (ValueError, TypeError, Inventory.DoesNotExist):
                self.inventory = inventory_id
        data['vars'] = self.keep_encrypted_data(data['vars'])
        self.template_data = json.dumps(data)

    # def __setattr__(self, key, value):
    #    if key == "data":
    #        self.set_data(value)
    #    else:
    #        super(Template, self).__setattr__(key, value)

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


class HistoryQuerySet(ACLHistoryQuerySet):
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


class History(BModel):
    objects        = HistoryQuerySet.as_manager()
    project        = models.ForeignKey(Project,
                                       on_delete=models.CASCADE,
                                       related_query_name="history",
                                       null=True)
    inventory      = models.ForeignKey(Inventory,
                                       on_delete=models.CASCADE,
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

    def get_hook_data(self, when):
        data = OrderedDict()
        data['id'] = self.id
        data['start_time'] = self.start_time.isoformat()
        if when == "after_execution":
            data['stop_time'] = self.stop_time.isoformat()
        data["initiator"] = dict(
            initiator_type=self.initiator_type,
            initiator_id=self.initiator,
        )
        if self.initiator_type in ["template", "scheduler"]:
            data["initiator"]['name'] = self.initiator_object.name
        return data

    @property
    def execution_time(self):
        if self.stop_time is None:
            return int((now() - self.start_time).total_seconds())
        else:
            return int((self.stop_time - self.start_time).total_seconds())

    @property
    def execute_args(self):
        return json.loads(self.json_args)

    @execute_args.setter
    def execute_args(self, value):
        if not isinstance(value, dict):
            raise ValidationError(dict(args="Should be a list."))
        data = {k: v for k, v in value.items() if k not in ['group']}
        for key in data.keys():
            if key in PeriodicTask.HIDDEN_VARS:
                data[key] = "[~~ENCRYPTED~~]"
        self.json_args = json.dumps(data)

    @property
    def initiator_object(self):
        print("123")
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
        if self.status not in ['OK', 'ERROR', 'OFFLINE']:
            raise DataNotReady("Execution still in process.")
        if self.kind != 'MODULE' or self.mode != 'setup':
            raise self.NoFactsAvailableException()
        qs = self.raw_history_line.all()
        qs = qs.exclude(Q(line__contains="No config file") |
                        Q(line__contains="as config file"))
        data = "\n".join(qs.values_list("line", flat=True)) + "\n"
        data = re.sub(r'\x1b[^m]*m', '', data)
        regex = (
            r"^([\S]{1,})\s\|\s([\S]{1,}) \=>"
            r" \{\s([^\r]*?\"[\w]{1,}\"\: .*?\s)\}\s"
        )
        subst = '"\\1": {\n\t"status": "\\2", \n\\3},'
        result = re.sub(regex, subst, data, 0, re.MULTILINE)
        result = "{" + result[:-1] + "}"
        return json.loads(result)

    @property
    def raw_stdout(self):
        return "\n".join(self.raw_history_line
                         .values_list("line", flat=True))

    @raw_stdout.setter
    @transaction.atomic
    def raw_stdout(self, lines):
        counter = 0
        del self.raw_stdout
        for line in lines.split("\n"):
            counter += 1
            self.raw_history_line.create(history=self, line_number=counter,
                                         line=line)

    @raw_stdout.deleter
    def raw_stdout(self):
        self.raw_history_line.all().delete()

    def write_line(self, value, number):  # nocv
        self.raw_history_line.create(
            history=self, line_number=number, line=value
        )

    def editable_by(self, user):  # noce
        if self.inventory is None:
            return self.project.editable_by(user)
        return self.inventory.editable_by(user)

    def _inventory_editable(self, user):  # noce
        return self.inventory and self.inventory.editable_by(user)

    def _inventory_viewable(self, user):  # noce
        return not self.inventory or self.inventory.viewable_by(user)

    def viewable_by(self, user):
        return (
            self.project.editable_by(user) or
            self._inventory_editable(user) or
            (self.initiator == user.id and self.initiator_type == "users") or
            (self.project.viewable_by(user) & self._inventory_viewable(user))
        )


class HistoryLines(BModel):
    line         = models.TextField(default="")
    line_number  = models.IntegerField(default=0)
    history      = models.ForeignKey(History,
                                     on_delete=models.CASCADE,
                                     related_query_name="raw_history_line")

    class Meta:
        default_related_name = "raw_history_line"
        index_together = [
            ["history"], ["line_number"],
            ["history", "line_number"]
        ]
