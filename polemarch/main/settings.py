from collections import OrderedDict
from vstutils.settings import *

POLEMARCH_VERSION = PROJECT_VERSION
APACHE = False if ("runserver" in sys.argv) else True

# Directory for git projects
PROJECTS_DIR = config.get("main", "projects_dir", fallback="{HOME}/projects").format(**KWARGS)
os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None

# Polemarch apps
INSTALLED_APPS += [
    'polemarch.main',
    'polemarch.api',
]

# Additional middleware and auth
MIDDLEWARE_CLASSES += [
    'polemarch.main.middleware.PolemarchHeadersMiddleware',
]

AUTH_PASSWORD_VALIDATORS += [
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# API settings
VST_API_VERSION = 'v2'

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
    "polemarch.api.{}.permissions.ModelPermission".format(VST_API_VERSION),
]

API_URL = VST_API_URL
DEFAULT_API_URL = "/{}/{}".format(API_URL, VST_API_VERSION)
API = {
    VST_API_VERSION: OrderedDict(
        project={'view': 'polemarch.api.v2.views.ProjectViewSet'},
        inventory={'view': 'polemarch.api.v2.views.InventoryViewSet'},
        group={'view': 'polemarch.api.v2.views.GroupViewSet'},
        host={'view': 'polemarch.api.v2.views.HostViewSet'},
        history={'view': 'polemarch.api.v2.views.HistoryViewSet', "op_types": ['get', 'del', 'mod']},
        _bulk={'view': 'polemarch.api.v2.views.BulkViewSet', 'type': 'view'},
        user={'view': 'polemarch.api.v2.views.UserViewSet'},
        team={'view': 'polemarch.api.v2.views.TeamViewSet'},
        token={'view': 'polemarch.api.v2.views.TokenView', 'type': 'view'},
        hook={'view': 'polemarch.api.v2.views.HookViewSet'},
        stats={'view': 'polemarch.api.v2.views.StatisticViewSet', 'op_types': ['get']})
}


# Polemarch handlers

# Repos
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

# RPC tasks settings
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

CLONE_RETRY = config.getint('rpc', 'clone_retry_count', fallback=5)

# ACL settings
ACL = {
    "MODEL_HANDLERS": {
        "Default": "polemarch.main.acl.handlers.Default"
    }
}

# Outgoing hooks settings
HOOKS = {
    "HTTP": {
        "BACKEND": 'polemarch.main.hooks.http.Backend'
    },
    "SCRIPT": {
        "BACKEND": 'polemarch.main.hooks.script.Backend'
    },
}

HOOKS_DIR = config.get("main", "hooks_dir", fallback="/etc/polemarch/hooks/")


# TEST settings
if "test" in sys.argv:
    CLONE_RETRY = 0
    PROJECTS_DIR = '/tmp/polemarch_projects' + str(PY_VER)
    HOOKS_DIR = '/tmp/polemarch_hooks' + str(PY_VER)
    os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None
    os.makedirs(HOOKS_DIR) if not os.path.exists(HOOKS_DIR) else None
