import base64
import io
import json
import logging
import os
import re
import shutil
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from tempfile import mkdtemp
from unittest import skipIf
from uuid import uuid1

import git
import yaml
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import FieldDoesNotExist
from django.core.management import call_command
from django.forms import ValidationError
from django.test import override_settings
from django.utils import timezone
from django_test_migrations.contrib.unittest_case import MigratorTestCase
from requests import Response
from rest_framework import fields as drffields
from vstutils.api import fields as vstfields
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from vstutils.utils import get_session_store

try:
    from polemarch.main.openapi import PROJECT_MENU
    from polemarch.main.tasks import ScheduledTask
    from polemarch.main.constants import CYPHER
    from polemarch.main.executions import PLUGIN_HANDLERS
    from polemarch.main.models.utils import ProjectProxy
    from polemarch.plugins.execution.ansible import BaseAnsiblePlugin, BasePlugin, AnsibleModule, AnsiblePlaybook
    from polemarch.plugins.inventory.base import BasePlugin as BaseInventoryPlugin
    from polemarch.main.exceptions import NotApplicable
except ImportError:
    from pmlib.main.tasks import ScheduledTask
    from pmlib.main.constants import CYPHER
    from pmlib.main.executions import PLUGIN_HANDLERS
    from pmlib.main.models.utils import ProjectProxy
    from pmlib.plugins.execution.ansible import BaseAnsiblePlugin, BasePlugin, AnsibleModule, AnsiblePlaybook
    from pmlib.plugins.inventory.base import BasePlugin as BaseInventoryPlugin
    from pmlib.main.exceptions import NotApplicable


logger = logging.getLogger('polemarch')


TEST_DATA_DIR = Path(__file__).parent.absolute()
ORIGINAL_PROJECTS_DIR = settings.PROJECTS_DIR
if settings.VST_PROJECT_LIB_NAME == 'polemarch':
    TEST_DATA_DIR /= 'test_data'
    TESTS_MODULE = 'tests'
else:
    TEST_DATA_DIR /= 'test_data_ce'
    TESTS_MODULE = 'tests_ce'

User = get_user_model()

example_key = """
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIH1LLUytCpUG6FMH06Wnuk+p4ZewjyDPJKcQwsaGZ5y3oAoGCCqGSM49
AwEHoUQDQgAET5LtltdvCIaMd4ZzXBP3JkZp/F2EMxPUiNVSe/HMdNIEnzy7WdH9
HD1a8+068eoT+KV/ESsjDxwo2NUPZAo0pQ==
-----END EC PRIVATE KEY-----
""".strip()


def use_temp_dir(func):
    """
    Decorator which makes temp directory and removes
    it after successful execution or error.
    """

    def wrapper(*args, **kwargs):
        temp_dir = mkdtemp()
        try:
            result = func(*args, temp_dir=temp_dir, **kwargs)
            shutil.rmtree(temp_dir)
            return result
        except BaseException:
            shutil.rmtree(temp_dir)
            raise

    return wrapper


def own_projects_dir(cls):
    """
    Decorator which overrides PROJECTS_DIR setting based
    on current app name (CE/EE) and class name.
    """

    return override_settings(PROJECTS_DIR=Path(settings.PROJECTS_DIR) / cls.__module__ / cls.__name__)(cls)


class MockServer:
    """
    Context manager which creates, serves and returns an
    instance of HTTPServer with given handler in separate
    thread. You can then make request to the `http://localhost:<PORT>`,
    where `<PORT>` in `.server_port` attribute of return value.
    Stops server after leaving context.
    """

    __slots__ = ('handler', 'httpd')

    def __init__(self, handler: BaseHTTPRequestHandler):
        self.handler = handler

    def __enter__(self) -> HTTPServer:
        self.httpd = HTTPServer(('', 0), self.handler)
        threading.Thread(target=self.httpd.serve_forever).start()
        return self.httpd

    def __exit__(self, exc_cls, exc_object, traceback):
        self.httpd.shutdown()
        if exc_cls is not None:
            exc_cls(exc_object, traceback)


class TestException(Exception):
    def __init__(self, msg='Test exception.', *args, **kwargs):
        super().__init__(msg, *args, **kwargs)


class DummyProject:
    def __init__(self):
        self.env_vars = {
            'env1': 'env1_value',
            'env2': 'env2_value',
        }

    def __getattr__(self, name):
        return name


class TestAnsibleDoc(BaseAnsiblePlugin):
    reference = {
        'module-path': {'type': 'string'},
        'verbose': {'type': 'int', 'help': 'verbose level'},
        'json': {'type': None},
    }
    serializer_fields = {'target': vstfields.VSTCharField()}
    arg_shown_on_history_as_mode = 'target'

    @property
    def base_command(self):
        return super().base_command + ['ansible-doc']

    def post_execute_hook(self, *args, **kwargs):
        self.verbose_output('Test log from test plugin', level=2)

    def _process_arg(self, key, value):
        if key == 'target':
            return value
        return super()._process_arg(key, value)


class TestEcho(BasePlugin):
    serializer_fields = {
        'string': vstfields.VSTCharField(),
        'n': drffields.BooleanField(default=drffields.empty, required=False, label='No trailing newlines'),
        'e': drffields.BooleanField(default=drffields.empty, required=False, label='Interpret backslash escapes'),
    }
    arg_shown_on_history_as_mode = 'string'

    @property
    def base_command(self):
        return ['echo']

    def _process_arg(self, key, value):
        if key == 'string':
            return value
        if key in ('n', 'e') and value:
            return f'-{key}'


class TestModule(AnsibleModule):
    def post_execute_hook(self, cmd, raw_args):
        if not self.inventory.plugin_object.state_managed:
            return

        state = self.inventory.inventory_state
        if 'counter' not in state.data:
            state.data['counter'] = 1
        else:
            state.data['counter'] += 1
        state.save(update_fields=('data',))

    def get_pre_commands(self, *args, **kwargs):
        return [['echo', 'echo_first'], ['echo', 'echo_second']]


class TestInventoryPlugin(BaseInventoryPlugin):
    supports_import = True

    serializer_fields = {
        'body': vstfields.TextareaField(allow_blank=True, default=''),
    }
    defaults = {
        'body': 'localhost ansible_connection=local',
    }
    serializer_import_fields = {
        'body': vstfields.FileInStringField(),
    }

    def render_inventory(self, instance, execution_dir):
        state_data = instance.inventory_state.data
        filename = str(uuid1())
        filepath = Path(execution_dir) / filename
        filepath.write_text(state_data['body'])
        return filepath, []

    def get_raw_inventory(self, inventory_string):
        return f'File contents:\n{inventory_string}'

    @classmethod
    def import_inventory(cls, instance, data):
        instance.update_inventory_state(data=data)
        return instance


class BaseTestCase(VSTBaseTestCase):
    def setUp(self):
        self.host = self.get_model_class('main.Host').objects.create(name='localhost')
        self.group = self.get_model_class('main.Group').objects.create(name='default_group')
        self.group.hosts.add(self.host)
        self.inventory = self.get_model_class('main.Inventory').objects.create(name='default_inventory')
        self.inventory.hosts.add(self.host)
        self.inventory.groups.add(self.group)
        host_type = ContentType.objects.get(model='host')
        self.get_model_class('main.Variable').objects.create(
            key='ansible_connection',
            value='local',
            object_id=self.inventory.id,
            content_type=host_type,
        )
        self.get_model_class('main.Variable').objects.create(
            key='ansible_python_interpreter',
            value=sys.executable,
            object_id=self.inventory.id,
            content_type=host_type,
        )
        super().setUp()


class BaseProjectTestCase(BaseTestCase):
    @classmethod
    def setUpTestData(cls):
        assert ORIGINAL_PROJECTS_DIR != settings.PROJECTS_DIR, (
            f'You should decorate {cls.__name__} using "@own_projects_dir". '
            'This needs to avoid race conditions in parallel executions.'
        )
        super().setUpTestData()

    def setUp(self):
        super().setUp()
        self.project = self.get_model_filter('main.Project').create(name='default_project')
        os.makedirs(f'{settings.PROJECTS_DIR}/{self.project.id}', exist_ok=True)
        self.project.hosts.add(self.host)
        self.project.groups.add(self.group)
        self.project.inventories.add(self.inventory)
        shutil.copy(f'{TEST_DATA_DIR}/playbook.yml', f'{settings.PROJECTS_DIR}/{self.project.id}/playbook.yml')
        shutil.copy(
            f'{TEST_DATA_DIR}/localhost-inventory.yml',
            f'{settings.PROJECTS_DIR}/{self.project.id}/localhost-inventory.yml',
        )
        self.project.start_repo_task('sync')
        self.inventory_path = 'localhost-inventory.yml'

        self.template = self.get_model_filter('main.ExecutionTemplate').create(
            name='default_template',
            project=self.project,
            plugin='ANSIBLE_MODULE',
        )
        self.template_option = self.get_model_filter('main.ExecutionTemplateOption').create(
            name='default_option',
            template=self.template,
            arguments={
                'module': 'system.ping',
                'connection': 'local',
                'inventory': 'localhost,',
                'group': 'all',
                'extra-vars': f'ansible_python_interpreter={ sys.executable }',
            },
        )

    def tearDown(self):
        if Path(settings.PROJECTS_DIR).exists():
            shutil.rmtree(settings.PROJECTS_DIR)
        super().tearDown()

    def create_inventory_bulk_data(self, plugin='POLEMARCH_DB', project_id=None, **kwargs):
        return {
            'method': 'post',
            'path': 'inventory' if project_id is None else ['project', project_id, 'inventory'],
            'data': {
                'name': 'test-inventory',
                'plugin': plugin,
                **kwargs,
            },
        }

    def update_inventory_state_bulk_data(self, inventory_id, project_id=None, **kwargs):
        path = ['inventory', inventory_id, 'state']
        if project_id is not None:
            path = ['project', project_id] + path
        return {
            'method': 'put',
            'path': path,
            'data': kwargs,
        }

    def import_inventory_bulk_data(self, plugin, data, project_id=None, name='test_imported_inventory'):
        project_prefix = [] if project_id is None else ['project', project_id]
        path = project_prefix + ['inventory', 'import_inventory']
        return {
            'method': 'post',
            'path': path,
            'data': {
                'name': name,
                'plugin': plugin,
                'data': data,
            },
        }

    def get_inventory_state_bulk_data(self, inventory_id, project_id=None):
        path = ['inventory', inventory_id, 'state']
        if project_id is not None:
            path = ['project', project_id] + path
        return {
            'method': 'get',
            'path': path,
        }

    def get_inventory_bulk_data(self, inventory_id, project_id=None):
        path = ['inventory', inventory_id]
        if project_id is not None:
            path = ['project', project_id] + path
        return {
            'method': 'get',
            'path': path,
        }

    def create_project_bulk_data(self, type='MANUAL', **kwargs):
        return {
            'method': 'post',
            'path': 'project',
            'data': {
                'name': str(uuid1()),
                'type': type,
                **kwargs,
            }
        }

    def sync_project_bulk_data(self, project_id=None):
        return {
            'method': 'patch',
            'path': ['project', project_id or self.project.id, 'sync'],
        }

    def create_project_variable_bulk_data(self, key, value, project_id=None):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'variables'],
            'data': {'key': key, 'value': value},
        }

    def get_project_bulk_data(self, project_id=None):
        return {
            'method': 'get',
            'path': ['project', project_id or self.project.id]
        }

    def get_history_bulk_data(self, history_id, path_prefix=None):
        path_prefix = path_prefix or []
        return {
            'method': 'get',
            'path': [*path_prefix, 'history', history_id],
        }

    def get_raw_history_bulk_data(self, history_id, path_prefix=None):
        path_prefix = path_prefix or []
        return {
            'method': 'get',
            'path': [*path_prefix, 'history', history_id, 'raw']
        }

    def execute_plugin_bulk_data(self, plugin, project_id=None, **arguments):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, f'execute_{plugin.lower()}'],
            'data': arguments,
        }

    def create_template_periodic_task_bulk_data(
        self,
        template_id=None,
        option_id=None,
        project_id=None,
        **kwargs,
    ):
        option_id = option_id or self.template_option.id
        return {
            'method': 'post',
            'path': [
                'project',
                project_id or self.project.id,
                'execution_templates',
                template_id or self.template.id,
                'options',
                str(option_id),
                'periodic_tasks',
            ],
            'data': {
                'name': str(uuid1()),
                'type': 'INTERVAL',
                'schedule': 5,
                'enabled': False,
                'save_result': True,
                'notes': 'some notes',
                **kwargs,
            },
        }

    def get_default_template_option(self, template_id):
        template = self.get_model_filter('main.ExecutionTemplate').get(id=template_id)
        return template.options.filter(name='default').first()

    def create_template_bulk_data(
        self,
        project_id=None,
        plugin='ANSIBLE_MODULE',
        arguments=None,
        **kwargs,
    ):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'execution_templates'],
            'data': {
                'name': 'template',
                'notes': 'some notes',
                'plugin': plugin,
                'arguments': arguments or {
                    'module': 'system.ping',
                    'inventory': 'localhost,',
                    'connection': 'local',
                    'verbose': 2,
                },
                **kwargs,
            },
        }

    def create_template_option_bulk_data(
        self,
        arguments,
        template_id=None,
        project_id=None,
        **kwargs,
    ):
        return {
            'method': 'post',
            'path': [
                'project',
                project_id or self.project.id,
                'execution_templates',
                template_id or self.template.id,
                'options',
            ],
            'data': {
                'name': 'custom_option',
                'notes': 'some notes',
                'arguments': arguments,
                **kwargs,
            },
        }

    def execute_template_bulk_data(
        self,
        project_id=None,
        template_id=None,
        option_id=None,
        via_option=False,
        **kwargs,
    ):
        option_id = option_id or self.template_option.id
        if via_option:
            return {
                'method': 'post',
                'path': [
                    'project',
                    project_id or self.project.id,
                    'execution_templates',
                    template_id or self.template.id,
                    'options',
                    str(option_id),
                    'execute',
                ],
                'data': kwargs,
            }

        return {
            'method': 'post',
            'path': [
                'project',
                project_id or self.project.id,
                'execution_templates',
                template_id or self.template.id,
                'execute',
            ],
            'data': {'option': str(option_id), **kwargs},
        }


