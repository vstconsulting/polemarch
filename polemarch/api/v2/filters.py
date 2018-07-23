# pylint: disable=import-error
from django_filters import (CharFilter, NumberFilter, IsoDateTimeFilter)
from vstutils.api.filters import extra_filter, name_filter, filters
from ...main import models

id_help = 'A unique integer value (or comma separated list) identifying this instance.'
name_help = 'A name string value (or comma separated list) of instance.'
vars_help = 'List of variables to filter. Comma separeted "key:value" list.'


def variables_filter(queryset, field, value):
    # filter applicable only to variables
    # pylint: disable=unused-argument
    items = value.split(",")
    kwargs = {item.split(":")[0]: item.split(":")[1] for item in items}
    return queryset.var_filter(**kwargs)


class VariableFilter(filters.FilterSet):
    class Meta:
        model = models.Variable
        fields = (
            'id',
            'key',
            'value',
        )


class _BaseFilter(filters.FilterSet):
    id        = CharFilter(method=extra_filter, help_text=id_help)
    id__not   = CharFilter(method=extra_filter, help_text=id_help)
    name__not = CharFilter(method=name_filter, help_text=name_help)
    name      = CharFilter(method=name_filter, help_text=name_help)


class TemplateFilter(_BaseFilter):
    class Meta:
        model = models.Template
        fields = (
            'id',
            'name',
            'kind',
            'inventory'
        )


class ModuleFilter(filters.FilterSet):
    path__not = CharFilter(method=name_filter)
    path      = CharFilter(method=name_filter)

    class Meta:
        model = models.Module
        fields = (
            'path',
        )


class HookFilter(_BaseFilter):
    class Meta:
        model = models.Hook
        fields = (
            'id',
            'name',
            'type',
        )


class _BaseHGIFilter(_BaseFilter):
    variables = CharFilter(method=variables_filter, help_text=vars_help)


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


class PeriodicTaskFilter(_BaseFilter):

    class Meta:
        model = models.PeriodicTask
        fields = ('id',
                  'mode',
                  'kind',
                  'type',
                  'project',
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
