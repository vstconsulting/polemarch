from rest_framework import filters
from django.contrib.auth.models import User
from ...main import models


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
    class Meta:
        model = models.Host
        fields = ('id',
                  'host',
                  'auth_user',
                  'auth_type',)


def extra_filter(queryset, field, value):
    vals = field.split("__")
    field, tp = vals[0], (list(vals)[1:2] + [""])[0]
    field += "__in"
    value = value.split(",")
    if tp.upper() == "NOT":
        return queryset.exclude(**{field: value})
    return queryset.filter(**{field: value})


class EnvironmentsFilter(filters.FilterSet):
    class Meta:
        model = models.Environment
        fields = ('id',
                  'type',
                  'name',)
