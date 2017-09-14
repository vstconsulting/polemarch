import os


def prepare_environment(*args, **kwargs):
    # pylint: disable=unused-argument
    # ansible specific environment variables
    os.environ.setdefault('ANSIBLE_HOST_KEY_CHECKING', 'False')
    os.environ.setdefault("ANSIBLE_FORCE_COLOR", "true")
    # django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                          'polemarch.main.settings')
    # celery specific
    os.environ.setdefault('C_FORCE_ROOT', 'true')

    os.environ.update(kwargs)
