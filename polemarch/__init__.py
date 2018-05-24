from vstutils.environment import prepare_environment, cmd_execution as _main

__version__ = "0.1.7"

default_settings = {
    # ansible specific environment variables
    "ANSIBLE_HOST_KEY_CHECKING": 'False',
    "ANSIBLE_FORCE_COLOR": "true",
    # django settings module
    "DJANGO_SETTINGS_MODULE": 'polemarch.main.settings',
    # celery specific
    "C_FORCE_ROOT": "true",
    # vstutils settings
    "VST_PROJECT": "polemarch",
    "VST_CTL_SCRIPT": "polemarchctl",
    "VST_WSGI": 'polemarch.main.wsgi'
}

prepare_environment(**default_settings)
