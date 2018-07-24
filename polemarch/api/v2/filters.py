# pylint: disable=import-error
from django_filters import (CharFilter, NumberFilter, IsoDateTimeFilter)
from vstutils.api.filters import DefaultIDFilter, extra_filter, name_filter, filters
from ...main import models

name_help = 'A name string value (or comma separated list) of instance.'
vars_help = 'List of variables to filter. Comma separeted "key:value" list.'


def variables_filter(queryset, field, value):
    # filter applicable only to variables
    # pylint: disable=unused-argument
    items = value.split(",")
    kwargs = {item.split(":")[0]: item.split(":")[1] for item in items}
    return queryset.var_filter(**kwargs)


class VariableFilter(DefaultIDFilter):
    key = CharFilter(method=name_filter, help_text=name_help.replace('name', 'key name'))
    value = CharFilter(method=name_filter, help_text='A value of instance.')

    class Meta:
        model = models.Variable
        fields = (
            'id',
            'key',
            'value',
        )


class _BaseFilter(DefaultIDFilter):
    name__not = CharFilter(method=name_filter, help_text=name_help)
    name      = CharFilter(method=name_filter, help_text=name_help)


class _TypedFilter(_BaseFilter):
    type = CharFilter(help_text='Instance type.')


class TemplateFilter(_BaseFilter):
    kind = CharFilter(help_text='A kind of template.')
    inventory = CharFilter(help_text='The inventory id or path in project.')

    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'inventory'
        )


class ModuleFilter(filters.FilterSet):
    path__not = CharFilter(method=name_filter, help_text='Full path to module.')
    path      = CharFilter(method=name_filter, help_text='Full path to module.')

    class Meta:
        model = models.Module
        fields = (
            'path',
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
    variables = CharFilter(method=variables_filter, help_text=vars_help)


class HostFilter(_TypedFilter, _BaseHGIFilter):

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
    status        = CharFilter(method=extra_filter, help_text='Project sync status.')
    status__not   = CharFilter(method=extra_filter, help_text='Project sync status.')

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',
                  'status',)


class TaskFilter(_BaseFilter):
    playbook__not = CharFilter(method=name_filter, help_text='Playbook filename.')
    playbook      = CharFilter(method=name_filter, help_text='Playbook filename.')

    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'playbook',)


class HistoryFilter(_BaseFilter):
    status = CharFilter(help_text='Status of execution.')
    mode = CharFilter(help_text='Module or playbook name.')
    kind = CharFilter(help_text='Kind of execution.')
    older = IsoDateTimeFilter(name="start_time",
                              lookup_expr=('lt'),
                              help_text='Older then this time')
    newer = IsoDateTimeFilter(name="start_time",
                              lookup_expr=('gt'),
                              help_text='Newer then this time')

    class Meta:
        model = models.History
        fields = ('id',
                  'mode',
                  'kind',
                  'status',)


class PeriodicTaskFilter(_TypedFilter):
    mode = CharFilter(help_text='Periodic task module or playbook name.')
    kind = CharFilter(help_text='Kind of periodic task.')
    template = NumberFilter(
        help_text='A unique integer id of template used in periodic task.'
    )

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'mode',
                  'kind',
                  'type',
                  'template')


class HistoryLinesFilter(filters.FilterSet):
    after  = NumberFilter(name="line_gnumber", lookup_expr=('gt'))
    before = NumberFilter(name="line_gnumber", lookup_expr=('lt'))

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
