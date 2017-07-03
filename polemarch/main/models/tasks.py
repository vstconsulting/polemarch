# pylint: disable=protected-access
from __future__ import unicode_literals

import logging
import sys
import uuid
from collections import namedtuple
from os.path import dirname

from celery.schedules import crontab
from django.utils import timezone

from . import Inventory
from .base import BModel, models
from .projects import Project
from ...main.utils import tmp_file, CmdExecutor, CalledProcessError

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

    def write_output(self, line):
        super(Executor, self).write_output(line)
        self.history.raw_stdout += line
        self.history.save()


def __parse_extra_args(project, **extra):
    extra_args, files = list(), list()
    for key, value in extra.items():
        if key == "extra_vars":
            key = "extra-vars"
        elif key == "verbose":
            continue
        elif key == "key_file":
            if "BEGIN RSA PRIVATE KEY" in value:
                kfile = tmp_file()
                kfile.write(value)
                files.append(kfile)
                value = "{}/{}".format(project.path, kfile.name)
            key = "key-file"
        extra_args.append("--{}".format(key))
        extra_args += [str(value)] if value else []
    return AnsibleExtra(extra_args, files)


def run_ansible_playbook(task, inventory, **extra_args):
    # pylint: disable=too-many-locals
    history_kwargs = dict(playbook=task.playbook, start_time=timezone.now(),
                          project=task.project, raw_stdout="")
    history = History.objects.create(status="RUN", **history_kwargs)
    path_to_ansible = dirname(sys.executable) + "/ansible-playbook"
    path_to_playbook = "{}/{}".format(task.project.path, task.playbook)
    history_kwargs["raw_inventory"], key_files = inventory.get_inventory()
    inventory_file = tmp_file()
    inventory_file.write(history_kwargs["raw_inventory"])
    status = "OK"
    try:
        extra = __parse_extra_args(project=task.project, **extra_args)
        args = [path_to_ansible, path_to_playbook, '-i',
                inventory_file.name, '-v'] + extra.args
        history_kwargs['raw_stdout'] = Executor(history).execute(args)
    except CalledProcessError as exception:
        history_kwargs['raw_stdout'] = str(exception.output)
        if exception.returncode == 4:
            status = "OFFLINE"
        else:
            status = "ERROR"
    except Exception as exception:  # pragma: no cover
        history_kwargs['raw_stdout'] = str(exception)
        status = "ERROR"
    finally:
        inventory_file.close()
        for key_file in key_files:
            key_file.close()
        history_kwargs.update(dict(stop_time=timezone.now(), status=status))
        History(id=history.id, **history_kwargs).save()


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

    def run_ansible_playbook(self, inventory, **extra):
        run_ansible_playbook(self, inventory, **extra)


class PeriodicTask(BModel):
    project     = models.ForeignKey(Project, on_delete=models.CASCADE,
                                    related_query_name="periodic_tasks")
    playbook    = models.CharField(max_length=256)
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
        'minute', 'hour', "day_of_week", 'day_of_month', 'month_of_year'
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

    def get_schedule(self):
        if self.type == "CRONTAB":
            return crontab(**self.crontab_kwargs)
        return float(self.schedule)

    def execute(self):
        # pylint: disable=no-member
        self.run_ansible_playbook()

    def run_ansible_playbook(self):
        run_ansible_playbook(self, self.inventory)


class History(BModel):
    project       = models.ForeignKey(Project,
                                      on_delete=models.CASCADE,
                                      related_query_name="history")
    playbook      = models.CharField(max_length=256)
    start_time    = models.DateTimeField(default=timezone.now)
    stop_time     = models.DateTimeField(blank=True, null=True)
    raw_stdout    = models.TextField()
    raw_inventory = models.TextField()
    status        = models.CharField(max_length=50)

    class Meta:
        default_related_name = "history"
        index_together = [
            ["id", "project", "playbook", "status", "start_time", "stop_time"]
        ]