@own_projects_dir
class ProjectTestCase(BaseProjectTestCase):
    def test_project_files_deletion(self):
        project_path = Path(self.project.path)
        self.assertTrue(project_path.is_dir())
        self.bulk_transactional(
            {'method': 'delete', 'path': ['project', self.project.id]},
        )
        self.assertFalse(project_path.is_dir())

    def test_copy_project(self):
        results = self.bulk_transactional([
            # [0] add variable to project
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'repo_sync_on_run_timeout', 'value': 12}
            },
            # [1] copy project
            {'method': 'post', 'path': ['project', self.project.id, 'copy'], 'data': {'name': 'copy'}},
            # [2]
            self.get_project_bulk_data('<<1[data][id]>>'),
            # [3] check variable list of copied project
            {
                'method': 'get',
                'path': ['project', '<<1[data][id]>>', 'variables'],
            },
        ])
        self.assertEqual(results[1]['data']['name'], 'copy')
        self.assertEqual(results[2]['data']['repository'], self.project.repository)
        self.assertEqual(results[2]['data']['status'], 'NEW')
        self.assertEqual(results[2]['data']['revision'], self.project.revision)

        self.assertEqual(results[3]['data']['count'], 1)
        self.assertEqual(results[3]['data']['results'][0]['key'], 'repo_sync_on_run_timeout')
        self.assertEqual(results[3]['data']['results'][0]['value'], 12)

    def test_create_project(self):
        results = self.bulk_transactional([
            # [0]
            self.create_project_bulk_data(
                type='GIT',
                repository='example.repo',
                repo_auth='KEY',
                auth_data=example_key,
                branch='main',
                additional_playbook_path='./somepath',
            ),
            # [1]
            self.get_project_bulk_data('<<0[data][id]>>'),
            # [2]
            {'method': 'get', 'path': ['project', '<<0[data][id]>>', 'variables']},
        ])
        self.assertEqual(results[1]['data']['repository'], 'example.repo')
        self.assertEqual(results[1]['data']['status'], 'NEW')
        self.assertEqual(results[1]['data']['revision'], 'NOT_SYNCED')
        self.assertEqual(results[1]['data']['branch'], 'waiting... => main')
        self.assertIsNone(results[1]['data']['readme_content'])
        self.assertIsNone(results[1]['data']['execute_view_data'])

        self.assertEqual(results[2]['data']['count'], 4)
        self.assertEqual(results[2]['data']['results'][0]['key'], 'playbook_path')
        self.assertEqual(results[2]['data']['results'][0]['value'], './somepath')
        self.assertEqual(results[2]['data']['results'][1]['key'], 'repo_branch')
        self.assertEqual(results[2]['data']['results'][1]['value'], 'main')
        self.assertEqual(results[2]['data']['results'][2]['key'], 'repo_key')
        self.assertEqual(results[2]['data']['results'][2]['value'], CYPHER)
        self.assertEqual(results[2]['data']['results'][3]['key'], 'repo_type')
        self.assertEqual(results[2]['data']['results'][3]['value'], 'GIT')

    def test_project_owner(self):
        user = self._create_user(is_super_user=False)
        with self.user_as(self, user):
            results = self.bulk([
                {'method': 'post', 'path': 'project', 'data': {'name': 'test'}},
                {'method': 'get', 'path': ['project', '<<0[data][id]>>']}
            ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['owner'], user.id)

    def test_set_owner(self):
        user = self._create_user(is_super_user=False, is_staff=True)
        user2 = self._create_user(is_super_user=False, is_staff=True)
        results = self.bulk([
            {
                'method': 'patch',
                'path': ['project', self.project.id, 'set_owner'],
                'data': {'owner': user.id}
            },
            {
                'method': 'patch',
                'path': ['project', self.project.id, 'set_owner'],
                'data': {'owner': 146}
            },
            {'method': 'get', 'path': ['project', self.project.id]},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['owner'], user.id)

        with self.user_as(self, user2):
            results = self.bulk([
                {'method': 'patch', 'path': ['project', self.project.id, 'set_owner'], 'data': {'owner': user.id}},
            ])
        self.assertEqual(results[0]['status'], 403)
        self.assertEqual(results[0]['data']['detail'], 'Only owner can change owner.')


@own_projects_dir
class InventoryTestCase(BaseProjectTestCase):
    def test_ansible_string_inventory(self):
        inventory_string = (TEST_DATA_DIR / 'repo' / 'inventory.ini').read_text()

        results = self.bulk_transactional([
            # [0]
            self.create_inventory_bulk_data('ANSIBLE_STRING', self.project.id),
            # [1]
            self.get_inventory_state_bulk_data(inventory_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['data']['plugin'], 'ANSIBLE_STRING')
        self.assertDictEqual(results[1]['data']['data'], {
            'body': '',
            'filename': '',
            'extension': 'yaml',
            'executable': False,
        })

        inventory_id = results[0]['data']['id']

        results = self.bulk_transactional([
            # [0]
            self.update_inventory_state_bulk_data(
                inventory_id=inventory_id,
                data={
                    'executable': True,
                    'extension': 'ini',
                    'body': inventory_string,
                }
            ),
            # [1]
            self.execute_plugin_bulk_data(
                'ANSIBLE_MODULE',
                module='system.ping',
                inventory=inventory_id,
            ),
            # [2]
            self.get_history_bulk_data('<<1[data][history_id]>>'),
        ])
        self.assertEqual(results[0]['data']['data']['body'].strip(), inventory_string.strip())
        self.assertEqual(results[0]['data']['data']['extension'], 'ini')
        self.assertTrue(results[0]['data']['data']['executable'])
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['inventory'], inventory_id)
        self.assertEqual(results[2]['data']['raw_inventory'].strip(), inventory_string.strip())

        # check hosts and groups path are unavailable
        bulk_data = [
            {
                'method': 'get',
                'path': ['inventory', inventory_id, endpoint],
            }
            for endpoint in ['variables', 'hosts', 'group', 'all_hosts', 'all_groups']
        ]
        results = self.bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 404)

        # check that state deletes with inventory
        state_id = self.get_model_filter('main.Inventory').get(id=inventory_id)._inventory_state_id
        self.assertIsNotNone(state_id)
        self.bulk_transactional([
            {
                'method': 'delete',
                'path': ['project', self.project.id, 'inventory', inventory_id],
                'headers': {'X-Purge-Nested': 'true'}
            },
        ])
        self.assertFalse(self.get_model_filter('main.Inventory').filter(id=inventory_id).exists())
        self.assertFalse(self.get_model_filter('main.InventoryState').filter(id=state_id).exists())

    @use_temp_dir
    def test_ansible_file_inventory(self, temp_dir):
        repo_dir = f'{temp_dir}/repo'
        shutil.copytree(TEST_DATA_DIR / 'repo', repo_dir)
        repo = git.Repo.init(repo_dir)
        repo.git.add(all=True)
        repo.index.commit('Initial commit')

        results = self.bulk_transactional([
            # [0]
            self.create_project_bulk_data(type='GIT', repository=repo_dir),
            # [1]
            self.sync_project_bulk_data('<<0[data][id]>>'),
            # [2]
            self.create_inventory_bulk_data('ANSIBLE_FILE', project_id='<<0[data][id]>>'),
            # [3]
            self.get_inventory_state_bulk_data('<<2[data][id]>>'),
        ])
        self.assertDictEqual(results[3]['data']['data'], {'path': ''})

        project_id = results[0]['data']['id']
        inventory_id = results[2]['data']['id']

        results = self.bulk_transactional([
            # [0]
            self.update_inventory_state_bulk_data(inventory_id, data={'path': './inventory.ini'}),
            # [1]
            self.execute_plugin_bulk_data(
                'ANSIBLE_MODULE',
                module='system.ping',
                project_id=project_id,
                inventory=inventory_id,
            ),
            # [2]
            self.get_history_bulk_data('<<1[data][history_id]>>'),
            # [3] create new inventory and check that its state has defaults
            self.create_inventory_bulk_data('ANSIBLE_FILE', project_id=project_id),
            # [4]
            self.get_inventory_state_bulk_data('<<3[data][id]>>'),
        ])
        self.assertDictEqual(results[0]['data']['data'], {'path': './inventory.ini'})
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['inventory'], inventory_id)
        self.assertEqual(
            results[2]['data']['raw_inventory'],
            (TEST_DATA_DIR / 'repo' / 'inventory.ini').read_text()
        )
        self.assertDictEqual(results[4]['data']['data'], {'path': ''})

        # check hosts and groups path are unavailable
        bulk_data = [
            {
                'method': 'get',
                'path': ['inventory', inventory_id, endpoint],
            }
            for endpoint in ['variables', 'hosts', 'group', 'all_hosts', 'all_groups']
        ]
        results = self.bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 404)

        # check copy
        results = self.bulk_transactional([
            {
                'method': 'post',
                'path': ['project', project_id, 'inventory', inventory_id, 'copy'],
                'data': {'name': 'copied'},
            },
            self.get_inventory_state_bulk_data('<<0[data][id]>>'),
        ])
        self.assertDictEqual(results[1]['data']['data'], {'path': './inventory.ini'})

        # check that state deletes with inventory
        state_id = self.get_model_filter('main.Inventory').get(id=inventory_id)._inventory_state_id
        self.assertIsNotNone(state_id)
        self.bulk_transactional([
            {
                'method': 'delete',
                'path': ['project', project_id, 'inventory', inventory_id],
                'headers': {'X-Purge-Nested': 'true'}
            },
        ])
        self.assertFalse(self.get_model_filter('main.Inventory').filter(id=inventory_id).exists())
        self.assertFalse(self.get_model_filter('main.InventoryState').filter(id=state_id).exists())

    def test_custom_inventory_plugin(self):
        results = self.bulk_transactional([
            # [0]
            self.create_inventory_bulk_data('TEST_INVENTORY_PLUGIN', project_id=self.project.id),
            # [1]
            self.get_inventory_state_bulk_data('<<0[data][id]>>'),
        ])
        self.assertDictEqual(results[1]['data']['data'], {'body': 'localhost ansible_connection=local'})

        inventory = self.get_model_filter('main.Inventory').get(id=results[0]['data']['id'])
        self.assertDictEqual(inventory.inventory_state.data, {'body': 'localhost ansible_connection=local'})

        # check post_execute_hook and get_pre_commands
        results = self.bulk_transactional([
            self.execute_plugin_bulk_data(
                'TEST_MODULE',
                module='system.ping',
                inventory=inventory.id,
            ),
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
        ])
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[1]['data']['inventory'], inventory.id)
        self.assertEqual(results[1]['data']['raw_inventory'], 'File contents:\nlocalhost ansible_connection=local')
        self.assertTrue(
            results[1]['data']['raw_args'].startswith('echo echo_first && echo echo_second &&'),
        )
        self.assertTrue(
            results[2]['data']['detail'].startswith('echo_first\necho_second')
        )

        inventory.inventory_state.refresh_from_db()
        self.assertDictEqual(inventory.inventory_state.data, {
            'body': 'localhost ansible_connection=local',
            'counter': 1,
        })

        results = self.bulk([
            # [0] try to execute incompatible execution plugin
            self.execute_plugin_bulk_data(
                'ANSIBLE_MODULE',
                module='system.ping',
                inventory=inventory.id,
            ),
            # [1] try to create option with incompatible plugin
            self.create_template_option_bulk_data(arguments={
                'module': 'system.ping',
                'inventory': inventory.id,
            }),
        ])
        for result in results:
            self.assertEqual(result['status'], 400)
            self.assertEqual(
                result['data']['detail'],
                'Field "inventory" is not compatible with TEST_INVENTORY_PLUGIN inventory plugin.',
            )

        # test import
        results = self.bulk_transactional([
            self.import_inventory_bulk_data(
                plugin='TEST_INVENTORY_PLUGIN',
                data={'body': 'some_data'},
            ),
            self.get_inventory_state_bulk_data('<<0[data][inventory_id]>>'),
        ])
        self.assertDictEqual(results[-1]['data']['data'], {'body': 'some_data'})

    def test_fk_inventory_usage(self):
        results = self.bulk_transactional([
            self.create_inventory_bulk_data(name='unreachable'),
            self.create_template_bulk_data(),

        ])
        inventory_id = results[0]['data']['id']
        template_id = results[1]['data']['id']
        option_id = self.get_model_filter('main.ExecutionTemplateOption').filter(template__id=template_id).first().id

        results = self.bulk([
            # [0]
            self.execute_plugin_bulk_data(plugin='ANSIBLE_MODULE', inventory=inventory_id, module='system.ping'),
            # [1]
            self.create_template_bulk_data(arguments={
                'inventory': inventory_id,
                'module': 'system.ping',
            }),
            # [2]
            {
                'method': 'patch',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'options', str(option_id)],
                'data': {'arguments': {'inventory': inventory_id, 'module': 'system.setup'}},
            },
        ])
        self.assertEqual(results[0]['status'], 400, results[0])
        self.assertEqual(results[0]['data'], ['No Inventory matches the given query.'])
        for idx in range(1, 3):
            self.assertEqual(results[idx]['status'], 400, f'Failed on {idx}')
            self.assertEqual(results[idx]['data'], ['No Inventory matches the given query.'])

    def test_import_ansible_string_inventory(self):
        json_file = {
            'content': base64.b64encode(b'{"json": true}').decode('utf-8'),
            'mediaType': 'application/json',
            'name': '1.json',
        }
        yml_file = {
            'content': base64.b64encode(b'---\nyml:\n  true').decode('utf-8'),
            'mediaType': 'application/x-yaml',
            'name': '2.yml',
        }
        ini_file = {
            'content': base64.b64encode(b'[example]\nini = true').decode('utf-8'),
            'mediaType': None,
            'name': '3.ini',
        }
        sh_file = {
            'content': base64.b64encode(b'#!/bin/sh\necho example').decode('utf-8'),
            'mediaType': 'application/x-shellscript',
            'name': '4.sh',
        }
        unknown_file = {
            'content': '',
            'mediaType': None,
            'name': 'unknown',
        }

        results = self.bulk_transactional([
            # [0]
            self.import_inventory_bulk_data(plugin='ANSIBLE_STRING', data={'file': json_file}),
            # [1]
            self.get_inventory_state_bulk_data('<<0[data][inventory_id]>>'),
            # [2]
            self.import_inventory_bulk_data(plugin='ANSIBLE_STRING', data={'file': yml_file}),
            # [3]
            self.get_inventory_state_bulk_data('<<2[data][inventory_id]>>'),
            # [4]
            self.import_inventory_bulk_data(plugin='ANSIBLE_STRING', data={'file': ini_file}),
            # [5]
            self.get_inventory_state_bulk_data('<<4[data][inventory_id]>>'),
            # [6]
            self.import_inventory_bulk_data(plugin='ANSIBLE_STRING', data={'file': sh_file}),
            # [7]
            self.get_inventory_state_bulk_data('<<6[data][inventory_id]>>'),
            # [8]
            self.import_inventory_bulk_data(plugin='ANSIBLE_STRING', data={'file': unknown_file}),
            # [9]
            self.get_inventory_state_bulk_data('<<8[data][inventory_id]>>'),
        ])
        self.assertDictEqual(results[1]['data']['data'], {
            'extension': 'json',
            'executable': False,
            'filename': '1',
            'body': '{"json": true}',
        })
        self.assertDictEqual(results[3]['data']['data'], {
            'extension': 'yml',
            'executable': False,
            'filename': '2',
            'body': '---\nyml:\n  true',
        })
        self.assertDictEqual(results[5]['data']['data'], {
            'extension': 'ini',
            'executable': False,
            'filename': '3',
            'body': '[example]\nini = true',
        })
        self.assertDictEqual(results[7]['data']['data'], {
            'extension': 'sh',
            'executable': True,
            'filename': '4',
            'body': '#!/bin/sh\necho example',
        })
        self.assertDictEqual(results[9]['data']['data'], {
            'extension': '',
            'executable': False,
            'filename': 'unknown',
            'body': '',
        })

    def test_import_polemarch_db_inventory(self):
        inventory = (TEST_DATA_DIR / 'inventory.yml').read_text()
        shutil.copy(
            TEST_DATA_DIR / 'inventory.yml',
            Path(settings.PROJECTS_DIR) / str(self.project.id) / 'inventory.yml'
        )

        results = self.bulk_transactional([
            # [0]
            self.import_inventory_bulk_data(
                plugin='POLEMARCH_DB',
                project_id=self.project.id,
                data={'body': inventory},
                name='inventory',
            ),
            # [1] check hosts added
            {'method': 'get', 'path': ['inventory', '<<0[data][inventory_id]>>', 'all_hosts']},
            # [2] check groups added
            {'method': 'get', 'path': ['inventory', '<<0[data][inventory_id]>>', 'all_groups']},
            # [3] check variables added
            {'method': 'get', 'path': ['inventory', '<<0[data][inventory_id]>>', 'variables']},
            # [4] check created inventory in project
            self.get_inventory_bulk_data('<<0[data][inventory_id]>>', self.project.id),
        ])
        self.assertEqual(results[1]['data']['count'], 3)
        self.assertEqual(results[2]['data']['count'], 3)
        self.assertEqual(results[3]['data']['count'], 1)
        self.assertEqual(results[4]['data']['name'], 'inventory')
        self.assertEqual(results[4]['data']['plugin'], 'POLEMARCH_DB')

        inventory_id = results[0]['data']['inventory_id']

        # check copy
        results = self.bulk_transactional([
            # [0]
            {
                'method': 'post',
                'path': ['inventory', inventory_id, 'copy'],
                'data': {'name': 'copied'},
            },
            # [1] check hosts added
            {'method': 'get', 'path': ['inventory', '<<0[data][id]>>', 'all_hosts']},
            # [2] check groups added
            {'method': 'get', 'path': ['inventory', '<<0[data][id]>>', 'all_groups']},
            # [3] check variables added
            {'method': 'get', 'path': ['inventory', '<<0[data][id]>>', 'variables']},
        ])
        self.assertEqual(results[1]['data']['count'], 3)
        self.assertEqual(results[2]['data']['count'], 3)
        self.assertEqual(results[3]['data']['count'], 1)

        # check invalid inventory
        results = self.bulk([
            self.import_inventory_bulk_data(
                plugin='POLEMARCH_DB',
                project_id=self.project.id,
                data={'body': '*&^?invalid'}
            ),
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn('Invalid hostname or IP', results[0]['data']['detail']['other_errors'][0])

    def test_delete_linked_inventory(self):
        # check linked inventory to project
        results = self.bulk([{'method': 'delete', 'path': ['inventory', self.inventory.id]}])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(results[0]['data']['detail']['linked_projects'], [str(self.project.id)])

        # check that template option removes with inventory deletion
        results = self.bulk_transactional([
            self.create_template_bulk_data(arguments={'module': 'system.ping', 'inventory': self.inventory.id}),
        ])
        template_id = results[0]['data']['id']
        option_id = self.get_default_template_option(template_id).id
        results = self.bulk_transactional([
            {
                'method': 'delete',
                'path': ['project', self.project.id, 'inventory', self.inventory.id],
                'headers': {'X-Purge-Nested': 'true'},
            }
        ])
        self.assertFalse(self.get_model_filter('main.ExecutionTemplateOption').filter(id=option_id).exists())

    @use_temp_dir
    def test_valid_inventory(self, temp_dir):
        results = self.bulk_transactional([
            # [0]
            self.create_inventory_bulk_data(name='inventory', notes='inventory'),
            {  # [1] create host with type RANGE
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'hosts'],
                'data': {'name': '127.0.0.[1:3]', 'type': 'RANGE', 'notes': '127.0.0.[1:3]'}
            },
            {  # [2] create master group
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group'],
                'data': {'name': 'master', 'notes': 'master'}
            },
            {  # [3] create master host
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group', '<<2[data][id]>>', 'hosts'],
                'data': {'name': '127.0.0.1', 'notes': '127.0.0.1'}
            },
            {  # [4] create slaves group
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group'],
                'data': {'name': 'slaves', 'notes': 'slaves'}
            },
            {  # [5] create slave hosts
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group', '<<4[data][id]>>', 'hosts'],
                'data': {'name': '127.0.0.[2:3]', 'type': 'RANGE'}
            },
            {  # [6] create inventory variable
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'variables'],
                'data': {'key': 'lol', 'value': 'depends'}
            },
            {  # [7] create master group variable
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group', '<<2[data][id]>>', 'variables'],
                'data': {'key': 'lol', 'value': 'yes'}
            },
            {  # [8] create slave hosts variable
                'method': 'post',
                'path': [
                    'inventory',
                    '<<0[data][id]>>',
                    'group',
                    '<<4[data][id]>>',
                    'hosts',
                    '<<5[data][id]>>',
                    'variables'
                ],
                'data': {'key': 'lol', 'value': 'no'}
            },
            {  # [9] create child-group
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group'],
                'data': {'name': 'child-group', 'children': True}
            },
            {  # [10] create child in child-group
                'method': 'post',
                'path': ['inventory', '<<0[data][id]>>', 'group', '<<9[data][id]>>', 'groups'],
                'data': {'id': '<<4[data][id]>>'}
            },
        ])

        # compare generated inventory with ready one
        generated_inventory_id = results[0]['data']['id']
        generated_inventory_obj = self.get_model_class('main.Inventory').objects.get(pk=generated_inventory_id)
        generated_inventory = generated_inventory_obj.plugin_object.render_inventory(
            generated_inventory_obj,
            Path(temp_dir),
        )[0].read_text()
        inventory_to_compare = (TEST_DATA_DIR / 'inventory.yml').read_text()
        # remove possible spaces between last symbol and \n
        # e.g. "word   \n  word" becomes "word\n  word"
        regex = re.compile(r'[ \t]+\n', flags=re.MULTILINE)
        generated_inventory = re.sub(regex, r'\n', generated_inventory)
        inventory_to_compare = re.sub(regex, r'\n', inventory_to_compare)
        self.assertEqual(generated_inventory, inventory_to_compare)

        def check_wr_string(wr_string):
            self.assertEqual(wr_string, 'lol_file')

        with self.patch('vstutils.utils.tmp_file.write', side_effect=check_wr_string):
            results = self.bulk_transactional([
                {  # [0] create ansible_ssh_private_key_file variable
                    'method': 'post',
                    'path': ['inventory', generated_inventory_id, 'variables'],
                    'data': {'key': 'ansible_ssh_private_key_file', 'value': 'lol_file'}
                },
            ])
            inventory_obj = self.get_model_class('main.Inventory').objects.get(pk=generated_inventory_id)
            inventory_obj.plugin_object.render_inventory(inventory_obj, Path(temp_dir))

        results = self.bulk_transactional([
            {  # [0] get all groups
                'method': 'get',
                'path': ['inventory', generated_inventory_id, 'all_groups']
            },
            {  # [1] get all hosts
                'method': 'get',
                'path': ['inventory', generated_inventory_id, 'all_hosts']
            },
        ])
        self.assertEqual(results[0]['data']['count'], 3)
        self.assertEqual(results[1]['data']['count'], 3)

        # check that POLEMARCH_DB inventory has not 'state' path
        results = self.bulk(
            {
                'method': 'get',
                'path': ['inventory', generated_inventory_id, 'state'],
            }
        )
        self.assertEqual(results[0]['status'], 404)

        # check that cannot access inventory state
        with self.assertRaises(NotApplicable):
            self.get_model_filter('main.Inventory').get(id=generated_inventory_id).inventory_state

    def test_groups_cyclic_dependence(self):
        results = self.bulk([
            {  # [0] add group
                'method': 'post',
                'path': ['inventory', self.inventory.id, 'group'],
                'data': {'children': True}
            },
            {  # [1] try to add this group as child of itself
                'method': 'post',
                'path': ['inventory', self.inventory.id, 'group', '<<0[data][id]>>', 'groups'],
                'data': {'id': '<<0[data][id]>>'}
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 400)
        self.assertIn('A cyclic dependence was found', results[1]['data']['detail'])

    def test_nested_groups(self):
        results = self.bulk([
            {'method': 'post', 'path': 'group', 'data': {'children': False}},
            {'method': 'get', 'path': ['group', '<<0[data][id]>>', 'groups']},
            {'method': 'post', 'path': ['group', '<<0[data][id]>>', 'groups'], 'data': {'lol': 'kek'}},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 409)
        self.assertEqual(results[1]['data'], ['Group cannot have child groups.'])
        self.assertEqual(results[2]['status'], 409)
        self.assertEqual(results[2]['data'], ['Group cannot have child groups.'])

        results = self.bulk([
            {'method': 'post', 'path': 'group', 'data': {'children': True}},
            {'method': 'get', 'path': ['group', '<<0[data][id]>>', 'hosts']},
            {'method': 'post', 'path': ['group', '<<0[data][id]>>', 'hosts'], 'data': {'lol': 'kek'}},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 409)
        self.assertEqual(results[1]['data'], ['Group cannot have child hosts.'])
        self.assertEqual(results[2]['status'], 409)
        self.assertEqual(results[2]['data'], ['Group cannot have child hosts.'])

        results = self.bulk([
            {'method': 'post', 'path': 'group', 'data': {'children': True}},
            {'method': 'post', 'path': ['group', '<<0[data][id]>>', 'groups'], 'data': {'id': '<<0[data][id]>>'}},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(
            results[1]['data']['detail'],
            'A cyclic dependence was found. The group can not refer to itself.'
        )

        with self.patch('sys.argv', ['loaddata']):
            group = self.get_model_class('main.Group').objects.create(children=True)
            group.parents.add(group)
        results = self.bulk([{'method': 'post', 'path': ['group', group.id, 'groups'], 'data': {}}])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(
            results[0]['data']['detail'],
            'A cyclic dependence was found. The group has a dependence on itself.'
        )

    def test_groups(self):
        user = self._create_user(is_super_user=True, username='user1', email='user1@users.vst')
        with self.user_as(self, user):
            results = self.bulk([
                {'method': 'post', 'path': 'group', 'data': {'name': 'group1'}},
                {'method': 'get', 'path': ['group', '<<0[data][id]>>']},
            ])
        self.assertEqual(results[0]['status'], 201, results[0])
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['owner'], user.id)

    def test_path_validator(self):
        try:
            from polemarch.main.validators import path_validator
        except BaseException:
            from pmlib.main.validators import path_validator

        valid_paths = {
            './.lol',
            './lol/kek.7z',
            './_l-o+l=',
            'lol.yaml/',
            'lol-kek_lol/_lol',
            '哈哈/chinese',
            '.lol',
            'лол.ру',
            '.tox/py38-coverage/lib/python3.8/site-packages/ansible/__pycache__/__init__.cpython-38.pyc',
        }
        invalid_paths = {
            'lol.',
            './lol.',
            '/lol/kek',
            'lol/../kek',
            '../kek',
        }

        for path in valid_paths:
            self.assertTrue(path_validator.regex.match(path), f'path {path} not matched')
        for path in invalid_paths:
            self.assertFalse(path_validator.regex.match(path), f'path {path} matched')

    def test_deep_nested_groups_crud(self):
        """
        NOTE: This test may fail if you are using database without CTE support.
        For this case consider set

        databases_without_cte_support = default

        to your [databases] section in settings.ini.
        """

        self.get_model_filter('main.Group').all().delete()

        def generate_group_chain_bulk_data(first, count):
            return [
                {
                    'method': 'post',
                    'path': ['group', f'<<{idx}[data][id]>>', 'groups'],
                    'data': {'children': True},
                }
                for idx in range(first, count)
            ]

        results = self.bulk_transactional([
            {'method': 'post', 'path': 'group', 'data': {'children': True}},
            *generate_group_chain_bulk_data(0, 9),
        ])
        second_to_last_group_id = results[-2]['data']['id']
        last_children_group_id = results[-1]['data']['id']

        results = self.bulk_transactional([
            {  # [0] create another group with children=False in second to last group
                'method': 'post',
                'path': ['group', second_to_last_group_id, 'groups'],
            },
            {  # [1] create host in last non-children group
                'method': 'post',
                'path': ['group', '<<0[data][id]>>', 'hosts'],
            },
            {  # [2] create some var in last non-children group
                'method': 'post',
                'path': ['group', '<<0[data][id]>>', 'variables'],
                'data': {'key': 'ansible_user', 'value': 'lol_user'},
            },
            {  # [3] create some var in last children group
                'method': 'post',
                'path': ['group', last_children_group_id, 'variables'],
                'data': {'key': 'ansible_user', 'value': 'lol_user'},
            },
            {  # [4] check subaction in last non-children group
                'method': 'patch',
                'path': ['group', '<<0[data][id]>>', 'set_owner'],
                'data': {'owner': self.user.id}
            },
            {  # [5] check subaction in last children group
                'method': 'patch',
                'path': ['group', last_children_group_id, 'set_owner'],
                'data': {'owner': self.user.id}
            },
            {  # [6] update name of non-children group
                'method': 'patch',
                'path': ['group', second_to_last_group_id, 'groups', '<<0[data][id]>>'],
                'data': {'name': 'non_children_group'}
            },
            {  # [7] update name of children group
                'method': 'patch',
                'path': ['group', second_to_last_group_id, 'groups', last_children_group_id],
                'data': {'name': 'children_group'}
            },
            {  # [8] get detailed non-children group
                'method': 'get',
                'path': ['group', second_to_last_group_id, 'groups', '<<0[data][id]>>'],
            },
            {  # [9] get detailed children group
                'method': 'get',
                'path': ['group', second_to_last_group_id, 'groups', last_children_group_id],
            },
            {  # [10] delete non-children group
                'method': 'delete',
                'path': ['group', second_to_last_group_id, 'groups', '<<0[data][id]>>'],
                'headers': {'X-Purge-Nested': 'true'}
            },
            {  # [11] delete children group
                'method': 'delete',
                'path': ['group', second_to_last_group_id, 'groups', last_children_group_id],
                'headers': {'X-Purge-Nested': 'true'}
            },
        ])
        self.assertEqual(results[8]['data']['name'], 'non_children_group')
        self.assertEqual(results[9]['data']['name'], 'children_group')
        self.assertFalse(self.get_model_filter('main.Group').filter(name='non_children_group').exists())
        self.assertFalse(self.get_model_filter('main.Group').filter(name='children_group').exists())

    def test_copy_group(self):
        self.bulk_transactional([
            {
                'method': 'patch',
                'path': ['group', self.group.id],
                'data': {'notes': 'lol notes'},
            },
            {
                'method': 'post',
                'path': ['group', self.group.id, 'variables'],
                'data': {'key': 'ansible_connection', 'value': 'local'},
            },
        ])

        results = self.bulk_transactional([
            {
                'method': 'post',
                'path': ['group', self.group.id, 'copy'],
                'data': {'name': f'copied_group_{self.group.id}'},
            },
            {
                'method': 'get',
                'path': ['group', '<<0[data][id]>>'],
            },
            {
                'method': 'get',
                'path': ['group', '<<0[data][id]>>', 'variables'],
            },
            {
                'method': 'get',
                'path': ['group', '<<0[data][id]>>', 'hosts'],
            },
        ])
        self.assertEqual(results[1]['data']['name'], f'copied_group_{self.group.id}')
        self.assertEqual(results[1]['data']['notes'], 'lol notes')
        self.assertEqual(results[2]['data']['count'], 1)
        self.assertEqual(results[2]['data']['results'][0]['key'], 'ansible_connection')
        self.assertEqual(results[2]['data']['results'][0]['value'], 'local')
        self.assertEqual(results[3]['data']['count'], 1)
        self.assertEqual(results[3]['data']['results'][0]['name'], self.host.name)

    def test_create_and_update_execution_template_option_with_different_inventory_types(self):
        def check_create(inventory):
            results = self.bulk_transactional([
                {
                    'method': 'post',
                    'path': [
                        'project',
                        self.project.id,
                        'execution_templates',
                        self.template.id,
                        'options',
                    ],
                    'data': {
                        'name': str(uuid1()),
                        'arguments': {'inventory': inventory, 'module': 'system.ping'},
                    }
                }
            ])
            self.assertEqual(results[0]['data']['arguments']['inventory'], str(inventory))
            option = self.get_model_filter('main.ExecutionTemplateOption').get(id=results[0]['data']['id'])
            self.assertEqual(option.arguments['inventory'], inventory)
            return results[0]['data']['id']

        def check_update(inventory, option_id):
            results = self.bulk_transactional([
                {
                    'method': 'patch',
                    'path': [
                        'project',
                        self.project.id,
                        'execution_templates',
                        self.template.id,
                        'options',
                        option_id,
                    ],
                    'data': {
                        'name': str(uuid1()),
                        'arguments': {'inventory': inventory, 'module': 'system.ping'},
                    }
                }
            ])
            self.assertEqual(results[0]['data']['arguments']['inventory'], str(inventory))
            option = self.get_model_filter('main.ExecutionTemplateOption').get(id=results[0]['data']['id'])
            self.assertEqual(option.arguments['inventory'], inventory)

        inventory_list = (self.inventory.id, self.inventory_path, 'host1,host2,')
        for inventory in inventory_list:
            for inventory2 in inventory_list:
                try:
                    template_id = check_create(inventory)
                    check_update(inventory2, template_id)
                except BaseException:
                    print(f'Failed with create {inventory}, update {inventory2}.')
                    raise

    def test_inventory_owner(self):
        user1 = self._create_user(is_super_user=False, is_staff=False)
        with self.user_as(self, user1):
            results = self.bulk_transactional([
                self.create_inventory_bulk_data(name='test'),
                {'method': 'get', 'path': ['inventory', '<<0[data][id]>>']},
            ])
        self.assertEqual(results[1]['data']['owner'], user1.id)


@own_projects_dir
class SyncTestCase(BaseProjectTestCase):
    def test_sync_manual(self):
        results = self.bulk([
            self.create_project_bulk_data(playbook_path='additional_pb_dir'),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertDictEqual(results[0]['data'], {
            **results[0]['data'],
            'type': 'MANUAL',
            'repository': 'MANUAL',
            'status': 'NEW',
            'branch': 'NO VCS',
            'additional_playbook_path': None,
        })
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['detail'], 'Sync with MANUAL.')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')

        project_dir = Path(f'{settings.PROJECTS_DIR}/{results[0]["data"]["id"]}')
        self.assertTrue(project_dir.is_dir())
        self.assertTrue(Path(f'{project_dir}/ansible.cfg').is_file())
        self.assertTrue(Path(f'{project_dir}/bootstrap.yml').is_file())

        # try to create a project which directory is already exists
        os.mkdir(Path(f'{settings.PROJECTS_DIR}/{results[0]["data"]["id"] + 1}'))
        with open(Path(f'{settings.PROJECTS_DIR}/{results[0]["data"]["id"] + 1}/lol.txt'), 'w') as f:
            f.write('lol')
        results = self.bulk([
            self.create_project_bulk_data(),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['detail'], 'Sync with MANUAL.')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')

        project_dir = Path(f'{settings.PROJECTS_DIR}/{results[0]["data"]["id"]}')
        self.assertTrue(project_dir.is_dir())
        self.assertFalse(Path(f'{project_dir}/ansible.cfg').is_file())
        self.assertFalse(Path(f'{project_dir}/bootstrap.yml').is_file())
        self.assertTrue(Path(f'{project_dir}/lol.txt').is_file())

    @use_temp_dir
    def test_sync_git(self, temp_dir):
        repo_dir = f'{temp_dir}/repo'
        shutil.copytree(f'{TEST_DATA_DIR}/repo', repo_dir)

        repo = git.Repo.init(repo_dir)

        # create submodules
        submodule_dir = f'{temp_dir}/submodule'
        os.mkdir(submodule_dir)
        shutil.copy(f'{TEST_DATA_DIR}/test_module.py', f'{submodule_dir}/test_module.py')
        submodule = git.Repo.init(submodule_dir)
        submodule.git.add('test_module.py')
        submodule.index.commit('Add module')
        repo.git.set_persistent_git_options(c='protocol.file.allow=always')
        repo.git.submodule('add', '../submodule/.git', 'lib')
        repo.git.submodule('add', f'{submodule_dir}/.git', 'lib2')
        repo.git.add(all=True)
        repo.index.commit('Initial commit')

        # create folder - while sync it must be replaced
        shutil.rmtree(settings.PROJECTS_DIR)
        os.mkdir(settings.PROJECTS_DIR)
        next_project_id = self.get_model_class('main.Project').objects.order_by('-id').values_list(
            'id',
            flat=True
        ).last() + 1
        os.mkdir(f'{settings.PROJECTS_DIR}/{next_project_id}')
        with open(f'{settings.PROJECTS_DIR}/{next_project_id}/some_trash', 'w') as f:
            f.write('lol')

        self.project.ansible_modules.all().delete()

        # sync with master
        results = self.bulk([
            self.create_project_bulk_data(
                type='GIT',
                repository=repo_dir,
                additional_playbook_path='additional_pb_dir'
            ),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertDictEqual(results[0]['data'], {
            **results[0]['data'],
            'type': 'GIT',
            'repository': repo_dir,
            'status': 'NEW',
        })
        project_id = results[0]['data']['id']
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['detail'], f'Sync with {repo_dir}.')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['branch'], 'master')
        self.assertEqual(results[2]['data']['revision'], repo.head.object.hexsha)
        self.assertEqual(results[2]['data']['execute_view_data']['playbooks'], {
            'main.yml': {'title': 'Main playbook', 'help': 'lol_help'},
            'additional_pb_path.yml': {'title': 'additional_pb_path', 'help': ''},
        })
        self.assertDictEqual(results[2]['data']['execute_view_data']['fields']['boolean_field'], {
            'default': False,
            'format': 'boolean',
            'help': '',
            'title': 'boolean field',
            'type': 'boolean'
        })
        self.assertEqual(results[2]['data']['execute_view_data']['fields']['unknown_field']['format'], 'unknown')

        # check that files were cloned
        project_dir = Path(f'{settings.PROJECTS_DIR}/{results[0]["data"]["id"]}')
        self.assertTrue(project_dir.is_dir())
        self.assertTrue(Path(f'{project_dir}/additional_pb_dir').is_dir())
        self.assertTrue(Path(f'{project_dir}/additional_pb_dir/additional_pb_path.yml').is_file())
        self.assertTrue(Path(f'{project_dir}/.polemarch.yaml').is_file())
        self.assertTrue(Path(f'{project_dir}/inventory.ini').is_file())
        self.assertTrue(Path(f'{project_dir}/main.yml').is_file())

        # check old files are removed
        self.assertFalse(Path(f'{project_dir}/some_trash').is_file())

        # check project module
        project_modules = self.get_model_filter('main.Project').get(
            pk=results[0]['data']['id']
        ).ansible_modules.filter(path__startswith='polemarch.project')
        self.assertEqual(project_modules.count(), 2)
        project_module = project_modules[0]
        self.assertEqual(project_module.path, 'polemarch.project.test_module')
        self.assertEqual(project_module.data['short_description'], 'Test module')

        # make a change in master
        with open(f'{repo_dir}/new_lol.yml', 'w') as f:
            f.write('- name: lol\n')
        repo.git.add('new_lol.yml')
        repo.index.commit('Feature: Add new lol')

        # sync again
        results = self.bulk([
            self.sync_project_bulk_data(project_id=project_id),
            self.get_project_bulk_data(project_id=project_id),
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['detail'], f'Sync with {repo_dir}.')
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[1]['data']['branch'], 'master')
        self.assertEqual(results[1]['data']['revision'], repo.head.object.hexsha)
        self.assertTrue(Path(f'{project_dir}/new_lol.yml').is_file())

        # create new branch and make change in it
        repo.git.branch('lol_branch')
        repo.git.checkout('lol_branch')
        with open(f'{repo_dir}/main.yml', 'a') as f:
            f.write('    - name: Another task\n    system.setup:')
        repo.git.add('main.yml')
        repo.index.commit('Feature: Add Another task')
        repo.create_tag('lol_tag')

        # change current branch and sync
        results = self.bulk([
            {  # [0] change branch to not existing one
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'invalid_branch'}
            },
            # [1]
            self.sync_project_bulk_data(project_id=project_id),
            # [2]
            self.get_project_bulk_data(project_id=project_id),
            {  # [3] change branch to existing branch using tag
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'tags/lol_tag'}
            },
            # [4]
            self.sync_project_bulk_data(project_id=project_id),
            # [5]
            self.get_project_bulk_data(project_id=project_id),
            {  # [6] change branch to existing branch using name
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'lol_branch'}
            },
            # [7]
            self.sync_project_bulk_data(project_id=project_id),
            # [8]
            self.get_project_bulk_data(project_id=project_id),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['detail'], f'Sync with {repo_dir}.')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'ERROR')
        self.assertEqual(results[2]['data']['branch'], 'waiting... => invalid_branch')
        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data']['detail'], f'Sync with {repo_dir}.')
        self.assertEqual(results[5]['status'], 200)
        self.assertEqual(results[5]['data']['status'], 'OK')
        self.assertEqual(results[5]['data']['branch'], 'tags/lol_tag')
        self.assertEqual(results[5]['data']['revision'], repo.head.object.hexsha)
        self.assertEqual(results[8]['data']['status'], 'OK')
        self.assertEqual(results[8]['data']['branch'], 'lol_branch')
        self.assertEqual(results[8]['data']['revision'], repo.head.object.hexsha)

        # test invalid git repository
        results = self.bulk_transactional([
            self.create_project_bulk_data(type='GIT', repository=f'{temp_dir}/not_existing_dir'),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertDictEqual(results[2]['data'], {
            **results[2]['data'],
            'status': 'ERROR',
            'revision': 'ERROR',
            'branch': 'waiting...',
        })

        def password_and_key_checker(operation, **kwargs):
            password_file = kwargs.get('GIT_ASKPASS')
            ssh_command = kwargs.get('GIT_SSH_COMMAND')
            if password_file is not None:
                saved_pass = Path(password_file).read_text()
                self.assertIn("echo 'lol_password'", saved_pass)
            elif ssh_command is not None:
                self.assertIn('ssh -vT -i', ssh_command)
                self.assertIn('PubkeyAuthentication=yes', ssh_command)
                key_file = ssh_command.split(' ')[3]
                saved_key = Path(key_file).read_text()
                self.assertIn('lol_key', saved_key)
            else:
                raise AssertionError('no password or key provided.')
            return operation(kwargs)

        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.repo._base._Base._operate',
            side_effect=password_and_key_checker
        ) as checker:
            checker.assert_not_called()
            # test sync if password is set
            results = self.bulk_transactional([
                self.create_project_variable_bulk_data('repo_password', 'lol_password', project_id=project_id),
                self.sync_project_bulk_data(project_id=project_id),
                # [2] check project after sync
                self.get_project_bulk_data(project_id=project_id),
                self.create_project_variable_bulk_data('repo_sync_on_run', True, project_id=project_id),
                self.execute_plugin_bulk_data(
                    project_id=project_id,
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory='localhost,',
                    connection='local'
                ),
                # [5] check history after run with repo_sync_on_run
                self.get_history_bulk_data('<<4[data][history_id]>>'),
                # [6]
                self.get_raw_history_bulk_data('<<4[data][history_id]>>'),
            ])
            self.assertEqual(results[2]['data']['status'], 'OK')
            self.assertEqual(results[5]['data']['status'], 'OK')
            self.assertIn('SUCCESS =>', results[6]['data']['detail'])
            self.get_model_filter('main.Variable').filter(key='repo_password').delete()
            self.assertEqual(checker.call_count, 3)
            checker.reset_mock()

            # test sync if key is set
            checker.assert_not_called()
            results = self.bulk([
                self.create_project_variable_bulk_data('repo_key', 'lol_key', project_id=project_id),
                self.sync_project_bulk_data(project_id=project_id),
                # [2] check project after sync
                self.get_project_bulk_data(project_id=project_id),
                self.execute_plugin_bulk_data(
                    project_id=project_id,
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory='localhost,',
                    connection='local'
                ),
                # [4] check history after run with repo_sync_on_run
                self.get_history_bulk_data('<<3[data][history_id]>>'),
                # [5]
                self.get_raw_history_bulk_data('<<3[data][history_id]>>'),
            ])
            self.assertEqual(results[2]['data']['status'], 'OK')
            self.assertEqual(results[4]['data']['status'], 'OK')
            self.assertIn('SUCCESS =>', results[5]['data']['detail'])
            self.assertEqual(checker.call_count, 3)

    @override_settings(CACHES={
        **settings.CACHES,
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'test_sync_after_repo_change',
        },
    })
    @use_temp_dir
    def test_sync_after_repo_change(self, temp_dir):
        def create_repo(num):
            repo_dir = Path(temp_dir) / f'repo{num}'
            repo_dir.mkdir()
            (repo_dir / f'playbook{num}.yml').touch()
            (repo_dir / '.polemarch.yaml').write_text(
                'view:\n'
                '   fields: {}\n'
                '   playbooks:\n'
                f'       playbook{num}.yml:\n'
                '           title: Test deploy\n'
            )
            repo = git.Repo.init(repo_dir)
            repo.git.add(all=True)
            repo.index.commit('Initial commit')
            return repo

        repo1 = create_repo(1)
        repo1.create_head('init_branch')
        results = self.bulk([
            # [0] Create project
            self.create_project_bulk_data(type='GIT', repository=repo1.working_dir, branch='init_branch'),
            # [1] Sync project
            self.sync_project_bulk_data('<<0[data][id]>>'),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data('<<0[data][id]>>'),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', '<<0[data][id]>>', 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['revision'], repo1.head.commit.hexsha)
        self.assertIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('new_playbook', (playbook['name'] for playbook in results[3]['data']['results']))

        project_id = results[0]['data']['id']

        repo_in_project = git.Repo(Path(settings.PROJECTS_DIR) / str(project_id))
        # Create remote to track when project will be removed and recreated
        repo_in_project.create_remote('TEST_REMOTE', 'url')
        self.assertEqual(repo_in_project.active_branch.name, 'init_branch')

        # Create branch changed_branch and commit 'new_playbook.yml'
        repo1.create_head('changed_branch').checkout()
        (Path(repo1.working_dir) / 'new_playbook.yml').touch()
        repo1.git.add(all=True)
        repo1.index.commit('Second commit')

        # Set project branch to changed_branch
        results = self.bulk([
            # [0] Update project branch
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'changed_branch'},
            },
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['revision'], repo1.heads.changed_branch.commit.hexsha)
        self.assertIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('new_playbook', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('TEST_REMOTE', repo_in_project.remotes)

        # Create new commit in init_branch with init_branch_playbook.yml
        repo1.heads.init_branch.checkout()
        (Path(repo1.working_dir) / 'init_branch_playbook.yml').touch()
        repo1.git.add(all=True)
        repo1.index.commit('Add playbook to init_branch')

        # Remove current active branch
        repo1.delete_head(repo1.heads.changed_branch, force=True)

        results = self.bulk([
            # [0] Select init_branch as current branch
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'init_branch'},
            },
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['revision'], repo1.heads.init_branch.commit.hexsha)
        self.assertIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('init_branch_playbook', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('TEST_REMOTE', repo_in_project.remotes)

        # Move original repository to new location
        new_location = Path(repo1.working_dir).with_name('new_location')
        shutil.move(repo1.working_dir, new_location)
        repo1 = git.Repo(new_location)

        # Set project repository to new location
        results = self.bulk([
            # [0] Update project repository
            {'method': 'patch', 'path': ['project', project_id], 'data': {'repository': str(new_location)}},
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['revision'], repo1.heads.init_branch.commit.hexsha)
        self.assertIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('init_branch_playbook', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('TEST_REMOTE', repo_in_project.remotes)

        # Create second repository
        repo2 = create_repo(2)
        repo2.create_tag('without_repo2_new_playbook')
        (Path(repo2.working_dir) / 'repo2_new_playbook.yml').touch()
        repo2.git.add(all=True)
        repo2.index.commit('Add repo2_new_playbook')

        # Set project repository to repo2 but selected branch does not exist
        results = self.bulk([
            # [0] Update project repository
            {'method': 'patch', 'path': ['project', project_id], 'data': {'repository': repo2.working_dir}},
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'ERROR')
        self.assertEqual(results[2]['data']['revision'], 'ERROR')
        self.assertIsNone(results[2]['data']['execute_view_data'])
        self.assertIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('TEST_REMOTE', repo_in_project.remotes)

        # Select branch that does exist in repo2
        results = self.bulk([
            # [0] Select existing as current branch
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': repo2.active_branch.name},
            },
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['revision'], repo2.active_branch.commit.hexsha)
        self.assertNotIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('repo2_new_playbook', (playbook['name'] for playbook in results[3]['data']['results']))

        repo_in_project.create_remote('TEST_REMOTE', 'url')

        results = self.bulk([
            # [0] Select tag
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'tags/without_repo2_new_playbook'},
            },
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['revision'], repo2.tags['without_repo2_new_playbook'].commit.hexsha)
        self.assertEqual(results[2]['data']['branch'], 'tags/without_repo2_new_playbook')
        self.assertNotIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('repo2_new_playbook', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('TEST_REMOTE', repo_in_project.remotes)

        results = self.bulk([
            # [0] Select commit
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': repo2.active_branch.commit.hexsha},
            },
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['revision'], repo2.active_branch.commit.hexsha)
        self.assertEqual(results[2]['data']['branch'], repo2.active_branch.commit.hexsha)
        self.assertNotIn('playbook1.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook2.yml', results[2]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook1', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('repo2_new_playbook', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertIn('TEST_REMOTE', repo_in_project.remotes)

        # Create new repo and tag commit
        repo3 = create_repo(3)
        (Path(repo3.working_dir) / 'repo_3_playbook.yml').touch()
        repo3.git.add(all=True)
        repo3.index.commit('repo3 commit')
        repo3.create_tag('repo3_tag')

        # Set project repository to repo3 and branch to repo3_tag
        results = self.bulk([
            # [0] Update project repository
            {'method': 'patch', 'path': ['project', project_id], 'data': {'repository': repo3.working_dir}},
            # [1] Select tag as current branch
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_branch', 'value': 'tags/repo3_tag'},
            },
            # [2] Sync project
            self.sync_project_bulk_data(project_id),
            # [3] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [4] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[3]['data']['revision'], repo3.active_branch.commit.hexsha)
        self.assertIn('playbook3.yml', results[3]['data']['execute_view_data']['playbooks'])
        self.assertNotIn('playbook2.yml', results[3]['data']['execute_view_data']['playbooks'])
        self.assertIn('playbook3', (playbook['name'] for playbook in results[4]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[4]['data']['results']))

        # Set project repository to repo2 that does not have selected tag
        results = self.bulk([
            # [0] Update project repository
            {'method': 'patch', 'path': ['project', project_id], 'data': {'repository': repo2.working_dir}},
            # [1] Sync project
            self.sync_project_bulk_data(project_id),
            # [2] Get project detail to check revision and execute_view_data
            self.get_project_bulk_data(project_id),
            # [3] Get project playbooks
            {'method': 'get', 'path': ['project', project_id, 'ansible_playbooks']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'ERROR')
        self.assertEqual(results[2]['data']['revision'], 'ERROR')
        self.assertIsNone(results[2]['data']['execute_view_data'])
        self.assertIn('playbook3', (playbook['name'] for playbook in results[3]['data']['results']))
        self.assertNotIn('playbook2', (playbook['name'] for playbook in results[3]['data']['results']))

    def test_sync_tar(self):
        class MockHandler(BaseHTTPRequestHandler):
            def do_GET(self, *args, **kwargs):
                self.send_response(200)
                self.send_header('Content-Type', 'application/gzip')
                self.send_header('Content-Length', '700')
                self.end_headers()
                self.wfile.write((Path(TEST_DATA_DIR) / 'repo.tar.gz').read_bytes())

        with MockServer(MockHandler) as server:
            # create folder - while sync it must be replaced
            shutil.rmtree(settings.PROJECTS_DIR)
            os.mkdir(settings.PROJECTS_DIR)
            next_project_id = self.get_model_class('main.Project').objects.order_by('-id').values_list(
                'id',
                flat=True
            ).last() + 1
            os.mkdir(f'{settings.PROJECTS_DIR}/{next_project_id}')
            with open(f'{settings.PROJECTS_DIR}/{next_project_id}/some_trash', 'w') as f:
                f.write('lol')

            remote = f'http://localhost:{server.server_port}/'

            results = self.bulk([
                self.create_project_bulk_data(type='TAR', repository=remote),
                self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                self.get_project_bulk_data(project_id='<<0[data][id]>>'),
                # update
                self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                self.get_project_bulk_data(project_id='<<0[data][id]>>'),
            ])

            self.assertEqual(results[0]['status'], 201)
            self.assertDictEqual(results[0]['data'], {
                **results[0]['data'],
                'type': 'TAR',
                'repository': remote,
                'status': 'NEW',
                'branch': 'NO VCS',
            })
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['detail'], f'Sync with {remote}.')
            self.assertEqual(results[2]['status'], 200)
            self.assertEqual(results[2]['data']['status'], 'OK')
            self.assertEqual(results[2]['data']['branch'], 'NO VCS')
            self.assertEqual(results[3]['status'], 200)
            self.assertEqual(results[3]['data']['detail'], f'Sync with {remote}.')
            self.assertEqual(results[4]['status'], 200)
            self.assertEqual(results[4]['data']['status'], 'OK')
            self.assertEqual(results[4]['data']['branch'], 'NO VCS')

            # check that files were cloned
            project_dir = Path(f'{settings.PROJECTS_DIR}/{results[0]["data"]["id"]}')
            self.assertTrue(project_dir.is_dir())
            self.assertTrue(Path(f'{project_dir}/additional_pb_dir').is_dir())
            self.assertTrue(Path(f'{project_dir}/additional_pb_dir/additional_pb_path.yml').is_file())
            self.assertTrue(Path(f'{project_dir}/inventory.ini').is_file())
            self.assertTrue(Path(f'{project_dir}/.polemarch.yaml').is_file())
            self.assertTrue(Path(f'{project_dir}/main.yml').is_file())

            # check old files are removed
            self.assertFalse(Path(f'{project_dir}/some_trash').is_file())

            with self.patch('shutil.move', side_effect=IOError):
                results = self.bulk([
                    self.create_project_bulk_data(type='TAR', repository=remote),
                    self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                    self.get_project_bulk_data(project_id='<<0[data][id]>>'),
                ])
                self.assertEqual(results[1]['status'], 200)
                self.assertEqual(results[1]['data']['detail'], f'Sync with {remote}.')
                self.assertEqual(results[2]['status'], 200)
                self.assertEqual(results[2]['data']['status'], 'OK')
                self.assertEqual(results[2]['data']['branch'], 'NO VCS')
                self.assertEqual(results[2]['data']['revision'], 'NO VCS')

            # check if file too big
            patched_settings = settings.REPO_BACKENDS
            patched_settings['TAR']['OPTIONS']['max_content_length'] = 500
            with override_settings(REPO_BACKENDS=patched_settings):
                results = self.bulk_transactional([
                    self.create_project_bulk_data(type='TAR', repository=remote),
                    self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                    self.get_project_bulk_data(project_id='<<0[data][id]>>'),
                ])
                self.assertEqual(results[1]['data']['detail'], f'Sync with {remote}.')
                self.assertEqual(results[2]['data']['status'], 'ERROR')
                self.assertEqual(results[2]['data']['branch'], 'NO VCS')
                self.assertEqual(results[2]['data']['revision'], 'NO VCS')

        class MockHandler(BaseHTTPRequestHandler):
            def do_GET(self, *args, **kwargs):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()

        with MockServer(MockHandler) as server:
            remote = f'http://localhost:{server.server_port}'
            results = self.bulk([
                self.create_project_bulk_data(type='TAR', repository=remote),
                self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                self.get_project_bulk_data(project_id='<<0[data][id]>>'),
            ])
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['detail'], f'Sync with {remote}.')
            self.assertEqual(results[2]['status'], 200)
            self.assertEqual(results[2]['data']['status'], 'ERROR')
            self.assertEqual(results[2]['data']['branch'], 'NO VCS')

        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.repo._base._ArchiveRepo._download',
            side_effect=lambda *args, **kwargs: io.BytesIO(b'invalid')
        ):
            results = self.bulk([
                self.create_project_bulk_data(type='TAR', repository='http://localhost:8000/invalid_repo.tar.gz'),
                self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                self.get_project_bulk_data(project_id='<<0[data][id]>>'),
            ])
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['detail'], 'Sync with http://localhost:8000/invalid_repo.tar.gz.')
            self.assertEqual(results[2]['status'], 200)
            self.assertEqual(results[2]['data']['status'], 'ERROR')
            self.assertEqual(results[2]['data']['branch'], 'NO VCS')

    def test_invalid_repo_operation(self):
        result = self.project.start_repo_task('push')
        self.assertEqual(result.status, 'FAILURE')
        self.assertEqual(result.info.msg, 'Unknown operation push.')

    @use_temp_dir
    def test_change_project_type_to_git(self, temp_dir):
        # create manual project
        results = self.bulk_transactional([
            self.create_project_bulk_data(),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[2]['data']['status'], 'OK')
        project_id = results[0]['data']['id']

        repo = git.Repo.init(temp_dir, bare=True)

        # change project type to git
        results = self.bulk([
            {  # [0] change repo_type
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_type', 'value': 'GIT'}
            },
            {  # [1] add repository to project
                'method': 'patch',
                'path': ['project', project_id],
                'data': {'repository': temp_dir},
            },
            # [2]
            self.sync_project_bulk_data(project_id=project_id),
            # [3]
            self.get_project_bulk_data(project_id=project_id)
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['status'], 200)

        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['status'], 'OK')
        self.assertEqual(results[3]['data']['branch'], 'master')
        # known problem: sometimes it fails
        self.assertEqual(repo.head.commit.summary, 'Create project from Polemarch.')

    def test_readme(self):
        results = self.bulk([
            self.create_project_bulk_data(),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        project_id = results[0]['data']['id']

        # create md readme in project directory
        with open(f'{settings.PROJECTS_DIR}/{project_id}/README.md', 'w') as f:
            f.write("# test README.md \n **bold** \n *italic* \n")
        results = self.bulk([
            self.sync_project_bulk_data(project_id=project_id),
            self.get_project_bulk_data(project_id=project_id),
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(
            results[1]['data']['readme_content'],
            '<h1 id="test-readmemd">test README.md</h1>\n\n<p><strong>bold</strong> \n <em>italic</em> </p>\n'
        )

        # create rst readme in project directory
        with open(f'{settings.PROJECTS_DIR}/{project_id}/README.rst', 'w') as f:
            f.write("test README.rst \n **bold** \n *italic* \n")
        results = self.bulk([
            self.sync_project_bulk_data(project_id=project_id),
            self.get_project_bulk_data(project_id=project_id),
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(
            results[1]['data']['readme_content'],
            '<div class="document">\n<dl class="docutils">\n<dt>'
            'test README.rst</dt>\n<dd><strong>bold</strong>\n'
            '<em>italic</em></dd>\n</dl>\n</div>\n'
        )

    @use_temp_dir
    def test_community_templates(self, temp_dir):
        repo_dir = f'{temp_dir}/repo'
        shutil.copytree(f'{TEST_DATA_DIR}/repo', repo_dir)
        repo = git.Repo.init(repo_dir)
        repo.git.add(all=True)
        repo.index.commit('Initial commit')
        project_templates = (TEST_DATA_DIR / 'projects.yaml').read_text() % {'repo_url': repo_dir}

        class MockHandler(BaseHTTPRequestHandler):
            def do_GET(self, *args, **kwargs):
                self.send_response(200)
                self.send_header('Content-Type', 'application/yaml')
                self.end_headers()
                self.wfile.write(project_templates.encode())

        with MockServer(MockHandler) as server:
            with override_settings(COMMUNITY_REPOS_URL=f'http://localhost:{server.server_port}'):
                results = self.bulk_transactional([
                    # [0] get possible templates
                    {'method': 'get', 'path': 'community_template'},
                    # [1] use TestProject template (see test_data/projects.yaml)
                    {
                        'method': 'post',
                        'path': ['community_template', '<<0[data][results][0][id]>>', 'use_it'],
                        'data': {'name': 'lol-name'}
                    },
                    # [2] check created project
                    self.get_project_bulk_data(project_id='<<1[data][project_id]>>'),
                    # [3] sync project
                    self.sync_project_bulk_data(project_id='<<1[data][project_id]>>'),
                    # [4] check created project
                    self.get_project_bulk_data(project_id='<<1[data][project_id]>>'),
                    # [5] execute template playbook
                    self.execute_plugin_bulk_data(
                        plugin='ANSIBLE_PLAYBOOK',
                        playbook='main.yml',
                        project_id='<<1[data][project_id]>>',
                    ),
                    # [6] check execution
                    self.get_history_bulk_data('<<5[data][history_id]>>'),
                ])

        project = self.get_model_filter('main.Project').get(id=results[1]['data']['project_id'])

        self.assertTrue((Path(project.path) / 'main.yml').is_file())
        self.assertTrue((Path(project.path) / '.polemarch.yaml').is_file())
        self.assertTrue((Path(project.path) / 'ansible.cfg').is_file())
        self.assertTrue((Path(project.path) / 'inventory.ini').is_file())
        self.assertTrue((Path(project.path) / 'additional_pb_dir' / 'additional_pb_path.yml').is_file())

        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[0]['data']['results'][0]['name'], 'TestProject')
        self.assertEqual(results[1]['data']['name'], 'lol-name')
        self.assertEqual(results[2]['data']['name'], 'lol-name')
        self.assertEqual(results[2]['data']['status'], 'NEW')
        self.assertEqual(results[2]['data']['repository'], repo_dir)
        self.assertEqual(results[4]['data']['status'], 'OK')
        self.assertEqual(results[6]['data']['kind'], 'ANSIBLE_PLAYBOOK')
        self.assertEqual(results[6]['data']['status'], 'OK', results[6])

        # check execution templates
        results = self.bulk_transactional([
            # [0]
            {
                'method': 'get',
                'path': ['project', project.id, 'execution_templates']
            },
            # [1]
            {
                'method': 'get',
                'path': ['project', project.id, 'execution_templates', '<<0[data][results][0][id]>>', 'options']
            },
            # [2]
            {
                'method': 'get',
                'path': ['project', project.id, 'execution_templates', '<<0[data][results][1][id]>>', 'options']
            },
            # [3]
            {
                'method': 'get',
                'path': ['project', project.id, 'execution_templates', '<<0[data][results][2][id]>>', 'options']
            },
        ])
        self.assertEqual(results[0]['data']['count'], 3)
        self.assertEqual(results[0]['data']['results'][0]['name'], 'deprecated_module')
        self.assertEqual(results[0]['data']['results'][0]['plugin'], 'ANSIBLE_MODULE')
        self.assertEqual(results[0]['data']['results'][1]['name'], 'deprecated_playbook')
        self.assertEqual(results[0]['data']['results'][1]['plugin'], 'ANSIBLE_PLAYBOOK')
        self.assertEqual(results[0]['data']['results'][2]['name'], 'actual_format')
        self.assertEqual(results[0]['data']['results'][2]['plugin'], 'TEST_ECHO')

        self.assertEqual(results[1]['data']['count'], 2)
        self.assertEqual(results[1]['data']['results'][0]['name'], 'default')
        self.assertEqual(results[1]['data']['results'][1]['name'], 'uptime')

        self.assertEqual(results[2]['data']['count'], 2)
        self.assertEqual(results[2]['data']['results'][0]['name'], 'default')
        self.assertEqual(results[2]['data']['results'][1]['name'], 'update')

        self.assertEqual(results[3]['data']['count'], 2)
        self.assertEqual(results[3]['data']['results'][0]['name'], 'first')
        self.assertEqual(results[3]['data']['results'][1]['name'], 'second')

        deprecated_module_template_id = results[0]['data']['results'][0]['id']
        deprecated_playbook_template_id = results[0]['data']['results'][1]['id']
        actual_format_template_id = results[0]['data']['results'][2]['id']

        # check execution
        results = self.bulk_transactional([
            self.execute_template_bulk_data(
                project_id=project.id,
                template_id=deprecated_module_template_id,
                option_id=results[1]['data']['results'][0]['id'],
                via_option=True,
            ),
            self.execute_template_bulk_data(
                project_id=project.id,
                template_id=deprecated_playbook_template_id,
                option_id=results[2]['data']['results'][1]['id'],
                via_option=True,
            ),
            self.execute_template_bulk_data(
                project_id=project.id,
                template_id=actual_format_template_id,
                option_id=results[3]['data']['results'][1]['id'],
                via_option=True,
            ),
        ])

    @use_temp_dir
    def test_repo_sync_on_run_for_manual_project(self, temp_dir):
        results = self.bulk_transactional([
            self.create_project_bulk_data(),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.create_project_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[-1]['data']['status'], 'OK')
        self.assertEqual(results[-1]['data']['branch'], 'NO VCS')
        self.assertEqual(results[-1]['data']['revision'], 'NO VCS')
        project_id = results[-1]['data']['id']

        project = self.get_model_filter('main.Project').get(id=project_id)
        shutil.copy(TEST_DATA_DIR / 'playbook.yml', project.path)

        mock_dir = Path(temp_dir) / 'project'
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.models.utils.PluginExecutor.create_execution_dir',
            return_value=mock_dir,
        ), self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.models.utils.PluginExecutor.__del__',
            return_value=None,
        ):
            results = self.bulk_transactional([
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    project_id=project_id,
                    playbook='playbook.yml',
                ),
                self.get_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[1]['data']['status'], 'OK')
            self.assertEqual(results[1]['data']['revision'], 'NO VCS')

            self.assertTrue((mock_dir / 'ansible.cfg').is_file())
            self.assertTrue((mock_dir / 'bootstrap.yml').is_file())
            self.assertTrue((mock_dir / 'playbook.yml').is_file())

    @use_temp_dir
    def test_repo_sync_on_run_for_git_project(self, temp_dir):
        repo_dir = f'{temp_dir}/repo'
        shutil.copytree(f'{TEST_DATA_DIR}/repo', repo_dir)

        repo = git.Repo.init(repo_dir)

        # create submodules
        submodule_dir = f'{temp_dir}/submodule'
        os.mkdir(submodule_dir)
        shutil.copy(f'{TEST_DATA_DIR}/test_module.py', f'{submodule_dir}/test_module.py')
        submodule = git.Repo.init(submodule_dir)
        submodule.git.add('test_module.py')
        submodule.index.commit('Add module')
        submodule.git.set_persistent_git_options(c='protocol.file.allow=always')
        repo.git.set_persistent_git_options(c='protocol.file.allow=always')
        repo.git.submodule('add', '../submodule/.git', 'lib')
        repo.git.submodule('add', f'{submodule_dir}/.git', 'lib2')

        repo.git.add(all=True)
        repo.index.commit('Initial commit')
        revision0 = repo.head.commit.hexsha

        results = self.bulk_transactional([
            self.create_project_bulk_data(
                type='GIT',
                repository=repo_dir,
                additional_playbook_path='additional_pb_dir'
            ),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.create_project_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[-1]['data']['status'], 'OK')
        self.assertEqual(results[-1]['data']['branch'], 'master')
        self.assertEqual(results[-1]['data']['revision'], revision0)
        project_id = results[-1]['data']['id']

        # make changes in remote after sync to check that with
        # repo_sync_on_run clone uses remote repo
        repo.git.branch('lol_branch')
        repo.git.checkout('lol_branch')
        with open(f'{repo_dir}/main.yml', 'a') as f:
            f.write('    - name: Another task\n    system.setup:')
        repo.git.add('main.yml')
        repo.index.commit('Feature: Add Another task')
        revision1 = repo.head.commit.hexsha

        repo.create_tag('lol_tag')
        repo.git.checkout('master')

        def check_execution(revision, no_assert=False):
            results = self.bulk_transactional([
                self.create_project_variable_bulk_data('repo_branch', revision, project_id),
                self.execute_plugin_bulk_data(
                    project_id=project_id,
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory='localhost,',
                    connection='local',
                ),
                self.get_history_bulk_data('<<1[data][history_id]>>'),
                self.get_project_bulk_data(project_id)
            ])
            if not no_assert:
                # history
                self.assertEqual(results[-2]['data']['status'], 'OK')
                # project
                self.assertEqual(results[-1]['data']['revision'], revision0)
                self.assertEqual(results[-1]['data']['status'], 'OK')

            return results

        check_execution('master')
        check_execution('lol_branch')
        check_execution('tags/lol_tag')
        check_execution(revision1)

        results = check_execution('invalid', no_assert=True)
        self.assertEqual(results[-2]['data']['status'], 'ERROR')
        self.assertEqual(results[-1]['data']['revision'], revision0)
        self.assertEqual(results[-1]['data']['status'], 'OK')

        # check that with repo_sync_on_run=False execution uses project's revision
        results = self.bulk_transactional([
            self.create_project_variable_bulk_data('repo_branch', 'master', project_id),
            self.sync_project_bulk_data(project_id),
            self.create_project_variable_bulk_data('repo_branch', 'invalid', project_id),
            self.create_project_variable_bulk_data('repo_sync_on_run', False, project_id),
            self.execute_plugin_bulk_data(
                project_id=project_id,
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory='localhost,',
                connection='local',
            ),
            self.get_history_bulk_data('<<4[data][history_id]>>'),
            self.get_project_bulk_data(project_id)
        ])
        self.assertEqual(results[-2]['data']['status'], 'OK')
        self.assertEqual(results[-1]['data']['revision'], revision0)
        self.assertEqual(results[-1]['data']['status'], 'OK')

    def test_repo_sync_on_run_for_tar_project(self):
        with open(str(TEST_DATA_DIR / 'repo.tar.gz'), 'rb') as targz:
            bts = targz.read()
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.repo._base._ArchiveRepo._download',
            side_effect=lambda *args, **kwargs: io.BytesIO(bts)
        ):
            results = self.bulk_transactional([
                self.create_project_bulk_data(type='TAR', repository='http://localhost:8000/repo.tar.gz'),
                self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
                self.create_project_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    project_id='<<0[data][id]>>',
                    playbook='main.yml',
                ),
                self.get_history_bulk_data('<<3[data][history_id]>>'),
            ])
            self.assertEqual(results[-1]['data']['status'], 'OK')
            self.assertEqual(results[-1]['data']['revision'], 'NO VCS')
            project_id = results[0]['data']['id']

        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.repo._base._ArchiveRepo._download',
            side_effect=lambda *args, **kwargs: io.BytesIO(b'invalid')
        ):
            results = self.bulk_transactional([
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    project_id=project_id,
                    playbook='main.yml'
                ),
                self.get_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[-1]['data']['status'], 'ERROR')
            self.assertIsNone(results[-1]['data']['revision'])

            # check that with repo_sync_on_run=False project will be copied
            results = self.bulk_transactional([
                self.create_project_variable_bulk_data('repo_sync_on_run', False, project_id=project_id),
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    project_id=project_id,
                    playbook='main.yml'
                ),
                self.get_history_bulk_data('<<1[data][history_id]>>'),
            ])
            self.assertEqual(results[-1]['data']['status'], 'OK')
            self.assertEqual(results[-1]['data']['revision'], 'NO VCS')

    @use_temp_dir
    def test_repo_sync_on_run_timeout(self, temp_dir):
        # up the mock server which will sleep on response
        class MockHandler(BaseHTTPRequestHandler):
            def do_GET(self, *args, **kwargs):
                time.sleep(1.1)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()

        with MockServer(MockHandler) as server:
            remote = f'http://localhost:{server.server_port}/'

            # git
            repo_dir = f'{temp_dir}/git_repo'
            shutil.copytree(f'{TEST_DATA_DIR}/repo', repo_dir)

            repo = git.Repo.init(repo_dir)

            # create submodules
            submodule_dir = f'{temp_dir}/submodule'
            os.mkdir(submodule_dir)
            shutil.copy(f'{TEST_DATA_DIR}/test_module.py', f'{submodule_dir}/test_module.py')
            submodule = git.Repo.init(submodule_dir)
            submodule.git.add('test_module.py')
            submodule.index.commit('Add module')
            submodule.git.set_persistent_git_options(c='protocol.file.allow=always')
            repo.git.set_persistent_git_options(c='protocol.file.allow=always')
            repo.git.submodule('add', '../submodule/.git', 'lib')
            repo.git.submodule('add', f'{submodule_dir}/.git', 'lib2')

            repo.git.add(all=True)
            repo.index.commit('Initial commit')

            results = self.bulk_transactional([
                self.create_project_bulk_data(type='GIT', repository=repo_dir),
                self.sync_project_bulk_data('<<0[data][id]>>'),
                self.create_project_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
            ])
            project_id = results[0]['data']['id']

            results = self.bulk_transactional([
                {
                    'method': 'patch',
                    'path': ['project', project_id],
                    'data': {'repository': remote}
                },
                self.create_project_variable_bulk_data('repo_sync_on_run_timeout', 1, project_id),
                self.execute_plugin_bulk_data(
                    project_id=project_id,
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory='localhost,',
                    connection='local',
                ),
                self.get_history_bulk_data('<<2[data][history_id]>>'),
                self.get_raw_history_bulk_data('<<2[data][history_id]>>'),
                {
                    "method": "get",
                    'path': ['project', project_id, 'history', '<<2[data][history_id]>>', 'lines'],
                }
            ])

            self.assertEqual(results[3]['data']['status'], 'ERROR')
            self.assertEqual(results[4]['data']['detail'], 'Sync error: timeout exceeded.')

            # test submodules timeout
            (Path(repo_dir) / '.gitmodules').write_text(f"""
                [submodule "lib"]
                    path = lib
                    url = {remote}.git
            """.strip())
            repo.git.add('.gitmodules')
            repo.index.commit('BREAKING CHANGE! Broke submodules.')

            results = self.bulk_transactional([
                {
                    'method': 'patch',
                    'path': ['project', project_id],
                    'data': {'repository': repo_dir}
                },
                self.execute_plugin_bulk_data(
                    project_id=project_id,
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory='localhost,',
                    connection='local',
                ),
                self.get_history_bulk_data('<<1[data][history_id]>>'),
                self.get_raw_history_bulk_data('<<1[data][history_id]>>'),
            ])

            self.assertEqual(results[2]['data']['status'], 'ERROR')
            self.assertEqual(results[3]['data']['detail'], 'Sync error: timeout exceeded.')

            # tar
            with open(str(TEST_DATA_DIR / 'repo.tar.gz'), 'rb') as targz:
                bts = targz.read()
            with self.patch(
                f'{settings.VST_PROJECT_LIB_NAME}.main.repo._base._ArchiveRepo._download',
                side_effect=lambda *args, **kwargs: io.BytesIO(bts)
            ):
                results = self.bulk_transactional([
                    self.create_project_bulk_data(type='TAR', repository='http://localhost:8000/repo.tar.gz'),
                    self.sync_project_bulk_data('<<0[data][id]>>'),
                    self.create_project_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
                    self.get_project_bulk_data('<<0[data][id]>>'),
                ])
                project_id = results[0]['data']['id']
                self.assertEqual(results[-1]['data']['status'], 'OK')

            results = self.bulk_transactional([
                {
                    'method': 'patch',
                    'path': ['project', project_id],
                    'data': {'repository': remote}
                },
                self.create_project_variable_bulk_data('repo_sync_on_run_timeout', 1, project_id),
                self.execute_plugin_bulk_data(
                    project_id=project_id,
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory='localhost,',
                    connection='local',
                ),
                self.get_history_bulk_data('<<2[data][history_id]>>'),
                self.get_raw_history_bulk_data('<<2[data][history_id]>>'),
            ])

            self.assertEqual(results[3]['data']['status'], 'ERROR')
            self.assertEqual(results[4]['data']['detail'], 'Sync error: timeout exceeded.')

    def test_ci_template(self):
        # test cannot set not existing option
        with self.assertRaises(ValidationError):
            self.project.vars = {'ci_template': str(uuid1())}

        # check that cannot set option from other project's template
        results = self.bulk_transactional([
            self.create_project_bulk_data(),
            self.create_template_bulk_data('<<0[data][id]>>'),
        ])
        option_id = self.get_default_template_option(template_id=results[1]['data']['id']).id
        with self.assertRaises(ValidationError):
            self.project.vars = {'ci_template': str(option_id)}

        results = self.bulk_transactional([
            # [0] setup execution template
            self.create_template_bulk_data(name='test_template', arguments={
                'module': 'system.ping',
                'inventory': self.inventory.id,
                'private_key': 'path/to/key',
            }),
        ])
        template_id = results[0]['data']['id']
        option_id = self.get_default_template_option(template_id).id
        self.get_model_filter('main.History').all().delete()

        # check _project_template_options endpoint
        results = self.bulk_transactional([
            {'method': 'get', 'path': ['project', self.project.id, '_project_template_options']},
        ])
        self.assertEqual(results[0]['data']['count'], 2)
        self.assertEqual(results[0]['data']['results'][0]['extended_name'], 'default_template (default_option)')
        self.assertEqual(results[0]['data']['results'][1]['extended_name'], 'test_template (default)')

        # basic workflow
        results = self.bulk_transactional([
            # [0] set ci_template variable
            self.create_project_variable_bulk_data('ci_template', str(option_id)),
            # [1] sync
            self.sync_project_bulk_data(),
            # [2] check history list
            {'method': 'get', 'path': 'history'},
            # [3] check history detail
            self.get_history_bulk_data('<<2[data][results][0][id]>>'),
        ])
        self.assertEqual(results[2]['data']['count'], 1)
        self.assertEqual(results[3]['data']['status'], 'OK')
        self.assertEqual(results[3]['data']['kind'], 'ANSIBLE_MODULE')
        self.assertEqual(results[3]['data']['mode'], 'system.ping')
        self.assertEqual(results[3]['data']['initiator_type'], 'template')
        ci_var_id = results[0]['data']['id']

        # test cannot delete option if ci_template exists
        results = self.bulk([
            {
                'method': 'delete',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    template_id,
                    'options',
                    str(option_id),
                ]
            },
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(
            results[0]['data']['detail']['other_errors'],
            [f"Cannot delete option {option_id} because it's used by project as CI template."],
        )

        # test cannot set repo_sync_on_run if ci_template set
        results = self.bulk([
            self.create_project_variable_bulk_data('repo_sync_on_run', True),
            self.create_project_variable_bulk_data('repo_sync_on_run_timeout', 12),
        ])
        for result in results:
            self.assertEqual(result['status'], 409)
            self.assertEqual(
                result['data']['detail'],
                'Couldn\'t set "repo_sync_on_run" setting for CI/CD project.'
            )

        # test cannot set ci_template if repo_sync_on_run set
        results = self.bulk([
            {
                'method': 'delete',
                'path': ['project', self.project.id, 'variables', ci_var_id]
            },
            self.create_project_variable_bulk_data('repo_sync_on_run', True),
            self.create_project_variable_bulk_data('ci_template', str(option_id)),
        ])
        self.assertEqual(results[0]['status'], 204)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 409)
        self.assertEqual(
            results[2]['data']['detail'],
            'Couldn\'t set CI/CD to project with "repo_sync_on_run" setting.'
        )


@own_projects_dir
class TemplatePeriodicTaskTestCase(BaseProjectTestCase):
    def test_periodic_task(self):
        # check correct data
        results = self.bulk_transactional([
            # [0]
            self.create_template_periodic_task_bulk_data(enabled=True),
            # [1]
            self.create_template_periodic_task_bulk_data(type='CRONTAB', schedule='* */2 1-15 * 0,5'),
            # [2]
            self.create_template_periodic_task_bulk_data(type='CRONTAB', schedule='30 */4'),
        ])
        task_id = results[0]['data']['id']

        # check wrong data
        results = self.bulk([
            self.create_template_periodic_task_bulk_data(type='CRONTAB', schedule='* l o l *'),
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(results[0]['data']['schedule'], ['Invalid hour range. Valid choices in 0-23 range.'])

        # check signal validation
        with self.assertRaises(ValidationError):
            self.get_model_filter('main.TemplatePeriodicTask').create(
                name='invalid',
                type='CRONTAB',
                schedule='invalid',
            )

        # emulate execute by scheduler
        ScheduledTask.delay(task_id)
        results = self.bulk_transactional([
            # [0] check that with save_result=True it creates history
            {
                'method': 'get',
                'path': 'history',
                'query': 'ordering=-id'
            },
            # [1] make save_result=False and check than that history not being created
            {
                'method': 'patch',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    self.template.id,
                    'options',
                    str(self.template_option.id),
                    'periodic_tasks',
                    task_id,
                ],
                'data': {'save_result': False}
            },
        ])
        self.assertEqual(results[0]['data']['results'][0]['status'], 'OK')
        self.assertEqual(results[0]['data']['results'][0]['kind'], 'ANSIBLE_MODULE')
        self.assertEqual(results[0]['data']['results'][0]['initiator_type'], 'scheduler')
        self.assertFalse(results[1]['data']['save_result'])

        self.get_model_filter('main.History').all().delete()
        ScheduledTask.delay(task_id)
        results = self.bulk_transactional([
            # [0] check that with save_result=False history is not created
            {
                'method': 'get',
                'path': 'history',
            },
        ])
        self.assertEqual(results[0]['data']['count'], 0)

        # try to execute not existing task
        result = ScheduledTask.delay(999999)
        self.assertEqual(result.status, 'FAILURE')

        # check exception on execution
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.models.TemplatePeriodicTask.execute',
            side_effect=TestException
        ) as executor:
            ScheduledTask.delay(task_id)
            self.assertEqual(executor.call_count, 1)

        # check patch schedule
        results = self.bulk_transactional([
            {  # [0] same schedule
                'method': 'patch',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    self.template.id,
                    'options',
                    str(self.template_option.id),
                    'periodic_tasks',
                    task_id,
                ],
                'data': {'schedule': 10}
            },
            {  # [1] alter schedule
                'method': 'patch',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    self.template.id,
                    'options',
                    str(self.template_option.id),
                    'periodic_tasks',
                    task_id,
                ],
                'data': {'schedule': 20}
            },
            {  # [2] new schedule type
                'method': 'patch',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    self.template.id,
                    'options',
                    str(self.template_option.id),
                    'periodic_tasks',
                    task_id,
                ],
                'data': {'schedule': '* * 1-15 * *', 'type': 'CRONTAB'},
            },
        ])

        # check delete task
        results = self.bulk_transactional([
            {
                'method': 'delete',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    self.template.id,
                    'options',
                    str(self.template_option.id),
                    'periodic_tasks',
                    task_id,
                ],
            }
        ])
        self.assertFalse(self.get_model_filter('main.TemplatePeriodicTask').filter(id=task_id).exists())

    def test_echo_plugin(self):
        results = self.bulk_transactional([
            self.create_template_bulk_data(
                plugin='TEST_ECHO',
                arguments={'string': 'some text'},
                name='echo',
            ),
        ])
        template_id = results[0]['data']['id']
        option_id = self.get_default_template_option(template_id).id

        results = self.bulk_transactional([
            self.create_template_periodic_task_bulk_data(
                type='INTERVAL',
                schedule=10,
                template_id=template_id,
                option_id=option_id,
            ),
        ])
        task_id = results[0]['data']['id']
        self.get_model_filter('main.History').all().delete()
        ScheduledTask.delay(task_id)

        results = self.bulk_transactional([
            # [0]
            {'method': 'get', 'path': 'history'},
            # [1]
            self.get_history_bulk_data('<<0[data][results][0][id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][results][0][id]>>'),
        ])
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[1]['data']['kind'], 'TEST_ECHO')
        self.assertEqual(results[1]['data']['initiator_type'], 'scheduler')
        self.assertEqual(results[1]['data']['initiator'], task_id)
        self.assertEqual(results[1]['data']['raw_args'], 'echo some text')
        self.assertEqual(results[2]['data']['detail'], 'some text\n')


@own_projects_dir
class PlaybookAndModuleTestCase(BaseProjectTestCase):
    def test_execute_with_key_in_inventory(self):
        self.get_model_filter('main.Variable').delete()
        inventory_type = ContentType.objects.get(model='inventory', app_label='main')
        self.get_model_filter('main.Variable').create(
            key='ansible_ssh_private_key_file',
            value=example_key,
            content_type=inventory_type,
            object_id=self.inventory.id
        )
        self.get_model_filter('main.Variable').create(
            key='ansible_user',
            value='user1',
            content_type=inventory_type,
            object_id=self.inventory.id
        )
        results = self.bulk_transactional([
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory.id
            ),
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
        ])
        self.assertEqual(results[1]['data']['status'], 'OFFLINE')
        self.assertIn('"unreachable": true', results[2]['data']['detail'])
        self.assertIn('"msg": "Failed to connect to the host via ssh:', results[2]['data']['detail'])
        self.assertNotIn('No such file or directory', results[2]['data']['detail'])
        self.assertNotIn('invalid format', results[2]['data']['detail'])
        self.assertNotIn('bad permissions', results[2]['data']['detail'])

    def test_execute_ansible_playbook(self):
        # try to execute not synced project
        project = self.get_model_filter('main.Project').create(name='project')
        results = self.bulk([
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_PLAYBOOK',
                playbook='bootstrap.yml',
                project_id=project.id,
            ),
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual('Project not synchronized.', results[0]['data']['detail'])

        def check_execution():
            results = self.bulk_transactional([
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    playbook='playbook.yml',
                    inventory=self.inventory.id,
                ),
                self.get_history_bulk_data('<<0[data][history_id]>>'),
                self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[1]['data']['kind'], 'ANSIBLE_PLAYBOOK')
            self.assertEqual(results[1]['data']['status'], 'OK')
            self.assertEqual(results[1]['data']['initiator_type'], 'project')
            self.assertIn('TASK [Some local task]', results[2]['data']['detail'])
            self.assertIn('ok: [localhost]', results[2]['data']['detail'])
            return results

        results = check_execution()
        self.assertEqual(
            self.get_model_filter('main.History').get(pk=results[0]['data']['history_id']).initiator_object.id,
            self.project.id,
        )

        # check again with repo_sync_on_run set
        sync_on_run = self.get_model_filter('main.Variable').create(
            key='repo_sync_on_run',
            value=False,
            object_id=self.project.id,
            content_type=ContentType.objects.get(model='project')
        )
        check_execution()

        # check SyncError in execution
        # check exception on execution
        sync_on_run.value = True
        sync_on_run.save(update_fields=['value'])
        check_execution()
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.utils.CmdExecutor.execute',
            side_effect=self.get_model_class('main.Project').SyncError
        ), self.assertRaises(AssertionError):
            check_execution()

    def test_execute_ansible_module(self):
        results = self.bulk_transactional([
            # [0] invalid module
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                inventory=self.inventory_path,
                module='invalid',
            ),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'ANSIBLE_MODULE')
        self.assertEqual(results[1]['data']['status'], 'ERROR')

        def check_with_inventory(inventory, **kwargs):
            results = self.bulk_transactional([
                # [2] valid module
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_MODULE',
                    inventory=inventory,
                    module='system.setup',
                    **kwargs,
                ),
                # [3]
                self.get_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[1]['data']['kind'], 'ANSIBLE_MODULE')
            self.assertEqual(results[1]['data']['status'], 'OK')
            self.assertEqual(results[1]['data']['initiator_type'], 'project')
            self.assertEqual(results[1]['data']['initiator'], self.project.id)

        check_with_inventory(self.inventory.id)
        check_with_inventory(self.inventory_path)
        check_with_inventory('localhost,', extra_vars='ansible_connection=local')

    def test_execute_echo_plugin(self):
        results = self.bulk_transactional([
            # [0]
            self.execute_plugin_bulk_data('test_echo', string='test string'),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
            # [3]
            self.execute_plugin_bulk_data('test_echo', string='test string 2'),
            # [4]
            self.get_history_bulk_data('<<3[data][history_id]>>'),
            # [5]
            self.get_raw_history_bulk_data('<<3[data][history_id]>>'),
        ])
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertDictEqual(results[1]['data']['execute_args'], {'string': 'test string'})
        self.assertEqual(results[1]['data']['mode'], 'test string')
        self.assertEqual(results[1]['data']['kind'], 'TEST_ECHO')
        self.assertEqual(results[1]['data']['raw_args'], 'echo test string')
        self.assertEqual(results[2]['data']['detail'], 'test string\n')

        self.assertEqual(results[4]['data']['status'], 'OK')
        self.assertDictEqual(results[4]['data']['execute_args'], {'string': 'test string 2'})
        self.assertEqual(results[4]['data']['raw_args'], 'echo test string 2')
        self.assertEqual(results[5]['data']['detail'], 'test string 2\n')

        # check that plugin cannot access other than allowed Project's attributes
        def access_unsafe(inner_self, project_data):
            project_data.objects.delete()

        with self.patch(f'{TESTS_MODULE}.TestEcho.get_env_vars', side_effect=access_unsafe, autospec=True):
            results = self.bulk_transactional([
                # [0]
                self.execute_plugin_bulk_data('test_echo', string='test string'),
                # [1]
                self.get_history_bulk_data('<<0[data][history_id]>>'),
                # [2]
                self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[1]['data']['status'], 'ERROR')
            self.assertIn(  # assertIn because there is '\n' on the end some times
                "allowed attributes are "
                "('config', 'revision', 'branch', 'project_branch', 'vars', 'env_vars', 'type', "
                "'repo_sync_on_run', 'repo_sync_timeout')",
                results[2]['data']['detail'],
            )

    def test_execute_ansible_doc_plugin(self):
        results = self.bulk_transactional([
            # [0]
            self.execute_plugin_bulk_data(
                plugin='test_ansible_doc',
                target='gitlab_runner',
                verbose=2,
                json=True,
                module_path='some/path'
            ),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
        ])
        next_history_id = self.get_model_filter('main.History').order_by('-id').first().id
        self.assertDictEqual(results[0]['data'], {
            'executor': self.user.id,
            'history_id': next_history_id,
            'detail': 'TEST_ANSIBLE_DOC plugin was executed.',

        })
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertIn('"module": "gitlab_runner"', results[2]['data']['detail'])
        self.assertIn(
            '"short_description": "Create, modify and delete GitLab Runners."',
            results[2]['data']['detail']
        )
        self.assertIn('Test log from test plugin', results[2]['data']['detail'])

    def test_gather_facts(self):
        results = self.bulk_transactional([
            # [0] run setup module
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.setup',
                inventory=self.inventory.id,
            ),
            # [1] get setup module history
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2] get facts from setup module
            {
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>', 'facts']
            },
        ])
        self.assertEqual(results[1]['data']['kind'], 'ANSIBLE_MODULE')
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['facts']['localhost']['status'], 'SUCCESS')
        self.assertFalse(results[2]['data']['facts']['localhost']['changed'])

        history_obj = self.get_model_filter('main.History').get(pk=results[0]['data']['history_id'])
        history_obj.status = 'RUN'
        history_obj.save(update_fields=['status'])

        results = self.bulk([
            {
                'method': 'get',
                'path': ['history', history_obj.id, 'facts']
            },
        ])
        self.assertEqual(results[0]['status'], 424)
        self.assertEqual(results[0]['data']['error_type'], 'DataNotReady')

        results = self.bulk([
            # [0] run ping module
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory.id,
            ),
            # [1] get ping module history
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2] try to get facts from ping module
            {
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>', 'facts']
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'ANSIBLE_MODULE')
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[2]['status'], 404)
        self.assertEqual(results[2]['data']['error_type'], 'NoFactsAvailableException')

    def test_get_modules(self):
        self.project.ansible_modules.create(path='lol.kek', _data='some_data')
        results = self.bulk([
            {  # [0] simple get
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules'],
                'query': 'limit=20',
            },
            {  # [1] use path filter
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules'],
                'query': 'path=s3_website',
            },
            {  # [2] use name filter
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules'],
                'query': 'name=setup',
            },
            {  # [3] get project's module
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules'],
                'query': 'path=lol.kek',
            },
            {  # [4] detail
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules', '<<2[data][results][0][id]>>']
            },
        ])
        self.assertEqual(len(results[0]['data']['results']), 20)
        self.assertEqual(len(results[1]['data']['results']), 1)
        self.assertEqual(len(results[2]['data']['results']), 1)
        self.assertEqual(len(results[3]['data']['results']), 1)
        self.assertEqual(results[4]['data']['data']['short_description'], 'Gathers facts about remote hosts')
        self.assertIn('Ansible Core Team', results[4]['data']['data']['author'])
        self.assertIn('Michael DeHaan', results[4]['data']['data']['author'])

    def test_pb_filter(self):
        (Path(settings.PROJECTS_DIR) / str(self.project.id) / 'example.yml').write_text('---\n  - example: example')
        self.project.start_repo_task('sync')

        results = self.bulk_transactional([
            {
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_playbooks'],
                'query': 'pb_filter=example'
            },
            {
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_playbooks'],
                'query': 'pb_filter=example.yml'
            },
        ])
        self.assertEqual(results[0]['data']['count'], 0)
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(results[1]['data']['results'][0]['name'], 'example')

    def test_filter_name_endswith(self):
        results = self.bulk_transactional([
            {
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules'],
                'query': 'name=setup'
            },
            {
                'method': 'get',
                'path': ['project', self.project.id, 'ansible_modules'],
                'query': 'name=etup'
            },
        ])
        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[0]['data']['results'][0]['path'], 'system.setup')
        self.assertEqual(results[1]['data']['count'], 0)


@own_projects_dir
class HistoryTestCase(BaseProjectTestCase):
    @use_temp_dir
    def test_execution_revision(self, temp_dir):
        repo_dir = f'{temp_dir}/repo'
        shutil.copytree(f'{TEST_DATA_DIR}/repo', repo_dir)
        repo = git.Repo.init(repo_dir)
        repo.git.add(all=True)
        repo.index.commit('Initial commit')

        results = self.bulk_transactional([
            self.create_project_bulk_data(type='GIT', repository=repo_dir),
            self.sync_project_bulk_data('<<0[data][id]>>'),
            self.execute_plugin_bulk_data(
                'ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory_path,
                connection='local',
                project_id='<<0[data][id]>>',
            ),
            self.get_history_bulk_data('<<2[data][history_id]>>'),
        ])
        project = self.get_model_filter('main.Project').get(id=results[0]['data']['id'])
        self.assertEqual(project.revision, repo.head.object.hexsha)
        self.assertEqual(results[-1]['data']['revision'], repo.head.object.hexsha)

    def test_history_str_inventory(self):
        results = self.bulk_transactional([
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory.id,
            ),
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory_path,
            ),
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory='lolhost,kekhost,',
            ),
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            self.get_history_bulk_data('<<1[data][history_id]>>'),
            self.get_history_bulk_data('<<2[data][history_id]>>'),
        ])
        self.assertEqual(results[3]['data']['inventory'], self.inventory.id)
        self.assertIn('inventory', results[3]['data']['execute_args'])
        self.assertIsNone(results[4]['data']['inventory'])
        self.assertEqual(results[4]['data']['execute_args']['inventory'], self.inventory_path)
        self.assertIsNone(results[5]['data']['inventory'])
        self.assertEqual(results[5]['data']['execute_args']['inventory'], 'lolhost,kekhost,')

    def test_history_execute_args_validation(self):
        with self.assertRaises(ValidationError):
            self.get_model_class('main.History')().execute_args = 'lol'

    def test_cancel_task_on_history_delete(self):
        task = self.get_model_filter('main.History').create(
            status='RUN',
            project=self.project,
            mode='lol',
            raw_inventory='lol',
            raw_stdout='text',
        )
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.models.history.History.cancel',
        ) as sender:
            self.assertEqual(0, sender.call_count)
            self.bulk_transactional([{'method': 'delete', 'path': ['history', task.id]}])
            self.assertEqual(1, sender.call_count)
        self.assertIsNone(task.initiator_object)

    def test_history_actions(self):
        results = self.bulk_transactional([
            # [0]
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory.id,
            ),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
            {  # [3]
                'method': 'delete',
                'path': ['history', '<<0[data][history_id]>>', 'clear'],
            },
        ])
        self.assertEqual(results[1]['data']['kind'], 'ANSIBLE_MODULE')
        self.assertEqual(results[1]['data']['status'], 'OK')

        self.assertIn('"ping": "pong"', results[2]['data']['detail'])
        self.assertIn('"changed": false', results[2]['data']['detail'])

        self.assertEqual(results[3]['data'], None)

        history_id = results[0]['data']['history_id']
        results = self.bulk([
            {
                'method': 'delete',
                'path': ['history', history_id, 'clear'],
            },
            {
                'method': 'patch',
                'path': ['history', history_id, 'cancel'],
            },
        ])
        self.assertEqual(results[0]['status'], 406)
        self.assertEqual(results[0]['data']['detail'], 'Job is running or already truncated.')
        self.assertEqual(results[1]['status'], 400, results[1])
        self.assertEqual(results[1]['data']['detail'], 'Task is already stopped.')

        history = self.get_model_filter('main.History').get(id=history_id)
        history.status = 'RUN'
        history.save(update_fields=('status',))
        results = self.bulk_transactional([
            {
                'method': 'patch',
                'path': ['history', history_id, 'cancel'],
            },
        ])
        self.assertEqual(results[0]['data']['detail'], f'Task {history_id} canceled.')

    @skipIf(settings.VST_PROJECT_LIB_NAME != 'polemarch', 'Stats may vary')
    def test_stats(self):
        def generate_history(status="OK"):
            project = self.get_model_filter('main.Project').create(name="Stats", repository='')
            inventory = self.get_model_filter('main.Inventory').create()
            project.inventories.add(inventory)
            self.get_model_filter('main.History').create(
                start_time=timezone.now() - timezone.timedelta(days=1, hours=1),
                stop_time=timezone.now() - timezone.timedelta(days=1),
                status=status,
                project=project,
                mode='task.yml',
                raw_inventory='inventory',
                raw_stdout='text',
                inventory=inventory,
                executor=self.user,
                initiator_type='project',
                initiator=project.id,
            )

        self.get_model_filter('main.History').delete()
        generate_history(status='OK')
        generate_history(status='ERROR')
        generate_history(status='STOP')

        results = self.bulk([{'method': 'get', 'path': 'stats'}])

        self.assertSetEqual(set(results[0]['data'].keys()), {
            'projects',
            'inventories',
            'users',
            'execution_plugins',
            'inventory_plugins',
            'jobs',
        })
        self.assertEqual(results[0]['data']['projects'], self.get_model_filter('main.Project').count())
        self.assertEqual(results[0]['data']['inventories'], self.get_model_filter('main.Inventory').count())
        self.assertEqual(results[0]['data']['users'], User.objects.count())
        self.assertEqual(results[0]['data']['execution_plugins'], len(PLUGIN_HANDLERS))
        self.assertEqual(
            results[0]['data']['inventory_plugins'],
            len(self.get_model_class('main.Inventory').plugin_handlers.keys()),
        )
        for unit in ['day', 'month', 'year']:
            self.assertEqual(results[0]['data']['jobs'][unit][0]['status'], 'ERROR')
            self.assertEqual(results[0]['data']['jobs'][unit][1]['status'], 'OK')
            self.assertEqual(results[0]['data']['jobs'][unit][2]['status'], 'STOP')
            for idx in range(3):
                self.assertEqual(results[0]['data']['jobs'][unit][idx]['sum'], 1)
                self.assertEqual(results[0]['data']['jobs'][unit][idx]['all'], 3)

    def test_execute_module_with_polemarch_db_inventory_from_template(self):
        # Create project
        [response] = self.bulk_transactional([
            self.create_project_bulk_data(),
        ])
        project_id = response['data']['id']

        # Sync project
        self.bulk_transactional([
            {
                "method": "patch",
                "path": ["project", project_id, "sync"],
                "data": {},
            },
        ])

        # Create POLEMARCH_DB inventory
        [response] = self.bulk_transactional([
            {
                "method": "post",
                "path": ["project", project_id, "inventory"],
                "data": {
                    "name": "localhost",
                    "plugin": "POLEMARCH_DB",
                },
            },
        ])
        inventory_id = response['data']['id']

        # Create execution template
        [response] = self.bulk_transactional([
            {
                "method": "post",
                "path": ["project", project_id, "execution_templates"],
                "data": {
                    "name": "localhost ping",
                    "plugin": "ANSIBLE_MODULE",
                    "arguments": {
                        "module": "system.ping",
                        "inventory": inventory_id,
                    },
                },
            },
        ])
        execution_template_id = response['data']['id']

        # Get execution template option id
        [response] = self.bulk_transactional([
            {
                "method": "get",
                "path": ["project", project_id, "execution_templates", execution_template_id, "options"],
            },
        ])
        execution_template_option_id = response['data']['results'][0]['id']

        # Execute template
        [response] = self.bulk_transactional([
            {
                "method": "post",
                "path": ["project", project_id, "execution_templates", execution_template_id, "execute"],
                "data": {
                    "option": execution_template_option_id,
                },
            },
        ])
        history_id = response['data']['history_id']

        # Get list history
        [response] = self.bulk([
            {
                "method": "get",
                "path": "history",
                "query": f"id={history_id}",
            }
        ])
        self.assertEqual(response['status'], 200)
        self.assertEqual(
            response['data']['results'][0],
            {
                'id': history_id,
                'status': 'OK',
                'project': project_id,
                'executor': self.user.id,
                'initiator': execution_template_id,
                'initiator_type': 'template',
                # Inventory should be id converted to string
                'inventory': f'{inventory_id}',
                'kind': 'ANSIBLE_MODULE',
                'mode': 'system.ping',
                'options': {'template_option': execution_template_option_id},
                'start_time': response['data']['results'][0]['start_time'],
                'stop_time': response['data']['results'][0]['stop_time'],
            },
        )

    def test_execute_module_with_polemarch_db_inventory(self):
        # Create project
        [response] = self.bulk_transactional([
            self.create_project_bulk_data(),
        ])
        project_id = response['data']['id']

        # Sync project
        self.bulk_transactional([
            {
                "method": "patch",
                "path": ["project", project_id, "sync"],
                "data": {},
            },
        ])

        # Create POLEMARCH_DB inventory
        [response] = self.bulk_transactional([
            {
                "method": "post",
                "path": ["project", project_id, "inventory"],
                "data": {
                    "name": "localhost",
                    "plugin": "POLEMARCH_DB",
                },
            },
        ])
        inventory_id = response['data']['id']

        # Execute module
        [response] = self.bulk_transactional([
            {
                "method": "post",
                "path": ["project", project_id, "execute_ansible_module"],
                "data": {
                    "module": "system.ping",
                    "inventory": inventory_id,
                },
            },
        ])
        history_id = response['data']['history_id']

        # Get list history
        [response] = self.bulk([
            {
                "method": "get",
                "path": "history",
                "query": f"id={history_id}",
            }
        ])
        self.assertEqual(response['status'], 200)
        self.assertEqual(
            response['data']['results'][0],
            {
                'id': history_id,
                'status': 'OK',
                'project': project_id,
                'executor': self.user.id,
                'initiator': project_id,
                'initiator_type': 'project',
                # Inventory should be id converted to string
                'inventory': f'{inventory_id}',
                'kind': 'ANSIBLE_MODULE',
                'mode': 'system.ping',
                'options': {},
                'start_time': response['data']['results'][0]['start_time'],
                'stop_time': response['data']['results'][0]['stop_time'],
            },
        )


