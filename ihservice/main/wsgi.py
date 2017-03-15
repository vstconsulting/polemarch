#  pylint: disable=invalid-name
"""
WSGI config for ihservice project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.10/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('ANSIBLE_HOST_KEY_CHECKING', 'False')
os.environ.setdefault('C_FORCE_ROOT', 'true')
os.environ.setdefault("DJANGO_SETTINGS_MODULE",
                      "ihservice.main.settings")

application = get_wsgi_application()
