# pylint: disable=protected-access
from __future__ import unicode_literals

import uuid
import logging
import subprocess

from django.utils import timezone

from .base import BModel, models
from .projects import Project
from ...main import exceptions as ex

logger = logging.getLogger("polemarch")


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


# Block of real models
class Task(BModel):
    project     = models.ForeignKey(Project, on_delete=models.CASCADE)
    name        = models.CharField(max_length=256, default=uuid.uuid1)
    playbook    = models.CharField(max_length=256)

    class Meta:
        default_related_name = "projects"

    def __unicode__(self):
        return str(self.name)


class PeriodicTask(BModel):
    project     = models.ForeignKey(Project, on_delete=models.CASCADE)
    playbook    = models.CharField(max_length=256)
    schedule    = models.CharField(max_length=4*1024)
    type        = models.CharField(max_length=10)

    class Meta:
        default_related_name = "periodic_tasks"


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
            ["project", "playbook", "status", "start_time", "stop_time"]
        ]
