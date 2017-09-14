from celery import Celery

from .environment import prepare_environment

prepare_environment()
app = Celery('polemarch')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