@own_projects_dir
class ExecutionTemplateTestCase(BaseProjectTestCase):
    def test_execution_template_task(self):
        results = self.bulk_transactional([
            # [0] not existing playbook
            self.create_template_bulk_data(
                name='invalid',
                plugin='ANSIBLE_PLAYBOOK',
                arguments={'playbook': 'invalid'},
            ),
            # [1] existing playbook
            self.create_template_bulk_data(
                name='playbook',
                plugin='ANSIBLE_PLAYBOOK',
                arguments={'playbook': 'playbook.yml'},
            ),
        ])
        invalid_template_id = results[0]['data']['id']
        working_template_id = results[1]['data']['id']
        invalid_template_option_id = self.get_default_template_option(invalid_template_id).id
        working_template_option_id = self.get_default_template_option(working_template_id).id

        results = self.bulk_transactional([
            # [0] execute template
            self.execute_template_bulk_data(template_id=invalid_template_id, option_id=invalid_template_option_id),
            # [1] get history
            self.get_history_bulk_data(
                '<<0[data][history_id]>>',
                path_prefix=['project', self.project.id, 'execution_templates', invalid_template_id],
            ),
            # [2] get raw history output
            self.get_raw_history_bulk_data(
                '<<0[data][history_id]>>',
                path_prefix=['project', self.project.id, 'execution_templates', invalid_template_id],
            ),
            # [3] execute template
            self.execute_template_bulk_data(template_id=working_template_id, option_id=working_template_option_id),
            # [4] get history
            self.get_history_bulk_data('<<3[data][history_id]>>'),
        ])
        self.assertEqual(results[1]['data']['status'], 'ERROR')
        self.assertIn('ERROR', results[2]['data']['detail'])
        self.assertIn('the playbook: invalid could not be found', results[2]['data']['detail'])
        self.assertEqual(results[4]['data']['status'], 'OK')
        self.assertEqual(results[4]['data']['initiator_type'], 'template')
        self.assertEqual(results[4]['data']['initiator'], working_template_id)

    def test_execution_template_module(self):
        results = self.bulk_transactional([
            # [0] not existing module
            self.create_template_bulk_data(
                name='invalid',
                plugin='ANSIBLE_MODULE',
                arguments={'module': 'invalid', 'inventory': self.inventory_path},
            ),
            # [1] ping module
            self.create_template_bulk_data(),
        ])
        invalid_template_id = results[0]['data']['id']
        invalid_template_option_id = self.get_default_template_option(invalid_template_id).id
        ping_template_id = results[1]['data']['id']
        ping_template_option_id = self.get_default_template_option(ping_template_id).id
        results = self.bulk_transactional([
            # [0]
            self.execute_template_bulk_data(template_id=invalid_template_id, option_id=invalid_template_option_id),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
            # [3]
            self.execute_template_bulk_data(
                template_id=ping_template_id,
                option_id=ping_template_option_id,
                via_option=True,
            ),
            # [4]
            self.get_history_bulk_data('<<3[data][history_id]>>'),
            {  # [5] try to change plugin
                'method': 'patch',
                'path': ['project', self.project.id, 'execution_templates', ping_template_id],
                'data': {'plugin': 'TEST_ECHO'},
            },
            {  # [6] get details
                'method': 'get',
                'path': ['project', self.project.id, 'execution_templates', ping_template_id]
            },
        ])
        self.assertEqual(results[1]['data']['status'], 'ERROR')
        self.assertIn('FAILED', results[2]['data']['detail'])
        self.assertIn('The module invalid was not found', results[2]['data']['detail'])
        self.assertEqual(results[4]['data']['status'], 'OK')
        self.assertEqual(results[4]['data']['initiator_type'], 'template')
        self.assertEqual(results[4]['data']['initiator'], ping_template_id)
        self.assertEqual(results[6]['data']['plugin'], 'ANSIBLE_MODULE')

    def test_execution_templates_options(self):
        template_id = self.bulk([
            self.create_template_bulk_data(arguments={
                'inventory': self.inventory.id,
                'module': 'system.ping',
            })
        ])[0]['data']['id']
        # Test valid data
        results = self.bulk([
            # [0] Get options list
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', template_id, 'options']},
            # [1] Create option
            {
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'options'],
                'data': {
                    'name': 'Option 1',
                    'arguments': {
                        'module': 'other_module',
                        'playbook_dir': 'some_dir',
                        'private_key': 'some key',
                    },
                }
            },
            # [2] Get options list
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', template_id, 'options']},
            # [3] Try to change option name
            {
                'method': 'put',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    template_id,
                    'options',
                    '<<1[data][id]>>'
                ],
                'data': {
                    'name': 'New name',
                    'arguments': {
                        'module': 'other_module',
                        'playbook_dir': 'some_dir',
                        'private_key': 'lol-key',
                    },
                }
            },
            # [4] Get option detail view
            {
                'method': 'get',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    template_id,
                    'options',
                    '<<1[data][id]>>'
                ]
            },
            # [5] Remove option
            {
                'method': 'delete',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    template_id,
                    'options',
                    '<<1[data][id]>>'
                ]
            },
            # [6] Get options list
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', template_id, 'options']},
        ])

        # Check that there is one default option
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[0]['data']['results'][0]['name'], 'default')

        # Check that option successfully created
        self.assertEqual(results[1]['status'], 201)
        self.assertDictEqual(results[1]['data'], {
            **results[1]['data'],
            'name': 'Option 1',
            'notes': '',
            'arguments': {
                'group': 'all',
                'module': 'other_module',
                'playbook_dir': 'some_dir',
                'private_key': CYPHER,
            },
        })

        # Check that list contains created option
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['count'], 2)
        self.assertEqual(results[2]['data']['results'][0]['name'], 'default')
        self.assertEqual(results[2]['data']['results'][1]['name'], 'Option 1')

        # Check that name of the option is changed
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['name'], 'New name')

        # Check detail view of the option
        self.assertEqual(results[4]['status'], 200)
        self.assertDictEqual(results[4]['data'], {
            **results[4]['data'],
            'name': 'New name',
            'arguments': {
                'group': 'all',
                'module': 'other_module',
                'playbook_dir': 'some_dir',
                'private_key': CYPHER,
            },
        })

        # Check that option removed
        self.assertEqual(results[5]['status'], 204)
        self.assertEqual(results[6]['data']['count'], 1)
        self.assertEqual(results[6]['data']['results'][0]['name'], 'default')

    def test_notificator(self):
        class DummyClient:
            def add(*args):
                pass

            def send(*args):
                pass

        with self.patch(
            'vstutils.models.cent_notify.Notificator.get_client',
            return_value=DummyClient()
        ) as client_getter:
            with self.patch(
                    'vstutils.models.cent_notify.Notificator.is_usable',
                    return_value=True
            ):
                self.assertEqual(client_getter.call_count, 0)
                self.bulk_transactional([self.sync_project_bulk_data()])
                client_getter.assert_any_call()
                client_getter.reset_mock()
                client_getter.assert_not_called()
                self.bulk_transactional([
                    self.execute_plugin_bulk_data(
                        plugin='ANSIBLE_MODULE',
                        module='system.ping',
                        inventory=self.inventory.id,
                    )
                ])
                client_getter.assert_any_call()

    def test_execute_test_module(self):
        results = self.bulk_transactional([
            self.create_template_bulk_data(
                name='test module',
                plugin='TEST_MODULE',
                arguments={'module': 'system.ping', 'inventory': self.inventory.id},
            ),
        ])
        template_id = results[0]['data']['id']
        option_id = self.get_default_template_option(template_id).id
        results = self.bulk_transactional([
            # [0]
            self.execute_template_bulk_data(template_id=template_id, option_id=option_id),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
        ])
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertIn('"ping": "pong"', results[2]['data']['detail'])

    def test_execute_ansible_doc_plugin(self):
        results = self.bulk_transactional([
            self.create_template_bulk_data(
                name='help a10_server',
                plugin='TEST_ANSIBLE_DOC',
                arguments={
                    'target': 'a10_server',
                    'verbose': 1,
                    'json': False,
                }
            ),
        ])
        template_id = results[0]['data']['id']
        option_id = self.get_default_template_option(template_id).id
        results = self.bulk_transactional([
            # [0]
            self.execute_template_bulk_data(template_id=template_id, option_id=option_id),
            # [1]
            self.get_history_bulk_data('<<0[data][history_id]>>'),
            # [2]
            self.get_raw_history_bulk_data('<<0[data][history_id]>>'),
        ])
        next_history_id = self.get_model_filter('main.History').order_by('-id').first().id
        self.assertDictEqual(results[0]['data'], {
            'executor': self.user.id,
            'history_id': next_history_id,
            'detail': 'TEST_ANSIBLE_DOC plugin was executed.',

        })
        self.assertEqual(results[1]['data']['status'], 'OK')
        history = self.get_model_filter('main.History').get(id=next_history_id)
        self.assertEqual(history.json_options, f'{{"template_option": "{option_id}"}}')
        self.assertIn(
            'Manage SLB (Server Load Balancer) server objects on A10',
            results[2]['data']['detail']
        )
        self.assertIn(
            'AUTHOR: Eric Chou (@ericchou1), Mischa Peters (@mischapeters)',
            results[2]['data']['detail']
        )
        self.assertNotIn('Test log from test plugin', results[2]['data']['detail'])

        # check custom option
        results = self.bulk_transactional([
            # [0]
            self.create_template_option_bulk_data(
                template_id=template_id,
                name='verbose_with_json',
                arguments={
                    'target': 'a10_server',
                    'verbose': 4,
                    'json': True,
                },
            ),
            # [1]
            self.execute_template_bulk_data(template_id=template_id, option_id='<<0[data][id]>>'),
            # [2]
            self.get_history_bulk_data('<<1[data][history_id]>>'),
            # [3]
            self.get_raw_history_bulk_data('<<1[data][history_id]>>'),
        ])
        self.assertEqual(results[2]['data']['status'], 'OK')
        history = self.get_model_filter('main.History').get(id=results[1]['data']['history_id'])
        self.assertEqual(history.json_options, f'''{{"template_option": "{results[0]['data']['id']}"}}''')
        # from verbose
        self.assertIn(
            'Executing command',
            results[3]['data']['detail']
        )
        self.assertIn(
            "'pm_ansible', 'ansible-doc', 'a10_server', '-vvvv', '--json'",
            results[3]['data']['detail']
        )
        self.assertIn("Test log from test plugin", results[3]['data']['detail'])
        # json output
        self.assertIn('"author": [', results[3]['data']['detail'])
        self.assertIn('"Eric Chou (@ericchou1)",', results[3]['data']['detail'])
        self.assertIn(
            '"Manage SLB (Server Load Balancer) server objects on A10 Networks devices via aXAPIv2."',
            results[3]['data']['detail']
        )

    def test_edit_template_option(self):
        results = self.bulk_transactional([
            # [0]
            {
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates'],
                'data': {
                    'name': 'echo',
                    'plugin': 'TEST_ECHO',
                    'arguments': {
                        'string': '1',
                        'n': True,
                        'e': False,
                    },
                },
            },
            # [1]
            {
                'method': 'get',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>', 'options'],
            },
            # [2]
            {
                'method': 'get',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    '<<0[data][id]>>',
                    'options',
                    '<<1[data][results][0][id]>>',
                ],
            },
            # [3]
            {
                'method': 'patch',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    '<<0[data][id]>>',
                    'options',
                    '<<1[data][results][0][id]>>',
                ],
                'data': {
                    'arguments': {
                        'string': '2',
                        'e': True,
                    },
                },
            },
        ])
        self.assertEqual(results[0]['data']['name'], 'echo')
        self.assertEqual(results[0]['data']['plugin'], 'TEST_ECHO')
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(results[2]['data']['name'], 'default')
        self.assertDictEqual(results[2]['data']['arguments'], {
            'string': '1',
            'n': True,
            'e': False,
        })
        self.assertDictEqual(results[3]['data']['arguments'], {
            'string': '2',
            'e': True,
        })


