from collections import OrderedDict
from vstutils.settings import *

POLEMARCH_VERSION = PROJECT_VERSION
APACHE = False if ("runserver" in sys.argv) else True

# Directory for git projects
PROJECTS_DIR = main.get("projects_dir", fallback="{LIB}/projects")
os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None

# Polemarch apps
INSTALLED_APPS += [
    '{}.main'.format(VST_PROJECT_LIB),
    '{}.api'.format(VST_PROJECT_LIB),
]

# Additional middleware and auth
MIDDLEWARE_CLASSES += [
    '{}.main.middleware.PolemarchHeadersMiddleware'.format(VST_PROJECT_LIB),
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
    "{}.api.{}.permissions.ModelPermission".format(VST_PROJECT_LIB, VST_API_VERSION),
]

API_URL = VST_API_URL
DEFAULT_API_URL = "/{}/{}".format(API_URL, VST_API_VERSION)
API = {
    VST_API_VERSION: OrderedDict(
        project={'view': '{}.api.v2.views.ProjectViewSet'.format(VST_PROJECT_LIB)},
        community_template={'view': '{}.api.v2.views.ProjectTemplateViewSet'.format(VST_PROJECT_LIB)},
        inventory={'view': '{}.api.v2.views.InventoryViewSet'.format(VST_PROJECT_LIB)},
        group={'view': '{}.api.v2.views.GroupViewSet'.format(VST_PROJECT_LIB)},
        host={'view': '{}.api.v2.views.HostViewSet'.format(VST_PROJECT_LIB)},
        history={'view': '{}.api.v2.views.HistoryViewSet'.format(VST_PROJECT_LIB), "op_types": ['get', 'del', 'mod']},
        _bulk={'view': '{}.api.v2.views.BulkViewSet'.format(VST_PROJECT_LIB), 'type': 'view'},
        user={'view': '{}.api.v2.views.UserViewSet'.format(VST_PROJECT_LIB)},
        team={'view': '{}.api.v2.views.TeamViewSet'.format(VST_PROJECT_LIB)},
        token={'view': '{}.api.v2.views.TokenView'.format(VST_PROJECT_LIB), 'type': 'view'},
        hook={'view': '{}.api.v2.views.HookViewSet'.format(VST_PROJECT_LIB)},
        stats={'view': '{}.api.v2.views.StatisticViewSet'.format(VST_PROJECT_LIB), 'op_types': ['get']})
}

PROJECT_GUI_MENU = [
    {
        'name': 'Projects',
        'url': '/project',
        'span_class': 'fa fa-fort-awesome',
    },
    {
        'name': 'Community',
        'url': '/community_template',
        'span_class': 'fa fa-cloud',
    },
    {
        'name': 'Inventories',
        'url': '/inventory',
        'span_class': 'fa fa-folder',
        'sublinks': [
            {
                'name': 'Groups',
                'url': '/group',
                'span_class': 'fa fa-tasks',
            },
            {
                'name': 'Hosts',
                'url': '/host',
                'span_class': 'fa fa-codepen',
            },
        ]
    },
    {
        'name': 'History',
        'url': '/history',
        'span_class': 'fa fa-calendar',
    },
    {
        'name': 'System',
        'span_class': 'fa fa-cog',
        'sublinks': [
            {
                'name': 'Users',
                'url': '/user',
                'span_class': 'fa fa-user',
            },
            {
                'name': 'Hooks',
                'url': '/hook',
                'span_class': 'fa fa-plug'
            },
        ]
    },
]

SWAGGER_SETTINGS['DEFAULT_INFO'] = '{}.api.v2.swagger.api_info'.format(VST_PROJECT_LIB)

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
        "BACKEND": "{}.main.repo.Manual".format(VST_PROJECT_LIB),
    },
    "GIT": {
        "BACKEND": "{}.main.repo.Git".format(VST_PROJECT_LIB),
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
        "BACKEND": "{}.main.repo.Tar".format(VST_PROJECT_LIB),
    },
}

# Custom user repos
DEFAULT_COMMUNITY_REPOS_URL = 'https://gitlab.com/vstconsulting/polemarch-community-repos/raw/master/projects.yaml'
COMMUNITY_REPOS_URL = main.get('community_projects_url', fallback=DEFAULT_COMMUNITY_REPOS_URL)

# RPC tasks settings
TASKS_HANDLERS = {
    "REPO": {
        "BACKEND": "{}.main.tasks.tasks.RepoTask".format(VST_PROJECT_LIB)
    },
    "SCHEDUER": {
        "BACKEND": "{}.main.tasks.tasks.ScheduledTask".format(VST_PROJECT_LIB)
    },
    "MODULE": {
        "BACKEND": "{}.main.tasks.tasks.ExecuteAnsibleModule".format(VST_PROJECT_LIB)
    },
    "PLAYBOOK": {
        "BACKEND": "{}.main.tasks.tasks.ExecuteAnsiblePlaybook".format(VST_PROJECT_LIB)
    },
}

CLONE_RETRY = rpc.getint('clone_retry_count', fallback=5)

# ACL settings
ACL = {
    "MODEL_HANDLERS": {
        "Default": "{}.main.acl.handlers.Default".format(VST_PROJECT_LIB)
    }
}

# Outgoing hooks settings
HOOKS = {
    "HTTP": {
        "BACKEND": '{}.main.hooks.http.Backend'.format(VST_PROJECT_LIB)
    },
    "SCRIPT": {
        "BACKEND": '{}.main.hooks.script.Backend'.format(VST_PROJECT_LIB)
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
