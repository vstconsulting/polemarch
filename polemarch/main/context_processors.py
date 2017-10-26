from django.conf import settings


def settings_constants(request):
    # pylint: disable=unused-argument
    data = {"login_url": getattr(settings, 'LOGIN_URL', '/login/'),
            "logout_url": getattr(settings, 'LOGOUT_URL', '/logout/'),
            "docs_url": getattr(settings, 'DOC_URL', '/docs/'),
            "debug": getattr(settings, 'DEBUG', False)}
    return data


def project_args(request):
    host_url = request.build_absolute_uri('/')
    return {
        "host_url": host_url,
        "polemarch_version": getattr(settings, 'POLEMARCH_VERSION', False)
    }