@own_projects_dir
class VariableTestCase(BaseProjectTestCase):
    def test_override_ansible_cfg_in_project(self):
        test_ansible_cfg = """
            [defaults]
            task_timeout = 1
        """.strip()
        # create directories in project
        (Path(self.project.path) / 'dir0' / 'dir1').mkdir(parents=True, exist_ok=True)
        # create ansible.cfg in dir0/dir1
        (Path(self.project.path) / 'dir0' / 'dir1' / 'ansible.cfg').write_text(test_ansible_cfg)

        results = self.bulk([
            # [0] invalid path (absolute)
            self.create_project_variable_bulk_data('env_ANSIBLE_CONFIG', '/dir0/ansible.cfg'),
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn(
            'Invalid path. Path must not contain "..", "~" or any other special characters and must be relative.',
            results[0]['data']['detail']['other_errors'][0],
        )

        # check if env_ANSIBLE_CONFIG is set than this config is used
        with self.patch('subprocess.Popen.__init__', return_value=None) as popen:
            popen.assert_not_called()
            results = self.bulk_transactional([
                self.create_project_variable_bulk_data('env_ANSIBLE_CONFIG', 'dir0/dir1/ansible.cfg'),
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    playbook='playbook.yml',
                ),
            ])
            self.assertTrue(popen.call_args[-1]['env']['ANSIBLE_CONFIG'].endswith('/dir0/dir1/ansible.cfg'))

        var_id = self.get_model_filter('main.Variable').get(key='env_ANSIBLE_CONFIG').id

        # check if env_ANSIBLE_CONFIG is not set than root project ansible.cfg is used
        (Path(self.project.path) / 'ansible.cfg').write_text(test_ansible_cfg)

        with self.patch('subprocess.Popen.__init__', return_value=None) as popen:
            popen.assert_not_called()
            results = self.bulk_transactional([
                {'method': 'delete', 'path': ['project', self.project.id, 'variables', var_id]},
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    playbook='playbook.yml',
                ),
            ])
            self.assertTrue(popen.call_args[-1]['env']['ANSIBLE_CONFIG'].endswith('/ansible.cfg'))

        # check if env_ANSIBLE_CONFIG is not set and project's ansible.cfg does not exist than
        # os ANSIBLE_CONFIG env var is used
        os.remove(Path(self.project.path) / 'ansible.cfg')

        with self.patch('subprocess.Popen.__init__', return_value=None) as popen, \
                self.patch('os.environ', {'ANSIBLE_CONFIG': '/some/global.cfg'}):
            popen.assert_not_called()
            results = self.bulk_transactional([
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_PLAYBOOK',
                    playbook='playbook.yml',
                ),
            ])
            self.assertEqual(popen.call_args[-1]['env']['ANSIBLE_CONFIG'], '/some/global.cfg')

    def test_add_vars_to_project(self):
        results = self.bulk([
            {  # [0] hidden var
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {
                    'key': 'repo_password',
                    'value': 'qwerty',
                },
            },
            {  # [1] boolean var
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {
                    'key': 'repo_sync_on_run',
                    'value': True,
                },
            },
            {  # [2] boolean var
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {
                    'key': 'repo_sync_on_run',
                    'value': 'kek',
                },
            },
            {  # [3] regular var
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {
                    'key': 'repo_branch',
                    'value': 'lol',
                },
            },
            {  # [4] wrong var
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {
                    'key': 'lol_variable',
                    'value': 'kek_value',
                },
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[0]['data']['value'], CYPHER)

        self.assertEqual(results[1]['status'], 201)
        self.assertTrue(results[1]['data']['value'])

        self.assertEqual(results[2]['status'], 400)
        self.assertListEqual(results[2]['data']['value'], ['Must be a valid boolean.'])

        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[3]['data']['value'], 'lol')

        self.assertEqual(results[4]['status'], 400)
        self.assertIn('Unknown variable key', results[4]['data']['detail']['other_errors'][0])

    def test_playbook_path_variable_validation(self):
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'playbook_path', 'value': '../kek.yaml'},
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'playbook_path', 'value': './lol/kek.yaml'},
            },
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn(
            'Invalid path. Path must not contain "..", "~" or any other special characters and must be relative.',
            results[0]['data']['detail']['other_errors'][0],
        )
        self.assertEqual(results[1]['status'], 201)

    def test_validate_ansible_host(self):
        def ansible_host_bulk_data(value):
            return {
                'method': 'post',
                'path': ['host', self.host.id, 'variables'],
                'data': {
                    'key': 'ansible_host',
                    'value': value,
                },
            }

        self.get_model_class('main.Variable').objects.all().delete()
        results = self.bulk([
            # [0] check invalid hostname
            ansible_host_bulk_data(':lol:'),
            # [2] check valid hostname
            ansible_host_bulk_data('example.com'),
            # [3] check valid ip
            ansible_host_bulk_data('127.0.0.1'),
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn('Invalid hostname or IP', results[0]['data']['detail']['other_errors'][0])
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[1]['data']['key'], 'ansible_host')
        self.assertEqual(results[1]['data']['value'], 'example.com')
        self.assertEqual(results[2]['status'], 201)
        self.assertEqual(results[2]['data']['key'], 'ansible_host')
        self.assertEqual(results[2]['data']['value'], '127.0.0.1')

        with self.assertRaises(ValueError):
            self.bulk([ansible_host_bulk_data(r'%%%')])

    def test_remove_existing_variable(self):
        self.get_model_class('main.Variable').objects.all().delete()
        results = self.bulk([
            {
                'method': 'post',
                'path': ['host', self.host.id, 'variables'],
                'data': {'key': 'ansible_host', 'value': '1'},
            },
            {
                'method': 'post',
                'path': ['host', self.host.id, 'variables'],
                'data': {'key': 'ansible_host', 'value': '2'},
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        variables_qs = self.get_model_class('main.Variable').objects.all()
        self.assertEqual(variables_qs.count(), 1)
        self.assertEqual(variables_qs[0].key, 'ansible_host')
        self.assertEqual(variables_qs[0].value, '2')

    def check_vars(self, base_path):
        results = self.bulk([
            {  # [0] hidden var
                'method': 'post',
                'path': [*base_path, 'variables'],
                'data': {'key': 'ansible_ssh_pass', 'value': 'qwerty'},
            },
            {  # [1] boolean var
                'method': 'post',
                'path': [*base_path, 'variables'],
                'data': {'key': 'ansible_become', 'value': True},
            },
            {  # [2] boolean var
                'method': 'post',
                'path': [*base_path, 'variables'],
                'data': {
                    'key': 'ansible_become',
                    'value': 'kek',
                },
            },
            {  # [3] regular var
                'method': 'post',
                'path': [*base_path, 'variables'],
                'data': {
                    'key': 'ansible_user',
                    'value': 'kek_user',
                },
            },
            {  # [4] unknown var
                'method': 'post',
                'path': [*base_path, 'variables'],
                'data': {
                    'key': 'lol_variable',
                    'value': 'kek_value',
                },
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[0]['data']['value'], CYPHER)
        self.assertEqual(results[1]['status'], 201)
        self.assertTrue(results[1]['data']['value'])
        self.assertEqual(results[2]['status'], 400)
        self.assertEqual(results[2]['data']['value'], ['Must be a valid boolean.'])
        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[3]['data']['value'], 'kek_user')
        self.assertEqual(results[4]['status'], 201)
        self.assertEqual(results[4]['data']['key'], 'lol_variable')
        self.assertEqual(results[4]['data']['value'], 'kek_value')

    def test_host_vars(self):
        self.check_vars(['host', self.host.id])

    def test_group_vars(self):
        self.check_vars(['group', self.group.id])

    def test_inventory_vars(self):
        self.check_vars(['inventory', self.inventory.id])

    def test_var_filter(self):
        group_type = ContentType.objects.get(model='group', app_label='main')
        another_group = self.get_model_class('main.Group').objects.create()
        self.get_model_class('main.Variable').objects.create(
            key='lol',
            value='kek',
            content_type=group_type,
            object_id=self.group.id,
        )
        self.get_model_class('main.Variable').objects.create(
            key='kek',
            value='lol',
            content_type=group_type,
            object_id=another_group.id,
        )

        results = self.bulk([
            {  # [0] get all
                'method': 'get',
                'path': 'group',
            },
            {  # [1] should find 1
                'method': 'get',
                'path': 'group',
                'query': 'variables=lol:kek',
            },
            {  # [2] should find 0
                'method': 'get',
                'path': 'group',
                'query': 'variables=unknown:unknown',
            },
            {  # [3] should raise list index out of range (FIXME: really ??)
                'method': 'get',
                'path': 'group',
                'query': 'variables=kek',
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 2)

        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], 1)

        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['count'], 0)

        self.assertEqual(results[3]['status'], 400)
        self.assertEqual(results[3]['data']['detail'], 'list index out of range')

    def test_execution_template_option_private_vars(self):
        results = self.bulk_transactional([
            self.create_template_bulk_data(
                plugin='ANSIBLE_MODULE',
                arguments={
                    'module': 'system.ping',
                    'private_key': 'key',
                    'vault_password_file': 'file',
                },
            ),
            self.create_template_bulk_data(
                plugin='ANSIBLE_PLAYBOOK',
                arguments={
                    'playbook': 'playbook.yml',
                    'private_key': 'key',
                    'vault_password_file': 'file',
                },
            ),
        ])
        module_template_id = results[0]['data']['id']
        playbook_template_id = results[1]['data']['id']
        module_template_option_id = self.get_default_template_option(module_template_id).id
        playbook_template_option_id = self.get_default_template_option(playbook_template_id).id
        results = self.bulk_transactional([
            {
                'method': 'get',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    module_template_id,
                    'options',
                    str(module_template_option_id),
                ],
            },
            {
                'method': 'get',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    playbook_template_id,
                    'options',
                    str(playbook_template_option_id),
                ],
            },
        ])
        self.assertEqual(results[-2]['data']['arguments']['private_key'], CYPHER)
        self.assertEqual(results[-2]['data']['arguments']['vault_password_file'], CYPHER)
        self.assertEqual(results[-1]['data']['arguments']['private_key'], CYPHER)
        self.assertEqual(results[-1]['data']['arguments']['vault_password_file'], CYPHER)

    def test_history_raw_inventory_private_vars(self):
        results = self.bulk_transactional([
            {
                'method': 'post',
                'path': ['inventory', self.inventory.id, 'variables'],
                'data': {'key': 'ansible_ssh_pass', 'value': 'lol-pass'},
            },
            self.execute_plugin_bulk_data(
                plugin='ANSIBLE_MODULE',
                module='system.ping',
                inventory=self.inventory.id,
            ),
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
        ])
        self.assertIn('ansible_ssh_pass: [~~ENCRYPTED~~]', results[-1]['data']['raw_inventory'])

    def test_vars_property_caching(self):
        self.project.vars = {'repo_branch': 'master'}
        self.assertDictEqual(self.project.vars, {'repo_branch': 'master'})

        self.project.vars = {
            'repo_branch': 'slave',
            'repo_password': CYPHER,
            'repo_sync_on_run': True,
        }
        self.assertDictEqual(self.project.vars, {
            'repo_branch': 'slave',
            'repo_password': CYPHER,
            'repo_sync_on_run': True,
        })

    def test_env_vars_on_execution(self):
        with self.patch('subprocess.Popen.__init__', return_value=None) as popen:
            popen.assert_not_called()
            self.bulk([
                self.create_project_variable_bulk_data('env_EXAMPLE', '1'),
                self.execute_plugin_bulk_data(
                    plugin='ANSIBLE_MODULE',
                    module='system.ping',
                    inventory=self.inventory.id,
                ),
            ])
            self.assertEqual(popen.call_args[-1]['env']['EXAMPLE'], '1')
            self.assertIn('VST_PROJECT', popen.call_args[-1]['env'])


class BaseHookTestCase(BaseProjectTestCase):
    @staticmethod
    def create_hook_bulk_data(type, recipients, when):
        return {
            'method': 'post',
            'path': 'hook',
            'data': {
                'enable': True,
                'recipients': recipients,
                'type': type,
                'when': when,
            },
        }


@own_projects_dir
class HookTestCase(BaseHookTestCase):
    def setUp(self):
        super().setUp()
        shutil.copy(f'{TEST_DATA_DIR}/script_hook.sh', f'{settings.HOOKS_DIR}/script_hook.sh')
        self.script_hook = self.get_model_filter('main.Hook').create(type='SCRIPT', recipients='script_hook.sh')
        self.http_hook = self.get_model_filter('main.Hook').create(type='HTTP', recipients='https://example.com')

    def tearDown(self):
        super().tearDown()
        os.remove(f'{settings.HOOKS_DIR}/script_hook.sh')

    def test_create_hook(self):
        results = self.bulk([
            # [0] create valid script hook
            self.create_hook_bulk_data(type='SCRIPT', recipients='script_hook.sh', when='on_object_add'),
            # [1] invalid when
            self.create_hook_bulk_data(type='SCRIPT', recipients='script_hook.sh', when='lol'),
            # [2] invalid recipient
            self.create_hook_bulk_data(type='SCRIPT', recipients='recipients', when='on_object_add'),
            # [3] create valid http hook
            self.create_hook_bulk_data(type='HTTP', recipients='recipients', when='on_object_add'),
            # [4] invalid when
            self.create_hook_bulk_data(type='HTTP', recipients='recipients', when='lol'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual('"lol" is not a valid choice.', results[1]['data']['when'][0])
        self.assertEqual(results[2]['status'], 400)
        self.assertIn('Recipients must be in hooks dir', results[2]['data']['detail']['recipients'][0])
        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[1]['status'], 400)

    def test_hook_when(self):
        self._login()

        @self.patch('requests.api.request')
        def check_hook(request, when, bulk_data, call_count=1, status=None):
            statuses = (status,) if status else (200, 201, 204)
            request.assert_not_called()
            self.get_model_filter('main.Hook').all().delete()
            self.get_model_filter('main.Hook').create(type='HTTP', recipients='recipients', when=when)
            results = self.bulk(bulk_data, relogin=False)
            self.assertIn(results[0]['status'], statuses, results[0]['data'])
            self.assertEqual(request.call_count, call_count)

        # check wrong when
        with self.assertRaises(ValidationError):
            self.get_model_filter('main.Hook').create(type='HTTP', recipients='recipients', when='lol')

        # *_execution
        check_hook(
            when='on_execution',
            bulk_data=[self.execute_plugin_bulk_data(plugin='ANSIBLE_MODULE', module='system.ping')],
        )
        check_hook(
            when='after_execution',
            bulk_data=[self.execute_plugin_bulk_data(plugin='ANSIBLE_MODULE', module='system.ping')],
        )

        # on_object_*
        check_hook(
            when='on_object_add',
            bulk_data=[{'method': 'post', 'path': 'host'}],
        )
        host = self.get_model_filter('main.Host').first()
        check_hook(
            when='on_object_upd',
            bulk_data=[{'method': 'patch', 'path': ['host', host.id], 'data': {'name': 'somename'}}],
        )
        check_hook(
            when='on_object_del',
            bulk_data=[{'method': 'delete', 'path': ['host', host.id]}],
        )

        # on_object_add
        check_hook(
            when='on_object_add',
            bulk_data=self.create_template_bulk_data(),
            call_count=2,  # because it creates default option
        )
        check_hook(
            when='on_object_add',
            bulk_data=self.create_template_option_bulk_data(arguments={'module': 'system.ping'}),
        )
        check_hook(
            when='on_object_add',
            bulk_data=self.create_template_periodic_task_bulk_data(),
        )

        # on_user_*
        check_hook(
            when='on_user_add',
            bulk_data=[
                {
                    'method': 'post',
                    'path': 'user',
                    'data': {
                        'username': 'username',
                        'password': 'password',
                        'password2': 'password',
                    },
                },
            ],
        )
        user = User.objects.get(username='username')
        check_hook(
            when='on_user_upd',
            bulk_data=[{'method': 'patch', 'path': ['user', user.id], 'data': {'username': 'username'}}],
        )
        check_hook(
            when='on_user_del',
            bulk_data=[{'method': 'delete', 'path': ['user', user.id]}],
        )

        # check successful change password triggers on_user_upd
        check_hook(
            when='on_user_upd',
            bulk_data=[
                {
                    'method': 'post',
                    'path': ['user', 'profile', 'change_password'],
                    'data': {
                        'old_password': self.user.data['password'],
                        'password': 'same',
                        'password2': 'same',
                    },
                },
            ],
        )
        # check unsuccessful attempt to change password not triggers on_user_upd
        check_hook(
            when='on_user_upd',
            bulk_data=[
                {
                    'method': 'post',
                    'path': ['user', 'profile', 'change_password'],
                    'data': {
                        'old_password': self.user.data['password'],
                        'password': 'password',
                        'password2': 'password2',
                    },
                },
            ],
            status=403,
            call_count=0,
        )

    def check_output_run_script(self, check_data, *args, **kwargs):
        script_path = str(kwargs.get('cwd', ''))
        script_path += '/' if kwargs.get('cwd') else ''
        script_path += self.script_hook.recipients
        self.assertEqual(check_data[0], script_path)
        self.assertEqual(check_data[1], 'on_execution')
        self.assertEqual(json.loads(kwargs.get('input', '{}')), {'test': 'test'})
        self.assertTrue(kwargs['universal_newlines'])
        return 'OK'

    def check_output_run_http(self, method, url, **kwargs):
        self.assertEqual(method, 'post')
        json_data = json.loads(kwargs['data'])
        self.assertEqual(url, self.http_hook.recipients)
        self.assertEqual(json_data.get('type'), 'on_execution')
        self.assertEqual(json_data.get('payload'), {'test': 'test'})
        self.assertEqual(
            kwargs['headers'],
            {'Content-Type': 'application/json'},
        )
        response = Response()
        response.status_code, response.reason = 200, 'OK'
        return response

    def test_script_hook(self):
        with self.patch('subprocess.check_output', side_effect=self.check_output_run_script) as cmd:
            result = self.script_hook.run(message={'test': 'test'})
            self.assertEqual(result, 'OK')
            self.assertEqual(cmd.call_count, 1)

            cmd.side_effect = TestException
            with self.assertLogs(level='ERROR') as logs:
                result = self.script_hook.run(message={'test': 'test'})
                error_log = logs.output[-1:][0]
                self.assertIn('ERROR:polemarch', error_log)
                self.assertIn(f'SCRIPT:{settings.HOOKS_DIR}/script_hook.sh', error_log)
                self.assertIn('WHEN:on_execution', error_log)
                self.assertIn(f'CWD:{settings.HOOKS_DIR}', error_log)
                self.assertIn('ERR:Test exception.', error_log)
            self.assertEqual(result, 'Test exception.')
            self.assertEqual(cmd.call_count, 2)

    def test_http_hook(self):
        with self.patch('requests.api.request', side_effect=self.check_output_run_http) as cmd:
            result = self.http_hook.run(message={'test': 'test'})
            self.assertEqual(result, '200 OK: ')
            self.assertEqual(cmd.call_count, 1)

            cmd.side_effect = TestException
            with self.assertLogs(level='ERROR') as logs:
                result = self.http_hook.run(message={'test': 'test'})
                error_log = logs.output[-1:][0]
                self.assertIn('Details:', error_log)
                self.assertIn(f'URL:{self.http_hook.recipients}', error_log)
                self.assertIn('WHEN:on_execution', error_log)
            self.assertEqual(result, 'Test exception.')
            self.assertEqual(cmd.call_count, 2)


class TranslationTestCase(VSTBaseTestCase):
    def test_lang_get(self):
        results = self.bulk([
            {'method': 'get', 'path': '_lang'},
            {'method': 'get', 'path': ['_lang', 'ru']},
            {'method': 'get', 'path': ['_lang', 'en']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['name'], 'Русский')
        self.assertEqual(results[1]['data']['translations']['pmwuserscounter'], 'счетчик пользователей')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['name'], 'English')
        self.assertEqual(results[2]['data']['translations']['pmwuserscounter'], 'users counter')


class CommandTestCase(VSTBaseTestCase):
    def test_update_ansible_modules(self):
        out = io.StringIO()
        call_command('update_ansible_modules', interactive=False, stdout=out)
        self.assertEqual(
            'The modules have been successfully updated.\n',
            out.getvalue().replace('\x1b[32;1m', '').replace('\x1b[0m', ''),
        )


class UserTestCase(VSTBaseTestCase):
    @skipIf(settings.VST_PROJECT_LIB_NAME != 'polemarch', 'Users creation may differ')
    def test_users_create(self):
        user_staff = self._create_user(is_super_user=False, is_staff=True)
        user_reg = self._create_user(is_super_user=False, is_staff=False)

        results = self.bulk([
            {'method': 'post', 'path': 'user', 'data': {
                'email': 'msh@example.com',
                'first_name': 'Msh',
                'is_active': True,
                'last_name': 'Msh',
                'username': 'msh',
                'password': '1q2w3e',
                'password2': '1q2w3e',
            }},
        ])

        self.assertEqual(results[0]['status'], 201)
        self.assertTrue(User.objects.get(id=results[0]['data']['id']).is_staff)

        with self.user_as(self, user_staff):
            results = self.bulk([
                {'method': 'post', 'path': 'user', 'data': {
                    'email': 'example@example.com',
                    'first_name': 'User',
                    'is_active': True,
                    'last_name': 'User',
                    'username': 'user',
                    'password': 'user',
                    'password2': 'user',
                }},
            ])

        self.assertEqual(results[0]['status'], 201)
        self.assertTrue(User.objects.get(id=results[0]['data']['id']).is_staff)

        with self.user_as(self, user_reg):
            results = self.bulk([
                {'method': 'post', 'path': 'user', 'data': {
                    'email': 'example1@example.com',
                    'first_name': 'User1',
                    'is_active': True,
                    'last_name': 'User1',
                    'username': 'user1',
                    'password': 'user1',
                    'password2': 'user1',
                }},
            ])

        self.assertEqual(results[0]['status'], 403)

    def test_update(self):
        results = self.bulk([
            {'method': 'patch', 'path': ['user', self.user.id], 'data': {'username': 'new_username'}},
            {'method': 'get', 'path': ['user', self.user.id]},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['username'], 'new_username')
        self.assertEqual(results[1]['data']['username'], 'new_username')

    @override_settings(SESSION_ENGINE='django.contrib.sessions.backends.db')
    def test_oauth2_tokens(self):
        # Reset cache to use overridden session backend
        get_session_store.cache_clear()

        user = self._create_user(is_super_user=False, is_staff=False)
        other_user = self._create_user(is_super_user=False, is_staff=False)

        # Try create with too long expires
        with (
            self.user_as(self, user),
            self.patch(
                'django.utils.timezone.now',
                return_value=timezone.make_aware(datetime(2020, 1, 1)),
            )
        ):
            [response] = self.bulk([
                {
                    'method': 'POST',
                    'path': ['user', user.id, 'token'],
                    'data': {
                        'name': 'Some token',
                        'expires': '2022-01-01',
                    },
                }
            ])
            self.assertEqual(response['status'], 400, response)
            self.assertEqual(response['data'], {'expires': ['Expires must be less than 365 days']})

        # Try create already expired
        with (
            self.user_as(self, user),
            self.patch(
                'django.utils.timezone.now',
                return_value=timezone.make_aware(datetime(2020, 1, 1)),
            )
        ):
            [response] = self.bulk([
                {
                    'method': 'POST',
                    'path': ['user', user.id, 'token'],
                    'data': {
                        'name': 'Some token',
                        'expires': '2019-01-01',
                    },
                }
            ])
            self.assertEqual(response['status'], 400, response)
            self.assertEqual(response['data'], {'expires': ['Expires must be in the future']})

        # Create token
        with (
            self.user_as(self, user),
            self.patch(
                'django.utils.timezone.now',
                return_value=timezone.make_aware(datetime(2020, 1, 1)),
            )
        ):
            [response] = self.bulk([
                {
                    'method': 'POST',
                    'path': ['user', user.id, 'token'],
                    'data': {
                        'name': 'Some token',
                        'expires': '2020-01-5',
                    },
                }
            ])
            self.assertEqual(response['status'], 201, response)
            self.assertEqual(
                response['data'],
                {
                    'id': response['data']['id'],
                    'name': 'Some token',
                    'expires': '2020-01-05',
                    'token': response['data']['token'],
                },
            )

        token_id = response['data']['id']
        token = response['data']['token']

        # Check token using user endpoint
        with (
            self.user_as(self, user),
            self.patch(
                'time.time',
                return_value=datetime(2020, 1, 2).timestamp(),
            ),
            self.patch(
                'django.utils.timezone.now',
                return_value=timezone.make_aware(datetime(2020, 1, 2)),
            ),
        ):
            response = self.client_class().get(
                '/api/v4/user/profile/',
                headers={'Authorization': f'Bearer {token}'},
            )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()['id'], user.id)

        # Check token visibility
        for request_user, expected_visible in [
            (user, True),
            (other_user, False),
        ]:
            with self.subTest():
                with self.user_as(self, request_user):
                    [response] = self.bulk([
                        {
                            'method': 'get',
                            'path': ['user', user.id, 'token'],
                        }
                    ])
                    self.assertEqual(
                        response['status'],
                        200 if expected_visible else 403,
                    )

        # Check token deletion
        with (
            self.user_as(self, user),
            self.patch(
                'time.time',
                return_value=datetime(2020, 1, 2).timestamp(),
            ),
            # Fix tests login
            self.patch(
                'vstutils.tests.time',
                return_value=datetime(2020, 1, 2).timestamp(),
            ),
        ):
            [response] = self.bulk([
                {
                    'method': 'delete',
                    'path': ['user', user.id, 'token', token_id],
                }
            ])
            self.assertEqual(response['status'], 204, response)

            response = self.client_class().get(
                '/api/v4/user/profile/',
                headers={'Authorization': f'Bearer {token}'},
            )
            self.assertEqual(response.status_code, 403, response.content)


class BaseOpenAPITestCase(VSTBaseTestCase):
    maxDiff = None
    _schema = None
    builtin_execution_plugins = {'ANSIBLE_PLAYBOOK', 'ANSIBLE_MODULE'}
    builtin_inventory_plugins = {'POLEMARCH_DB', 'ANSIBLE_STRING', 'ANSIBLE_FILE'}
    import_excluded_inventory_plugins = {'ANSIBLE_FILE'}

    system_tab = {
        'name': 'System',
        'span_class': 'fa fa-cog',
        'sublinks': [],
    }
    users_sublink = {
        'name': 'Users',
        'url': '/user',
        'span_class': 'fa fa-user',
    }
    hooks_sublink = {
        'name': 'Hooks',
        'url': '/hook',
        'span_class': 'fa fa-plug',
    }

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.openapi_schema_yaml = os.getenv('SCHEMA_PATH')
        if cls.openapi_schema_yaml is None:
            cls.openapi_schema_yaml = Path.cwd() / 'doc' / 'api_schema.yaml'
        assert Path(cls.openapi_schema_yaml).is_file(), "OpenAPI schema file doesn't exist."

    def schema(self):
        if self._schema is None:
            self._schema = self.endpoint_schema()
        return self._schema

    def check_execution_plugins(self, values):
        self.assertSetEqual(
            set(values),
            self.builtin_execution_plugins,
            'External execution plugins are not allowed in generated YML schema.',
        )

    def check_inventory_plugins(self, values, exclude=None):
        if exclude is None:
            exclude = set()
        self.assertSetEqual(
            set(values),
            self.builtin_inventory_plugins - exclude,
            'plugin is either not excluded or external. '
            'External inventory plugins are not allowed in generated YML schema.',
        )

    def get_schemas_for_test(self):
        endpoint_schema = self.schema()
        yml_schema = yaml.load(Path(self.openapi_schema_yaml).read_text(), Loader=yaml.SafeLoader)

        yml_schema['host'] = self.server_name
        yml_schema['schemes'][0] = 'https'
        yml_schema['info']['contact'] = endpoint_schema['info']['contact']
        yml_schema['info']['x-versions'] = endpoint_schema['info']['x-versions']
        yml_schema['info']['x-links'] = endpoint_schema['info']['x-links']
        yml_schema['info']['x-user-id'] = endpoint_schema['info']['x-user-id']

        for key in filter(lambda d: d.startswith('Execute'), yml_schema['definitions']):
            yml_schema['definitions'][key]['x-view-field-name'] = \
                endpoint_schema['definitions'][key]['x-view-field-name']
            yml_schema['definitions'][key]['x-properties-groups'] = \
                endpoint_schema['definitions'][key]['x-properties-groups']

        yml_enum = yml_schema['definitions']['CreateExecutionTemplate']['properties']['plugin']['enum']
        self.check_execution_plugins(yml_enum)
        endpoint_schema['definitions']['CreateExecutionTemplate']['properties']['plugin']['enum'] = yml_enum

        yml_types = yml_schema['definitions']['OneHistory']['properties']['execute_args']['x-options']['types']
        self.check_execution_plugins(yml_types.keys())
        endpoint_schema['definitions']['OneHistory']['properties']['execute_args']['x-options']['types'] = yml_types

        template_types_depend_on_plugins = (
            'CreateExecutionTemplate',
            'OneExecutionTemplateOption',
        )
        for key in template_types_depend_on_plugins:
            yml_types = yml_schema['definitions'][key]['properties']['arguments']['x-options']['types']
            self.check_execution_plugins(yml_types)
            endpoint_schema['definitions'][key]['properties']['arguments']['x-options']['types'] = yml_types

        for idx, query_def in enumerate(
            endpoint_schema['paths']['/project/{id}/execution_templates/']['get']['parameters'],
        ):
            if query_def['name'] == 'plugin':
                yml_schema['paths']['/project/{id}/execution_templates/']['get']['parameters'][idx] = query_def

        for def_ in ('Inventory', 'OneInventory', 'CreateInventory'):
            yml_enum = yml_schema['definitions'][def_]['properties']['plugin']['enum']
            self.check_inventory_plugins(yml_enum)
            endpoint_schema['definitions'][def_]['properties']['plugin']['enum'] = yml_enum

        for def_ in ('InventoryState', 'InventoryStateUpdate'):
            yml_types = yml_schema['definitions'][def_]['properties']['data']['x-options']['types']
            self.check_inventory_plugins(yml_types.keys())
            endpoint_schema['definitions'][def_]['properties']['data']['x-options']['types'] = yml_types

        for def_ in ('ImportInventory', 'ProjectImportInventory'):
            yml_enum = yml_schema['definitions'][def_]['properties']['plugin']['enum']
            yml_types = yml_schema['definitions'][def_]['properties']['data']['x-options']['types']
            self.check_inventory_plugins(yml_enum, exclude=self.import_excluded_inventory_plugins)
            self.check_inventory_plugins(yml_types.keys(), exclude=self.import_excluded_inventory_plugins)
            endpoint_schema['definitions'][def_]['properties']['plugin']['enum'] = yml_enum
            endpoint_schema['definitions'][def_]['properties']['data']['x-options']['types'] = yml_types

        del yml_schema['definitions']['_MainSettings']
        del endpoint_schema['definitions']['_MainSettings']

        return yml_schema, endpoint_schema

    def schema_test(self):
        yml_schema, endpoint_schema = self.get_schemas_for_test()

        for module in ('paths', 'definitions'):
            for key, value in yml_schema[module].items():
                self.assertDictEqual(
                    value,
                    endpoint_schema[module][key],
                    f'Failed on {module} {key}',
                )


class OpenAPITestCase(BaseOpenAPITestCase):
    """
    Regenerate new doc schema:

    Examples:
    .. sourcecode:: bash

        python -m polemarch generate_swagger \
                                --format yaml \
                                --overwrite \
                                --url 'http://localhost:8080/' \
                                --user admin \
                                -m doc/api_schema.yaml
    """

    @skipIf(settings.VST_PROJECT_LIB_NAME != 'polemarch', 'Schema may vary')
    def test_schema(self):
        self.schema_test()

    @skipIf(settings.VST_PROJECT_LIB_NAME != 'polemarch', 'Menu may vary')
    def test_menu(self):
        schema = self.schema()
        # superuser menu
        system_tab_superuser = self.system_tab
        system_tab_superuser['sublinks'] = [self.users_sublink, self.hooks_sublink]
        self.assertEqual(schema['info']['x-menu'], PROJECT_MENU + [system_tab_superuser])

        # regular user menu
        user_reg = self._create_user(is_super_user=False)
        with self.user_as(self, user_reg):
            reg_schema = self.endpoint_schema()

        system_tab_user = self.system_tab
        system_tab_user['sublinks'] = [self.users_sublink]
        self.assertEqual(reg_schema['info']['x-menu'], PROJECT_MENU + [system_tab_user])


class MetricsTestCase(VSTBaseTestCase):
    maxDiff = None

    def setUp(self):
        super().setUp()
        History = self.get_model_class('main.History')
        Project = self.get_model_class('main.Project')

        self.history_status_count_map = {
            "OK": 10,
            'OFFLINE': 110,
            'ERROR': 310,
        }

        for status, count in self.history_status_count_map.items():
            for _ in range(count):
                History.objects.create(status=status)

        Project.objects.create(name='test_metrics_0')
        for i in range(3):
            Project.objects.create(name=f'test_metrics_{i}', status='OK')
        for i in range(4):
            Project.objects.create(name=f'test_metrics_{i}', status='ERROR')

    def test_metrics(self):
        result = self.get_result('get', '/api/metrics/')
        expected = (Path(__file__).parent / 'test_data' / 'metrics.txt').read_text('utf-8')
        expected = expected.replace(
            '$VERSION',
            f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}',
        )
        self.assertEqual(result, expected)


class BaseMigrationTestCase(MigratorTestCase):
    def check_model_not_exists(self, state, app, name):
        with self.assertRaises(LookupError):
            state.apps.get_model(app, name)

    def check_field_not_exists(self, model, field):
        with self.assertRaises(FieldDoesNotExist):
            model._meta.get_field(field)

    def prepare(self):
        # See https://github.com/wemake-services/django-test-migrations/issues/292
        self.old_state.clear_delayed_apps_cache()

        Inventory = self.old_state.apps.get_model('main', 'Inventory')
        Project = self.old_state.apps.get_model('main', 'Project')

        self.inventory = Inventory.objects.create(name='test inventory')
        self.project = Project.objects.create(
            name='test project',
            repository='test_repo',
            status='OK',
        )
        self.project.inventories.add(self.inventory)

    def setUp(self):
        super().setUp()
        # See https://github.com/wemake-services/django-test-migrations/issues/292
        self.new_state.clear_delayed_apps_cache()


class ExecutionTemplateDirectMigrationTestCase(BaseMigrationTestCase):
    migrate_from = ('main', '0001_v3')
    migrate_to = ('main', '0004_v3_delete_old_models')

    def prepare(self):
        super().prepare()

        Template = self.old_state.apps.get_model('main', 'Template')
        PeriodicTask = self.old_state.apps.get_model('main', 'PeriodicTask')

        Variable = self.old_state.apps.get_model('main', 'Variable')
        History = self.old_state.apps.get_model('main', 'History')

        # create and delete unused template so all other templates' ids will start from 2
        unused_template = Template.objects.create(
            name='unused',
            kind='Module',
            template_data='{}',
            project=self.project,
            owner=self.project.owner,
        )
        Template.objects.filter(id=unused_template.id).delete()

        # same for periodic tasks
        unused_pt = PeriodicTask.objects.create(
            name='unused',
            mode='shell',
            kind='MODULE',
            inventory_file=None,
            type='CRONTAB',
            schedule='57 22 * * 0',
            save_result=True,
            enabled=False,
            template_opt=None,
            _inventory=self.inventory,
            project=self.project,
            owner=self.project.owner,
            template=None,
        )
        PeriodicTask.objects.filter(id=unused_pt.id).delete()

        # create template with kind=Module
        module_template = Template.objects.create(
            name='module template',
            notes='test notes',
            kind='Module',
            inventory=str(self.inventory.id),
            template_data=json.dumps({
                'module': 'shell',  # this should become "commands.shell"
                'group': 'gitlab_storage',
                'args': 'uptime',
                'vars': {'become': False},
            }),
            options_data=json.dumps({
                'become': {
                    'vars': {'become': True, 'verbose': 4},
                },
                'cleanup': {
                    'module': 'bash',  # invalid module should remain as is
                    'args': 'rm -rf /',
                },
            }),
            project=self.project,
            owner=self.project.owner,
        )
        # create template with kind=Task
        Template.objects.create(
            name='playbook template',
            kind='Task',
            inventory='localhost,',
            template_data=json.dumps({
                'playbook': 'update.yml',
                'vars': {
                    'become': True,
                    'limit': 'gitlab_storage',
                    'private_key': example_key,
                    'verbose': 2,
                },
            }),
            options_data='{}',
            project=self.project,
            owner=self.project.owner,
        )
        # create template with kind=TEST_ECHO
        Template.objects.create(
            name='echo plugin template',
            kind='TEST_ECHO',
            inventory='path/to/inventory',
            template_data=json.dumps({
                'string': 'test string',
                'n': True,
            }),
            options_data=json.dumps({
                'n_False': {'n': False},
            }),
            project=self.project,
            owner=self.project.owner,
        )

        # create periodic task using template without option
        pt1 = PeriodicTask.objects.create(
            name='pt1',
            mode='',
            notes='some notes',
            kind='TEMPLATE',
            inventory_file='',
            type='CRONTAB',
            schedule='12 20 * * *',
            save_result=True,
            enabled=False,
            template_opt=None,
            _inventory=None,
            project=self.project,
            owner=self.project.owner,
            template=module_template,
        )

        # create periodic task using template and option
        pt2 = PeriodicTask.objects.create(
            name='pt2',
            mode='',
            notes='',
            kind='TEMPLATE',
            inventory_file='',
            type='INTERVAL',
            schedule='12',
            save_result=False,
            enabled=True,
            template_opt='cleanup',
            _inventory=None,
            project=self.project,
            owner=self.project.owner,
            template=module_template,
        )

        # create periodic task with kind=MODULE
        pt3 = PeriodicTask.objects.create(
            name='pt3',
            notes='pt3 notes',
            mode='shell',
            kind='MODULE',
            inventory_file=None,
            type='CRONTAB',
            schedule='57 22 * * 0',
            save_result=True,
            enabled=False,
            template_opt=None,
            _inventory=self.inventory,
            project=self.project,
            owner=self.project.owner,
            template=None,
        )

        content_type = self.old_state.apps.get_model(
            'contenttypes',
            'ContentType',
        ).objects.create(app_label='main', model='periodictask')

        Variable.objects.create(
            key='become',
            value=True,
            content_type=content_type,
            object_id=pt3.id,
        )
        Variable.objects.create(
            key='args',
            value='some args',
            content_type=content_type,
            object_id=pt3.id,
        )

        # create periodic task with kind=PLAYBOOK
        pt4 = PeriodicTask.objects.create(
            name='pt4',
            notes='',
            mode='playbook.yml',
            kind='PLAYBOOK',
            inventory_file='path/to/inventory',
            type='CRONTAB',
            schedule='57 22 * * 0',
            save_result=True,
            enabled=False,
            template_opt=None,
            _inventory=None,
            project=self.project,
            owner=self.project.owner,
            template=None,
        )

        Variable.objects.create(
            key='private_key',
            value=example_key,
            content_type=content_type,
            object_id=pt4.id,
        )

        # create history with module ping
        history1 = History.objects.create(
            status='OK',
            mode='ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'ping', 'connection': 'local'}),
            initiator=1,
            initiator_type='project',
            executor=None,
        )
        self.history1_id = history1.id

        # create history with invalid module
        history2 = History.objects.create(
            status='OK',
            mode='invalid',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'invalid'}),
            initiator=1,
            initiator_type='project',
            executor=None,
        )
        self.history2_id = history2.id

        # create history with template initiator (no option)
        history3 = History.objects.create(
            status='OK',
            mode='ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'ping'}),
            initiator=module_template.id,
            initiator_type='template',
            executor=None,
        )
        self.history3_id = history3.id

        # create history with template initiator (with option)
        history4 = History.objects.create(
            status='OK',
            mode='ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'ping'}),
            json_options=json.dumps({'template_option': 'cleanup'}),
            initiator=module_template.id,
            initiator_type='template',
            executor=None,
        )
        self.history4_id = history4.id

        # create history with scheduler initiator
        history5 = History.objects.create(
            status='OK',
            mode='ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'ping'}),
            json_options='{}',
            initiator=pt1.id,
            initiator_type='scheduler',
            executor=None,
        )
        self.history5_id = history5.id

        history6 = History.objects.create(
            status='OK',
            mode='ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'ping'}),
            json_options=json.dumps({'template_option': 'cleanup'}),
            initiator=pt2.id,
            initiator_type='scheduler',
            executor=None,
        )
        self.history6_id = history6.id

        history7 = History.objects.create(
            status='OK',
            mode='ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'ping'}),
            json_options='{}',
            initiator=pt3.id,
            initiator_type='scheduler',
            executor=None,
        )
        self.history7_id = history7.id

    def test_migrations(self):
        self.check_model_not_exists(self.new_state, 'main', 'Template')
        self.check_model_not_exists(self.new_state, 'main', 'PeriodicTask')

        ExecutionTemplate = self.new_state.apps.get_model('main', 'ExecutionTemplate')
        ExecutionTemplateOption = self.new_state.apps.get_model('main', 'ExecutionTemplateOption')
        TemplatePeriodicTask = self.new_state.apps.get_model('main', 'TemplatePeriodicTask')

        History = self.new_state.apps.get_model('main', 'History')

        self.check_field_not_exists(ExecutionTemplate, 'old_template_id')

        # check module template
        template1 = ExecutionTemplate.objects.get(name='module template')
        self.assertEqual(template1.project.id, self.project.id)
        self.assertEqual(template1.plugin, 'ANSIBLE_MODULE')
        self.assertEqual(template1.notes, 'test notes')

        self.assertEqual(ExecutionTemplateOption.objects.filter(template_id=template1.id).count(), 3)

        # default option
        option1 = ExecutionTemplateOption.objects.get(template=template1, name='default')
        self.assertDictEqual(option1.arguments, {
            'module': 'commands.shell',
            'group': 'gitlab_storage',
            'args': 'uptime',
            'become': False,
            'inventory': self.inventory.id,
        })

        # become option
        option2 = ExecutionTemplateOption.objects.get(template=template1, name='become')
        self.assertDictEqual(option2.arguments, {
            'module': 'commands.shell',
            'group': 'gitlab_storage',
            'args': 'uptime',
            'become': True,
            'verbose': 4,
            'inventory': self.inventory.id,
        })

        # cleanup option
        option3 = ExecutionTemplateOption.objects.get(template=template1, name='cleanup')
        self.assertDictEqual(option3.arguments, {
            'module': 'bash',
            'group': 'gitlab_storage',
            'args': 'rm -rf /',
            'become': False,
            'inventory': self.inventory.id,
        })

        # check playbook template
        template2 = ExecutionTemplate.objects.get(name='playbook template')
        self.assertEqual(template2.project.id, self.project.id)
        self.assertEqual(template2.plugin, 'ANSIBLE_PLAYBOOK')
        self.assertEqual(template2.notes, '')

        self.assertEqual(ExecutionTemplateOption.objects.filter(template_id=template2.id).count(), 1)

        # default option
        option4 = ExecutionTemplateOption.objects.get(template=template2, name='default')
        self.assertDictEqual(option4.arguments, {
            'playbook': 'update.yml',
            'inventory': 'localhost,',
            'become': True,
            'limit': 'gitlab_storage',
            'private_key': example_key,
            'verbose': 2,
        })

        # check echo plugin template
        template3 = ExecutionTemplate.objects.get(name='echo plugin template')
        self.assertEqual(template3.project.id, self.project.id)
        self.assertEqual(template3.plugin, 'TEST_ECHO')
        self.assertEqual(template3.notes, '')

        self.assertEqual(ExecutionTemplateOption.objects.filter(template_id=template3.id).count(), 2)

        # default option
        option5 = ExecutionTemplateOption.objects.get(template=template3, name='default')
        self.assertDictEqual(option5.arguments, {
            'inventory': 'path/to/inventory',
            'string': 'test string',
            'n': True,
        })

        # n_False option
        option6 = ExecutionTemplateOption.objects.get(template=template3, name='n_False')
        self.assertDictEqual(option6.arguments, {
            'inventory': 'path/to/inventory',
            'string': 'test string',
            'n': False,
        })

        # check periodic task that uses template without option
        pt1 = TemplatePeriodicTask.objects.get(name='pt1')
        self.assertEqual(pt1.template_option.id, option1.id)
        self.assertEqual(pt1.notes, 'some notes')
        self.assertEqual(pt1.type, 'CRONTAB')
        self.assertEqual(pt1.schedule, '12 20 * * *')
        self.assertTrue(pt1.save_result)
        self.assertFalse(pt1.enabled)

        # check periodic task that uses template with option
        pt2 = TemplatePeriodicTask.objects.get(name='pt2')
        self.assertEqual(pt2.template_option.id, option3.id)
        self.assertEqual(pt2.notes, '')
        self.assertEqual(pt2.type, 'INTERVAL')
        self.assertEqual(pt2.schedule, '12')
        self.assertFalse(pt2.save_result)
        self.assertTrue(pt2.enabled)

        # check periodic task with kind=MODULE
        pt3 = TemplatePeriodicTask.objects.get(name='pt3')

        template = ExecutionTemplate.objects.get(name='[PeriodicTask] pt3')
        self.assertEqual(pt3.template_option.template_id, template.id)
        self.assertEqual(template.name, '[PeriodicTask] pt3')
        self.assertEqual(template.plugin, 'ANSIBLE_MODULE')
        self.assertEqual(template.notes, 'pt3 notes')
        self.assertEqual(template.project.id, self.project.id)

        self.assertEqual(pt3.template_option.notes, '')
        self.assertEqual(pt3.template_option.name, 'default')
        self.assertDictEqual(pt3.template_option.arguments, {
            'module': 'commands.shell',
            'args': 'some args',
            'become': True,
            'inventory': self.inventory.id,
        })

        self.assertEqual(pt3.notes, '')
        self.assertEqual(pt3.type, 'CRONTAB')
        self.assertEqual(pt3.schedule, '57 22 * * 0')
        self.assertTrue(pt3.save_result)
        self.assertFalse(pt3.enabled)

        # check periodic task with kind=PLAYBOOK
        pt4 = TemplatePeriodicTask.objects.get(name='pt4')

        template = ExecutionTemplate.objects.get(name='[PeriodicTask] pt4')
        self.assertEqual(pt4.template_option.template_id, template.id)
        self.assertEqual(template.name, '[PeriodicTask] pt4')
        self.assertEqual(template.plugin, 'ANSIBLE_PLAYBOOK')
        self.assertEqual(template.notes, '')
        self.assertEqual(template.project.id, self.project.id)

        self.assertEqual(pt4.template_option.notes, '')
        self.assertEqual(pt4.template_option.name, 'default')
        self.assertDictEqual(pt4.template_option.arguments, {
            'playbook': 'playbook.yml',
            'private_key': example_key,
            'inventory': 'path/to/inventory',
        })

        self.assertEqual(pt4.notes, '')
        self.assertEqual(pt4.type, 'CRONTAB')
        self.assertEqual(pt4.schedule, '57 22 * * 0')
        self.assertTrue(pt4.save_result)
        self.assertFalse(pt4.enabled)

        history1 = History.objects.get(id=self.history1_id)
        self.assertEqual(history1.mode, 'system.ping')
        self.assertDictEqual(json.loads(history1.json_args), {
            'module': 'system.ping',
            'connection': 'local',
        })

        history2 = History.objects.get(id=self.history2_id)
        self.assertEqual(history2.mode, 'invalid')
        self.assertDictEqual(json.loads(history2.json_args), {
            'module': 'invalid',
        })

        history3 = History.objects.get(id=self.history3_id)
        self.assertEqual(history3.initiator_type, 'template')
        self.assertEqual(history3.initiator, template1.id)
        self.assertDictEqual(json.loads(history3.json_options), {
            'template_option': str(option1.id),
        })

        history4 = History.objects.get(id=self.history4_id)
        self.assertEqual(history4.initiator_type, 'template')
        self.assertEqual(history4.initiator, template1.id)
        self.assertDictEqual(json.loads(history4.json_options), {
            'template_option': str(option3.id),
        })

        history5 = History.objects.get(id=self.history5_id)
        self.assertEqual(history5.initiator_type, 'scheduler')
        self.assertEqual(history5.initiator, pt1.id)
        self.assertDictEqual(json.loads(history5.json_options), {
            'template_option': str(pt1.template_option.id),
            'template': pt1.template_option.template.id,
        })

        history6 = History.objects.get(id=self.history6_id)
        self.assertEqual(history6.initiator_type, 'scheduler')
        self.assertEqual(history6.initiator, pt2.id)
        self.assertDictEqual(json.loads(history6.json_options), {
            'template_option': str(pt2.template_option.id),
            'template': pt2.template_option.template.id,
        })

        history7 = History.objects.get(id=self.history7_id)
        self.assertEqual(history7.initiator_type, 'scheduler')
        self.assertEqual(history7.initiator, pt3.id)
        self.assertDictEqual(json.loads(history7.json_options), {
            'template_option': str(pt3.template_option.id),
            'template': pt3.template_option.template.id,
        })


class ExecutionTemplateBackwardsMigrationTestCase(BaseMigrationTestCase):
    migrate_from = ('main', '0004_v3_delete_old_models')
    migrate_to = ('main', '0001_v3')

    def prepare(self):
        super().prepare()

        ExecutionTemplate = self.old_state.apps.get_model('main', 'ExecutionTemplate')
        ExecutionTemplateOption = self.old_state.apps.get_model('main', 'ExecutionTemplateOption')
        TemplatePeriodicTask = self.old_state.apps.get_model('main', 'TemplatePeriodicTask')

        History = self.old_state.apps.get_model('main', 'History')

        unused_template = ExecutionTemplate.objects.create(
            name='unused',
            notes='some notes',
            plugin='ANSIBLE_MODULE',
            project=self.project,
        )
        unused_option = ExecutionTemplateOption.objects.create(
            name='unused',
            template=unused_template,
            arguments={},
        )
        TemplatePeriodicTask.objects.create(
            name='unused',
            template_option=unused_option,
            type='CRONTAB',
            schedule='12 20 * * *',
            enabled=False,
            save_result=True,
        )
        ExecutionTemplate.objects.filter(id=unused_template.id).delete()

        # create template with module plugin
        template1 = ExecutionTemplate.objects.create(
            name='template1',
            notes='some notes',
            plugin='ANSIBLE_MODULE',
            project=self.project,
        )

        option1 = ExecutionTemplateOption.objects.create(
            name='default',
            template=template1,
            arguments={
                'module': 'system.ping',  # should become "ping"
                'args': 'some args',
                'inventory': self.inventory.id,
                'check': True,
                'group': 'all',
            },
        )

        option2 = ExecutionTemplateOption.objects.create(
            name='option2',
            template=template1,
            arguments={
                'module': 'bash',  # invalid module should remain as is
                'args': 'some args',
                'check': False,
                'group': 'some_group',
                'become': True,
            },
        )

        # create template with playbook plugin
        template2 = ExecutionTemplate.objects.create(
            name='template2',
            plugin='ANSIBLE_PLAYBOOK',
            project=self.project,
        )

        ExecutionTemplateOption.objects.create(
            name='option3',
            template=template2,
            arguments={
                'playbook': 'playbook.yml',
                'inventory': 'path/to/inventory',
                'check': True,
                'private_key': example_key,
            },
        )

        # create template with TEST_ECHO plugin
        template3 = ExecutionTemplate.objects.create(
            name='template3',
            plugin='TEST_ECHO',
            project=self.project,
        )

        ExecutionTemplateOption.objects.create(
            name='option4',
            template=template3,
            arguments={
                'string': 'test',
                'n': True,
                'e': False,
            },
        )

        # create periodic task for default option
        pt1 = TemplatePeriodicTask.objects.create(
            name='pt1',
            template_option=option1,
            type='CRONTAB',
            schedule='12 20 * * *',
            enabled=False,
            save_result=True,
        )

        # create periodic task for another option
        pt2 = TemplatePeriodicTask.objects.create(
            name='pt2',
            template_option=option2,
            type='INTERVAL',
            schedule='12',
            enabled=True,
            save_result=False,
        )

        # create history with module system.ping
        history1 = History.objects.create(
            status='OK',
            mode='system.ping',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'system.ping', 'connection': 'local'}),
            initiator=1,
            initiator_type='project',
            executor=None,
        )
        self.history1_id = history1.id

        # create history with invalid module
        history2 = History.objects.create(
            status='OK',
            mode='invalid',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'invalid'}),
            initiator=1,
            initiator_type='project',
            executor=None,
        )
        self.history2_id = history2.id

        # create history with template initiator (default option)
        history3 = History.objects.create(
            status='OK',
            mode='invalid',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'invalid'}),
            initiator=template1.id,
            initiator_type='template',
            executor=None,
            json_options=json.dumps({'template_option': str(option1.id)}),
        )
        self.history3_id = history3.id

        # create history with template initiator (default option)
        history4 = History.objects.create(
            status='OK',
            mode='invalid',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'invalid'}),
            initiator=template1.id,
            initiator_type='template',
            executor=None,
            json_options=json.dumps({'template_option': str(option2.id)}),
        )
        self.history4_id = history4.id

        # create history with scheduler initiator
        history5 = History.objects.create(
            status='OK',
            mode='invalid',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'invalid'}),
            initiator=pt1.id,
            initiator_type='scheduler',
            executor=None,
            json_options=json.dumps({
                'template_option': str(pt1.template_option.id),
                'template': pt1.template_option.template.id,
            }),
        )
        self.history5_id = history5.id

        # create history with scheduler initiator
        history6 = History.objects.create(
            status='OK',
            mode='invalid',
            inventory=self.inventory,
            project=self.project,
            kind='ANSIBLE_MODULE',
            json_args=json.dumps({'module': 'invalid'}),
            initiator=pt2.id,
            initiator_type='scheduler',
            executor=None,
            json_options=json.dumps({
                'template_option': str(pt2.template_option.id),
                'template': pt2.template_option.template.id,
            }),
        )
        self.history6_id = history6.id

    def test_migrations(self):
        self.check_model_not_exists(self.new_state, 'main', 'ExecutionTemplate')
        self.check_model_not_exists(self.new_state, 'main', 'ExecutionTemplateOption')
        self.check_model_not_exists(self.new_state, 'main', 'TemplatePeriodicTask')

        Template = self.new_state.apps.get_model('main', 'Template')
        PeriodicTask = self.new_state.apps.get_model('main', 'PeriodicTask')

        History = self.new_state.apps.get_model('main', 'History')

        template1 = Template.objects.get(name='template1')
        self.assertEqual(template1.notes, 'some notes')
        self.assertEqual(template1.kind, 'Module')
        self.assertEqual(template1.project.id, self.project.id)
        self.assertEqual(template1.inventory, str(self.inventory.id))
        self.assertDictEqual(json.loads(template1.template_data), {
            'module': 'ping',
            'args': 'some args',
            'group': 'all',
            'vars': {'check': True},
        })
        self.assertDictEqual(json.loads(template1.options_data), {
            'option2': {
                'module': 'bash',
                'args': 'some args',
                'group': 'some_group',
                'vars': {
                    'check': False,
                    'become': True,
                },
            },
        })

        template2 = Template.objects.get(name='template2')
        self.assertEqual(template2.notes, '')
        self.assertEqual(template2.kind, 'Task')
        self.assertEqual(template2.project.id, self.project.id)
        self.assertEqual(template2.inventory, 'path/to/inventory')
        self.assertDictEqual(json.loads(template2.template_data), {
            'playbook': 'playbook.yml',
            'vars': {
                'check': True,
                'private_key': example_key,
            },
        })
        self.assertEqual(template2.options_data, '{}')

        template3 = Template.objects.get(name='template3')
        self.assertEqual(template3.notes, '')
        self.assertEqual(template3.kind, 'TEST_ECHO')
        self.assertEqual(template3.project.id, self.project.id)
        self.assertIsNone(template3.inventory)
        self.assertDictEqual(json.loads(template3.template_data), {
            'string': 'test',
            'n': True,
            'e': False,
            'vars': {},
        })
        self.assertEqual(template3.options_data, '{}')

        # check periodic task for option1 (default for template1)
        pt1 = PeriodicTask.objects.get(name='pt1')
        self.assertEqual(pt1.project.id, self.project.id)
        self.assertEqual(pt1.mode, '')
        self.assertEqual(pt1.kind, 'TEMPLATE')
        self.assertIsNone(pt1._inventory)
        self.assertEqual(pt1.type, 'CRONTAB')
        self.assertEqual(pt1.schedule, '12 20 * * *')
        self.assertFalse(pt1.enabled)
        self.assertTrue(pt1.save_result)
        self.assertEqual(pt1.template.id, template1.id)
        self.assertIsNone(pt1.template_opt)

        # check periodic task for option2 for template1
        pt2 = PeriodicTask.objects.get(name='pt2')
        self.assertEqual(pt2.project.id, self.project.id)
        self.assertEqual(pt2.mode, '')
        self.assertEqual(pt2.kind, 'TEMPLATE')
        self.assertIsNone(pt2._inventory)
        self.assertEqual(pt2.type, 'INTERVAL')
        self.assertEqual(pt2.schedule, '12')
        self.assertTrue(pt2.enabled)
        self.assertFalse(pt2.save_result)
        self.assertEqual(pt2.template.id, template1.id)
        self.assertEqual(pt2.template_opt, 'option2')

        history1 = History.objects.get(id=self.history1_id)
        self.assertEqual(history1.mode, 'ping')
        self.assertDictEqual(json.loads(history1.json_args), {
            'module': 'ping',
            'connection': 'local',
        })

        history2 = History.objects.get(id=self.history2_id)
        self.assertEqual(history2.mode, 'invalid')
        self.assertDictEqual(json.loads(history2.json_args), {
            'module': 'invalid',
        })

        history3 = History.objects.get(id=self.history3_id)
        self.assertEqual(history3.initiator_type, 'template')
        self.assertEqual(history3.initiator, template1.id)
        self.assertDictEqual(json.loads(history3.json_options), {})

        history4 = History.objects.get(id=self.history4_id)
        self.assertEqual(history4.initiator_type, 'template')
        self.assertEqual(history3.initiator, template1.id)
        self.assertDictEqual(json.loads(history4.json_options), {
            'template_option': 'option2',
        })

        history5 = History.objects.get(id=self.history5_id)
        self.assertEqual(history5.initiator_type, 'scheduler')
        self.assertEqual(history5.initiator, pt1.id)
        self.assertDictEqual(json.loads(history5.json_options), {})

        history6 = History.objects.get(id=self.history6_id)
        self.assertEqual(history6.initiator_type, 'scheduler')
        self.assertEqual(history6.initiator, pt2.id)
        self.assertDictEqual(json.loads(history6.json_options), {
            'template_option': 'option2',
        })


