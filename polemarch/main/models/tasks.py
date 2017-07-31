# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import uuid
from collections import OrderedDict

import json

import re
import six
from celery.schedules import crontab
from django.db import transaction
from django.utils import timezone

from . import Inventory
from ..exceptions import DataNotReady, NotApplicable
from .base import BModel, BManager, BQuerySet, models
from .vars import AbstractModel, AbstractVarsQuerySet
from .projects import Project

logger = logging.getLogger("polemarch")


# Block of real models
class Task(BModel):
    project     = models.ForeignKey(Project, on_delete=models.CASCADE,
                                    related_query_name="tasks")
    name        = models.CharField(max_length=256, default=uuid.uuid1)
    playbook    = models.CharField(max_length=256)

    class Meta:
        default_related_name = "tasks"

    def __unicode__(self):
        return str(self.name)


# noinspection PyTypeChecker
class PeriodicTask(AbstractModel):
    objects     = BManager.from_queryset(AbstractVarsQuerySet)()
    project     = models.ForeignKey(Project, on_delete=models.CASCADE,
                                    related_query_name="periodic_tasks",
                                    blank=True, null=True)
    mode        = models.CharField(max_length=256)
    kind        = models.CharField(max_length=50, default="PLAYBOOK")
    inventory   = models.ForeignKey(Inventory, on_delete=models.CASCADE,
                                    related_query_name="periodic_tasks")
    schedule    = models.CharField(max_length=4*1024)
    type        = models.CharField(max_length=10)

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

    def execute(self):
        if self.kind == "PLAYBOOK":
            self.run_ansible_playbook()
        elif self.kind == "MODULE":
            self.run_ansible_module()

    def run_ansible_module(self):
        self.project.execute_ansible_playbook(self.mode, self.inventory.id,
                                              sync=True, **self.vars)

    def run_ansible_playbook(self):
        self.project.execute_ansible_playbook(self.mode, self.inventory.id,
                                              sync=True, **self.vars)


class Template(BModel):
    name          = models.CharField(max_length=512)
    kind          = models.CharField(max_length=32)
    template_data = models.TextField(default="")

    class Meta:
        index_together = [
            ["id", "name", "kind"]
        ]

    template_fields = {}
    template_fields["Task"] = ["playbook", "vars", "inventory", "project"]
    template_fields["PeriodicTask"] = ["type", "name", "schedule", "inventory",
                                       "kind", "mode", "project", "vars"]
    template_fields["Module"] = ["inventory", "module", "group", "args",
                                 "vars"]
    template_fields["Host"] = ["name", "vars"]
    template_fields["Group"] = template_fields["Host"] + ["children"]

    @property
    def data(self):
        return json.loads(self.template_data)

    @data.setter
    def data(self, value):
        if isinstance(value, (six.string_types, six.text_type)):
            self.template_data = json.dumps(json.loads(json.dumps(value)))
        elif isinstance(value, (dict, OrderedDict, list)):
            self.template_data = json.dumps(value)
        else:
            raise ValueError("Unknown data type set.")

    @data.deleter
    def data(self):
        self.template_data = ""


class HistoryQuerySet(BQuerySet):
    use_for_related_fields = True

    def create(self, **kwargs):
        raw_stdout = kwargs.pop("raw_stdout", None)
        history = super(HistoryQuerySet, self).create(**kwargs)
        if raw_stdout:
            history.raw_stdout = raw_stdout
        return history


class History(BModel):
    objects       = HistoryQuerySet.as_manager()
    project       = models.ForeignKey(Project,
                                      on_delete=models.CASCADE,
                                      related_query_name="history",
                                      null=True)
    inventory     = models.ForeignKey(Inventory,
                                      on_delete=models.CASCADE,
                                      related_query_name="history",
                                      blank=True, null=True, default=None)
    mode          = models.CharField(max_length=256)
    kind          = models.CharField(max_length=50, default="PLAYBOOK")
    start_time    = models.DateTimeField(default=timezone.now)
    stop_time     = models.DateTimeField(blank=True, null=True)
    raw_args      = models.TextField(default="")
    raw_inventory = models.TextField(default="")
    status        = models.CharField(max_length=50)

    class NoFactsAvailableException(NotApplicable):
        def __init__(self):
            msg = "Facts can be gathered only by setup module."
            super(History.NoFactsAvailableException, self).__init__(msg)

    class Meta:
        default_related_name = "history"
        ordering = ["-id"]
        index_together = [
            ["id", "project", "mode", "status", "inventory",
             "start_time", "stop_time"]
        ]

    @property
    def facts(self):
        def jsonify(match):
            source = str(match.group(0))
            result = ', "' + source
            result = re.sub(r" \| ", '":{ "status": "', result)
            result = re.sub(r" => {", '",', result)
            return result

        if self.status not in ['OK', 'ERROR', 'OFFLINE']:
            raise DataNotReady("Execution still in process.")
        if self.kind != 'MODULE':
            raise self.NoFactsAvailableException()
        if self.mode != 'setup':
            raise self.NoFactsAvailableException()
        data = self.raw_stdout
        result = re.sub(r"[^|^\n]+\|[^{]+{\n", jsonify, data)
        result = "{" + result[1:] + "}"
        return json.loads(result)

    @property
    def raw_stdout(self):
        return "\n".join(self.raw_history_line
                         .values_list("line", flat=True)[:10000000])

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
