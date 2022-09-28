import json
import io
import os
import re
import time
import shutil
from threading import Thread
from http.server import BaseHTTPRequestHandler, HTTPServer
from django.forms import ValidationError
from django.test import override_settings
from unittest import skipIf
import git
import yaml
from uuid import uuid1
from tempfile import mkdtemp
from pathlib import Path
from requests import Response
from django.core.management import call_command
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from vstutils.utils import raise_context
from django.conf import settings
try:
    from polemarch.main import tasks
    from polemarch.main.openapi import PROJECT_MENU
    from polemarch.main.constants import CYPHER
except ImportError:
    from pmlib.main import tasks
    from pmlib.main.constants import CYPHER


TEST_DATA_DIR = Path(__file__).parent.absolute()
ORIGINAL_PROJECTS_DIR = settings.PROJECTS_DIR
if settings.VST_PROJECT_LIB_NAME == 'polemarch':
    TEST_DATA_DIR /= 'test_data'
else:
    TEST_DATA_DIR /= 'test_data_ce'

User = get_user_model()

example_key = """
-----BEGIN RSA PRIVATE KEY-----
our_private_key_string
-----END RSA PRIVATE KEY-----
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
        except:
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

    def __init__(self, handler: BaseHTTPRequestHandler):
        self.handler = handler

    def __enter__(self) -> HTTPServer:
        self.httpd = HTTPServer(('', 0), self.handler)
        Thread(None, self.httpd.serve_forever).start()
        return self.httpd

    def __exit__(self, exc_cls, exc_object, traceback):
        self.httpd.shutdown()
        if exc_cls is not None:
            exc_cls(exc_object, traceback)


class TestException(Exception):
    def __init__(self, msg='Test exception.', *args, **kwargs):
        super().__init__(msg, *args, **kwargs)


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
            content_type=host_type
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
            f'{settings.PROJECTS_DIR}/{self.project.id}/localhost-inventory.yml'
        )
        self.project.start_repo_task('sync')
        self.inventory_path = 'localhost-inventory.yml'

    def tearDown(self):
        if Path(settings.PROJECTS_DIR).exists():
            shutil.rmtree(settings.PROJECTS_DIR)
        super().tearDown()

    @staticmethod
    def create_project_bulk_data(type='MANUAL', **kwargs):
        return {
            'method': 'post',
            'path': 'project',
            'data': {
                'name': str(uuid1()),
                'type': type,
                **kwargs
            }
        }

    def sync_project_bulk_data(self, project_id=None):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'sync'],
            'data': {}
        }

    def create_variable_bulk_data(self, key, value, project_id=None):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'variables'],
            'data': {'key': key, 'value': value}
        }

    def get_project_bulk_data(self, project_id=None):
        return {
            'method': 'get',
            'path': ['project', project_id or self.project.id]
        }

    def get_history_bulk_data(self, history_id):
        return {
            'method': 'get',
            'path': ['history', history_id]
        }

    def get_raw_history_bulk_data(self, history_id):
        return {
            'method': 'get',
            'path': ['history', history_id, 'raw']
        }

    def execute_module_bulk_data(self, project_id=None, inventory=None, module='ping', **kwargs):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'execute_module'],
            'data': {'module': module, 'inventory': inventory or self.inventory_path, **kwargs}
        }

    def execute_playbook_bulk_data(self, project_id=None, inventory=None, playbook='bootstrap.yml', **kwargs):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'execute_playbook'],
            'data': {'playbook': playbook, 'inventory': inventory or self.inventory_path, **kwargs}
        }

    def create_periodic_task_bulk_data(self, project_id=None, inventory=None, **kwargs):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'periodic_task'],
            'data': {
                'inventory': inventory or self.inventory.id,
                'kind': 'PLAYBOOK',
                'mode': 'playbook.yml',
                'type': 'INTERVAL',
                'schedule': '10',
                **kwargs,
            }
        }

    def create_execution_template_bulk_data(self, project_id=None, inventory=None, **kwargs):
        return {
            'method': 'post',
            'path': ['project', project_id or self.project.id, 'execution_templates'],
            'data': {
                'name': 'ping module',
                'notes': 'lol_notes',
                'inventory': inventory or self.inventory.id,
                'kind': 'Module',
                'data': {
                    'module': 'ping',
                    'vars': {'forks': 5, 'timeout': 30, 'verbose': 2, 'private_key': example_key}
                },
                **kwargs
            }
        }


@own_projects_dir
class ProjectTestCase(BaseProjectTestCase):
    def test_set_owner(self):
        user = self._create_user(is_super_user=False, is_staff=True)
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'set_owner'],
                'data': {'user_id': user.id}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'set_owner'],
                'data': {'user_id': 146}
            },
            {'method': 'get', 'path': ['project', self.project.id]}
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['owner']['id'], user.id)


@own_projects_dir
class InventoryTestCase(BaseProjectTestCase):
    def test_import_inventory(self):
        def check_import(file_import=False):
            inventory = (TEST_DATA_DIR / 'inventory.yml').read_text()
            shutil.copy(
                f'{TEST_DATA_DIR}/inventory.yml',
                f'{settings.PROJECTS_DIR}/{self.project.id}/inventory.yml'
            )

            raw_import_request = {
                'method': 'post',
                'path': ['project', self.project.id, 'inventory', 'import_inventory'],
                'data': {'name': 'inventory', 'raw_data': inventory}
            }
            file_import_request = {
                'method': 'post',
                'path': ['project', self.project.id, 'inventory', 'file_import_inventory'],
                'data': {'name': 'inventory.yml'}
            }
            results = self.bulk([
                # [0] import inventory from string or file to project
                file_import_request if file_import else raw_import_request,
                # [1] check hosts added
                {'method': 'get', 'path': ['inventory', '<<0[data][inventory_id]>>', 'all_hosts']},
                # [2] check groups added
                {'method': 'get', 'path': ['inventory', '<<0[data][inventory_id]>>', 'all_groups']},
                # [3] check variables added
                {'method': 'get', 'path': ['inventory', '<<0[data][inventory_id]>>', 'variables']},
                # [4] check created inventory in project
                {'method': 'get', 'path': ['project', self.project.id, 'inventory', '<<0[data][inventory_id]>>']},
            ])
            self.assertEqual(results[0]['status'], 201)
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['count'], 3)
            self.assertEqual(results[2]['status'], 200)
            self.assertEqual(results[2]['data']['count'], 3)
            self.assertEqual(results[3]['status'], 200)
            self.assertEqual(results[3]['data']['count'], 1)
            self.assertEqual(results[4]['status'], 200)
            self.assertEqual(results[4]['data']['name'], 'inventory')

            return results[0]['data']['inventory_id']

        check_import(file_import=False)
        imported_inventory_id = check_import(file_import=True)

        # check invalid inventory
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'inventory', 'import_inventory'],
                'data': {'name': 'lol', 'raw_data': '*_lol_*'}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'inventory', 'file_import_inventory'],
                'data': {'name': 'not_exists.yml'}
            }
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn('Invalid hostname or IP', results[0]['data']['detail']['other_errors'][0])
        self.assertEqual(results[1]['status'], 400)
        self.assertIn('No such file or directory', results[1]['data']['detail'], results[1]['data'])

        # check file imported inventory updates with project
        with open(f'{settings.PROJECTS_DIR}/{self.project.id}/inventory.yml', 'w') as f:
            f.write('---\n  all:\n    hosts:\n      127.0.0.1')
        results = self.bulk([
            self.sync_project_bulk_data(),
            {'method': 'get', 'path': ['inventory', imported_inventory_id, 'all_hosts']},
            {'method': 'get', 'path': ['inventory', imported_inventory_id, 'all_groups']},
        ])
        for result in results:
            self.assertIn(result['status'], {200, 201}, result)
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(results[2]['data']['count'], 0)

        # remove inventory from file system and sync
        os.remove(f'{settings.PROJECTS_DIR}/{self.project.id}/inventory.yml')
        self.bulk([self.sync_project_bulk_data()])
        self.assertFalse(self.get_model_class('main.Inventory').objects.filter(pk=imported_inventory_id).exists())

        # check remove project also removes imported inventory
        imported_inventory_id = check_import(file_import=True)
        results = self.bulk([
            {  # [0] check have no permission to change imported inventory items
                'method': 'post',
                'path': ['inventory', imported_inventory_id, 'variables'],
                'data': {'key': 'lol', 'value': 'kek'}
            },
            {  # [1] check cannot delete imported inventory while linked project exists
                'method': 'delete',
                'path': ['inventory', imported_inventory_id]
            },
            {  # [2] delete linked project
                'method': 'delete',
                'path': ['project', self.project.id],
            },
        ])
        self.assertEqual(results[0]['status'], 403)
        self.assertEqual(results[1]['status'], 403)
        self.assertEqual(results[2]['status'], 204)
        self.assertFalse(self.get_model_class('main.Inventory').objects.filter(pk=imported_inventory_id).exists())

    def test_delete_linked_inventory(self):
        # check linked inventory to project
        results = self.bulk([{'method': 'delete', 'path': ['inventory', self.inventory.id]}])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(results[0]['data']['detail']['linked_projects'], [str(self.project.id)])

        # check linked inventory to periodic task or exec template
        results = self.bulk([
            self.create_execution_template_bulk_data(),
            self.create_periodic_task_bulk_data(),
            {'method': 'delete', 'path': ['project', self.project.id, 'inventory', self.inventory.id]}
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 400)
        self.assertEqual(results[2]['data']['detail']['linked_templates'], [str(results[0]['data']['id'])])
        self.assertEqual(results[2]['data']['detail']['linked_periodic_tasks'], [str(results[1]['data']['id'])])

    @use_temp_dir
    def test_valid_inventory(self, temp_dir):
        results = self.bulk([
            {  # [0] create inventory with name
                'method': 'post',
                'path': 'inventory',
                'data': {'name': 'inventory', 'notes': 'inventory'},
            },
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
        for result in results:
            self.assertEqual(result['status'], 201)

        # compare generated inventory with ready one
        generated_inventory_id = results[0]['data']['id']
        generated_inventory = self.get_model_class('main.Inventory').objects.get(
            pk=generated_inventory_id
        ).get_inventory(temp_dir)[0]
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
            results = self.bulk([
                {  # [0] create ansible_ssh_private_key_file variable
                    'method': 'post',
                    'path': ['inventory', generated_inventory_id, 'variables'],
                    'data': {'key': 'ansible_ssh_private_key_file', 'value': 'lol_file'}
                },
            ])
            self.assertEqual(results[0]['status'], 201)
            self.get_model_class('main.Inventory').objects.get(pk=generated_inventory_id).get_inventory(temp_dir)

        results = self.bulk([
            {  # [0] get all groups
                'method': 'get',
                'path': ['inventory', generated_inventory_id, 'all_groups']
            },
            {  # [1] get all hosts
                'method': 'get',
                'path': ['inventory', generated_inventory_id, 'all_hosts']
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 3)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], 3)

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
        self.assertEqual(results[1]['data'], ['Group is not children.'])
        self.assertEqual(results[2]['status'], 409)
        self.assertEqual(results[2]['data'], ['Group is not children.'])

        results = self.bulk([
            {'method': 'post', 'path': 'group', 'data': {'children': True}},
            {'method': 'get', 'path': ['group', '<<0[data][id]>>', 'hosts']},
            {'method': 'post', 'path': ['group', '<<0[data][id]>>', 'hosts'], 'data': {'lol': 'kek'}},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 409)
        self.assertEqual(results[1]['data'], ['Group is children.'])
        self.assertEqual(results[2]['status'], 409)
        self.assertEqual(results[2]['data'], ['Group is children.'])

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
        self.assertEqual(results[1]['data']['owner']['id'], user.id)

    def test_path_validator(self):
        try:
            from polemarch.main.validators import path_validator
        except:
            from pmlib.main.validators import path_validator

        valid_paths = {
            './.lol',
            './lol/kek.7z',
            './_l-o+l=',
            'lol/kek.7z',
            'lol.yaml/',
            'lol/kek.7z',
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
                'data': {}
            },
            {  # [1] create host in last non-children group
                'method': 'post',
                'path': ['group', '<<0[data][id]>>', 'hosts'],
                'data': {}
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
                'method': 'post',
                'path': ['group', '<<0[data][id]>>', 'set_owner'],
                'data': {'user_id': self.user.id}
            },
            {  # [5] check subaction in last children group
                'method': 'post',
                'path': ['group', last_children_group_id, 'set_owner'],
                'data': {'user_id': self.user.id}
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
                'headers': {'HTTP_X_Purge_Nested': 'true'}
            },
            {  # [11] delete children group
                'method': 'delete',
                'path': ['group', second_to_last_group_id, 'groups', last_children_group_id],
                'headers': {'HTTP_X_Purge_Nested': 'true'}
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

        self.project.modules.all().delete()

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
        project_modules = self.get_model_class('main.Project').objects.get(
            pk=results[0]['data']['id']
        ).modules.filter(path__startswith='polemarch.project')
        self.assertEqual(project_modules.count(), 2)
        project_module = project_modules[0]
        self.assertEqual(project_module.name, 'test_module')
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

        # execute playbook with sync_on_run set
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', project_id, 'variables'],
                'data': {'key': 'repo_sync_on_run', 'value': True},
            },
            {
                'method': 'post',
                'path': ['project', project_id, 'execute_playbook'],
                'data': {'playbook': 'main.yml'}
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)

        # test invalid git repository
        results = self.bulk([
            self.create_project_bulk_data(type='GIT', repository=f'{temp_dir}/not_existing_dir'),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['status'], 200)
        self.assertDictEqual(results[2]['data'], {
            **results[2]['data'],
            'status': 'ERROR',
            'revision': 'ERROR',
            'branch': 'waiting...'
        })

        def password_and_key_checker(operation, **kwargs):
            password_file = kwargs.get('GIT_ASKPASS')
            ssh_command = kwargs.get('GIT_SSH_COMMAND')
            if password_file is not None:
                saved_pass = Path(password_file).read_text()
                self.assertIn("echo 'lol_password'", saved_pass)
            if ssh_command is not None:
                self.assertIn('ssh -vT -i', ssh_command)
                self.assertIn('PubkeyAuthentication=yes', ssh_command)
                key_file = ssh_command.split(' ')[3]
                with open(key_file, 'r') as f:
                    saved_key = f.read()
                    f.close()
                self.assertIn('lol_key', saved_key)
            return operation(kwargs)

        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.repo._base._Base._operate',
            side_effect=password_and_key_checker
        ):
            # test sync if password is set
            results = self.bulk([
                # [0] create password variable
                {
                    'method': 'post',
                    'path': ['project', project_id, 'variables'],
                    'data': {'key': 'repo_password', 'value': 'lol_password'},
                },
                # [1]
                self.sync_project_bulk_data(project_id=project_id),
                # [2]
                self.get_project_bulk_data(project_id=project_id),
            ])
            self.assertEqual(results[0]['status'], 201)
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[2]['status'], 200)
            self.assertEqual(results[2]['data']['status'], 'OK')
            self.get_model_class('main.Variable').objects.filter(key='repo_password').delete()

            # test sync if key is set
            results = self.bulk([
                # [0] create key variable
                {
                    'method': 'post',
                    'path': ['project', project_id, 'variables'],
                    'data': {'key': 'repo_key', 'value': 'lol_key'},
                },
                # [1]
                self.sync_project_bulk_data(project_id=project_id),
                # [2]
                self.get_project_bulk_data(project_id=project_id),
            ])
            self.assertEqual(results[0]['status'], 201)
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[2]['status'], 200)
            self.assertEqual(results[2]['data']['status'], 'OK')

    @override_settings(CACHES={
        **settings.CACHES,
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'test_sync_after_repo_change',
        }
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
            {'method': 'get', 'path': ['project', '<<0[data][id]>>', 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
            {'method': 'get', 'path': ['project', project_id, 'playbook']},
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
        results = self.bulk([
            self.create_project_bulk_data(),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['status'], 200)
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

        with self.patch('requests.models.Response.text', return_value=project_templates):
            results = self.bulk([
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
                {
                    'method': 'post',
                    'path': ['project', '<<1[data][project_id]>>', 'execute_playbook'],
                    'data': {'playbook': 'main.yml'},
                },
                # [6] check execution
                {'method': 'get', 'path': ['history', '<<5[data][history_id]>>']}
            ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[0]['data']['results'][0]['name'], 'TestProject')
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[1]['data']['name'], 'lol-name')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['name'], 'lol-name')
        self.assertEqual(results[2]['data']['status'], 'NEW')
        self.assertEqual(results[2]['data']['repository'], repo_dir)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data']['status'], 'OK')
        self.assertEqual(results[5]['status'], 201)
        self.assertEqual(results[6]['status'], 200)
        self.assertEqual(results[6]['data']['kind'], 'PLAYBOOK')
        self.assertEqual(results[6]['data']['status'], 'OK')

    @use_temp_dir
    def test_repo_sync_on_run_for_manual_project(self, temp_dir):
        results = self.bulk_transactional([
            self.create_project_bulk_data(),
            self.sync_project_bulk_data(project_id='<<0[data][id]>>'),
            self.create_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
            self.get_project_bulk_data(project_id='<<0[data][id]>>'),
        ])
        self.assertEqual(results[-1]['data']['status'], 'OK')
        self.assertEqual(results[-1]['data']['branch'], 'NO VCS')
        self.assertEqual(results[-1]['data']['revision'], 'NO VCS')
        project_id = results[-1]['data']['id']

        project = self.get_model_filter('main.Project').get(id=project_id)
        (Path(project.path) / 'test.yml').touch()

        mock_dir = Path(temp_dir) / 'project'
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.models.utils.AnsibleCommand._get_tmp_name',
            return_value=mock_dir
        ):
            results = self.bulk_transactional([
                self.execute_module_bulk_data(project_id),
                self.get_history_bulk_data('<<0[data][history_id]>>'),
                self.execute_playbook_bulk_data(project_id, playbook='test.yml'),
                self.get_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[1]['data']['status'], 'OK')
            self.assertEqual(results[1]['data']['revision'], 'NO VCS')

            self.assertEqual(results[3]['data']['status'], 'OK')
            self.assertEqual(results[3]['data']['revision'], 'NO VCS')

            self.assertTrue((mock_dir / 'ansible.cfg').is_file())
            self.assertTrue((mock_dir / 'bootstrap.yml').is_file())
            self.assertTrue((mock_dir / 'test.yml').is_file())

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
            self.create_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
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
                self.create_variable_bulk_data('repo_branch', revision, project_id),
                self.execute_module_bulk_data(project_id),
                self.get_history_bulk_data('<<1[data][history_id]>>'),
                self.get_project_bulk_data(project_id)
            ])
            if not no_assert:
                # history
                self.assertEqual(results[-2]['data']['status'], 'OK')
                self.assertEqual(results[-2]['data']['revision'], revision)
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
        self.assertEqual(results[-2]['data']['revision'], 'invalid')
        self.assertEqual(results[-1]['data']['revision'], revision0)
        self.assertEqual(results[-1]['data']['status'], 'OK')

        # check that with repo_sync_on_run=False execution uses project's revision
        results = self.bulk_transactional([
            self.create_variable_bulk_data('repo_branch', 'master', project_id),
            self.sync_project_bulk_data(project_id),
            self.create_variable_bulk_data('repo_branch', 'invalid', project_id),
            self.create_variable_bulk_data('repo_sync_on_run', False, project_id),
            self.execute_module_bulk_data(project_id),
            self.get_history_bulk_data('<<4[data][history_id]>>'),
            self.get_project_bulk_data(project_id)
        ])
        self.assertEqual(results[-2]['data']['status'], 'OK')
        self.assertEqual(results[-2]['data']['revision'], 'master')
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
                self.create_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
                self.execute_playbook_bulk_data(project_id='<<0[data][id]>>', playbook='main.yml'),
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
                self.execute_playbook_bulk_data(project_id, playbook='main.yml'),
                self.get_history_bulk_data('<<0[data][history_id]>>'),
            ])
            self.assertEqual(results[-1]['data']['status'], 'ERROR')
            self.assertEqual(results[-1]['data']['revision'], 'NO VCS')

            # check that with repo_sync_on_run=False project will be copied
            results = self.bulk_transactional([
                self.create_variable_bulk_data('repo_sync_on_run', False, project_id=project_id),
                self.execute_playbook_bulk_data(project_id, playbook='main.yml'),
                self.get_history_bulk_data('<<1[data][history_id]>>'),
            ])
            self.assertEqual(results[-1]['data']['status'], 'OK')
            self.assertEqual(results[-1]['data']['revision'], 'NO VCS')

    @use_temp_dir
    def test_repo_sync_on_run_timeout(self, temp_dir):
        # up the mock server which will sleep on response
        class MockHandler(BaseHTTPRequestHandler):
            def do_GET(self, *args, **kwargs):
                time.sleep(1.2)
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
            repo.git.submodule('add', '../submodule/.git', 'lib')
            repo.git.submodule('add', f'{submodule_dir}/.git', 'lib2')

            repo.git.add(all=True)
            repo.index.commit('Initial commit')

            results = self.bulk_transactional([
                self.create_project_bulk_data(type='GIT', repository=repo_dir),
                self.sync_project_bulk_data('<<0[data][id]>>'),
                self.create_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
            ])
            project_id = results[0]['data']['id']

            results = self.bulk_transactional([
                {
                    'method': 'patch',
                    'path': ['project', project_id],
                    'data': {'repository': remote}
                },
                self.create_variable_bulk_data('repo_sync_on_run_timeout', 1, project_id),
                self.execute_module_bulk_data(project_id),
                self.get_history_bulk_data('<<2[data][history_id]>>'),
                self.get_raw_history_bulk_data('<<2[data][history_id]>>'),
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
                self.execute_module_bulk_data(project_id),
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
                    self.create_variable_bulk_data('repo_sync_on_run', True, project_id='<<0[data][id]>>'),
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
                self.create_variable_bulk_data('repo_sync_on_run_timeout', 1, project_id),
                self.execute_module_bulk_data(project_id),
                self.get_history_bulk_data('<<2[data][history_id]>>'),
                self.get_raw_history_bulk_data('<<2[data][history_id]>>'),
            ])

            self.assertEqual(results[3]['data']['status'], 'ERROR')
            self.assertEqual(results[4]['data']['detail'], 'Sync error: timeout exceeded.')


@own_projects_dir
class PeriodicTaskTestCase(BaseProjectTestCase):
    def test_periodic_task(self):
        # check correct data
        results = self.bulk([
            # [0]
            self.create_periodic_task_bulk_data(type='INTERVAL', schedule='10'),
            # [1]
            self.create_periodic_task_bulk_data(type='CRONTAB', schedule='* */2 1-15 * sun,fri'),
            # [2]
            self.create_periodic_task_bulk_data(type='CRONTAB', schedule=''),
            # [3]
            self.create_periodic_task_bulk_data(type='CRONTAB', schedule='30 */4'),
            # [4]
            self.create_periodic_task_bulk_data(type='INTERVAL', schedule='10', kind='MODULE', mode='ping'),
            # [5]
            self.create_execution_template_bulk_data(),
            # [6]
            self.create_periodic_task_bulk_data(
                type='INTERVAL',
                schedule='10',
                kind='TEMPLATE',
                template='<<5[data][id]>>',
            ),
        ])
        for result in results:
            self.assertEqual(result['status'], 201)
        playbook_task_id = results[0]['data']['id']
        module_task_id = results[4]['data']['id']
        template_id = results[5]['data']['id']
        template_task_id = results[6]['data']['id']

        results = self.bulk([
            {
                'method': 'patch',
                'path': ['project', self.project.id, 'periodic_task', module_task_id],
                'data': {'enabled': False}
            },
            {
                'method': 'patch',
                'path': ['project', self.project.id, 'periodic_task', module_task_id],
                'data': {'enabled': True}
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['enabled'], False)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['enabled'], True)

        # check wrong data
        results = self.bulk([
            self.create_periodic_task_bulk_data(type='CRONTAB', schedule='* l o l *'),
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn("Invalid weekday literal", results[0]['data']['detail']['schedule'][0])

        # execute template
        results = self.bulk([
            {  # [0] execute playbook task
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', playbook_task_id, 'execute'],
                'data': {}
            },
            {  # [1] check history
                'method': 'get',
                'path': ['project', self.project.id, 'history', '<<0[data][history_id]>>'],
            },
            {  # [2] disable save result
                'method': 'patch',
                'path': ['project', self.project.id, 'periodic_task', playbook_task_id],
                'data': {'save_result': False}
            },
            {  # [3] execute without saving
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', playbook_task_id, 'execute'],
                'data': {}
            },
            {  # [4] execute module task
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', module_task_id, 'execute'],
                'data': {}
            },
            {  # [5] check history
                'method': 'get',
                'path': ['project', self.project.id, 'history', '<<4[data][history_id]>>'],
            },
            {  # [6] execute template task
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', template_task_id, 'execute'],
                'data': {}
            },
            {  # [7] check history
                'method': 'get',
                'path': ['project', self.project.id, 'history', '<<6[data][history_id]>>'],
            },
        ])
        for result in results:
            self.assertIn(result['status'], {200, 201})
        self.assertIn(f'Started at inventory {self.inventory.id}', results[0]['data']['detail'])
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[1]['data']['initiator_type'], 'scheduler')
        self.assertEqual(results[1]['data']['initiator'], playbook_task_id)
        self.assertEqual(results[3]['data']['history_id'], None)
        self.assertIn(f'Started at inventory {self.inventory.id}', results[4]['data']['detail'])
        self.assertEqual(results[5]['data']['status'], 'OK')
        self.assertEqual(results[7]['data']['status'], 'OK')

        template = self.get_model_class('main.Template').objects.get(pk=template_id)

        # check template without inventory
        template.inventory = None
        template.save(update_fields=['inventory'])
        results = self.bulk([
            {  # [0] execute template task
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', template_task_id, 'execute'],
                'data': {}
            },
            {  # [1] check history
                'method': 'get',
                'path': ['project', self.project.id, 'history', '<<0[data][history_id]>>'],
            },
        ])
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['status'], 'OK')

        # check template with inventory path
        template.inventory = self.inventory_path
        template.save(update_fields=['inventory'])
        results = self.bulk([
            {  # [0] execute template task
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', template_task_id, 'execute'],
                'data': {}
            },
            {  # [1] check history
                'method': 'get',
                'path': ['project', self.project.id, 'history', '<<0[data][history_id]>>'],
            },
        ])
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['status'], 'OK')

        # emulate execute by scheduler
        tasks.ScheduledTask.delay(module_task_id)
        results = self.bulk([
            {
                'method': 'get',
                'path': 'history',
                'query': 'ordering=-id'
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['results'][0]['status'], 'OK')
        self.assertEqual(results[0]['data']['results'][0]['kind'], 'MODULE')
        self.assertEqual(results[0]['data']['results'][0]['initiator_type'], 'scheduler')

        # try to execute not existing task
        result = tasks.ScheduledTask.delay(999999)
        self.assertEqual(result.status, 'SUCCESS')

        # check exception while execution
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.models.tasks.PeriodicTask.execute',
            side_effect=TestException
        ) as executor:
            tasks.ScheduledTask.delay(playbook_task_id)
            self.assertEqual(executor.call_count, 1)

        # check patch schedule
        results = self.bulk([
            {  # [0] same schedule
                'method': 'patch',
                'path': ['project', self.project.id, 'periodic_task', module_task_id],
                'data': {'schedule': 10}
            },
            {  # [1] alter schedule
                'method': 'patch',
                'path': ['project', self.project.id, 'periodic_task', module_task_id],
                'data': {'schedule': 20}
            },
            {  # [2] new schedule type
                'method': 'patch',
                'path': ['project', self.project.id, 'periodic_task', module_task_id],
                'data': {'schedule': '* * 1-15 * *', 'type': 'CRONTAB'},
            },
        ])
        for result in results:
            self.assertEqual(result['status'], 200)

        # check delete task
        results = self.bulk([
            {
                'method': 'delete',
                'path': ['project', self.project.id, 'periodic_task', module_task_id]
            }
        ])
        self.assertEqual(results[0]['status'], 204)


@own_projects_dir
class PlaybookAndModuleTestCase(BaseProjectTestCase):
    def test_execute_playbook(self):
        # try to execute not synced project
        project = self.get_model_class('main.Project').objects.create(name='lol_project')
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', project.id, 'execute_playbook'],
                'data': {'playbook': 'bootstrap.yml'},
            },
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual('ERROR project not synchronized', results[0]['data']['detail'])

        def check_execution():
            results = self.bulk([
                {
                    'method': 'post',
                    'path': ['project', self.project.id, 'execute_playbook'],
                    'data': {'playbook': 'playbook.yml', 'inventory': self.inventory.id}
                },
                {
                    'method': 'get',
                    'path': ['history', '<<0[data][history_id]>>'],
                },
                {
                    'method': 'get',
                    'path': ['history', '<<0[data][history_id]>>', 'raw'],
                },
            ])
            self.assertEqual(results[0]['status'], 201)
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['kind'], 'PLAYBOOK')
            self.assertEqual(results[1]['data']['status'], 'OK')
            self.assertEqual(results[1]['data']['initiator_type'], 'project')
            self.assertEqual(results[2]['status'], 200)
            self.assertIn('TASK [Some local task]', results[2]['data']['detail'])
            self.assertIn('ok: [localhost]', results[2]['data']['detail'])
            return results

        results = check_execution()
        self.assertEqual(
            self.get_model_class('main.History').objects.get(pk=results[0]['data']['history_id']).initiator_object.id,
            self.project.id,
        )

        # check again with repo_sync_on_run set
        sync_on_run = self.get_model_class('main.Variable').objects.create(
            key='repo_sync_on_run',
            value=False,
            object_id=self.project.id,
            content_type=ContentType.objects.get(model='project')
        )
        check_execution()

        # check SyncError in execution
        # check exception while execution
        sync_on_run.value = True
        sync_on_run.save(update_fields=['value'])
        check_execution()
        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.utils.CmdExecutor.execute',
            side_effect=self.get_model_class('main.Project').SyncError
        ), self.assertRaises(AssertionError):
            check_execution()

    def test_execute_module(self):
        results = self.bulk([
            {  # [0] invalid module
                'method': 'post',
                'path': ['project', self.project.id, 'execute_module'],
                'data': {'module': 'kek_module', 'inventory': self.inventory_path}
            },
            {  # [1]
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>'],
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'MODULE')
        self.assertEqual(results[1]['data']['status'], 'ERROR')

        def check_with_inventory(inventory, **kwargs):
            results = self.bulk([
                {  # [1] valid module
                    'method': 'post',
                    'path': ['project', self.project.id, 'execute_module'],
                    'data': {'module': 'setup', 'inventory': inventory, **kwargs}
                },
                {  # [2]
                    'method': 'get',
                    'path': ['history', '<<0[data][history_id]>>'],
                },
            ])
            self.assertEqual(results[0]['status'], 201)
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['kind'], 'MODULE')
            self.assertEqual(results[1]['data']['status'], 'OK')
            self.assertEqual(results[1]['data']['initiator_type'], 'project')
            self.assertEqual(results[1]['data']['initiator'], self.project.id)

        check_with_inventory(self.inventory.id)
        check_with_inventory(self.inventory_path)
        check_with_inventory('localhost,', extra_vars='ansible_connection=local')

    def test_gather_facts(self):
        results = self.bulk([
            {  # [0] run setup module
                'method': 'post',
                'path': ['project', self.project.id, 'execute_module'],
                'data': {'module': 'setup', 'inventory': self.inventory.id}
            },
            {  # [1] get setup module history
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>'],
            },
            {  # [2] get facts from setup module
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>', 'facts']
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'MODULE')
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['facts']['localhost']['status'], 'SUCCESS')
        self.assertFalse(results[2]['data']['facts']['localhost']['changed'])

        history_obj = self.get_model_class('main.History').objects.get(pk=results[0]['data']['history_id'])
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
            {  # [0] run ping module
                'method': 'post',
                'path': ['project', self.project.id, 'execute_module'],
                'data': {'module': 'ping', 'inventory': self.inventory.id}
            },
            {  # [1] get ping module history
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>'],
            },
            {  # [2] try to get facts from ping module
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>', 'facts']
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'MODULE')
        self.assertEqual(results[1]['data']['status'], 'OK')
        self.assertEqual(results[2]['status'], 404)
        self.assertEqual(results[2]['data']['error_type'], 'NoFactsAvailableException')

    def test_get_modules(self):
        self.project.modules.create(path='lol.kek', _data='some_data')
        results = self.bulk([
            {  # [0] simple get
                'method': 'get',
                'path': ['project', self.project.id, 'module'],
                'query': 'limit=20',
            },
            {  # [1] use path filter
                'method': 'get',
                'path': ['project', self.project.id, 'module'],
                'query': 'path=s3_website',
            },
            {  # [2] use name filter
                'method': 'get',
                'path': ['project', self.project.id, 'module'],
                'query': 'name=setup',
            },
            {  # [3] get project's module
                'method': 'get',
                'path': ['project', self.project.id, 'module'],
                'query': 'path=lol.kek',
            },
            {  # [4] detail
                'method': 'get',
                'path': ['project', self.project.id, 'module', '<<2[data][results][0][id]>>']
            },
        ])
        for result in results:
            self.assertEqual(result['status'], 200)
        self.assertEqual(len(results[0]['data']['results']), 20)
        self.assertEqual(len(results[1]['data']['results']), 1)
        self.assertEqual(len(results[2]['data']['results']), 1)
        self.assertEqual(len(results[3]['data']['results']), 1)
        self.assertEqual(results[4]['data']['data']['short_description'], 'Gathers facts about remote hosts')
        self.assertIn('Ansible Core Team', results[4]['data']['data']['author'])
        self.assertIn('Michael DeHaan', results[4]['data']['data']['author'])

    def test_ci_template(self):
        # check file private key instead of plain text
        template = self.create_execution_template_bulk_data(
            project_id=self.project.id,
            inventory=self.inventory.id
        )
        template['data']['data']['vars']['private_key'] = 'path/to/key'
        # basic workflow
        results = self.bulk([
            # [0] setup execution template
            template,
            # [1] set ci_template variable
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'ci_template', 'value': '<<0[data][id]>>'}
            },
            # [2] sync
            self.sync_project_bulk_data(),
            # [3] check history list
            {'method': 'get', 'path': 'history'},
            # [4] check history detail
            {'method': 'get', 'path': ['history', '<<0[data][id]>>']}
        ])
        for result in results:
            self.assertIn(result['status'], {200, 201})
        self.assertEqual(len(results[3]['data']['results']), 1)
        self.assertEqual(results[4]['data']['status'], 'OK')
        self.assertEqual(results[4]['data']['kind'], 'MODULE')
        self.assertEqual(results[4]['data']['mode'], 'ping')
        self.assertEqual(results[4]['data']['initiator_type'], 'template')
        exec_template_id = results[0]['data']['id']
        ci_var_id = results[1]['data']['id']

        # test cannot set repo_sync_on_run if ci_template set
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'repo_sync_on_run', 'value': True}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'repo_sync_on_run_timeout', 'value': 12}
            },
        ])
        for result in results:
            self.assertEqual(result['status'], 409)
            self.assertEqual(
                result['data']['detail'],
                'Couldnt install "repo_sync_on_run" settings for CI/CD project.'
            )

        # test cannot set ci_template if repo_sync_on_run set
        results = self.bulk([
            {
                'method': 'delete',
                'path': ['project', self.project.id, 'variables', ci_var_id]
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'repo_sync_on_run', 'value': True}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'ci_template', 'value': exec_template_id}
            }
        ])
        self.assertEqual(results[0]['status'], 204)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 409)
        self.assertEqual(
            results[2]['data']['detail'],
            'Couldnt install CI/CD to project with "repo_sync_on_run" settings.'
        )

        # test cannot use not existing template
        self.get_model_class('main.Variable').objects.all().delete()
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'ci_template', 'value': 9999},
            },
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(
            results[0]['data']['detail']['other_errors'],
            ['Template does not exists in this project.']
        )

    def test_pb_filter(self):
        with open(f'{settings.PROJECTS_DIR}/{self.project.id}/lol.yml', 'w') as f:
            f.write('---\n  - lol: kek')
            f.close()
        self.project.start_repo_task('sync')

        results = self.bulk([
            {
                'method': 'get',
                'path': ['project', self.project.id, 'playbook'],
                'query': 'pb_filter=lol'
            },
            {
                'method': 'get',
                'path': ['project', self.project.id, 'playbook'],
                'query': 'pb_filter=lol.yml'
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 0)

        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(len(results[1]['data']['results']), 1)
        self.assertEqual(results[1]['data']['results'][0]['name'], 'lol')

    def test_filter_name_endswith(self):
        results = self.bulk([
            {
                'method': 'get',
                'path': ['project', self.project.id, 'module'],
                'query': 'name=setup'
            },
            {
                'method': 'get',
                'path': ['project', self.project.id, 'module'],
                'query': 'name=etup'
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[0]['data']['results'][0]['path'], 'system.setup')
        self.assertEqual(results[0]['data']['results'][0]['name'], 'setup')

        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], 0)


@own_projects_dir
class HistoryTestCase(BaseProjectTestCase):
    def test_history_execute_args_validation(self):
        with self.assertRaises(ValidationError):
            self.get_model_class('main.History')().execute_args = 'lol'

    def test_cancel_task_on_history_delete(self):
        complete_task = self.get_model_class('main.History').objects.create(
            status='OK',
            project=self.project,
            mode='lol',
            raw_inventory='lol',
            raw_stdout='text',
        )
        run_task = self.get_model_class('main.History').objects.create(
            status='RUN',
            project=self.project,
            mode='lol',
            raw_inventory='lol',
            raw_stdout='text',
        )
        with self.patch('vstutils.utils.KVExchanger.send') as sender:
            self.assertEqual(0, sender.call_count)
            results = self.bulk([{'method': 'delete', 'path': ['history', run_task.id]}])
            self.assertEqual(results[0]['status'], 204, results[0]['data'])
            self.assertEqual(1, sender.call_count)
            results = self.bulk([{'method': 'delete', 'path': ['history', complete_task.id]}])
            self.assertEqual(results[0]['status'], 204)
            self.assertEqual(1, sender.call_count)
        self.assertIsNone(run_task.initiator_object)

    def test_history_actions(self):
        results = self.bulk([
            {  # [0]
                'method': 'post',
                'path': ['project', self.project.id, 'execute_module'],
                'data': {'module': 'ping', 'inventory': self.inventory.id}
            },
            {  # [1]
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>'],
            },
            {  # [2]
                'method': 'get',
                'path': ['history', '<<0[data][history_id]>>', 'raw'],
            },
            {  # [3]
                'method': 'delete',
                'path': ['history', '<<0[data][history_id]>>', 'clear'],
            },
            {  # [4]
                'method': 'post',
                'path': ['history', '<<0[data][history_id]>>', 'cancel'],
            },
        ])
        self.assertEqual(results[0]['status'], 201)

        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'MODULE')
        self.assertEqual(results[1]['data']['status'], 'OK')

        self.assertEqual(results[2]['status'], 200)
        self.assertIn('"ping": "pong"', results[2]['data']['detail'])
        self.assertIn('"changed": false', results[2]['data']['detail'])

        self.assertEqual(results[3]['status'], 204)
        self.assertEqual(results[3]['data'], {'detail': 'Output trancated.\n'})

        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data'], {'detail': f'Task canceled: {self.project.id}'})

    def test_stats(self):
        def generate_history(status="OK"):
            project = self.get_model_class('main.Project').objects.create(name="Stats", repository='')
            history_inventory = self.get_model_class('main.Inventory').objects.create()
            self.get_model_class('main.History').objects.create(
                start_time=timezone.now() - timezone.timedelta(days=1, hours=1),
                stop_time=timezone.now() - timezone.timedelta(days=1),
                status=status,
                project=project,
                mode='task.yml',
                raw_inventory='inventory',
                raw_stdout='text',
                inventory=history_inventory,
                initiator=self.user.id
            )

        self.get_model_class('main.History').objects.all().delete()
        generate_history(status='OK')
        generate_history(status='ERROR')
        generate_history(status='STOP')

        results = self.bulk([{'method': 'get', 'path': 'stats'}])

        self.assertEqual(results[0]['data']['projects'], self.get_model_class('main.Project').objects.count())
        self.assertEqual(results[0]['data']['inventories'], self.get_model_class('main.Inventory').objects.count())
        self.assertEqual(results[0]['data']['groups'], self.get_model_class('main.Group').objects.count())
        self.assertEqual(results[0]['data']['hosts'], self.get_model_class('main.Host').objects.count())
        self.assertEqual(results[0]['data']['teams'], self.get_model_class('main.UserGroup').objects.count())
        self.assertEqual(results[0]['data']['users'], User.objects.count())
        for unit in ['day', 'month', 'year']:
            self.assertEqual(results[0]['data']['jobs'][unit][0]['status'], 'ERROR')
            self.assertEqual(results[0]['data']['jobs'][unit][1]['status'], 'OK')
            self.assertEqual(results[0]['data']['jobs'][unit][2]['status'], 'STOP')
            for idx in range(3):
                self.assertEqual(results[0]['data']['jobs'][unit][idx]['sum'], 1)
                self.assertEqual(results[0]['data']['jobs'][unit][idx]['all'], 3)


@own_projects_dir
class ExecutionTemplateTestCase(BaseProjectTestCase):
    def test_execution_template_task(self):
        results = self.bulk([
            {  # [0] not existing playbook
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates'],
                'data': {
                    'name': 'lol',
                    'kind': 'Task',
                    'data': {'playbook': 'lol_playbook'}
                }
            },
            {  # [1] execute template
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>', 'execute']
            },
            # [2] get history
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
            # [3] get raw history output
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>', 'raw']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'ERROR')
        self.assertIn('ERROR', results[3]['data']['detail'])
        self.assertIn('the playbook: lol_playbook could not be found', results[3]['data']['detail'])

        results = self.bulk([
            self.create_execution_template_bulk_data(kind='Task', data={'playbook': 'playbook.yml'}),
            {  # [1] execute template
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>', 'execute']
            },
            # [2] get history
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['initiator_type'], 'template')
        self.assertEqual(results[2]['data']['initiator'], results[0]['data']['id'])

    def test_execution_template_module(self):
        results = self.bulk([
            {  # [0] not existing module
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates'],
                'data': {
                    'name': 'lol',
                    'kind': 'Module',
                    'inventory': self.inventory_path,
                    'data': {'module': 'lol_module'}
                }
            },
            {  # [1] execute template
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>', 'execute']
            },
            # [2] get history
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
            # [3] get raw history output
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>', 'raw']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'ERROR')
        self.assertIn('FAILED', results[3]['data']['detail'])
        self.assertIn('The module lol_module was not found', results[3]['data']['detail'])

        results = self.bulk([
            # [0] create template
            self.create_execution_template_bulk_data(project_id=self.project.id, inventory=self.inventory.id),
            {  # [1] execute template
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>', 'execute']
            },
            # [2] get history
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
            {  # [3] get details
                'method': 'get',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>']
            },
            {  # [4] try to change type
                'method': 'patch',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>'],
                'data': {'kind': 'Task'},
            },
            {  # [5] get details
                'method': 'get',
                'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>']
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['data']['initiator_type'], 'template')
        self.assertEqual(results[2]['data']['initiator'], results[0]['data']['id'])

        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['kind'], 'Module')
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[5]['status'], 200)
        self.assertEqual(results[5]['data']['kind'], 'Module')

    def test_execution_templates_options(self):
        template_id = self.bulk([
            self.create_execution_template_bulk_data(
                project_id=self.project.id,
                inventory=self.inventory.id
            )
        ])[0]['data']['id']
        # Test valid data
        results = self.bulk([
            # [0] Get options list
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', template_id, 'option']},
            # [1] Create option
            {
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option'],
                'data': {
                    'name': 'Option 1',
                    'data': {
                        'module': 'other_module',
                        'vars': {
                            'playbook_dir': 'some_dir',
                            'private_key': 'lol-key',
                        }
                    },
                }
            },
            # [2] Get options list
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', template_id, 'option']},
            # [3] Try to change option name
            {
                'method': 'put',
                'path': [
                    'project',
                    self.project.id,
                    'execution_templates',
                    template_id,
                    'option',
                    '<<1[data][id]>>'
                ],
                'data': {
                    'name': 'New name',
                    'data': {
                        'module': 'other_module',
                        'vars': {
                            'playbook_dir': 'some_dir',
                            'private_key': 'lol-key',
                        }
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
                    'option',
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
                    'option',
                    '<<1[data][id]>>'
                ]
            },
            # [6] Get options list
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', template_id, 'option']},
        ])

        # Check empty options list
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(len(results[0]['data']['results']), 0)

        # Check that option successfully created
        self.assertEqual(results[1]['status'], 201)
        self.assertDictEqual(results[1]['data'], {
            'id': 'option-1',
            'kind': 'Module',
            'name': 'Option 1',
            'data': {
                'args': '',
                'group': 'all',
                'module': 'other_module',
                'vars': {
                    'playbook_dir': 'some_dir',
                    'private_key': CYPHER,
                }
            },
        })

        # Check that list contains created option
        self.assertEqual(results[2]['status'], 200)
        self.assertListEqual(results[2]['data']['results'], [{'id': 'option-1', 'name': 'Option 1'}])

        # Check that name of the option is not changed
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['name'], 'Option 1')

        # Check detail view of the option
        self.assertEqual(results[4]['status'], 200)
        self.assertDictEqual(results[4]['data'], {
            'id': 'option-1',
            'kind': 'Module',
            'name': 'Option 1',
            'data': {
                'args': '',
                'group': 'all',
                'module': 'other_module',
                'vars': {
                    'playbook_dir': 'some_dir',
                    'private_key': CYPHER,
                }
            },
        })

        # Check that option removed
        self.assertEqual(results[5]['status'], 204)
        self.assertEqual(len(results[6]['data']['results']), 0)

        # Test invalid data
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option'],
                'data': {
                    'name': 'Option 1',
                    'data': {'playbook': 'file.yml'},
                }
            },
        ])

        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(
            results[0]['data']['playbook'],
            ["Unknown key. Keys should be ['inventory', 'module', 'group', 'args', 'vars']"]
        )

        # Test options with the same name
        results = self.bulk([
            {  # [0]
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option'],
                'data': {
                    'name': 'Option 1',
                    'data': {'module': 'other_module'},
                },
            },
            {  # [1]
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option'],
                'data': {
                    'name': 'Option 2',
                    'data': {'module': 'other_module'},
                },
            },
            {  # [2]
                'method': 'put',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option', '<<0[data][id]>>'],
                'data': {
                    'name': 'Option 1',
                    'data': {'module': 'other_module'},
                }
            },
            {  # [3]
                'method': 'get',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option', '<<0[data][id]>>'],
            },
            {  # [4]
                'method': 'post',
                'path': ['project', self.project.id, 'execution_templates', template_id, 'option'],
                'data': {
                    'name': 'option 1',
                    'data': {'module': 'other_module'},
                },
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['name'], 'Option 1')
        self.assertEqual(results[4]['status'], 400)
        self.assertEqual(results[4]['data'], {
            'error_type': 'IntegrityError',
            'detail': 'Template option name should be unique',
        })

    # NOTE: template api is deprecated. Remove after break support.
    def test_template(self):
        results = self.bulk([
            {  # [0] create module template
                'method': 'post',
                'path': ['project', self.project.id, 'template'],
                'data': {
                    'kind': 'Module',
                    'name': 'Lol template',
                    'data': {
                        'module': 'ping',
                        'group': 'all',
                        'inventory': self.inventory.id,
                        'args': '',
                        'vars': {'forks': 8, 'connection': 'local', 'vault_password_file': 'lol-key'},
                    },
                    'options': {
                        'one': {'module': 'shell', 'args': 'uname', 'vars': {'verbose': 3}},
                        'two': {'vars': {'forks': 1}},
                        'three': {}
                    }
                }
            },
            {  # [1] create task template
                'method': 'post',
                'path': ['project', self.project.id, 'template'],
                'data': {
                    'kind': 'Task',
                    'name': 'Kek template',
                    'data': {'playbook': 'playbook.yml', 'vars': {'forks': 8, 'connection': 'local', 'verbose': 8}},
                    'options': {
                        'one': {'vars': {'limit': 'localhost'}},
                        'two': {'vars': {'forks': 1, 'private_key': 'id_rsa'}},
                    }
                }
            },
            # [2] execute module
            {'method': 'post', 'path': ['project', self.project.id, 'template', '<<0[data][id]>>', 'execute']},
            # [3] execute task
            {'method': 'post', 'path': ['project', self.project.id, 'template', '<<1[data][id]>>', 'execute']},
            {  # [4] execute module with options
                'method': 'post',
                'path': ['project', self.project.id, 'template', '<<0[data][id]>>', 'execute'],
                'data': {'option': 'one'}
            },
            {  # [5] execute module with options
                'method': 'post',
                'path': ['project', self.project.id, 'template', '<<1[data][id]>>', 'execute'],
                'data': {'option': 'one'}
            },
            # [6] get task
            {'method': 'get', 'path': ['project', self.project.id, 'template', '<<1[data][id]>>']},
            {  # [7] update template
                'method': 'patch',
                'path': ['project', self.project.id, 'template', '<<1[data][id]>>'],
                'data': {
                    'kind': 'Task',
                    'name': 'Kek template',
                    'data': {
                        'playbook': 'playbook.yml',
                        'vars': {'private_key': CYPHER}
                    },
                }
            }
        ])
        for result in results:
            self.assertIn(result['status'], {200, 201})
        self.assertEqual(results[0]['data']['data']['vars']['vault_password_file'], CYPHER)
        self.assertEqual(results[6]['data']['options']['two']['vars']['private_key'], CYPHER)
        self.assertEqual(results[7]['data']['data']['vars']['private_key'], CYPHER)

        module_template = results[0]['data']
        task_template = results[1]['data']

        results = self.bulk([
            {
                'method': 'patch',
                'path': ['project', self.project.id, 'template', task_template['id']],
                'data': {'data': {'inventory': self.inventory_path, **task_template['data']}}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'template'],
                'data': {
                    'kind': 'Task',
                    'name': 'Kek template',
                    'data': {'playbook': 'playbook.yml', 'vars': {'forks': 8, 'connection': 'local', 'verbose': 8}},
                    'options': {'vars': {'inventory': 'lol'}}
                }
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['data']['inventory'], self.inventory_path)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[1]['data']['detail']['inventory'], ['Disallowed to override inventory.'])

        results = self.bulk([
            # [0] execute module template
            {'method': 'post', 'path': ['project', self.project.id, 'template', module_template['id'], 'execute']},
            # [1] execute task template
            {'method': 'post', 'path': ['project', self.project.id, 'template', task_template['id'], 'execute']},
            # [2] check module execution history
            {'method': 'get', 'path': ['history', '<<0[data][history_id]>>']},
            # [3] check task execution history
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], 'OK')
        self.assertEqual(results[2]['data']['initiator_type'], 'template')
        self.assertEqual(results[2]['data']['initiator'], module_template['id'])
        self.assertEqual(results[2]['data']['mode'], 'ping')
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['status'], 'OK')
        self.assertEqual(results[3]['data']['initiator_type'], 'template')
        self.assertEqual(results[3]['data']['initiator'], task_template['id'])
        self.assertEqual(results[3]['data']['mode'], 'playbook.yml')

    def test_notificator(self):
        class DummyClient:
            def add(*args):
                pass

            def send(*args):
                pass

        with self.patch(
            f'{settings.VST_PROJECT_LIB_NAME}.main.utils.PolemarchNotificator.get_client',
            return_value=DummyClient()
        ) as client_getter:
            self.assertEqual(client_getter.call_count, 0)
            self.bulk_transactional([self.sync_project_bulk_data()])
            client_getter.assert_any_call()
            client_getter.reset_mock()
            client_getter.assert_not_called()
            self.bulk_transactional([self.execute_module_bulk_data()])
            client_getter.assert_any_call()


@own_projects_dir
class VariableTestCase(BaseProjectTestCase):
    def test_periodic_task_variables_validation(self):
        results = self.bulk([
            # [0] create task
            self.create_periodic_task_bulk_data(),
            {  # [1] correct var
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', '<<0[data][id]>>', 'variables'],
                'data': {'key': 'become', 'value': 'lol_user'}
            },
            {  # [2] wrong var
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', '<<0[data][id]>>', 'variables'],
                'data': {'key': 'kek', 'value': 'lol'}
            },
            {  # [3] check list vars
                'method': 'get',
                'path': ['project', self.project.id, 'periodic_task', '<<0[data][id]>>', 'variables'],
            }
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 400)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['count'], 1)

    def test_copy_project(self):
        results = self.bulk([
            {  # [0] add variable to project
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'repo_sync_on_run_timeout', 'value': 12}
            },
            {  # [1] copy project
                'method': 'post',
                'path': ['project', self.project.id, 'copy'],
                'data': {'name': 'copy'}
            },
            {  # [2] get copied project
                'method': 'get',
                'path': ['project', '<<1[data][id]>>'],
            },
            {  # [3] check variable list of copied project
                'method': 'get',
                'path': ['project', '<<1[data][id]>>', 'variables'],
            },
            {  # [4] check copied variable
                'method': 'get',
                'path': ['project', '<<1[data][id]>>', 'variables', '<<3[data][results][0][id]>>'],
            }
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)

        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['name'], 'copy')

        self.assertEqual(results[4]['data']['key'], 'repo_sync_on_run_timeout')
        self.assertEqual(results[4]['data']['value'], 12)

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

        self.assertEqual(results[2]['status'], 201)
        self.assertFalse(results[2]['data']['value'])

        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[3]['data']['value'], 'lol')

        self.assertEqual(results[4]['status'], 400)
        self.assertIn('Unknown variable key', results[4]['data']['detail']['other_errors'][0])

    def test_playbook_path_variable_validation(self):
        results = self.bulk([
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'playbook_path', 'value': '../kek.yaml'}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'variables'],
                'data': {'key': 'playbook_path', 'value': './lol/kek.yaml'}
            },
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertIn(
            'Invalid path. Path must not contain ".." or any special characters.',
            results[0]['data']['detail']['other_errors'][0]
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
                }
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
                'data': {'key': 'ansible_host', 'value': '1'}
            },
            {
                'method': 'post',
                'path': ['host', self.host.id, 'variables'],
                'data': {'key': 'ansible_host', 'value': '2'}
            }
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        variables_qs = self.get_model_class('main.Variable').objects.all()
        self.assertEqual(variables_qs.count(), 1)
        self.assertEqual(variables_qs[0].key, 'ansible_host')
        self.assertEqual(variables_qs[0].value, '2')

    def check_vars(self, base_path):
        results = self.bulk_transactional([
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
        self.assertEqual(results[0]['data']['value'], CYPHER)
        self.assertTrue(results[1]['data']['value'])
        self.assertEqual(results[2]['data']['value'], 'kek')
        self.assertEqual(results[3]['data']['value'], 'kek_user')
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
            object_id=self.group.id
        )
        self.get_model_class('main.Variable').objects.create(
            key='kek',
            value='lol',
            content_type=group_type,
            object_id=another_group.id
        )

        results = self.bulk([
            {  # [0] get all
                'method': 'get',
                'path': 'group',
            },
            {  # [1] should find 1
                'method': 'get',
                'path': 'group',
                'query': 'variables=lol:kek'
            },
            {  # [2] should find 0
                'method': 'get',
                'path': 'group',
                'query': 'variables=unknown:unknown'
            },
            {  # [3] should raise list index out of range (FIXME: really ??)
                'method': 'get',
                'path': 'group',
                'query': 'variables=kek'
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

    def test_execution_template_private_vars(self):
        results = self.bulk([
            # [0]
            self.create_execution_template_bulk_data(
                kind='Module',
                data={
                    'module': 'ping',
                    'vars': {
                        'private_key': 'lol-key',
                        'vault_password_file': 'lol-file',
                    }
                }
            ),
            # [1]
            self.create_execution_template_bulk_data(
                kind='Task',
                data={
                    'playbook': 'bootstrap.yml',
                    'vars': {
                        'private_key': 'lol-key',
                        'vault_password_file': 'lol-file',
                    }
                }
            ),
            # [2] get module template
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', '<<0[data][id]>>']},
            # [3] get task template
            {'method': 'get', 'path': ['project', self.project.id, 'execution_templates', '<<1[data][id]>>']},
        ])
        for result in results:
            self.assertIn(result['status'], {200, 201}, result)
        self.assertEqual(results[-2]['data']['data']['vars']['private_key'], CYPHER)
        self.assertEqual(results[-2]['data']['data']['vars']['vault_password_file'], CYPHER)
        self.assertEqual(results[-1]['data']['data']['vars']['private_key'], CYPHER)
        self.assertEqual(results[-1]['data']['data']['vars']['vault_password_file'], CYPHER)

    def test_periodic_task_private_vars(self):
        results = self.bulk_transactional([
            self.create_periodic_task_bulk_data(),
            {
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', '<<0[data][id]>>', 'variables'],
                'data': {'key': 'private_key', 'value': 'lol-key'}
            },
            {
                'method': 'post',
                'path': ['project', self.project.id, 'periodic_task', '<<0[data][id]>>', 'variables'],
                'data': {'key': 'vault_password_file', 'value': 'lol-file'}
            },
            {
                'method': 'get',
                'path': ['project', self.project.id, 'periodic_task', '<<0[data][id]>>', 'variables'],
            },
        ])
        self.assertEqual(results[-1]['data']['count'], 2)
        self.assertEqual(results[-1]['data']['results'][0]['key'], 'private_key')
        self.assertEqual(results[-1]['data']['results'][0]['value'], CYPHER)
        self.assertEqual(results[-1]['data']['results'][1]['key'], 'vault_password_file')
        self.assertEqual(results[-1]['data']['results'][1]['value'], CYPHER)

    def test_history_raw_inventory_private_vars(self):
        results = self.bulk_transactional([
            {
                'method': 'post',
                'path': ['inventory', self.inventory.id, 'variables'],
                'data': {'key': 'ansible_ssh_pass', 'value': 'lol-pass'}
            },
            self.execute_module_bulk_data(inventory=self.inventory.id),
            {'method': 'get', 'path': ['history', '<<1[data][history_id]>>']},
        ])
        self.assertIn('ansible_ssh_pass: [~~ENCRYPTED~~]', results[-1]['data']['raw_inventory'])

    def test_vars_property_caching(self):
        self.project.vars = {'repo_branch': 'master'}
        self.assertDictEqual(self.project.vars, {'repo_branch': 'master'})

        self.project.vars = {
            'repo_branch': 'slave',
            'repo_password': CYPHER,
            'repo_sync_on_run': True
        }
        self.assertDictEqual(self.project.vars, {
            'repo_branch': 'slave',
            'repo_password': CYPHER,
            'repo_sync_on_run': True
        })


@own_projects_dir
class HookTestCase(BaseProjectTestCase):
    def setUp(self):
        super().setUp()
        shutil.copy(f'{TEST_DATA_DIR}/script_hook.sh', f'{settings.HOOKS_DIR}/script_hook.sh')
        self.script_hook = self.get_model_filter('main.Hook').create(type='SCRIPT', recipients='script_hook.sh')
        self.http_hook = self.get_model_filter('main.Hook').create(type='HTTP', recipients='https://example.com')

    def tearDown(self):
        super().tearDown()
        os.remove(f'{settings.HOOKS_DIR}/script_hook.sh')

    @staticmethod
    def create_hook_bulk_data(type, recipients, when):
        return {
            'method': 'post',
            'path': 'hook',
            'data': {
                'enable': True,
                'recipients': recipients,
                'type': type,
                'when': when
            }
        }

    def test_create_hook(self):
        results = self.bulk([
            # [0] create valid script hook
            self.create_hook_bulk_data(type='SCRIPT', recipients='script_hook.sh', when='on_object_add'),
            # [1] invalid when
            self.create_hook_bulk_data(type='SCRIPT', recipients='script_hook.sh', when='lol'),
            # [2] invalid recipient
            self.create_hook_bulk_data(type='SCRIPT', recipients='lols', when='on_object_add'),
            # [3] create valid http hook
            self.create_hook_bulk_data(type='HTTP', recipients='lols', when='on_object_add'),
            # [4] invalid when
            self.create_hook_bulk_data(type='HTTP', recipients='lols', when='lol'),
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 400)
        self.assertIn('not a valid choice', results[1]['data']['when'][0])
        self.assertEqual(results[2]['status'], 400)
        self.assertIn('Recipients must be in hooks dir', results[2]['data']['detail']['recipients'][0])
        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[1]['status'], 400)

    def test_hook_when(self):
        self._login()

        @self.patch('requests.api.request')
        def check_hook(request, when, bulk_data, call_count=1, status=None):
            status = {status} if status else set()
            request.assert_not_called()
            self.get_model_filter('main.Hook').all().delete()
            self.get_model_filter('main.Hook').create(type='HTTP', recipients='lols', when=when)
            results = self.bulk(bulk_data, relogin=False)
            self.assertIn(results[0]['status'], status or {200, 201, 204}, results[0]['data'])
            self.assertEqual(request.call_count, call_count)

        # check wrong when
        with self.assertRaises(ValidationError):
            self.get_model_filter('main.Hook').create(type='HTTP', recipients='lols', when='lol')

        # *_execution
        check_hook(
            when='on_execution',
            bulk_data=[
                {
                    'method': 'post',
                    'path': ['project', self.project.id, 'execute_module'],
                    'data': {'module': 'kek_module'}
                }
            ]
        )
        check_hook(
            when='after_execution',
            bulk_data=[
                {
                    'method': 'post',
                    'path': ['project', self.project.id, 'execute_module'],
                    'data': {'module': 'kek_module'}
                }
            ]
        )

        # on_object_*
        check_hook(
            when='on_object_add',
            bulk_data=[{'method': 'post', 'path': 'host', 'data': {}}]
        )
        host = self.get_model_filter('main.Host').first()
        check_hook(
            when='on_object_upd',
            bulk_data=[{'method': 'patch', 'path': ['host', host.id], 'data': {'name': 'lol'}}]
        )
        check_hook(
            when='on_object_del',
            bulk_data=[{'method': 'delete', 'path': ['host', host.id]}]
        )

        # on_user_*
        check_hook(
            when='on_user_add',
            bulk_data=[
                {
                    'method': 'post',
                    'path': 'user',
                    'data': {
                        'username': 'lol_user',
                        'password': 'lol_pass',
                        'password2': 'lol_pass',
                    }
                }
            ]
        )
        user = User.objects.get(username='lol_user')
        check_hook(
            when='on_user_upd',
            bulk_data=[{'method': 'patch', 'path': ['user', user.id], 'data': {'username': 'kek_user'}}],
        )
        check_hook(
            when='on_user_del',
            bulk_data=[{'method': 'delete', 'path': ['user', user.id]}]
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
                        'password': 'kek_pass',
                        'password2': 'kek_pass',
                    }
                }
            ]
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
                        'password': 'kek_pass',
                        'password2': 'pass_kek',
                    }
                }
            ],
            status=403,
            call_count=0
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
        json_data = kwargs.get('json')
        self.assertEqual(url, self.http_hook.recipients)
        self.assertEqual(json_data.get('type'), 'on_execution')
        self.assertEqual(json_data.get('payload'), {'test': 'test'})
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
            out.getvalue().replace('\x1b[32;1m', '').replace('\x1b[0m', '')
        )


class UserTestCase(VSTBaseTestCase):
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
                'password2': '1q2w3e'
            }}
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
                    'password2': 'user'
                }}
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
                    'password2': 'user1'
                }}
            ])

        self.assertEqual(results[0]['status'], 403)

    def test_update(self):
        results = self.bulk([
            {'method': 'patch', 'path': ['user', self.user.id], 'data': {'username': 'new_username'}},
            {'method': 'get', 'path': ['user', self.user.id]}
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['username'], 'new_username')
        self.assertEqual(results[1]['data']['username'], 'new_username')

    def test_delete_token(self):
        response = self.client.delete(self.get_url('token'))
        self.assertEqual(response.status_code, 400)

        self.client.logout()
        result = self.result(
            self.client.post,
            self.get_url('token'),
            data={'username': self.user.username, 'password': self.user.username.upper()}
        )
        response = self.client.delete(
            self.get_url('token'),
            HTTP_AUTHORIZATION=f'Token {result["token"]}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 204)


class BaseOpenAPITestCase(VSTBaseTestCase):
    maxDiff = None
    _schema = None

    system_tab = {
        'name': 'System',
        'span_class': 'fa fa-cog',
        'sublinks': []
    }
    users_sublink = {
        'name': 'Users',
        'url': '/user',
        'span_class': 'fa fa-user',
    }
    hooks_sublink = {
        'name': 'Hooks',
        'url': '/hook',
        'span_class': 'fa fa-plug'
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

    def test_schema(self):
        schema = self.schema()
        openapi_schema_yml = yaml.load(Path(self.openapi_schema_yaml).read_text(), Loader=yaml.SafeLoader)

        openapi_schema_yml['host'] = self.server_name
        openapi_schema_yml['schemes'][0] = 'https'
        openapi_schema_yml['info']['contact'] = schema['info']['contact']
        openapi_schema_yml['info']['x-versions'] = schema['info']['x-versions']
        openapi_schema_yml['info']['x-links'] = schema['info']['x-links']
        openapi_schema_yml['info']['x-user-id'] = schema['info']['x-user-id']

        for key in list(filter(lambda x: 'Ansible' in x, openapi_schema_yml['definitions'].keys())):
            del openapi_schema_yml['definitions'][key]
            del schema['definitions'][key]

        del openapi_schema_yml['definitions']['_MainSettings']
        del schema['definitions']['_MainSettings']

        with raise_context():
            openapi_schema_yml['definitions']['ProjectDir']['properties']['content']["x-options"]['types'] = \
                schema['definitions']['ProjectDir']['properties']['content']["x-options"]['types']

        for module in ('paths', 'definitions'):
            for key, value in openapi_schema_yml[module].items():
                self.assertDictEqual(value, schema[module].get(key), key)

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
