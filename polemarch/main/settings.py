from vstutils.settings import *

POLEMARCH_VERSION = PROJECT_VERSION
APACHE = False if ("runserver" in sys.argv) else True

# Directory for git projects
PROJECTS_DIR = config.get("main", "projects_dir", fallback="{HOME}/projects").format(**KWARGS)
os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None

INSTALLED_APPS += [
    'polemarch.main',
    'polemarch.api',
]

MIDDLEWARE_CLASSES += [
    'polemarch.main.middleware.PolemarchHeadersMiddleware',
]

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
    "polemarch.api.permissions.ModelPermission",
]

REPO_BACKENDS = {
    "GIT": {
        "BACKEND": "polemarch.main.repo.Git",
        "OPTIONS": {
            "CLONE_KWARGS": {
                "depth": 1
            },
            "FETCH_KWARGS": {
            },
            "GIT_ENV": {
                "GLOBAL": {
                    "GIT_SSL_NO_VERIFY": "true"
                }
            }
        }
    },
    "TAR": {
        "BACKEND": "polemarch.main.repo.Tar",
    },
    "MANUAL": {
        "BACKEND": "polemarch.main.repo.Manual",
    }
}


TASKS_HANDLERS = {
    "REPO": {
        "BACKEND": "polemarch.main.tasks.tasks.RepoTask"
    },
    "SCHEDUER": {
        "BACKEND": "polemarch.main.tasks.tasks.ScheduledTask"
    },
    "MODULE": {
        "BACKEND": "polemarch.main.tasks.tasks.ExecuteAnsibleModule"
    },
    "PLAYBOOK": {
        "BACKEND": "polemarch.main.tasks.tasks.ExecuteAnsiblePlaybook"
    },
}

ACL = {
    "MODEL_HANDLERS": {
        "Default": "polemarch.main.acl.handlers.Default"
    }
}

HOOKS = {
    "HTTP": {
        "BACKEND": 'polemarch.main.hooks.http.Backend'
    },
    "SCRIPT": {
        "BACKEND": 'polemarch.main.hooks.script.Backend'
    },
}

HOOKS_DIR = config.get("main", "hooks_dir", fallback="/tmp")

API_URL = VST_API_URL
API = {
    VST_API_VERSION: {
        r'users': {'view': 'polemarch.api.v1.views.UserViewSet'},
        r'teams': {'view': 'polemarch.api.v1.views.TeamViewSet'},
        r'hosts': {'view': 'polemarch.api.v1.views.HostViewSet'},
        r'groups': {'view': 'polemarch.api.v1.views.GroupViewSet'},
        r'inventories': {'view': 'polemarch.api.v1.views.InventoryViewSet'},
        r'projects': {'view': 'polemarch.api.v1.views.ProjectViewSet'},
        r'tasks': {'view': 'polemarch.api.v1.views.TaskViewSet'},
        r'periodic-tasks': {'view': 'polemarch.api.v1.views.PeriodicTaskViewSet'},
        r'templates': {'view': 'polemarch.api.v1.views.TemplateViewSet'},
        r'history': {'view': 'polemarch.api.v1.views.HistoryViewSet', "op_types": ['get', 'del']},
        r'ansible': {'view': 'polemarch.api.v1.views.AnsibleViewSet', 'op_types': ['get']},
        r'stats': {'view': 'polemarch.api.v1.views.StatisticViewSet', 'op_types': ['get']},
        r'hooks': {'view': 'polemarch.api.v1.views.HookViewSet'},
        r'token': {'view': 'polemarch.api.v1.views.TokenView', 'type': 'view'},
        r'_bulk': {'view': 'polemarch.api.v1.views.BulkViewSet', 'type': 'view'},
    }
}


if "test" in sys.argv:
    REPO_BACKENDS["TEST"] = {
        "BACKEND": "polemarch.main.tests.repo_backends.Test",
    }
    PROJECTS_DIR = '/tmp/polemarch_projects' + str(PY_VER)
    os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None
