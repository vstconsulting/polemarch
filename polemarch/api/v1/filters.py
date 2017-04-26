from rest_framework import filters
from django.contrib.auth.models import User
from ...main import models


def extra_filter(queryset, field, value):
    vals = field.split("__")
    field, tp = vals[0], (list(vals)[1:2] + [""])[0]
    field += "__in"
    value = value.split(",")
    if tp.upper() == "NOT":
        return queryset.exclude(**{field: value})
    return queryset.filter(**{field: value})


def variables_filter(queryset, field, value):
    if field == "variables":
        items = value.split(",")
        kwargs = {item.split(":")[0]: item.split(":")[1] for item in items}
        return queryset.var_filter(**kwargs)
    return queryset.filter(**dict(field=value))


class _BaseFilter(filters.FilterSet):
    id        = filters.django_filters.NumberFilter(method=extra_filter)
    id__not   = filters.django_filters.NumberFilter(method=extra_filter)
    name__not = filters.django_filters.CharFilter(method=extra_filter)
    name      = filters.django_filters.CharFilter(method=extra_filter)


class UserFilter(filters.FilterSet):
    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'first_name',
                  'last_name',
                  'email',)


class _BaseHGIFilter(_BaseFilter):
    variables = filters.django_filters.CharFilter(method=variables_filter)


class HostFilter(_BaseHGIFilter):

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',)


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


class ProjectFilter(_BaseFilter):

    class Meta:
        model = models.Project
        fields = ('id',
                  'name',)


class EnvironmentsFilter(filters.FilterSet):
    class Meta:
        model = models.Environment
        fields = ('id',
                  'type',
                  'name',)
