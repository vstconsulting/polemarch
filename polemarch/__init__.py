from vstutils.environment import prepare_environment, cmd_execution, os

default_settings = {
    # ansible specific environment variables
    "ANSIBLE_HOST_KEY_CHECKING": 'False',
    "ANSIBLE_FORCE_COLOR": "true",
    # celery specific
    "C_FORCE_ROOT": "true",
    # django settings module
    "DJANGO_SETTINGS_MODULE": os.getenv(
        "DJANGO_SETTINGS_MODULE", 'polemarch.main.settings'
    ),
    # VSTUTILS settings
    "VST_PROJECT": os.getenv("VST_PROJECT", 'polemarch'),
    "VST_ROOT_URLCONF": os.getenv("VST_ROOT_URLCONF", 'polemarch.main.urls'),
    "VST_WSGI": os.getenv("VST_WSGI", 'polemarch.main.wsgi')
}

__version__ = "0.1.8"

prepare_environment(**default_settings)
