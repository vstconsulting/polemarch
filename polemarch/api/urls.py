from django.conf.urls import include, url
from django.conf import settings
from rest_framework import permissions
from .routers import MainRouter

# Main router for all APIs versions
router = MainRouter(perms=(permissions.IsAuthenticated,))
router.generate_routers(settings.API)

# Register globals
urls = [
    url(r'^{}/'.format(settings.API_URL), include(router.urls)),
]
