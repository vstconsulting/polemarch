# pylint: disable=protected-access
from __future__ import unicode_literals

import logging

from django.db import transaction

from .base import BaseModel, BaseManager, BaseQuerySet, models

logger = logging.getLogger("ihservice")


# Block of models
class TaskQuerySet(BaseQuerySet):
    pass


class TaskManager(BaseManager.from_queryset(TaskQuerySet)):
    # pylint: disable=no-member
    pass


class Task(BaseModel):
    objects = TaskManager()
    name    = models.CharField(max_length=100, unique=True)
    data    = models.CharField(max_length=2048)
    parent  = models.ForeignKey('self', blank=True, null=True)
    group   = models.BooleanField(default=False)

    def __unicode__(self):
        return self.name


class ScenarioQuerySet(BaseQuerySet):
    pass


class ScenarioManager(BaseManager.from_queryset(ScenarioQuerySet)):
    # pylint: disable=no-member
    pass


class Scenario(BaseModel):
    objects = ScenarioManager()
    name    = models.CharField(max_length=100, unique=True)

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
        tasks, created, all = self.__get_tasks_list(tids), 0, len(tids)
        for pr, task in tasks.items():
            _, cr = self.tasklist.update_or_create(task=task,
                                                   defaults={"priority": pr})
            created += cr
        self.tasklist.exclude(task__id__in=tids).delete()
        return dict(all=all, updated=all-created, created=created)


class TaskListQuerySet(BaseQuerySet):
    def tasks(self):
        return Task.objects.filter(tasklist__in=self)


class TaskListManager(BaseManager.from_queryset(TaskListQuerySet)):
    # pylint: disable=no-member
    pass


class TaskList(BaseModel):
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
