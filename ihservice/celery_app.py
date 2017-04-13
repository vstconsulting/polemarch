import os

from celery import Celery


os.environ.setdefault('ANSIBLE_HOST_KEY_CHECKING', 'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'ihservice.main.settings')
app = Celery('ihservice')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()