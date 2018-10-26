from collections import OrderedDict
from vstutils.settings import *

POLEMARCH_VERSION = PROJECT_VERSION
APACHE = False if ("runserver" in sys.argv) else True

# Directory for git projects
PROJECTS_DIR = main.get("projects_dir", fallback="{LIB}/projects")
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

PROJECT_GUI_MENU = [
    {
        'name': 'Projects',
        'url': '/project',
        'span_class': 'glyphicon glyphicon-blackboard',
    },
    {
        'name': 'Inventories',
        'url': '/inventory',
        'span_class': 'fa fa-folder',
        'sublinks': [
            {
                'name': 'Groups',
                'url': '/group',
                'span_class': 'glyphicon glyphicon-tasks',
            },
            {
                'name': 'Hosts',
                'url': '/host',
                'span_class': 'glyphicon glyphicon-hdd',
            },
        ]
    },
    {
        'name': 'History',
        'url': '/history',
        'span_class': 'glyphicon glyphicon-calendar',
    },
    {
        'name': 'System',
        'span_class': 'glyphicon glyphicon-cog',
        'sublinks': [
            {
                'name': 'Users',
                'url': '/user',
                'span_class': 'glyphicon glyphicon-user',
            },
            {
                'name': 'Hooks',
                'url': '/hook',
                'span_class': 'glyphicon glyphicon-console'
            },
        ]
    },
]

SWAGGER_SETTINGS['DEFAULT_INFO'] = 'polemarch.api.v2.swagger.api_info'

OPENAPI_EXTRA_LINKS = dict()
OPENAPI_EXTRA_LINKS['Request'] = [
    {
        'url': (
            'https://gitlab.com/vstconsulting/polemarch/issues/new?'
            'issuable_template%5D=Ask&issue%5Btitle%5D=Ask%20about%20version%20'
            +str(POLEMARCH_VERSION)
        ),
        'name': 'Question'
    },
    {
        'url': (
            'https://gitlab.com/vstconsulting/polemarch/issues/new?'
            'issuable_template%5D=Bug&issue%5Btitle%5D=Bug%20in%20version%20'
            + str(POLEMARCH_VERSION)
        ),
        'name': 'Bug report'
    },
    {
        'url': (
            'https://gitlab.com/vstconsulting/polemarch/issues/new?'
            'issuable_template%5D=Feature%20request&issue%5Btitle%5D='
        ),
        'name': 'Feature request'
    },
]
OPENAPI_EXTRA_LINKS['Documentation'] = {
    'url': 'http://polemarch.readthedocs.io/',
    'name': 'Official documentation'
}
OPENAPI_EXTRA_LINKS['Repository'] = {
    'url': 'https://gitlab.com/vstconsulting/polemarch.git',
    'name': 'Official repository'
}

# Polemarch handlers

# Repos
class GitSectionConfig(SectionConfig):
    section = 'git'
    subsections = ['clone', 'fetch']
    section_defaults = {
        'fetch': {
            "force": True,
        }
    }
    types_map = {
        'fetch.all': SectionConfig.bool,
        'fetch.append': SectionConfig.bool,
        'fetch.multiple': SectionConfig.bool,
        'fetch.unshallow': SectionConfig.bool,
        'fetch.update-shallow': SectionConfig.bool,
        'fetch.force': SectionConfig.bool,
        'fetch.keep': SectionConfig.bool,
        'fetch.prune': SectionConfig.bool,
        'fetch.prune-tags': SectionConfig.bool,
        'fetch.no-tags': SectionConfig.bool,
        'fetch.tags': SectionConfig.bool,
        'fetch.no-recurse-submodules': SectionConfig.bool,
        'fetch.update-head-ok': SectionConfig.bool,
        'fetch.quiet': SectionConfig.bool,
        'fetch.verbose': SectionConfig.bool,
        'fetch.ipv4': SectionConfig.bool,
        'fetch.ipv6': SectionConfig.bool,
        'fetch.depth': SectionConfig.int,
        'fetch.deepen': SectionConfig.int,
        'fetch.jobs': SectionConfig.int,
        'clone.local': SectionConfig.bool,
        'clone.no-hardlinks': SectionConfig.bool,
        'clone.shared': SectionConfig.bool,
        'clone.dissociate': SectionConfig.bool,
        'clone.quiet': SectionConfig.bool,
        'clone.verbose': SectionConfig.bool,
        'clone.single-branch': SectionConfig.bool,
        'clone.no-single-branch': SectionConfig.bool,
        'clone.no-tags': SectionConfig.bool,
        'clone.shallow-submodules': SectionConfig.bool,
        'clone.no-shallow-submodules': SectionConfig.bool,
        'clone.depth': SectionConfig.int,
        'clone.jobs': SectionConfig.int,
    }


git = GitSectionConfig()

REPO_BACKENDS = {
    "MANUAL": {
        "BACKEND": "polemarch.main.repo.Manual",
    },
    "GIT": {
        "BACKEND": "polemarch.main.repo.Git",
        "OPTIONS": {
            "CLONE_KWARGS": git.get('CLONE', {}),
            "FETCH_KWARGS": git.get('FETCH', {}),
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

CLONE_RETRY = rpc.getint('clone_retry_count', fallback=5)

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

HOOKS_DIR = main.get("hooks_dir", fallback="/etc/polemarch/hooks/")

__EXECUTOR_DEFAULT = '{INTERPRETER} -m pm_ansible'
EXECUTOR = main.get("executor_path", fallback=__EXECUTOR_DEFAULT).strip().split(' ')
SELFCARE = '/tmp/'


# TEST settings
if "test" in sys.argv:
    REPO_BACKENDS['GIT']['OPTIONS']['CLONE_KWARGS']['local'] = True
    CLONE_RETRY = 0
    PROJECTS_DIR = '/tmp/polemarch_projects' + str(PY_VER)
    HOOKS_DIR = '/tmp/polemarch_hooks' + str(PY_VER)
    os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None
    os.makedirs(HOOKS_DIR) if not os.path.exists(HOOKS_DIR) else None
