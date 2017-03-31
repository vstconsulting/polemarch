# pylint: disable=protected-access
from __future__ import unicode_literals

import logging
import subprocess

from django.db import transaction

from .base import BModel, BManager, BQuerySet, BGroupedModel, models
from ...main import exceptions as ex

logger = logging.getLogger("ihservice")


# Block of abstract models
class ExecuteStatusHandler:
    # pylint: disable=old-style-class
    _playbooks = dict()
    _ok = dict(err=False)
    _other = {OSError: {'err': ex.AnsibleNotFoundException}}
    _retcodes = {"other": {"err": ex.NodeFailedException},
                 4: {"err": ex.NodeOfflineException}}

    def __init__(self, **kwargs):
        self.status_logics = self.logic(**kwargs)

    def get_raise(self, service, exception=None, playbook=""):
        self.service = service
        if exception:
            return self.callproc_error(playbook, exception) or \
                   self.other_error(exception) or exception

    def handler(self, logic, exception, output):
        self.service.set_status(logic["status"])
        if isinstance(logic['err'], bool) and logic['err']:
            return exception  # pragma: no cover
        elif issubclass(logic['err'], Exception):
            return logic['err'](output)

    def callproc_error(self, playbook, exception):
        if not isinstance(exception, subprocess.CalledProcessError):
            return
        pblogic = list(pb for pb in self.status_logics["playbooks"]
                       if pb in playbook)
        if any(pblogic):
            logic = self.status_logics["playbooks"][pblogic[0]]
        elif exception.returncode in self.status_logics["retcodes"]:
            logic = self.status_logics["retcodes"][exception.returncode]
        else:
            logic = self.status_logics["retcodes"]["other"]
        return self.handler(logic, exception, exception.output)

    def other_error(self, exception):
        logic = self.status_logics['other'].get(exception.__class__, None)
        if logic is None:
            return
        return self.handler(logic, exception, str(exception))

    @staticmethod
    def logic(**kwargs):
        kwargs.pop('self', None)
        defaults = ExecuteStatusHandler
        result = dict(ok=defaults._ok.copy(),
                      other=defaults._other.copy(),
                      playbooks=defaults._playbooks.copy(),
                      retcodes=defaults._retcodes.copy())
        result['retcodes'].update(kwargs.pop("retcodes", {}))
        result['playbooks'].update(kwargs.pop("playbooks", {}))
        result.update(kwargs)
        return result


class _AbstractTask(BGroupedModel):
    name    = models.CharField(max_length=100, unique=True)

    class Meta:
        abstract = True

    def execute(self):
        return True


# Block of real models
class TaskQuerySet(BQuerySet):
    pass


class TaskManager(BManager.from_queryset(TaskQuerySet)):
    # pylint: disable=no-member
    pass


class Task(_AbstractTask):
    objects = TaskManager()
    data    = models.CharField(max_length=2048)

    def __unicode__(self):
        return self.name


class ScenarioQuerySet(BQuerySet):
    pass


class ScenarioManager(BManager.from_queryset(ScenarioQuerySet)):
    # pylint: disable=no-member
    pass


class Scenario(_AbstractTask):
    objects = ScenarioManager()

    @property
    def tasks(self):
        return self.tasklist.tasks()

    def __unicode__(self):
        return self.name

    def __get_tasks_list(self, tids):
        counter, tasks, qs = 0, {}, Task.objects.filter(id__in=tids)
        for i in tids:
            tasks[counter] = qs.get(id=i)
            counter += 1
        return tasks

    @transaction.atomic
    def set_tasks(self, tids):
        tasks, cr, all = self.__get_tasks_list(tids), 0, len(tids)
        for pr, task in tasks.items():
            cr += self.tasklist.update_or_create(task=task,
                                                 defaults={"priority": pr})[1]
        self.tasklist.exclude(task__id__in=tids).delete()
        return dict(all=all, updated=all-cr, created=cr)


class TaskListQuerySet(BQuerySet):
    def tasks(self):
        return Task.objects.filter(tasklist__in=self)


class TaskListManager(BManager.from_queryset(TaskListQuerySet)):
    # pylint: disable=no-member
    pass


class TaskList(BModel):
    objects   = TaskListManager()
    scenario  = models.ForeignKey(Scenario)
    task      = models.ForeignKey(Task)
    priority  = models.PositiveIntegerField(default=0)

    class Meta:
        default_related_name = "tasklist"
        ordering = ["scenario", "priority", "id"]
        unique_together = ["scenario", "task", "priority"]

    def __unicode__(self):
        return "{} - {}({})".format(self.scenario, self.task, self.priority)
