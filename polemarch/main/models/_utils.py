# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

from django.conf import settings
from ...main import exceptions as ex


def import_class(path):
    m_len = path.rfind(".")
    class_name = path[m_len + 1:len(path)]
    module = __import__(path[0:m_len], globals(), locals(), [class_name])
    return getattr(module, class_name)


def get_classes(name):
    return getattr(settings, name, {})


def get_class(tp, name):
    try:
        backend = get_classes(tp)[name].get('BACKEND', None)
        if backend is None:
            raise ex.PMException("Backend is 'None'.")
        return import_class(backend)
    except KeyError or ImportError:
        raise ex.UnknownClassException(name)


def get_class_opts(tp, name):
    return get_classes(tp).get(name, {}).get('OPTIONS', {})
