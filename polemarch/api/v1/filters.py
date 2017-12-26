# pylint: disable=import-error
from rest_framework import filters
from django_filters import (CharFilter, NumberFilter, IsoDateTimeFilter)
from django.contrib.auth.models import User
from ...main import models


def _extra_search(queryset, field, value, stype):
    vals = field.split("__")
    field, tp = vals[0], (list(vals)[1:2] + [""])[0]
    field += "__{}".format(stype)
    value = value.split(",") if stype == "in" else value
    if tp.upper() == "NOT":
        return queryset.exclude(**{field: value})
    return queryset.filter(**{field: value})


def extra_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "in")


def name_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "contains")


def variables_filter(queryset, field, value):
    # filter applicable only to variables
    # pylint: disable=unused-argument
    items = value.split(",")
    kwargs = {item.split(":")[0]: item.split(":")[1] for item in items}
    return queryset.var_filter(**kwargs)


class _BaseFilter(filters.FilterSet):
    id        = CharFilter(method=extra_filter)
    id__not   = CharFilter(method=extra_filter)
    name__not = CharFilter(method=name_filter)
    name      = CharFilter(method=name_filter)


class TemplateFilter(_BaseFilter):
    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'project',
            'inventory'
        )


class HookFilter(_BaseFilter):
    class Meta:
        model = models.Hook
        fields = (
            'id',
            'name',
            'type',
        )


class UserFilter(filters.FilterSet):
    id        = CharFilter(method=extra_filter)
    id__not   = CharFilter(method=extra_filter)
    username__not = CharFilter(method=name_filter)
    username      = CharFilter(method=name_filter)

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'first_name',
                  'last_name',
                  'email',)


class _BaseHGIFilter(_BaseFilter):
    variables = CharFilter(method=variables_filter)


class HostFilter(_BaseHGIFilter):

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type')


class GroupFilter(_BaseHGIFilter):

    class Meta:
        model = models.Group
        fields = ('id',
                  'name',)


class InventoryFilter(_BaseHGIFilter):

    class Meta:
        model = models.Inventory
        fields = ('id',
                  'name',)


class ProjectFilter(_BaseHGIFilter):
    status        = CharFilter(method=extra_filter)
    status__not   = CharFilter(method=extra_filter)

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'status',)


class TaskFilter(_BaseFilter):
    playbook__not = CharFilter(method=name_filter)
    playbook      = CharFilter(method=name_filter)

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',
                  'project')


class HistoryFilter(_BaseFilter):
    start_time__gt = IsoDateTimeFilter(name="start_time",
                                       lookup_expr=('gt'))
    stop_time__gt = IsoDateTimeFilter(name="stop_time",
                                      lookup_expr=('gt'))
    start_time__lt = IsoDateTimeFilter(name="start_time",
                                       lookup_expr=('lt'))
    stop_time__lt = IsoDateTimeFilter(name="stop_time",
                                      lookup_expr=('lt'))
    start_time__gte = IsoDateTimeFilter(name="start_time",
                                        lookup_expr=('gte'))
    stop_time__gte = IsoDateTimeFilter(name="stop_time",
                                       lookup_expr=('gte'))
    start_time__lte = IsoDateTimeFilter(name="start_time",
                                        lookup_expr=('lte'))
    stop_time__lte = IsoDateTimeFilter(name="stop_time",
                                       lookup_expr=('lte'))

    class Meta:
        model = models.History
        fields = ('id',
                  'mode',
                  'kind',
                  'project',
                  'status',
                  'inventory',
                  'start_time',
                  'stop_time',
                  'initiator',
                  'initiator_type')


class PeriodicTaskFilter(_BaseFilter):

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'mode',
                  'kind',
                  'type',
                  'project')


class HistoryLinesFilter(filters.FilterSet):
    after  = NumberFilter(name="line_number", lookup_expr=('gt'))
    before = NumberFilter(name="line_number", lookup_expr=('lt'))

    class Meta:
        model = models.HistoryLines
        fields = (
            'line_number',
        )


class TeamFilter(_BaseFilter):
    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name"
        )
