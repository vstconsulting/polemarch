#  pylint: disable=invalid-name
"""
WSGI config for polemarch project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.10/howto/deployment/wsgi/
"""

from django.core.wsgi import get_wsgi_application
from ..environment import prepare_environment

prepare_environment()

application = get_wsgi_application()
