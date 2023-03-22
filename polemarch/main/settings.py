from vstutils.settings import *

WEBSERVER_COMMAND = 'webserver'

POLEMARCH_VERSION = PROJECT_VERSION
APACHE = False if ("runserver" in sys.argv) else True

# Directory for git projects
PROJECTS_DIR = main.get("projects_dir", fallback=os.getenv("POLEMARCH_PROJECTS_DIR", "{LIB}/projects"))
os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None

# Polemarch apps
INSTALLED_APPS += [
    '{}.main'.format(VST_PROJECT_LIB_NAME),
    '{}.api'.format(VST_PROJECT_LIB_NAME),
]

# Additional middleware and auth
MIDDLEWARE += [
    'vstutils.middleware.TimezoneHeadersMiddleware',
    '{}.main.middleware.PolemarchHeadersMiddleware'.format(VST_PROJECT_LIB_NAME),
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
VST_API_VERSION = 'v4'

API_URL = VST_API_URL
DEFAULT_API_URL = "/{}/{}".format(API_URL, VST_API_VERSION)

LANGUAGES = (
    ('en', 'English'),
    ('ru', 'Русский'),
)

API[VST_API_VERSION] = {
    'host': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.hosts.HostViewSet',
    },
    'group': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.hosts.AnsibleGroupViewSet',
    },
    'inventory': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.hosts.InventoryViewSet',
    },
    'history': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.history.HistoryViewSet',
    },
    'project': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.projects.ProjectViewSet',
    },
    'stats': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.statistics.StatsViewSet',
    },
    'community_template': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.projects.ProjectCommunityTemplateViewSet',
    },
    'hook': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.hooks.HookViewSet',
    },
    'user': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.users.UserViewSet',
    },
    'token': {
        'view': f'{VST_PROJECT_LIB_NAME}.api.v4.users.TokenView',
        'type': 'view',
    },
}

PROJECT_GUI_MENU = []

OPENAPI_HOOKS = [
    'polemarch.main.openapi.set_gui_menu_ce',
    'polemarch.main.openapi.hide_project_template_options_view',
]

SWAGGER_SETTINGS['DEFAULT_INFO'] = '{}.api.swagger.api_info'.format(VST_PROJECT_LIB_NAME)
SWAGGER_SETTINGS['DEFAULT_AUTO_SCHEMA_CLASS'] = '{}.api.schema.PolemarchAutoSchema'.format(VST_PROJECT_LIB_NAME)

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
class GitSection(BaseAppendSection):
    pass


class GitFetchSection(GitSection):
    types_map = {
        'all': cconfig.BoolType(),
        'append': cconfig.BoolType(),
        'multiple': cconfig.BoolType(),
        'unshallow': cconfig.BoolType(),
        'update-shallow': cconfig.BoolType(),
        'force': cconfig.BoolType(),
        'keep': cconfig.BoolType(),
        'prune': cconfig.BoolType(),
        'prune-tags': cconfig.BoolType(),
        'no-tags': cconfig.BoolType(),
        'tags': cconfig.BoolType(),
        'no-recurse-submodules': cconfig.BoolType(),
        'update-head-ok': cconfig.BoolType(),
        'quiet': cconfig.BoolType(),
        'verbose': cconfig.BoolType(),
        'ipv4': cconfig.BoolType(),
        'ipv6': cconfig.BoolType(),
        'depth': cconfig.IntType(),
        'deepen': cconfig.IntType(),
        'jobs': cconfig.IntType(),
    }

    def all(self):
        data = super().all()
        data['force'] = True
        return data


class GitCloneSection(GitSection):
    types_map = {
        'local': cconfig.BoolType(),
        'no-hardlinks': cconfig.BoolType(),
        'shared': cconfig.BoolType(),
        'dissociate': cconfig.BoolType(),
        'quiet': cconfig.BoolType(),
        'verbose': cconfig.BoolType(),
        'single-branch': cconfig.BoolType(),
        'no-single-branch': cconfig.BoolType(),
        'no-tags': cconfig.BoolType(),
        'shallow-submodules': cconfig.BoolType(),
        'no-shallow-submodules': cconfig.BoolType(),
        'depth': cconfig.IntType(),
        'jobs': cconfig.IntType(),
    }


class ArchiveSection(BaseAppendSection):
    types_map = {
        'max_content_length': cconfig.BytesSizeType()
    }


git_fetch = {}
git_clone = {}
git_config_list = ()

if TESTS_RUN:
    config['git'] = dict(fetch={}, clone={}, config={'protocol.file.allow': 'always'})

