import os

from celery import Celery


os.environ.setdefault('ANSIBLE_HOST_KEY_CHECKING', 'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'polemarch.main.settings')
os.environ.setdefault("ANSIBLE_FORCE_COLOR", "true")
app = Celery('polemarch')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
