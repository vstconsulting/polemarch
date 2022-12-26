from datetime import timedelta
from django.conf import settings
from django.utils.timezone import now
from django.db.models import Count
from vstutils.api.metrics import DefaultBackend
from .main.models import History, Project


def get_polemarch_metrics():
    histories = History.objects.\
        filter(start_time__gte=now()-timedelta(seconds=settings.HISTORY_METRICS_WINDOW)).\
        values('status').\
        annotate(total=Count('status')).\
        values('status', 'total').\
        order_by('status')

    projects = Project.objects.\
        values('status'). \
        annotate(total=Count('status')). \
        values('status', 'total'). \
        order_by('status')

    for qs in (histories, projects):
        for obj in qs:
            yield '{prefix}_' + qs.model.__name__.lower() + '_total', ({'status': obj['status']}, obj['total'])


class PolemarchBackend(DefaultBackend):
    metrics_list = (
        (None, get_polemarch_metrics),
    )