if 'git' in config:
    git = config['git']

    if 'fetch' in git:
        git_fetch = GitFetchSection('git.fetch', config, git['fetch']).all()

    if 'clone' in git:
        git_clone = GitCloneSection('git.clone', config, git['clone']).all()

    if 'config' in git:
        git_config_list = tuple(f'{k}={v}' for k, v in git['config'].items())


archive_section = ArchiveSection('archive', config, config['archive']).all()

REPO_BACKENDS = {
    "MANUAL": {
        "BACKEND": "{}.main.repo.Manual".format(VST_PROJECT_LIB_NAME),
    },
    "GIT": {
        "BACKEND": "{}.main.repo.Git".format(VST_PROJECT_LIB_NAME),
        "OPTIONS": {
            "CLONE_KWARGS": git_clone,
            "FETCH_KWARGS": git_fetch,
            "CONFIG_LIST": git_config_list,
            "GIT_ENV": {
                "GLOBAL": {
                    "GIT_SSL_NO_VERIFY": "true"
                }
            }
        }
    },
    "TAR": {
        "BACKEND": "{}.main.repo.Tar".format(VST_PROJECT_LIB_NAME),
        "OPTIONS": archive_section,
    },
}

# Custom user repos
DEFAULT_COMMUNITY_REPOS_URL = 'https://gitlab.com/vstconsulting/polemarch-community-repos/raw/master/projects.yaml'
COMMUNITY_REPOS_URL = main.get('community_projects_url', fallback=DEFAULT_COMMUNITY_REPOS_URL)

# Execution plugins
class ExecutionPluginSection(BaseAppendSection):
    types_map = {
        'backend': cconfig.StrType(),
    }


class ExecutionPluginOptionsSection(ExecutionPluginSection):
    pass


# Execution plugins
EXECUTION_PLUGIN_HANDLERS_CLASS = f'{VST_PROJECT_LIB_NAME}.main.utils.ExecutionHandlers'
EXECUTION_PLUGINS = {}

for plugin_name, plugin_config, in config['execution']['plugin'].items():
    if 'backend' in plugin_config:
        plugin_section = ExecutionPluginSection(
            f'execution.plugin.{plugin_name}', config, config['execution']['plugin'][plugin_name]
        ).all()
        options_section = ExecutionPluginOptionsSection(
            f'execution.plugin.{plugin_name}.options',
            config,
            plugin_section.get('options', {})
        ).all()
        options_section = {key.upper(): val for key, val in options_section.items()}
        if 'COMPATIBLE_INVENTORY_PLUGINS' in options_section:
            for field_name, suitable_plugins in options_section['COMPATIBLE_INVENTORY_PLUGINS'].items():
                options_section['COMPATIBLE_INVENTORY_PLUGINS'][field_name] = tuple(
                    k.upper() for k in options_section['COMPATIBLE_INVENTORY_PLUGINS'][field_name].split(',')
                )

        EXECUTION_PLUGINS[plugin_name.upper()] = {
            "BACKEND": plugin_section['backend'],
            "OPTIONS": options_section
        }

# Inventory plugins
INVENTORY_PLUGINS = {
    plugin.upper(): {
        key.upper(): val
        for key, val in config['inventory']['plugin'][plugin].all().items()
    }
    for plugin in config['inventory']['plugin'].keys()
}

# History plugins
history = config['history']
HISTORY_OUTPUT_PLUGINS = history.getlist('output_plugins', fallback='database')
HISTORY_READ_PLUGIN = history.get('read_plugin', fallback='database')

HISTORY_PLUGIN_SETTINGS = {
    plugin: {
        key.upper(): val
        for key, val in history['plugin'][plugin].all().items()
    }
    for plugin in history['plugin'].keys()
}

LOGGING['formatters']['polemarch.history.output'] = {
    "format": history['plugin']['logger'].get('format', fallback='%(message)s'),
}
LOGGING['handlers']['polemarch.history.output'] = HISTORY_PLUGIN_SETTINGS['logger']['OPTIONS']
LOGGING['loggers']['polemarch.history.output'] = {
    'handlers': list(filter(bool, ['console' if DEBUG else None, 'polemarch.history.output'])),
    'level': 'INFO',
    'propagate': True,
}

# RPC tasks settings
CELERY_TASK_SERIALIZER = 'json'

