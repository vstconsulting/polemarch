from .environment import prepare_environment

__version__ = "0.1.5"

def _main(**kwargs):
    # pylint: disable=unused-variable
    import sys
    from django.core.management import execute_from_command_line
    prepare_environment(**kwargs)
    execute_from_command_line(sys.argv)

def get_app(**kwargs):
    from celery import Celery
    prepare_environment(**kwargs)
    celery_app = Celery('polemarch')
    celery_app.config_from_object('django.conf:settings', namespace='CELERY')
    celery_app.autodiscover_tasks()
    return celery_app
