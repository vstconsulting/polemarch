from django.conf.urls import include, url
from rest_framework import permissions
from .routers import APIRouter, MainRouter
# Import views versions
from .v1 import views as v1

# Main router for all APIs versions
router = MainRouter(perms=(permissions.IsAuthenticated,))

# V1 - API
routerv1 = APIRouter(perms=(permissions.IsAuthenticated,))
routerv1.root_view_name = 'v1'
routerv1.register(r'users', v1.UserViewSet)
routerv1.register(r'environments', v1.EnvironmentViewSet)
# routerv1.register(r'hosts', v1.HostViewSet)


# Register routers
router.register_router(r'v1/', routerv1)

# Register globals


urls = [
    url(r'^api/', include(router.urls)),
]