TASKS_HANDLERS = {
    "REPO": {
        "BACKEND": "{}.main.tasks.tasks.RepoTask".format(VST_PROJECT_LIB_NAME)
    },
    "SCHEDULER": {
        "BACKEND": "{}.main.tasks.tasks.ScheduledTask".format(VST_PROJECT_LIB_NAME)
    },
    "EXECUTION": {
        "BACKEND": "{}.main.tasks.tasks.PluginTask".format(VST_PROJECT_LIB_NAME)
    },
}

NOTIFY_WITHOUT_QUEUE_MODELS = [
    'main.History',
    'main.Project',
]

CLONE_RETRY = rpc.getint('clone_retry_count', fallback=5)


# Outgoing hooks settings
HOOKS = {
    "HTTP": {
        "BACKEND": '{}.main.hooks.http.Backend'.format(VST_PROJECT_LIB_NAME)
    },
    "SCRIPT": {
        "BACKEND": '{}.main.hooks.script.Backend'.format(VST_PROJECT_LIB_NAME)
    },
}

HOOKS_DIR = main.get("hooks_dir", fallback="/etc/polemarch/hooks/")

__EXECUTOR_DEFAULT = '{INTERPRETER} -m pm_ansible'
EXECUTOR = main.get("executor_path", fallback=__EXECUTOR_DEFAULT).strip().split(' ')
SELFCARE = '/tmp/'

MANUAL_PROJECT_VARS = config['project_manual_vars'].all() or \
                      dict(forks=4, timeout=30, fact_caching_timeout=3600, poll_interval=5)

PROJECT_REPOSYNC_WAIT_SECONDS = main.getseconds('repo_sync_on_run_timeout', fallback='1:00')
PROJECT_CI_HANDLER_CLASS = "{}.main.ci.DefaultHandler".format(VST_PROJECT_LIB_NAME)
METRICS_BACKEND_CLASS = "{}.metrics.PolemarchBackend".format(VST_PROJECT_LIB_NAME)
HISTORY_METRICS_WINDOW = web.getseconds('history_metrics_window', fallback=600)


__PWA_ICONS_SIZES = [
    "36x36", "48x48", "72x72", "96x96", "120x120", "128x128", "144x144",
    "150x150", "152x152", "180x180", "192x192", "310x310", "512x512"
]

PWA_MANIFEST = {
    "description": "Ansible based service for IT infrastructure management",
    "icons": list(
        map(lambda icon_size : {
            "src": "{0}img/logo/logo_{1}.png".format(STATIC_URL, icon_size),
            "sizes": icon_size,
            "type": "image/png"
        }, __PWA_ICONS_SIZES)
    ),
}

SPA_STATIC += [
    {'priority': 149, 'type': 'js', 'name': 'polemarch/pmlib.js'},
]

# TEST settings
if "test" in sys.argv:
    REPO_BACKENDS['GIT']['OPTIONS']['CLONE_KWARGS']['local'] = True
    CLONE_RETRY = 0
    PROJECTS_DIR = '/tmp/polemarch_projects' + str(KWARGS['PY_VER'])
    HOOKS_DIR = '/tmp/polemarch_hooks' + str(KWARGS['PY_VER'])
    os.makedirs(PROJECTS_DIR) if not os.path.exists(PROJECTS_DIR) else None
    os.makedirs(HOOKS_DIR) if not os.path.exists(HOOKS_DIR) else None

    tests_module_name = 'tests'
    if VST_PROJECT_LIB_NAME != 'polemarch':
        tests_module_name = 'tests_ce'  # noce
    EXECUTION_PLUGINS['TEST_ANSIBLE_DOC'] = {
        'BACKEND': f'{tests_module_name}.TestAnsibleDoc',
        'OPTIONS': {},
    }
    EXECUTION_PLUGINS['TEST_ECHO'] = {
        'BACKEND': f'{tests_module_name}.TestEcho',
        'OPTIONS': {},
    }
    EXECUTION_PLUGINS['TEST_MODULE'] = {
        'BACKEND': f'{tests_module_name}.TestModule',
        'OPTIONS': {
            'COMPATIBLE_INVENTORY_PLUGINS': {
                'inventory': [
                    'POLEMARCH_DB',
                    'ANSIBLE_FILE',
                    'ANSIBLE_STRING',
                    'TEST_INVENTORY_PLUGIN',
                ],
            }
        }
    }
    INVENTORY_PLUGINS['TEST_INVENTORY_PLUGIN'] = {'BACKEND': f'{tests_module_name}.TestInventoryPlugin'}
    HISTORY_OUTPUT_PLUGINS = ['database', 'logger']
