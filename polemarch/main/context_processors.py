from django.conf import settings
from .. import __version__ as polemarch_version


def settings_constants(request):
    host_url = request.build_absolute_uri('/')
    data = {"login_url": getattr(settings, 'LOGIN_URL', '/login/'),
            "logout_url": getattr(settings, 'LOGOUT_URL', '/logout/'),
            "host_url": host_url,
            "polemarch_version": polemarch_version}
    return data
