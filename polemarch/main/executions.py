from django.conf import settings
from django.utils.module_loading import import_string


PLUGIN_HANDLERS = import_string(settings.EXECUTION_PLUGIN_HANDLERS_CLASS)('EXECUTION_PLUGINS', 'plugin not found')