class BaseExecutionPluginUnitTestCase(VSTBaseTestCase):
    plugin_class = None

    def setUp(self):
        self.dummy_output = ''
        self.dummy_execution_dir = Path(mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.dummy_execution_dir, ignore_errors=True)

    def dummy_output_handler(self, message, level):
        self.dummy_output += f'message:{message},level:{level}\n'

    def get_plugin_instance(self, options=None, execution_dir=None) -> BasePlugin:
        instance = self.plugin_class(
            options=options or {},
            output_handler=self.dummy_output_handler,
        )
        instance.execution_dir = execution_dir or self.dummy_execution_dir
        return instance


class AnsibleExecutionPluginUnitTestCase(BaseExecutionPluginUnitTestCase):
    plugin_class = BaseAnsiblePlugin

    def test_put_into_tmpfile(self):
        instance = self.get_plugin_instance()
        test_value = 'test_value'
        filepath = instance._put_into_tmpfile(test_value)
        self.assertEqual(Path(filepath).read_text(), test_value)
        self.assertEqual(Path(filepath).stat().st_mode, 0o100600)


class AnsiblePlaybookExecutionPluginUnitTestCase(BaseExecutionPluginUnitTestCase):
    plugin_class = AnsiblePlaybook

    boolean_args = (
        'force_handlers',
        'flush_cache',
        'become',
        'check',
        'syntax_check',
        'diff',
        'list_hosts',
        'list_tasks',
        'list_tags',
    )
    string_args = (
        'user',
        'connection',
        'ssh_common_args',
        'sftp_extra_args',
        'scp_extra_args',
        'ssh_extra_args',
        'become_method',
        'become_user',
        'tags',
        'skip_tags',
        'inventory',
        'limit',
        'extra_vars',
        'vault_id',
        'start_at_task',
        'args',
    )
    int_args = (
        'timeout',
        'forks',
    )
    file_args = (
        'private_key',
        'vault_password_file',
        'module_path',
    )

    def test_process_arg(self):
        instance = self.get_plugin_instance()

        self.assertIsNone(instance._process_arg('unknown', 'unknown'))
        self.assertEqual(instance._process_arg('verbose', 2), '-vv')
        self.assertIsNone(instance._process_arg('verbose', 0))

        for arg in self.boolean_args:
            self.assertIsNone(instance._process_arg(arg, False))
            self.assertEqual(instance._process_arg(arg, True), f'--{arg.replace("_", "-")}')

        for arg in self.string_args:
            self.assertIsNone(instance._process_arg(arg, ''))
            self.assertEqual(instance._process_arg(arg, 'test-value'), f'--{arg.replace("_", "-")}=test-value')

        for arg in self.int_args:
            self.assertIsNone(instance._process_arg(arg, 0))
            self.assertEqual(instance._process_arg(arg, 2), f'--{arg.replace("_", "-")}=2')

        for arg in self.file_args:
            self.assertIsNone(instance._process_arg(arg, ''))
            processed_arg = instance._process_arg(arg, 'test-value')
            filepath = processed_arg[processed_arg.index('=') + 1:]
            self.assertEqual(Path(filepath).read_text(), 'test-value')

    def test_get_execution_data(self):
        instance = self.get_plugin_instance()

        all_args = {'playbook': 'playbook.yml'}

        for arg in self.boolean_args:
            all_args[arg] = True

        for arg in self.string_args:
            all_args[arg] = f'{arg}:value'

        for arg in self.int_args:
            all_args[arg] = 1

        for arg in self.file_args:
            all_args[arg] = f'{arg}:value'

        all_args['verbose'] = 3
        all_args['invalid'] = 'invalid'

        cmd, env = instance.get_execution_data(
            self.dummy_execution_dir,
            all_args,
            ProjectProxy(DummyProject()),
        )
        raw_inventory = instance.get_raw_inventory()
        self.assertEqual(raw_inventory, 'inventory:value')
        self.assertDictEqual(env, {
            'env1': 'env1_value',
            'env2': 'env2_value',
        })
        self.assertListEqual(cmd[:3], settings.EXECUTOR)
        self.assertEqual(cmd[3], 'ansible-playbook')
        self.assertEqual(cmd[4], 'playbook.yml')

        # boolean args
        self.assertSetEqual(set(cmd[5:14]), {
            f'--{value.replace("_", "-")}'
            for value in self.boolean_args
        })

        # string args
        self.assertIn('--inventory=inventory:value', cmd)
        self.assertSetEqual(set(cmd[14:30]), {
            f'--{value.replace("_", "-")}={value}:value'
            for value in self.string_args
            if value != 'group'
        })

        # int args
        self.assertSetEqual(set(cmd[30:32]), {
            f'--{value.replace("_", "-")}=1'
            for value in self.int_args
        })

        # file args
        for value in cmd[32:35]:
            arg, *_, filename = value.split('=')
            self.assertEqual(Path(filename).read_text(), f'{arg[2:].replace("-", "_")}:value')

        # other args
        self.assertIn('-vvv', cmd)
        self.assertEqual([v for v in cmd if 'invalid' in v], [])

    def test_get_raw_inventory(self):
        instance = self.get_plugin_instance()

        inventory = """
---
somegroup:
  hosts:
    localhost:
      vars:
        ansible_password: pass
        ansible_ssh_pass: pass
        ansible_ssh_private_key_file: somefile
"""
        instance.inventory = inventory
        raw_inventory = instance.get_raw_inventory()

        self.assertEqual(raw_inventory.strip(), f"""
---
somegroup:
  hosts:
    localhost:
      vars:
        ansible_password: {CYPHER}
        ansible_ssh_pass: {CYPHER}
        ansible_ssh_private_key_file: {CYPHER}
        """.strip())

        inventory = self.get_model_filter('main.Inventory').create(name='test')
        inventory.variables.create(
            key='ansible_password',
            value='pass',
        )
        inventory.variables.create(
            key='ansible_ssh_pass',
            value='pass',
        )

        cmd, _ = instance.get_execution_data(
            self.dummy_execution_dir,
            {'playbook': 'playbook.yml', 'inventory': inventory},
            ProjectProxy(DummyProject()),
        )
        raw_inventory = instance.get_raw_inventory()
        self.assertEqual(raw_inventory.strip(), f"""
---
all:
  vars:
    ansible_password: {CYPHER}
    ansible_ssh_pass: {CYPHER}
        """.strip())

        self.assertListEqual(cmd[:3], settings.EXECUTOR)
        self.assertEqual(cmd[3], 'ansible-playbook')
        self.assertEqual(cmd[4], 'playbook.yml')
        self.assertIn('--inventory=', cmd[5])
        generated_file = cmd[5].rsplit('=', maxsplit=1)[-1]
        self.assertEqual(Path(generated_file).read_text().strip(), """
---
all:
  vars:
    ansible_password: pass
    ansible_ssh_pass: pass
        """.strip())


