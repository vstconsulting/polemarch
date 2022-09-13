# pylint: disable=import-error
from functools import reduce
from operator import or_
from django.db.models import Q
from django_filters import CharFilter, NumberFilter, IsoDateTimeFilter
from vstutils.api.filters import DefaultIDFilter, DefaultNameFilter, extra_filter, name_filter, filters
from vstutils.utils import lazy_translate as __
from ...main import models
from ...main.models.hosts import variables_filter, vars_help

name_help = 'A name string value (or comma separated list) of instance.'


def filter_name_endswith(queryset, field, value):
    # pylint: disable=unused-argument
    return queryset.filter(
        reduce(or_, (
            Q(path__endswith='.{}'.format(v))
            for v in value.split(',')
        ))
    )


def playbook_filter(queryset, field, value):
    # pylint: disable=unused-argument
    return queryset.filter(playbook__in=value.split(','))


class VariableFilter(DefaultIDFilter):
    key = CharFilter(method=name_filter, help_text=__(name_help.replace('name', 'key name')))
    value = CharFilter(method=name_filter, help_text=__('A value of instance.'))

    class Meta:
        model = models.Variable
        fields = (
            'id',
            'key',
            'value',
        )


class _BaseFilter(DefaultIDFilter, DefaultNameFilter):
    pass


class _TypedFilter(_BaseFilter):
    type = CharFilter(help_text=__('Instance type.'))


class TemplateFilter(_BaseFilter):
    kind = CharFilter(help_text=__('A kind of template.'))
    inventory = CharFilter(help_text=__('The inventory id or path in project.'))

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'inventory'
        )


class ModuleFilter(filters.FilterSet):
    path__not = CharFilter(method=name_filter, help_text=__('Full path to module.'))
    path = CharFilter(method=name_filter, help_text=__('Full path to module.'))
    name = CharFilter(method=filter_name_endswith, help_text=__('Name of module.'))

    class Meta:
        model = models.Module
        fields = (
            'path',
            'name',
        )


class HookFilter(_TypedFilter):
    class Meta:
        model = models.Hook
        fields = (
            'id',
            'name',
            'type',
        )


class _BaseHGIFilter(_BaseFilter):
    variables = CharFilter(method=variables_filter, help_text=__(vars_help))


class HostFilter(_TypedFilter, _BaseHGIFilter):
    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'type',)


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
    status = CharFilter(method=extra_filter, help_text=__('Project sync status.'))
    status__not = CharFilter(method=extra_filter, help_text=__('Project sync status.'))

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'status',)


class TaskFilter(_BaseFilter):
    playbook__not = CharFilter(method=name_filter, help_text=__('Playbook filename.'))
    playbook = CharFilter(method=name_filter, help_text=__('Playbook filename.'))
    pb_filter = CharFilter(method=playbook_filter, help_text=__('Playbook filename - filter for prefetch.'))

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',
                  'pb_filter',)


class HistoryFilter(_BaseFilter):
    status = CharFilter(help_text=__('Status of execution.'))
    mode = CharFilter(help_text=__('Module or playbook name.'))
    kind = CharFilter(help_text=__('Kind of execution.'))
    older = IsoDateTimeFilter(field_name="start_time",
                              lookup_expr=('lt'),
                              help_text=__('Older then this time'))
    newer = IsoDateTimeFilter(field_name="start_time",
                              lookup_expr=('gt'),
                              help_text=__('Newer then this time'))

    class Meta:
        model = models.History
        fields = ('id',
                  'mode',
                  'kind',
                  'status',)


class PeriodicTaskFilter(_TypedFilter):
    mode = CharFilter(help_text=__('Periodic task module or playbook name.'))
    kind = CharFilter(help_text=__('Kind of periodic task.'))
    template = NumberFilter(
        help_text=__('A unique integer id of template used in periodic task.')
    )

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'mode',
                  'kind',
                  'type',
                  'template')


class HistoryLinesFilter(filters.FilterSet):
    after = NumberFilter(field_name="line_gnumber", lookup_expr=('gt'))
    before = NumberFilter(field_name="line_gnumber", lookup_expr=('lt'))

    class Meta:
        model = models.HistoryLines
        fields = (
            'line_number',
            'line_gnumber',
        )


class TeamFilter(_BaseFilter):
    class Meta:
        model = models.UserGroup
        fields = (
            'id',
            "name"
        )
