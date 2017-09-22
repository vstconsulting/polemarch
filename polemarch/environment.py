import os


default_settings = {
    # ansible specific environment variables
    "ANSIBLE_HOST_KEY_CHECKING": 'False',
    "ANSIBLE_FORCE_COLOR": "true",
    # django settings module
    "DJANGO_SETTINGS_MODULE": 'polemarch.main.settings',
    # celery specific
    "C_FORCE_ROOT": "true",
}


def prepare_environment(**kwargs):
    # pylint: disable=unused-argument
    for key, value in default_settings.items():
        os.environ.setdefault(key, value)

    os.environ.update(kwargs)
