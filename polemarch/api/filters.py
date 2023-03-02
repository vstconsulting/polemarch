# pylint: disable=import-error
from functools import reduce
from operator import or_
from django.db.models import Q
from django_filters import CharFilter
from vstutils.api.filters import DefaultIDFilter, name_filter
from vstutils.utils import lazy_translate as __
from ..main import models

name_help = 'A name string value (or comma separated list) of instance.'
vars_help = 'List of variables to filter. Comma separated "key:value" list.'


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


def variables_filter(queryset, field, value):
    # filter applicable only to variables
    # pylint: disable=unused-argument
    items = value.split(",")
    kwargs = {item.split(":")[0]: item.split(":")[1] for item in items}
    return queryset.var_filter(**kwargs)


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
