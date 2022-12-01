from django.conf import settings
from django.utils.module_loading import import_string


PLUGIN_HANDLERS = import_string(settings.PLUGIN_HANDLERS_CLASS)('PLUGINS', 'plugin not found')
