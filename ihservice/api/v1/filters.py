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


class UserFilter(filters.FilterSet):
    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'first_name',
                  'last_name',
                  'email',)


class HostFilter(filters.FilterSet):
    address__not = filters.django_filters.CharFilter(method=extra_filter)
    address      = filters.django_filters.CharFilter(method=extra_filter)

    class Meta:
        model = models.Host
        fields = ('id',
                  'name',
                  'address',
                  'auth_user',
                  'auth_type',
                  'group',
                  'parent',)


class EnvironmentsFilter(filters.FilterSet):
    class Meta:
        model = models.Environment
        fields = ('id',
                  'type',
                  'name',)


class TaskFilter(filters.FilterSet):
    class Meta:
        model = models.Task
        fields = ('id',
                  'name',
                  'group',
                  'parent',)


class ScenarioFilter(filters.FilterSet):
    class Meta:
        model = models.Scenario
        fields = ('id',
                  'name',
                  'group',
                  'parent',)
