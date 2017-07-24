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
routerv1.register(r'hosts', v1.HostViewSet)
routerv1.register(r'groups', v1.GroupViewSet)
routerv1.register(r'inventories', v1.InventoryViewSet)
routerv1.register(r'projects', v1.ProjectViewSet)
routerv1.register(r'tasks', v1.TaskViewSet)
routerv1.register(r'periodic-tasks', v1.PeriodicTaskViewSet)
routerv1.register(r'templates', v1.TemplateViewSet)
routerv1.register(r'history', v1.HistoryViewSet)
routerv1.register_view(r'token', v1.TokenView)
routerv1.register_view(r'_bulk', v1.BulkViewSet)
routerv1.register_view(r'execute_module', v1.ModuleExecuteViewSet)

# Register routers
router.register_router(r'v1/', routerv1)

# Register globals


urls = [
    url(r'^api/', include(router.urls)),
]
