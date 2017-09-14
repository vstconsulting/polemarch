import os

from celery import Celery


# ansible specific environment variables
os.environ.setdefault('ANSIBLE_HOST_KEY_CHECKING', 'False')
os.environ.setdefault("ANSIBLE_FORCE_COLOR", "true")
# django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'polemarch.main.settings')
# run Celery
app = Celery('polemarch')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