class AnsibleModuleExecutionPluginUnitTestCase(BaseExecutionPluginUnitTestCase):
    plugin_class = AnsibleModule

    boolean_args = (
        'become',
        'list_hosts',
        'one_line',
        'check',
        'syntax_check',
        'diff',
    )
    string_args = (
        'become_method',
        'become_user',
        'inventory',
        'limit',
        'tree',
        'user',
        'connection',
        'ssh_common_args',
        'sftp_extra_args',
        'scp_extra_args',
        'ssh_extra_args',
        'extra_vars',
        'vault_id',
        'playbook_dir',
        'args',
        'group',
    )
    int_args = (
        'poll',
        'background',
        'timeout',
        'forks',
    )
    file_args = (
        'private_key',
        'vault_password_file',
    )

    def test_process_arg(self):
        instance = self.get_plugin_instance()

        self.assertIsNone(instance._process_arg('unknown', 'unknown'))
        self.assertEqual(instance._process_arg('verbose', 3), '-vvv')
        self.assertIsNone(instance._process_arg('verbose', 0))

        for arg in self.boolean_args:
            self.assertIsNone(instance._process_arg(arg, False))
            self.assertEqual(instance._process_arg(arg, True), f'--{arg.replace("_", "-")}')

        for arg in self.string_args:
            self.assertIsNone(instance._process_arg(arg, ''))
            self.assertEqual(instance._process_arg(arg, 'test-value'), f'--{arg.replace("_", "-")}=test-value')

        for arg in self.int_args:
            self.assertIsNone(instance._process_arg(arg, 0))
            self.assertEqual(instance._process_arg(arg, 2), f'--{arg.replace("_", "-")}=2')

        for arg in self.file_args:
            self.assertIsNone(instance._process_arg(arg, ''))
            processed_arg = instance._process_arg(arg, 'test-value')
            filepath = processed_arg[processed_arg.index('=') + 1:]
            self.assertEqual(Path(filepath).read_text(), 'test-value')

    def test_get_execution_data(self):
        instance = self.get_plugin_instance()

        all_args = {'module': 'system.ping'}

        for arg in self.boolean_args:
            all_args[arg] = True

        for arg in self.string_args:
            all_args[arg] = f'{arg}:value'

        for arg in self.int_args:
            all_args[arg] = 1

        for arg in self.file_args:
            all_args[arg] = f'{arg}:value'

        all_args['verbose'] = 3
        all_args['invalid'] = 'invalid'

        cmd, env = instance.get_execution_data(
            self.dummy_execution_dir,
            all_args,
            ProjectProxy(DummyProject()),
        )
        raw_inventory = instance.get_raw_inventory()
        self.assertEqual(raw_inventory, 'inventory:value')
        self.assertDictEqual(env, {
            'env1': 'env1_value',
            'env2': 'env2_value',
        })
        self.assertListEqual(cmd[:3], settings.EXECUTOR)
        self.assertEqual(cmd[3], 'ansible')
        self.assertEqual(cmd[4], 'group:value')
        self.assertEqual(cmd[5], '-m')
        self.assertEqual(cmd[6], 'ping')

        # boolean args
        self.assertSetEqual(set(cmd[7:13]), {
            f'--{value.replace("_", "-")}'
            for value in self.boolean_args
        })

        # string args
        self.assertSetEqual(set(cmd[13:28]), {
            f'--{value.replace("_", "-")}={value}:value'
            for value in self.string_args
            if value != 'group'
        })

        # int args
        self.assertSetEqual(set(cmd[28:32]), {
            f'--{value.replace("_", "-")}=1'
            for value in self.int_args
        })

        # file args
        for value in cmd[32:34]:
            arg, *_, filename = value.split('=')
            self.assertEqual(Path(filename).read_text(), f'{arg[2:].replace("-", "_")}:value')

        # other args
        self.assertIn('-vvv', cmd)
        self.assertEqual([v for v in cmd if 'invalid' in v], [])

    def test_get_raw_inventory(self):
        instance = self.get_plugin_instance()

        instance.inventory = """
---
somegroup:
  hosts:
    localhost:
      vars:
        ansible_password: pass
        ansible_ssh_pass: pass
        ansible_ssh_private_key_file: somefile
"""
        raw_inventory = instance.get_raw_inventory()
        self.assertEqual(raw_inventory.strip(), f"""
---
somegroup:
  hosts:
    localhost:
      vars:
        ansible_password: {CYPHER}
        ansible_ssh_pass: {CYPHER}
        ansible_ssh_private_key_file: {CYPHER}
        """.strip())

        inventory = self.get_model_filter('main.Inventory').create(name='test')
        inventory.variables.create(
            key='ansible_password',
            value='pass',
        )
        inventory.variables.create(
            key='ansible_ssh_pass',
            value='pass',
        )

        cmd, _ = instance.get_execution_data(
            self.dummy_execution_dir,
            {'module': 'system.ping', 'inventory': inventory},
            ProjectProxy(DummyProject()),
        )
        raw_inventory = instance.get_raw_inventory()
        self.assertEqual(raw_inventory.strip(), f"""
---
all:
  vars:
    ansible_password: {CYPHER}
    ansible_ssh_pass: {CYPHER}
        """.strip())

        self.assertListEqual(cmd[:3], settings.EXECUTOR)
        self.assertEqual(cmd[3], 'ansible')
        self.assertEqual(cmd[4], 'all')
        self.assertEqual(cmd[5], '-m')
        self.assertEqual(cmd[6], 'ping')
        self.assertIn('--inventory=', cmd[7])
        generated_file = cmd[7].rsplit('=', maxsplit=1)[-1]
        self.assertEqual(Path(generated_file).read_text().strip(), """
---
all:
  vars:
    ansible_password: pass
    ansible_ssh_pass: pass
        """.strip())
