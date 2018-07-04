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

AUTH_PASSWORD_VALIDATORS += [
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
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

HOOKS_DIR = config.get("main", "hooks_dir", fallback="/etc/polemarch/hooks/")

API_URL = VST_API_URL
VST_API_VERSION = 'v2'
API = {
    VST_API_VERSION: {
        r'token': {'view': 'polemarch.api.v2.views.TokenView', 'type': 'view'},
        r'_bulk': {'view': 'polemarch.api.v2.views.BulkViewSet', 'type': 'view'},
        r'user': {'view': 'polemarch.api.v2.views.UserViewSet'},
        r'team': {'view': 'polemarch.api.v2.views.TeamViewSet'},
        r'host': {'view': 'polemarch.api.v2.views.HostViewSet'},
        r'group': {'view': 'polemarch.api.v2.views.GroupViewSet'},
        r'inventory': {'view': 'polemarch.api.v2.views.InventoryViewSet'},
        r'project': {'view': 'polemarch.api.v2.views.ProjectViewSet'},
        r'history': {'view': 'polemarch.api.v2.views.HistoryViewSet', "op_types": ['get', 'del', 'mod']},
        r'template': {'view': 'polemarch.api.v1.views.TemplateViewSet'},
        r'ansible': {'view': 'polemarch.api.v1.views.AnsibleViewSet', 'op_types': ['get']},
        r'stats': {'view': 'polemarch.api.v1.views.StatisticViewSet', 'op_types': ['get']},
        r'hook': {'view': 'polemarch.api.v1.views.HookViewSet'},
    }
}


if "test" in sys.argv:
    PROJECTS_DIR = '/tmp/polemarch_projects' + str(PY_VER)
    HOOKS_DIR = '/tmp/polemarch_hooks' + str(PY_VER)
    os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None
    os.makedirs(HOOKS_DIR) if not os.path.exists(HOOKS_DIR) else None
