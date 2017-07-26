# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import sys
import uuid
from collections import namedtuple, OrderedDict
from os.path import dirname

import json

import six
from celery.schedules import crontab
from django.db import transaction
from django.utils import timezone

from . import Inventory
from .base import BModel, BManager, BQuerySet, models
from .vars import _AbstractModel, _AbstractVarsQuerySet
from .projects import Project
from ...main.utils import (tmp_file, CmdExecutor,
                           KVExchanger, CalledProcessError)

logger = logging.getLogger("polemarch")
AnsibleExtra = namedtuple('AnsibleExtraArgs', [
    'args',
    'files',
])


# Classes and methods for support
class Executor(CmdExecutor):
    def __init__(self, history):
        super(Executor, self).__init__()
        self.history = history
        self.counter = 0

    @property
    def output(self):
        return self.history.raw_stdout

    @output.setter
    def output(self, value):
        pass

    def line_handler(self, proc, line):
        cancel = KVExchanger(self.CANCEL_PREFIX + str(self.history.id)).get()
        if cancel is not None:
            self.write_output("\n[ERROR]: User interrupted execution")
            proc.kill()
            proc.wait()
            return True
        return super(Executor, self).line_handler(proc, line)

    def write_output(self, line):
        self.counter += 1
        self.history.raw_history_line.create(history=self.history,
                                             line_number=self.counter,
                                             line=line)


def __parse_extra_args(project, **extra):
    extra_args, files = list(), list()
    for key, value in extra.items():
        if key in ["extra_vars", "extra-vars"]:
            key = "extra-vars"
        elif key == "verbose":
            continue
        elif key in ["key_file", "key-file"]:
            if "BEGIN RSA PRIVATE KEY" in value:
                kfile = tmp_file()
                kfile.write(value)
                files.append(kfile)
                value = kfile.name
            else:
                value = "{}/{}".format(project.path, value)
            key = "key-file"
        extra_args.append("--{}".format(key))
        extra_args += [str(value)] if value else []
    return AnsibleExtra(extra_args, files)


def run_ansible_executable(executable, task, inventory,
                           history, **extra_args):
    history.raw_inventory, key_files = inventory.get_inventory()
    history.status = "RUN"
    history.save()
    path_to_ansible = dirname(sys.executable) + "/" + executable
    inventory_file = tmp_file()
    inventory_file.write(history.raw_inventory)
    status = "OK"
    try:
        extra = __parse_extra_args(project=history.project, **extra_args)
        args = [path_to_ansible, task, '-i',
                inventory_file.name, '-v'] + extra.args
        history.raw_args = " ".join(args)
        history.raw_stdout = Executor(history).execute(args)
    except CalledProcessError as exception:
        history.raw_stdout = str(exception.output)
        if exception.returncode == 4:
            status = "OFFLINE"
        elif exception.returncode == -9:
            status = "INTERRUPTED"
        else:
            status = "ERROR"
    except Exception as exception:  # pragma: no cover
        history.raw_stdout = history.raw_stdout + str(exception)
        status = "ERROR"
    finally:
        inventory_file.close()
        for key_file in key_files:
            key_file.close()
        history.stop_time = timezone.now()
        history.status = status
        history.save()


def run_ansible(group, module, inventory, history, module_args, **extra_args):
    extra_args['module-name'] = module
    if module_args is not None:
        extra_args['args'] = module_args
    run_ansible_executable("ansible", group,
                           inventory, history, **extra_args)


def run_ansible_playbook(task, inventory, history, **extra_args):
    path_to_playbook = "{}/{}".format(task.project.path, task.playbook)
    run_ansible_executable("ansible-playbook", path_to_playbook,
                           inventory, history, **extra_args)


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

    def run_ansible_playbook(self, inventory, history, **extra):
        run_ansible_playbook(self, inventory, history, **extra)


# noinspection PyTypeChecker
class PeriodicTask(_AbstractModel):
    objects     = BManager.from_queryset(_AbstractVarsQuerySet)()
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
        kwargs = dict(group=self.vars.pop("group"),
                      module=self.mode,
                      module_args=self.vars.pop('args', None) or None)
        kwargs.update(self.vars)
        self.inventory.execute_ansible_module(**kwargs)

    def run_ansible_playbook(self):
        self.project.execute(self.mode, self.inventory.id,
                             sync=True, **self.vars)


# FIXME: should adapt to module changes
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
    template_fields["PeriodicTask"] = [] + template_fields["Task"]
    template_fields["PeriodicTask"] += ["type", "name", "schedule"]
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
    name          = models.CharField(max_length=256)
    kind          = models.CharField(max_length=50, default="PLAYBOOK")
    start_time    = models.DateTimeField(default=timezone.now)
    stop_time     = models.DateTimeField(blank=True, null=True)
    raw_args      = models.TextField(default="")
    raw_inventory = models.TextField(default="")
    status        = models.CharField(max_length=50)

    class Meta:
        default_related_name = "history"
        ordering = ["-id"]
        index_together = [
            ["id", "project", "name", "status", "inventory",
             "start_time", "stop_time"]
        ]

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
