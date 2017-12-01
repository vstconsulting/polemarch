from django.conf.urls import include, url
from rest_framework import permissions
from .routers import APIRouter, MainRouter
# Import views versions
from .v1 import views as v1

# Main router for all APIs versions
router = MainRouter(perms=(permissions.IsAuthenticated,))

# V1 - API
router_v1 = APIRouter(perms=(permissions.IsAuthenticated,))
router_v1.root_view_name = 'v1'
router_v1.register(r'users', v1.UserViewSet)
router_v1.register(r'teams', v1.TeamViewSet)
router_v1.register(r'hosts', v1.HostViewSet)
router_v1.register(r'groups', v1.GroupViewSet)
router_v1.register(r'inventories', v1.InventoryViewSet)
router_v1.register(r'projects', v1.ProjectViewSet)
router_v1.register(r'tasks', v1.TaskViewSet)
router_v1.register(r'periodic-tasks', v1.PeriodicTaskViewSet)
router_v1.register(r'templates', v1.TemplateViewSet)
router_v1.register(r'history', v1.HistoryViewSet)
router_v1.register(r'ansible', v1.AnsibleViewSet)
router_v1.register(r'stats', v1.StatisticViewSet)
router_v1.register(r'hooks', v1.HookViewSet)
router_v1.register_view(r'token', v1.TokenView)
router_v1.register_view(r'_bulk', v1.BulkViewSet)

# Register routers
router.register_router(r'v1/', router_v1)

# Register globals

urls = [
    url(r'^api/', include(router.urls)),
]
