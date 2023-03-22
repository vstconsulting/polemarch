from django.contrib.auth import get_user_model
from rest_framework import fields as drffields
from vstutils.api.base import NonModelsViewSet
from vstutils.api.serializers import BaseSerializer
from vstutils.api.responses import HTTP_200_OK
from ...main.models import (
    Project,
    Inventory,
    History,
)
from ...main.executions import PLUGIN_HANDLERS


User = get_user_model()


class BaseStatsJobSerializer(BaseSerializer):
    status = drffields.CharField()
    sum = drffields.IntegerField()
    all = drffields.IntegerField()


class DayJobSerializer(BaseStatsJobSerializer):
    day = drffields.DateTimeField()


class MonthJobSerializer(BaseStatsJobSerializer):
    month = drffields.DateTimeField()


class YearJobSerializer(BaseStatsJobSerializer):
    year = drffields.DateTimeField()


class StatsJobsSerializer(BaseSerializer):
    day = DayJobSerializer(many=True)
    month = MonthJobSerializer(many=True)
    year = YearJobSerializer(many=True)


class StatsSerializer(BaseSerializer):
    projects = drffields.IntegerField()
    inventories = drffields.IntegerField()
    users = drffields.IntegerField()
    execution_plugins = drffields.IntegerField()
    inventory_plugins = drffields.IntegerField()
    jobs = StatsJobsSerializer()


class StatsViewSet(NonModelsViewSet):
    base_name = 'stats'
    serializer_class = StatsSerializer

    def _get_projects_count(self):
        return Project.objects.count()

    def _get_inventories_count(self):
        return Inventory.objects.count()

    def _get_users_count(self):
        return User.objects.count()

    def _get_execution_plugins_count(self):
        return len(PLUGIN_HANDLERS.keys())

    def _get_inventory_plugins_count(self):
        return len(Inventory.plugin_handlers.keys())

    def _get_history_stats(self):
        return History.objects.stats(int(self.request.query_params.get('last', '14')))

    def _get_data(self):
        return {
            'projects': self._get_projects_count(),
            'inventories': self._get_inventories_count(),
            'users': self._get_users_count(),
            'execution_plugins': self._get_execution_plugins_count(),
            'inventory_plugins': self._get_inventory_plugins_count(),
            'jobs': self._get_history_stats(),
        }

    def list(self, *args, **kwargs):
        serializer = self.serializer_class(instance=self._get_data())
        return HTTP_200_OK(serializer.data)
