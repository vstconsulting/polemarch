from vstutils.environment import prepare_environment

default_settings = {
    # ansible specific environment variables
    "ANSIBLE_HOST_KEY_CHECKING": 'False',
    "ANSIBLE_FORCE_COLOR": "true",
    # django settings module
    "DJANGO_SETTINGS_MODULE": 'polemarch.main.settings',
    # celery specific
    "C_FORCE_ROOT": "true",
    # VSTUTILS settings
    "VST_PROJECT": 'polemarch',
    "VST_ROOT_URLCONF": 'polemarch.main.urls',
    "VST_WSGI": 'polemarch.main.wsgi'
}

__version__ = "0.1.7"

prepare_environment(**default_settings)
