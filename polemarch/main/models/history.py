# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

from typing import Any, Dict, List, TypeVar
import logging
from collections import OrderedDict
from datetime import timedelta, datetime
import json
import re
import signal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import functions as dbfunc, Count
from django.utils.timezone import now

from vstutils.environment import get_celery_app
from vstutils.models import BaseModel, BModel, BQuerySet
from . import Inventory
from .projects import Project
from ..constants import HiddenArgumentsEnum, HistoryInitiatorType, HistoryStatus
from ..exceptions import NotApplicable
from .execution_templates import ExecutionTemplate, TemplatePeriodicTask


logger = logging.getLogger("polemarch")
InvOrString = TypeVar('InvOrString', str, int, Inventory, None)
User = get_user_model()
celery_app = get_celery_app()


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
    kind           = models.CharField(max_length=50, default="ANSIBLE_PLAYBOOK", db_index=True)
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
    celery_task_id = models.UUIDField(null=True)

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
        return self.status in HistoryStatus.get_working_statuses()

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
        if self.initiator_type == HistoryInitiatorType.PROJECT and self.initiator:
            return self
        elif self.initiator_type == HistoryInitiatorType.SCHEDULER and self.initiator:
            return TemplatePeriodicTask.objects.get(id=self.initiator)
        elif self.initiator_type == HistoryInitiatorType.TEMPLATE and self.initiator:
            return ExecutionTemplate.objects.get(id=self.initiator)
        return None

    def cancel(self):
        if self.working and self.celery_task_id:
            celery_app.control.revoke(self.celery_task_id, terminate=True, signal=signal.SIGTERM)


class HistoryLines(BaseModel):
    id = models.BigAutoField(primary_key=True)
    line = models.TextField(default="")
    line_number = models.IntegerField(default=0)
    line_gnumber = models.IntegerField(default=0)
    history = models.ForeignKey(History, on_delete=models.CASCADE, related_query_name="raw_history_line")

    class Meta:
        default_related_name = "raw_history_line"
        ordering = ['-line_gnumber', '-line_number']
