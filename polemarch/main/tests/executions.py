import shutil
import uuid
import tempfile
import logging
from collections import OrderedDict
from datetime import timedelta

import git
import requests
import six
from django.conf import settings
from django.utils.timezone import now
from yaml import dump, load as from_yaml, Loader

from ._base import BaseTestCase, os
from ..tasks import ScheduledTask
from ..unittests.ansible import inventory_data, valid_inventory

logger = logging.getLogger('polemarch')
pm_mod = settings.VST_PROJECT_LIB_NAME
test_ansible_cfg = '''
[defaults]
library = lib:lib2
'''

test_module_content = '''
#!/usr/bin/python
# -*- coding: utf-8 -*-

ANSIBLE_METADATA = {'metadata_version': '1.1',
                    'status': ['stableinterface'],
                    'supported_by': 'core'}

DOCUMENTATION = """
---
module: test_module
short_description: Test module
description:
  - Test module for check functionality.
version_added: "0.0.2"
options:
  name:
    description:
      - Test description.
author: "Sergey Klyuykov"
notes:
   - Test module
"""
'''

test_playbook_content = '''
---
- hosts: all
  gather_facts: False
  vars:
    ansible_connection: local
  tasks:
    - name: Some local task
      ping:
'''

test_yaml_templates = {
    'test module': {
        "notes": "Module test template.",
        "kind": "Module",
        "data": {
            "group": "all",
            "vars": {},
            "args": "",
            "module": "ping",
            "inventory": 'localhost,'
        },
        "options": {
            "uptime": {
                "args": "uptime",
                "module": "shell"
            },
        }
    },
    'test playbook': {
        "notes": "Playbook test template.",
        "kind": "Task",
        "data": {
            "vars": {
                "become": True
            },
            "playbook": "main.yml",
            "inventory": 'localhost,'
        },
        "options": {
            "update": {
                "playbook": "other.yml"
            }
        }
    }
}

test_yaml_view = {
    'fields': {
        'string': {
            'title': 'Field string',
            'default': 0,
            'format': 'string',
            'help': 'Some help text'
        },
        'integer': {
            'title': 'Field integer',
            'default': 0,
            'format': 'integer',
            'help': 'Some help text'
        },
        'float': {
            'title': 'Field float',
            'default': 0,
            'format': 'float',
            'help': 'Some help text'
        },
        'boolean': {
            'title': 'Field boolean',
            'default': 0,
            'format': 'boolean',
            'help': 'Some help text'
        },
        'enum_string': {
            'title': 'Field enum_string',
            'default': 0,
            'format': 'string',
            'help': 'Some help text',
            'enum': list(range(10))
        },
        'unknown': {
            'title': 'Field unknown',
            'default': 0,
            'format': 'invalid_or_unknown',
            'help': 'Some help text'
        },
    },
    'playbooks': {
        'main.yml': {
            'title': 'Execute title',
            'help': 'Some help text'
        }
    }
}

project_template_response = '''
---
- id: 1
  name: test_template_1
  repository: git@test.repo.url:/path/to/project
- id: 2
  name: test_template_2
  repository: http://test.repo.url/path/to/project.git
- id: 3
  name: test_template_3
  description: |
    Some text with
    new
    lines
  type: TAR
  repository: http://test.repo.url/path/to/project.tar.gz
'''


class Object(object):
    pass


class BaseExecutionsTestCase(BaseTestCase):
    def setUp(self):
        super(BaseExecutionsTestCase, self).setUp()
        self.path = self._settings('PROJECTS_DIR', '/tmp/unknown')

    @property
    def template_module(self):
        return dict(
            kind="Module",
            name='Test module template',
            data=dict(
                module="ping",
                group="all",
                inventory='localhost',
                args="",
                vars=dict(
                    forks=8,
                    connection='local'
                ),
            ),
            options=dict(
                one=dict(module='shell', args='uname', verbose=3),
                two=dict(vars=dict(forks=1))
            )
        )

    @property
    def template_playbook(self):
        return dict(
            kind="Task",
            name='Test playbook template',
            data=dict(
                playbook="test-0.yml",
                inventory='localhost',
                vars=dict(
                    forks=8,
                    connection='local',
                    verbose=4,
                ),
            ),
            options=dict(
                tree=dict(vars=dict(limit='localhost')),
                four=dict(vars={'forks': 1, 'private_key': './key.pem'})
            )
        )

    def get_periodic_task_data(self, pk, template_id):
        periodic_template = dict(
            kind='TEMPLATE', template=template_id, schedule="10", type="INTERVAL",
        )
        return [
            self.get_mod_bulk('project', pk, periodic_template, 'periodic_task'),
        ]

    def get_templates_data(self, bulk_data, pk, inventory='localhost,'):
        template_module = self.template_module
        template_module['data']['inventory'] = inventory
        template_playbook = self.template_playbook
        template_playbook['data']['inventory'] = inventory
        count_bulk = len(bulk_data)
        template_module_index = count_bulk
        return (
            bulk_data + [
                self.get_mod_bulk('project', pk, template_module, 'template'),
                self.get_mod_bulk('project', pk, template_playbook, 'template'),
            ] +
            self.get_periodic_task_data(
                pk, '<{}[data][id]>'.format(template_module_index)
            )
        )

    def get_complex_data(self, with_subs=False):
        hostlocl_v = dict(ansible_user='centos', ansible_ssh_private_key_file='PATH')
        groups1_v = dict(ansible_user='ubuntu', ansible_ssh_pass='mypass')
        complex_inventory_v = dict(
            ansible_ssh_private_key_file="PATH", custom_var1='hello_world'
        )
        bulk_data = [
            # Create hosts
            self.get_complex_bulk('host', name='127.0.1.1'),
            self.get_complex_bulk('host', name='127.0.1.[3:4]', type="RANGE"),
            self.get_complex_bulk('host', name='127.0.1.[5:6]', type="RANGE"),
            self.get_complex_bulk('host', name='hostlocl'),
            # Create groups
            self.get_complex_bulk('group', name='hosts1'),
            self.get_complex_bulk('group', name='hosts2'),
            self.get_complex_bulk('group', name='groups1', children=True),
            self.get_complex_bulk('group', name='groups2', children=True),
            self.get_complex_bulk('group', name='groups3', children=True),
            # Create inventory
            self.get_complex_bulk('inventory', name='complex_inventory'),
        ]
        # Create manual project
        bulk_data += [
            self.get_complex_bulk('project', name="complex", repository='MANUAL')
        ]
        # Set vars
        bulk_data += [
            self.get_mod_bulk('host', "<3[data][id]>", dict(key=k, value=v))
            for k, v in hostlocl_v.items()
        ]
        bulk_data += [
            self.get_mod_bulk('group', "<6[data][id]>", dict(key=k, value=v))
            for k, v in groups1_v.items()
        ]
        bulk_data += [
            self.get_mod_bulk('inventory', "<9[data][id]>", dict(key=k, value=v))
            for k, v in complex_inventory_v.items()
        ]
        # Add children
        bulk_data += [
            # to hosts1
            self.get_mod_bulk(
                'group', "<4[data][id]>", dict(id="<0[data][id]>"), 'host',
            ),
            self.get_mod_bulk(
                'group', "<4[data][id]>", dict(id="<3[data][id]>"), 'host',
            ),
            # to hosts2
            self.get_mod_bulk(
                'group', "<5[data][id]>", dict(id="<1[data][id]>"), 'host',
            ),
            self.get_mod_bulk(
                'group', "<5[data][id]>", dict(id="<2[data][id]>"), 'host',
            ),
            # to groups1
            self.get_mod_bulk(
                'group', "<6[data][id]>", dict(id="<7[data][id]>"), 'group',
            ),
            self.get_mod_bulk(
                'group', "<6[data][id]>", dict(id="<8[data][id]>"), 'group',
            ),
            # to groups2
            self.get_mod_bulk(
                'group', "<7[data][id]>", dict(id="<8[data][id]>"), 'group',
            ),
            # to groups3
            self.get_mod_bulk(
                'group', "<8[data][id]>", dict(id="<4[data][id]>"), 'group',
            ),
            self.get_mod_bulk(
                'group', "<8[data][id]>", dict(id="<5[data][id]>"), 'group',
            ),
            # to inventory
            self.get_mod_bulk(
                'inventory', "<9[data][id]>", dict(id="<6[data][id]>"), 'group',
            ),
            self.get_mod_bulk(
                'inventory', "<9[data][id]>", dict(id="<0[data][id]>"), 'host',
            ),
            self.get_mod_bulk(
                'inventory', "<9[data][id]>", dict(id="<1[data][id]>"), 'host',
            ),
            self.get_mod_bulk(
                'inventory', "<9[data][id]>", dict(id="<3[data][id]>"), 'host',
            ),
            # to project
            self.get_mod_bulk(
                'project', "<10[data][id]>", dict(id="<9[data][id]>"), 'inventory'
            ),
        ]
        bulk_data = (
            self.get_templates_data(bulk_data, "<10[data][id]>", "<9[data][id]>")
            if with_subs else bulk_data
        )
        # Execute actions
        _exec = dict(
            connection="local", inventory="<9[data][id]>",
            module="ping", group="127.0.1.1", args="", forks=1, verbose=4
        )
        bulk_data += [
            self.get_mod_bulk(
                'project', "<10[data][id]>", {}, 'sync',
            ),
            self.get_mod_bulk(
                'project', "<10[data][id]>", _exec, 'execute_module',
            ),
            self.get_bulk(
                'history', {}, 'get',
                pk="<{}[data][history_id]>".format(len(bulk_data) + 1)
            ),
            self.get_mod_bulk(
                'history', "<{}[data][history_id]>".format(len(bulk_data) + 1), {},
                'raw', 'get', filters='color=yes'
            ),
        ]
        return bulk_data

    def get_access_deps(self):
        return self.get_complex_data(with_subs=True)

    def is_equal_dict(self, origin, desc, stack=None):
        stack = stack if stack else []
        for k, v in origin.items():
            stack.append(k)
            if isinstance(v, dict):
                self.is_equal_dict(v, desc[k], stack)
            else:
                msg = 'Difference in key {}'.format('.'.join(stack))
                self.assertEqual(v, desc[k], msg)

    def generate_subs(self, bulk_results=None):
        # Create project and dependences
        if bulk_results is None:
            bulk_results = self.make_bulk(self.get_access_deps())
        objects = OrderedDict(
            host=[], group=[], inventory=[],
            project=[], template=[], periodic_task=[], history=[],
            team=[]
        )
        hard_subitems = ['template', 'periodic_task']
        for result in bulk_results:
            if result['type'] == 'add':
                self.assertEqual(result['status'], 201)
                objects[result['item']].append(result['data'])
            if result['type'] == 'mod' and result['subitem'] in hard_subitems:
                self.assertEqual(result['status'], 201)
                objects[result['subitem']].append(result['data'])
            if result['type'] == 'get' and result['item'] == 'history':
                self.assertEqual(result['status'], 200)
                history = result['data']
                self.assertEqual(history['revision'], "NO VCS")
                self.assertEqual(history['mode'], 'ping')
                self.assertEqual(history['kind'], 'MODULE')
                self.assertEqual(history['inventory'], objects['inventory'][0]['id'])
                self.assertEqual(
                    history['status'], "OK",
                    self.get_result('get', self.get_url('history', history['id'], 'raw'))
                )
                yaml_inv = from_yaml(history['raw_inventory'], Loader)
                gr3 = {
                    'hosts1': {
                        'hosts': {
                            '127.0.1.1': None,
                            'hostlocl': {
                                'ansible_user': 'centos',
                                'ansible_ssh_private_key_file': ['~~ENCRYPTED~~']
                            }
                        }
                    },
                    'hosts2': {
                        'hosts': {
                            '127.0.1.[3:4]': None,
                            '127.0.1.[5:6]': None
                        }
                    }
                }
                etalon = {
                    'all':
                        {
                            'hosts': {
                                '127.0.1.1': None,
                                '127.0.1.[3:4]': None,
                                'hostlocl': {
                                    'ansible_ssh_private_key_file': ['~~ENCRYPTED~~'],
                                    'ansible_user': 'centos'
                                }
                            },
                            'children': {
                                'groups1': {
                                    'children':
                                        {
                                            'groups2': {
                                                'children': {
                                                    'groups3': {
                                                        'children': gr3
                                                    }
                                                }
                                            },
                                            'groups3': {
                                                'children': gr3
                                            }
                                        },
                                    'vars':
                                        {
                                            'ansible_user': 'ubuntu',
                                            'ansible_ssh_pass': ['~~ENCRYPTED~~'],
                                        },
                                }
                            },
                            'vars':
                                {
                                    'ansible_ssh_private_key_file': ['~~ENCRYPTED~~'],
                                    'custom_var1': 'hello_world'
                                }
                        }
                }
                self.is_equal_dict(yaml_inv, etalon)
                objects[result['item']].append(history)
        return objects

    def get_project_dir(self, id, **kwargs):
        return '{}/{}'.format(self.path, id)

    def sync_project(self, id, **kwargs):
        return self.make_bulk([
            self.get_mod_bulk('project', id, {}, 'sync'),
            self.get_bulk('project', {}, 'get', pk=id)
        ])[1]['data']

    def create_project_test(self, name=None, repo_type="MANUAL", **kwargs):
        name = name or str(uuid.uuid1())
        status_after_create = kwargs.pop('status_new', 'NEW')
        status_after_sync = kwargs.pop('status', 'OK')
        status_after_rm_sync = kwargs.pop('status_rm', status_after_sync)
        result = self.mass_create_bulk('project', [
            dict(
                name=name, repository=kwargs.pop('repository', repo_type),
                branch=kwargs.pop('branch', None),
                variables=dict(repo_type=repo_type, **kwargs)
            )
        ])
        project_data = result[0]['data']
        self.assertEqual(project_data['status'], status_after_create)
        self.assertEqual(project_data['name'], name)
        project_data = self.sync_project(project_data['id'])
        self.assertEqual(project_data['status'], status_after_sync)
        self.assertEqual(project_data['name'], name)
        self.remove_project_dir(project_data['id'])
        project_data = self.sync_project(project_data['id'])
        self.assertEqual(project_data['status'], status_after_rm_sync)
        self.assertEqual(project_data['name'], name)
        return project_data

    def remove_project_dir(self, id, **kwargs):
        shutil.rmtree(self.get_project_dir(id, **kwargs))

    def remove_project(self, id, **kwargs):
        self.get_result('delete', self.get_url('project', id))
        self.assertFalse(os.path.exists(self.get_project_dir(id, **kwargs)))

    def _check_copy_project(self, id, **kwargs):
        obj = self.get_model_filter('Project', pk=id).get()
        bulk_data = [
            self.get_mod_bulk('project', obj.id, {'name': 'copied'}, 'copy'),
            self.get_mod_bulk('project', '<0[data][id]>', {}, 'variables', method='GET'),
            self.get_bulk('project', {}, 'del', pk='<0[data][id]>'),
        ]
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[0]['data']['status'], 'NEW')
        self.assertEqual(results[1]['data']['count'], len(obj.vars))
        for value in results[1]['data']['results']:
            self.assertIn(
                value['value'], [obj.vars[value['key']], '[~~ENCRYPTED~~]'], value
            )

    def project_workflow(self, repo_type, **kwargs):
        execute = kwargs.pop('execute', False)
        project_data = self.create_project_test(str(uuid.uuid1()), repo_type, **kwargs)
        self.remove_project_dir(**project_data)
        self.remove_project(**project_data)
        project_data = self.create_project_test(str(uuid.uuid1()), repo_type, **kwargs)
        try:
            self._check_copy_project(**project_data)
            if not execute:
                return
            kwargs = getattr(self, 'wip_{}'.format(repo_type.lower()), str)(project_data)
            kwargs = kwargs if not isinstance(kwargs, six.string_types) else dict()
            self.change_owner(project_data)
            self.playbook_tests(project_data, **kwargs)
            self.module_tests(project_data)
        finally:
            self.remove_project(**project_data)

    def get_file_path(self, name, path):
        return "{}/{}".format(path, name)

    def generate_playbook(self, path, name='test', count=1, data=test_playbook_content):
        '''
        Generate playbooks in project path

        :param path: path, where playbook will appear
        :type path: str,unicode
        :param name: filename pattern or list of names for playbooks
        :type name: str,unicode,list,tuple
        :param count: count files for pattern
        :type count: int
        :param data: playbook data
        :type data: str,bytes,unicode
        :return:
        '''
        files = []
        if isinstance(name, (list, tuple)):
            _files = name[:count or len(name)]
        else:
            _files = ['{}-{}.yml'.format(name, i) for i in range(count or 1)]
        for filename in _files:
            file_path = self.get_file_path(filename, path)
            with open(file_path, 'w') as playbook:
                playbook.write(data)
            files.append(filename)
        return files

    def project_bulk_sync_and_playbooks(self, id, **kwargs):
        return [
            self.get_mod_bulk('project', id, {}, 'sync', 'post'),
            self.get_mod_bulk('project', id, {}, 'playbook', 'get'),
        ]

    def change_owner(self, project_data):
        new_owner = self._create_user(False)
        pk = project_data['id']
        bulk_data = [
            self.get_mod_bulk('project', pk, dict(user_id=new_owner.id), 'set_owner'),
            self.get_bulk('project', {}, 'get', pk=pk),
            self.get_mod_bulk('project', pk, dict(user_id=self.user.id), 'set_owner'),
            self.get_bulk('project', {}, 'get', pk=pk),
        ]
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[2]['status'], 201)
        self.assertEqual(results[1]['data']['owner']['id'], new_owner.id)
        self.assertEqual(results[3]['data']['owner']['id'], self.user.id)

    def project_execute(self, project_data, exec_data=None, type='playbook'):
        exec_data = exec_data or dict(
            playbook='main.yml', inventory='inventory.ini',
            save_result=False, verbose=4
        )
        exec_data['check'] = True
        exec_data['syntax-check'] = True
        return self.make_bulk([
            self.get_mod_bulk(
                'project', project_data['id'], exec_data, 'execute_{}'.format(type)
            ),
            self.get_mod_bulk(
                'project', project_data['id'], {}, 'history/<0[data][history_id]>', 'get'
            ),
        ], 'put')

    def playbook_tests(self, prj, playbook_count=1, execute=None, inventory="localhost"):
        _exec = dict(
            connection="local", limit="docker",
            playbook="<1[data][results][0][playbook]>", inventory=inventory,
            private_key='BEGIN RSA PRIVATE KEY'
        )
        bulk_data = self.project_bulk_sync_and_playbooks(prj['id'])
        bulk_data += [
            self.get_mod_bulk('project', prj['id'], _exec, 'execute_playbook'),
        ] if execute else []
        results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], playbook_count)
        if not execute:
            return
        self.assertEqual(results[2]['status'], 201)

    def module_tests(self, prj):
        bulk_data = [
            self.get_mod_bulk(
                'project', prj['id'], {}, 'module', 'get', filters='limit=20'
            ),
            self.get_mod_bulk(
                'project', prj['id'], {}, 'module', 'get', filters='path=s3_website'
            ),
            self.get_mod_bulk(
                'project', prj['id'], {}, 'module/<1[data][results][0][id]>', 'get'
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')
        for result in results:
            self.assertEqual(result['status'], 200)
        self.assertTrue(results[0]['data']['count'] > 1000)
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(results[1]['data']['results'][0]['name'], 's3_website')
        self.assertEqual(results[2]['data']['data']['module'], 's3_website')

    def get_complex_bulk(self, item, op='add', **kwargs):
        return self.get_bulk(item, kwargs, op)


class ProjectTestCase(BaseExecutionsTestCase):

    def tearDown(self):
        super(ProjectTestCase, self).tearDown()
        repo_dir = getattr(self, 'repo_dir', None)
        submodule_dir = getattr(self, 'submodule_dir', None)
        if repo_dir:
            if os.path.exists(repo_dir):
                shutil.rmtree(repo_dir)
        if submodule_dir:
            if os.path.exists(submodule_dir):
                shutil.rmtree(submodule_dir)

    def wip_manual(self, project_data):
        files = self.generate_playbook(self.get_project_dir(**project_data))
        path = self.get_project_dir(**project_data)
        self.get_model_filter('Project', pk=project_data['id']).get().set_status('NEW')
        self.sync_project(**project_data)
        # Create test ssh-key
        with open(self.get_file_path('key.pem', path), 'w') as key:
            key.write('BEGIN RSA PRIVATE KEY')
        self.make_test_templates(project_data)
        self.make_test_periodic_task(project_data)
        self.make_test_readme(project_data)
        self.make_test_restrict_sync(project_data)
        return dict(playbook_count=len(files), execute=True)

    def wip_git(self, project_data):
        # Check brunch and revision
        self.assertEqual(project_data['revision'], self.revisions[-1])
        self.assertEqual(project_data['branch'], 'master')
        # Update branch
        new_branch_var = dict(key='repo_branch', value='invalid_branch')
        self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var)
        ])
        project_data = self.sync_project(project_data['id'])
        self.assertEqual(project_data['status'], 'ERROR')
        self.assertEqual(project_data['branch'], 'waiting...')

        new_branch_var = dict(key='repo_branch', value='master')
        self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var)
        ])
        project_data = self.sync_project(project_data['id'])
        self.assertEqual(project_data['status'], 'OK')
        self.assertEqual(project_data['branch'], 'master')

        new_branch_var = dict(key='repo_branch', value='tags/new_tag')
        self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var)
        ])
        project_data = self.sync_project(project_data['id'])
        # Check updated brunch and revision
        self.assertEqual(project_data['branch'], 'tags/new_tag')
        self.assertEqual(project_data['revision'], self.revisions[1])
        # Return old branch
        new_branch_var['value'] = 'new_branch'
        self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var)
        ])
        project_data = self.sync_project(project_data['id'])
        new_branch_var['value'] = 'master'
        results = self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var),
            self.get_mod_bulk(
                'project', project_data['id'], {},
                method='get', filters='key=repo_sync_on_run'
            ),
            self.get_mod_bulk('project', project_data['id'], {}, 'template', 'get'),
        ])
        # Check synced templates
        self.assertTrue(results[1]['data']['results'][0]['value'])
        self.assertEqual(results[2]['data']['count'], 2)
        for template in results[2]['data']['results']:
            origin_template_data = test_yaml_templates[template['name']]
            for option in origin_template_data['options'].keys():
                self.assertIn(option, template['options_list'])
        # Check extra execute-view data in project
        extra_view_data = project_data['execute_view_data']
        for field_name in test_yaml_view['fields']:
            self.assertIn(field_name, extra_view_data['fields'].keys())
            field = extra_view_data['fields'][field_name]
            for required_field in ['title', 'default', 'format', 'help']:
                self.assertIn(required_field, field.keys())
            self.assertEqual(field_name.split('_')[-1], field['format'], field)
            default_type = (six.string_types, six.text_type)
            if field['format'] == 'boolean':
                default_type = bool
            elif field['format'] == 'integer':
                default_type = int
            elif field['format'] == 'float':
                default_type = float
            self.assertTrue(isinstance(field['default'], default_type), field)
            if field_name == 'enum_string':
                self.assertIn('enum', field.keys())
                self.assertTrue(isinstance(field['enum'], (list, tuple)))
                for value in field['enum']:
                    self.assertTrue(isinstance(value, default_type))
        for playbook_name in test_yaml_view['playbooks']:
            self.assertIn(playbook_name, extra_view_data['playbooks'].keys())
            playbook = extra_view_data['playbooks'][playbook_name]
            for required_field in ['title', 'help']:
                self.assertIn(required_field, playbook.keys())
        # Check ansible.cfg
        proj = self.get_model_filter('Project', pk=project_data['id']).get()
        proj_config = getattr(proj, 'config', None)
        self.assertTrue(proj_config is not None)
        # Check modules and git submodules sync
        proj_modules = proj.module.filter(path__startswith='polemarch.project.')
        self.assertEqual(proj_modules.count(), 1)
        proj_module = proj_modules.first()
        self.assertEqual(proj_module.name, 'test_module')
        self.assertEqual(proj_module.data['short_description'], 'Test module')
        self.assertTrue(os.path.exists(os.path.join(proj.path, 'sm1', 'test_module.py')))
        return dict(playbook_count=len(self.revisions), execute=True)

    def make_test_templates(self, project_data):
        pk = project_data['id']
        template_module = self.template_module
        template_playbook = self.template_playbook
        template_playbook['options']['tree']['vars']['private-key'] = 'PATH'
        template_playbook['data']['vars']['private-key'] = './key.pem'
        m_opts = dict(option='one')
        p_opts = dict(option='four')
        bulk_data = [
            self.get_mod_bulk('project', pk, template_module, 'template'),
            self.get_mod_bulk('project', pk, template_playbook, 'template'),
            self.get_mod_bulk('project', pk, {}, 'template/<0[data][id]>/execute'),
            self.get_mod_bulk('project', pk, {}, 'template/<1[data][id]>/execute'),
            self.get_mod_bulk('project', pk, m_opts, 'template/<0[data][id]>/execute'),
            self.get_mod_bulk('project', pk, p_opts, 'template/<1[data][id]>/execute'),
            self.get_mod_bulk('project', pk, {}, 'template/<1[data][id]>', 'get'),
        ]
        results = self.make_bulk(bulk_data)
        for result in results:
            if result['status'] == 200:
                self.assertEqual(
                    result['data']['options']['tree']['vars']['private-key'],
                    '[~~ENCRYPTED~~]'
                )
                continue
            self.assertEqual(result['status'], 201)

        tmplt_mod = results[0]['data']
        tmplt_play = results[1]['data']
        # Check update keys
        check_update = self.make_bulk([
            self.get_mod_bulk(
                'project', pk, dict(data=tmplt_play['data']),
                'template/{}'.format(tmplt_play['id']), 'patch'
            ),
        ])[0]
        self.assertEqual(check_update['status'], 200)
        self.assertEqual(
            check_update['data']['data']['vars']['private-key'], '[~~ENCRYPTED~~]'
        )
        results = self.get_result(
            'get', self.get_url('project', project_data['id'], 'history') + '?limit=4'
        )
        self.assertEqual(results['results'][-1]['status'], 'OK')
        self.assertEqual(results['results'][-1]['kind'], 'MODULE')
        self.assertEqual(results['results'][-1]['initiator_type'], 'template')
        self.assertEqual(results['results'][-1]['mode'], 'ping')
        self.assertEqual(results['results'][-2]['status'], 'OK')
        self.assertEqual(results['results'][-2]['kind'], 'PLAYBOOK')
        self.assertEqual(results['results'][-2]['initiator_type'], 'template')
        self.assertEqual(results['results'][-2]['mode'], 'test-0.yml')
        self.assertEqual(results['results'][-3]['status'], 'OK')
        self.assertEqual(results['results'][-3]['kind'], 'MODULE')
        self.assertEqual(results['results'][-3]['initiator_type'], 'template')
        self.assertEqual(results['results'][-3]['options']['template_option'], 'one')
        self.assertEqual(results['results'][-4]['status'], 'OK')
        self.assertEqual(results['results'][-4]['kind'], 'PLAYBOOK')
        self.assertEqual(results['results'][-4]['initiator_type'], 'template')
        self.assertEqual(results['results'][-4]['options']['template_option'], 'four')

        # Templates in periodic tasks
        data = dict(
            mode="test-1.yml", schedule="10", type="INTERVAL",
            project=project_data['id'],
            inventory='localhost,', name="one"
        )
        new_data = dict(kind='TEMPLATE', template=tmplt_mod['id'], template_opt='one')
        bulk_data = [
            self.get_mod_bulk('project', pk, data, 'periodic_task'),
            self.get_mod_bulk(
                'project', pk, new_data, 'periodic_task/<0[data][id]>', 'patch'
            ),
        ]
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['kind'], 'TEMPLATE')
        self.assertEqual(results[1]['data']['inventory'], '')
        self.assertEqual(results[1]['data']['mode'], '')
        # Create new periodic_tasks
        ptask_data = [
            dict(
                kind='TEMPLATE', template=tmplt_mod['id'], template_opt='one',
                schedule="10", type="INTERVAL"
            ),
            dict(
                kind='TEMPLATE', template=tmplt_play['id'], template_opt='four',
                schedule="10", type="INTERVAL"
            ),
        ]
        bulk_data = [
            self.get_mod_bulk('project', pk, dt, 'periodic_task')
            for dt in ptask_data
        ]
        results = self.make_bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 201)
            ScheduledTask.delay(result['data']['id'])
        results = self.get_result(
            'get', self.get_url('project', project_data['id'], 'history') + '?limit=2'
        )
        self.assertEqual(results['results'][-1]['status'], 'OK')
        self.assertEqual(results['results'][-1]['kind'], 'MODULE')
        self.assertEqual(results['results'][-1]['initiator_type'], 'scheduler')
        self.assertEqual(results['results'][-1]['mode'], 'shell')
        self.assertEqual(results['results'][-2]['status'], 'OK')
        self.assertEqual(results['results'][-2]['kind'], 'PLAYBOOK')
        self.assertEqual(results['results'][-2]['initiator_type'], 'scheduler')
        self.assertEqual(results['results'][-2]['mode'], 'test-0.yml')

        # Try to send cencel message
        result = self.get_result(
            'post', self.get_url(
                'project', project_data['id'],
                'history/{}/cancel'.format(results['results'][-2]['id'])
            ),
            code=200
        )
        self.assertEqual(
            result['detail'], "Task canceled: {}".format(results['results'][-2]['id'])
        )
        # Check Templates without inventory
        invalid_type_template = dict(**template_playbook)
        invalid_type_template['kind'] = 'UnknownKind'
        invalid_options_template = dict(**template_playbook)
        invalid_options_template['options'] = 'options'
        invalid_override_template = dict(**template_playbook)
        invalid_override_template['options'] = dict(test=dict(inventory='some_ovveride'))
        bulk_data = [
            self.get_mod_bulk('project', pk, invalid_type_template, 'template'),
            self.get_mod_bulk('project', pk, invalid_options_template, 'template'),
            self.get_mod_bulk('project', pk, invalid_override_template, 'template'),
        ]
        results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[2]['status'], 400)
        self.assertEqual(
            results[2]['data']['detail']['inventory'],
            ["Disallowed to override inventory."]
        )

    def make_test_periodic_task(self, project_data):
        # Check periodic tasks
        # Check correct values
        ptasks_data = [
            dict(
                mode="test-1.yml", schedule="10", type="INTERVAL",
                project=project_data['id'],
                inventory='localhost', name="one"
            ),
            dict(
                mode="test-1.yml",
                schedule="* */2 1-15 * sun,fri",
                type="CRONTAB", project=project_data['id'],
                inventory='localhost', name="two"
            ),
            dict(
                mode="test-1.yml", schedule="", type="CRONTAB",
                project=project_data['id'],
                inventory='localhost', name="thre"
            ),
            dict(
                mode="test-1.yml", schedule="30 */4", type="CRONTAB",
                project=project_data['id'],
                inventory='localhost', name="four"
            ),
            dict(
                mode="ping", schedule="10", type="INTERVAL",
                project=project_data['id'],
                kind="MODULE", name="one", inventory='localhost'
            )
        ]
        bulk_data = [
            self.get_mod_bulk('project', project_data['id'], data, 'periodic_task')
            for data in ptasks_data
        ]
        bulk_data += [
            self.get_mod_bulk(
                'project', project_data['id'], dict(key='connection', value='local'),
                'periodic_task/<0[data][id]>/variables'
            ),
            self.get_mod_bulk(
                'project', project_data['id'], dict(key='forks', value='5'),
                'periodic_task/<0[data][id]>/variables'
            ),
        ]
        results = self.make_bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 201)
        # Check incorrect values
        incorrect_ptasks_data = [
            dict(
                mode="test-1.yml", schedule="30 */4 foo", type="CRONTAB",
                project=project_data['id'], inventory='localhost'
            ),
            dict(
                mode="test-1.yml", schedule="30 */4", type="crontab",
                project=project_data['id'], inventory='localhost',
                name="four"
            ),
        ]
        bulk_data = [
            self.get_mod_bulk('project', project_data['id'], data, 'periodic_task')
            for data in incorrect_ptasks_data
        ]
        bulk_data += [
            self.get_mod_bulk(
                'project', project_data['id'], dict(key='incorrect_var', value='blabla'),
                'periodic_task/{}/variables'.format(results[0]['data']['id'])
            ),
            self.get_mod_bulk(
                'project', project_data['id'], dict(key='forks', value='3423kldf'),
                'periodic_task/{}/variables'.format(results[4]['data']['id'])
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[0]['status'], 400)
        self.assertIn(
            "Invalid weekday literal", results[0]['data']['detail']['schedule'][0]
        )
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[2]['status'], 400)
        self.assertIn("Incorrect argument", results[2]['data']["detail"]['playbook'][0])
        self.assertIn('incorrect_var', results[2]['data']["detail"]['argument'][0])
        self.assertEqual(results[3]['status'], 400)
        self.assertIn("Incorrect argument", results[3]['data']["detail"]['module'][0])
        self.assertIn('forks', results[3]['data']["detail"]['argument'][0])

        # Try to execute now
        data = dict(
            mode="test-0.yml", schedule="10", type="INTERVAL", name="one",
            project=project_data['id'], inventory='localhost,'
        )
        results = self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], data, 'periodic_task'),
            self.get_mod_bulk(
                'project', project_data['id'], data,
                'periodic_task/<0[data][id]>/execute',
                'post'
            ),
            self.get_mod_bulk(
                'project', project_data['id'], {}, 'history/<1[data][history_id]>', 'get'
            ),
            self.get_mod_bulk(
                'project', project_data['id'], dict(save_result=False),
                'periodic_task/<0[data][id]>', 'patch'
            ),
            self.get_mod_bulk(
                'project', project_data['id'], data,
                'periodic_task/<0[data][id]>/execute',
                'post'
            ),
            self.get_mod_bulk(
                'project', project_data['id'], dict(save_result=True),
                'periodic_task/<0[data][id]>', 'patch'
            ),
        ], 'put')
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(
            results[1]['data']['detail'], "Started at inventory localhost,."
        )
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['status'], "OK")
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[4]['status'], 201)
        self.assertEqual(results[4]['data']['history_id'], None)
        self.assertEqual(results[5]['status'], 200)
        # Just exec
        ScheduledTask.delay(results[0]['data']['id'])
        # Except on execution
        with self.patch('{}.main.utils.CmdExecutor.execute'.format(pm_mod)) as _exec:
            def _exec_error(*args, **kwargs):
                raise Exception("It is not error. Just test execution.")

            _exec.side_effect = _exec_error
            ScheduledTask.delay(results[0]['data']['id'])
            self.assertEquals(_exec.call_count, 1)
            _exec.reset_mock()

        # No task
        with self.patch('{}.main.utils.CmdExecutor.execute'.format(pm_mod)) as _exec:
            ScheduledTask.delay(999)
            self.assertEquals(_exec.call_count, 0)

        results = self.get_result(
            'get', self.get_url('project', project_data['id'], 'history') + '?limit=2'
        )
        self.assertEqual(results['results'][-1]['status'], 'OK')
        self.assertEqual(results['results'][-2]['status'], 'ERROR')

    def make_test_readme(self, project_data):
        project = self.get_model_filter("Project", pk=project_data['id']).get()

        def get_bulk_readme():
            bulk_data = [
                self.get_mod_bulk('project', project_data['id'], {}, 'sync', 'post'),
                self.get_bulk('project', {}, 'get', pk=project_data['id']),
            ]
            results = self.make_bulk(bulk_data)
            self.assertEqual(results[0]['status'], 200)
            self.assertEqual(results[1]['status'], 200)
            return results[1]['data']

        with open(project.path + "/readme.md", "w") as f:
            f.write("# test README.md \n **bold** \n *italic* \n")

        self.assertEqual(
            get_bulk_readme()['readme_content'],
            '<h1 id="test-readmemd">test README.md</h1>\n\n<p><strong>bold</strong>' +
            ' \n <em>italic</em> </p>\n'
        )
        with open(project.path + "/readme.rst", "w") as f:
            f.write("test README.rst \n **bold** \n *italic* \n")

        self.assertEqual(
            get_bulk_readme()['readme_content'],
            '<div class="document">\n<dl class="docutils">\n<dt>' +
            'test README.rst</dt>\n<dd><strong>bold</strong>\n' +
            '<em>italic</em></dd>\n</dl>\n</div>\n'
        )

    def make_test_restrict_sync(self, project_data):
        self.get_model_filter('Project', pk=project_data['id']).get().set_status('NEW')
        data = dict(
            connection="local", inventory="<9[data][id]>",
            module="ping", group="127.0.1.1", args="", forks=1, verbose=4
        )
        result = self.make_bulk([
            self.get_mod_bulk(
                'project', project_data["id"], data, 'execute_module',
            ),
        ], 'put')[0]
        self.assertEqual(result['status'], 400)

        result = self.make_bulk([
            self.get_mod_bulk(
                'project', project_data["id"], data, 'execute_module',
            ),
        ], 'put')[0]
        self.assertEqual(result['status'], 400)

    def test_project_manual(self):
        self.project_workflow('MANUAL', execute=True)

    def test_project_tar(self):
        with self.patch('{}.main.repo._base._ArchiveRepo._download'.format(pm_mod)) as d:
            d.side_effect = [self.tests_path + '/test_repo.tar.gz'] * 10
            self.project_workflow(
                'TAR', repository='http://localhost:8000/test_repo.tar.gz', execute=True
            )
            d.reset_mock()

            # try error
            def over_download(*args, **kwargs):
                raise Exception("It is not error. Just test")

            result = self.mass_create_bulk('project', [
                dict(
                    name=str(uuid.uuid1()),
                    repository='http://localhost:8000/test_repo.tar.gz',
                    variables=dict(
                        repo_type="TAR", repo_sync_on_run=True
                    )
                )
            ])
            project_data = result[0]['data']
            correct_add = self.make_bulk([
                dict(
                    data_type=['project', project_data['id'], 'variables'],
                    data=dict(key='env_test_var', value="TestVar"), method='post'
                ),
            ], 'put')
            self.assertEqual(correct_add[0]['status'], 201)
            error = self.make_bulk([
                dict(
                    data_type=['project', project_data['id'], 'variables'],
                    data=dict(key='err_key', value="error"), method='post'
                ),
            ], 'put')
            self.assertEqual(error[0]['status'], 400)
            self.sync_project(project_data['id'])
            self.project_execute(project_data)

            with self.patch('tarfile.open') as extract:
                extract.side_effect = over_download
                _ex_module = dict(
                    module='ping', group='all',
                    inventory='192.168.254.255', become_method='sudo'
                )
                _ex_playbook = dict(
                    playbook='unknown.yml', inventory='192.168.254.255',
                    private_key='BEGIN RSA PRIVATE KEY'
                )
                unsync = dict(key='repo_sync_on_run', value=False)
                pk = project_data['id']
                results = self.make_bulk([
                    self.get_bulk('project', {}, 'get', pk=pk),
                    self.get_mod_bulk('project', pk, _ex_module, 'execute_module'),
                    self.get_mod_bulk('project', pk, unsync, 'variables'),
                    self.get_mod_bulk('project', pk, _ex_playbook, 'execute_playbook'),
                    self.get_bulk('project', {}, 'get', pk=pk),
                    self.get_mod_bulk(
                        'project', pk, {}, 'history', method='get', filters='limit=2'
                    ),
                ], 'put')
                project_data = results[-2]['data']
                self.assertEqual(project_data['status'], 'ERROR')
                self.assertEqual(results[-1]['data']['results'][-1]['status'], 'OK')
                self.assertEqual(results[-1]['data']['results'][-2]['status'], 'ERROR')
                self.assertEqual(results[-1]['data']['count'], 2)

    def test_project_git(self):
        # Prepare .polemarch.yaml
        pm_yaml = dict()
        # sync_on_run
        pm_yaml['sync_on_run'] = True
        # templates
        pm_yaml['templates'] = test_yaml_templates
        pm_yaml['templates_rewrite'] = False
        # fast task widget
        pm_yaml['view'] = test_yaml_view
        # Prepare repo
        self.repo_dir = tempfile.mkdtemp()
        self.submodule_dir = "{}_submodule".format(self.repo_dir)
        self.generate_playbook(self.repo_dir, ['main.yml'])
        self.generate_playbook(self.repo_dir, ['.polemarch.yaml'], data=dump(pm_yaml))
        self.generate_playbook(self.repo_dir, ['ansible.cfg'], data=test_ansible_cfg)
        lib_dir = self.submodule_dir
        if not os.path.exists(lib_dir):
            os.makedirs(lib_dir)
            self.generate_playbook(lib_dir, ['test_module.py'], data=test_module_content)
        # Create submodule
        submodule_repo = git.Repo.init(self.submodule_dir)
        submodule_repo.index.add(['test_module.py'])
        submodule_repo.index.commit("no message")
        repo = git.Repo.init(self.repo_dir)
        # Add submodules
        repo.git.submodule(
            'add', '../{}/.git'.format(self.submodule_dir.split('/')[-1]), 'lib'
        )
        repo.git.submodule('add', '{}/.git'.format(self.submodule_dir), 'sm1')
        repo.index.add(["main.yml", ".polemarch.yaml", "ansible.cfg"])
        repo.index.commit("no message")
        first_revision = repo.head.object.hexsha
        repo.create_head('new_branch')
        pm_yaml['sync_on_run'] = False
        self.generate_playbook(self.repo_dir, ['.polemarch.yaml'], data=dump(pm_yaml))
        self.generate_playbook(self.repo_dir, ['other.yml'])
        repo.index.add(["other.yml", ".polemarch.yaml"])
        repo.index.commit("no message 2")
        second_revision = repo.head.object.hexsha
        repo.create_tag('new_tag')

        # Test project
        self.revisions = [first_revision, second_revision]
        self.project_workflow(
            'GIT', repository=self.repo_dir, repo_password='', execute=True
        )
        self.project_workflow(
            'GIT', repository=self.repo_dir, repo_branch='new_branch', repo_key='key'
        )

        # Test invalid repo
        result = self.mass_create_bulk('project', [
            dict(
                name=str(uuid.uuid1()), repository='/tmp/not_git_path',
                variables=dict(repo_type="GIT")
            )
        ])
        project_data = result[0]['data']
        results = self.make_bulk([
            self.get_bulk('project', {}, 'get', pk=project_data['id']),
            self.get_mod_bulk('project', '<0[data][id]>', {}, 'sync'),
            self.get_bulk('project', {}, 'get', pk=project_data['id']),
        ], 'put')
        project_data = results[2]['data']
        self.assertEqual(project_data['status'], 'ERROR')
        self.assertEqual(project_data['revision'], 'ERROR')
        self.assertEqual(project_data['branch'], 'waiting...')

    def test_on_change_other_to_git(self):
        # Prepare project and clean repository
        project_data = self.create_project_test(str(uuid.uuid1()))
        self.repo_dir = self.get_project_dir(**project_data)
        self.generate_playbook(self.repo_dir, ['.polemarch.yaml'], data=dump(dict()))
        self.sync_project(**project_data)

        self.submodule_dir = tempfile.mkdtemp()
        repo = git.Repo.init(self.submodule_dir, bare=True)

        # Try to change project type
        results = self.make_bulk([
            dict(data_type=['project', project_data['id'], 'variables'], method='post',
                 data={'key': 'repo_type', 'value': 'GIT'}),
            dict(data_type=['project', project_data['id']], method='patch',
                 data={'repository': self.submodule_dir}),
            dict(data_type=['project', project_data['id'], 'sync'], method='post')
        ], 'put')
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['status'], 200)
        self.assertTrue(os.path.exists(os.path.join(self.repo_dir, '.polemarch.yaml')))
        self.assertEqual(repo.head.commit.summary, 'Create project from Polemarch.')
        self.assertEqual(repo.head.commit.tree.blobs[0].name, '.polemarch.yaml')

    def test_complex(self):  # update test for new yaml based inv generator
        bulk_data = self.get_complex_data()
        # additionaly test hooks
        self.hook_model.objects.all().delete()
        hook_urls = ['localhost:64000', 'localhost:64001']
        recipients = ' | '.join(hook_urls)
        data = [
            dict(type='HTTP', recipients=recipients, when='on_execution'),
            dict(type='HTTP', recipients=recipients, when='after_execution'),
        ]
        self.generate_hooks(hook_urls)
        self.mass_create_bulk('hook', data)
        response = Object()
        response.status_code = 200
        response.reason = None
        response.text = "OK"
        ##
        with self.patch('requests.post') as mock:
            iterations = 2 * len(hook_urls)
            mock.side_effect = [response] * iterations
            # results = self.make_bulk(bulk_data, 'put')
            subs = self.generate_subs()
            self.assertEqual(mock.call_count, iterations)
            self.hook_model.objects.all().delete()
        # Check clear output
        bulk_data = [
            self.get_mod_bulk(
                'history', subs['history'][0]['id'], {}, 'raw', 'get',
            ),
            self.get_mod_bulk(
                'history', subs['history'][0]['id'], {}, 'clear', 'delete',
            ),
            self.get_mod_bulk(
                'project', subs['history'][0]['project'], {},
                'history/{}/raw'.format(subs['history'][0]['id']), 'get',
            ),
        ]
        new_results = self.make_bulk(bulk_data)
        self.assertEqual(new_results[0]['status'], 200)
        self.assertEqual(new_results[1]['status'], 204)
        self.assertEqual(new_results[2]['status'], 200)
        self.assertEqual(new_results[2]['data']['detail'], "Output trancated.\n")
        # Check all_hosts
        self.mass_create_bulk('host', [
            dict(name='complex{}'.format(i)) for i in range(3)
        ])
        bulk_data = [
            self.get_mod_bulk(
                'inventory', subs['inventory'][0]['id'], {}, 'all_hosts', 'get',
            ),
            self.get_mod_bulk(
                'inventory', subs['inventory'][0]['id'], {}, 'all_hosts', 'post',
            ),
            self.get_mod_bulk(
                'inventory', subs['inventory'][0]['id'], {}, 'all_groups', 'get',
            ),
            self.get_mod_bulk(
                'inventory', subs['inventory'][0]['id'], {}, 'all_groups', 'post',
            ),
        ]
        new_results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(new_results[0]['status'], 200)
        self.assertEqual(new_results[0]['data']['count'], 4)
        self.assertEqual(new_results[1]['status'], 405)
        self.assertEqual(new_results[2]['status'], 200)
        self.assertEqual(new_results[2]['data']['count'], 5)
        self.assertEqual(new_results[3]['status'], 405)

        # Check history filters
        df = "%Y-%m-%dT%H:%M:%S.%fZ"
        now_time = (now() + timedelta(hours=1)).strftime(df)
        bulk_data = [
            self.get_bulk('history', {}, 'get', filters='newer={}'.format(now_time)),
            self.get_bulk('history', {}, 'get', filters='older={}'.format(now_time)),
        ]
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 0)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], len(subs['history']))

    def test_project_required_inventory(self):
        # Test removing inventory linked to periodic task or template
        bulk_data = [
            self.get_complex_bulk('inventory', name='project_required_inventory'),
            self.get_complex_bulk('project', name='project_req', repository='MANUAL'),
            # to project
            self.get_mod_bulk(
                'project', "<1[data][id]>", dict(id="<0[data][id]>"), 'inventory'
            ),
        ]
        bulk_data = self.get_templates_data(bulk_data, "<1[data][id]>", "<0[data][id]>")
        subs = self.generate_subs(self.make_bulk(bulk_data))
        subs['project'][0] = self.sync_project(subs['project'][0]['id'])
        prj_id = subs['project'][0]['id']
        inv_id = subs['inventory'][0]['id']
        ptask_id = subs['periodic_task'][0]['id']
        tmplt_ids = [t['id'] for t in subs['template']]
        test_bulk_data = [
            self.get_mod_bulk(
                'project', prj_id, {}, 'inventory/{}'.format(inv_id), 'delete'
            ),
            self.get_mod_bulk(
                'project', prj_id, {}, 'periodic_task/{}'.format(ptask_id), 'delete'
            ),
            self.get_mod_bulk(
                'project', prj_id, {}, 'inventory/{}'.format(inv_id), 'delete'
            ),
            self.get_mod_bulk(
                'project', prj_id, {}, 'template/{}'.format(tmplt_ids[0]), 'delete'
            ),
            self.get_mod_bulk(
                'project', prj_id, {}, 'inventory/{}'.format(inv_id), 'delete'
            ),
            self.get_mod_bulk(
                'project', prj_id, {}, 'template/{}'.format(tmplt_ids[1]), 'delete'
            ),
            self.get_bulk('inventory', {}, 'del', pk=inv_id),
            self.get_mod_bulk(
                'project', prj_id, {}, 'inventory/{}'.format(inv_id), 'delete'
            ),
            self.get_bulk('inventory', {}, 'del', pk=inv_id),
        ]
        results = self.make_bulk(test_bulk_data, 'put')
        for result in results[:-2]:
            if 'inventory' not in result.get('subitem', result['item']):
                self.assertEqual(result['status'], 204, result)
            else:
                self.assertEqual(result['status'], 400, result)
        self.assertEqual(results[-2]['status'], 204)
        self.assertEqual(results[-1]['status'], 204)
        self.assertTrue(not self.get_model_filter('Inventory', pk=inv_id).exists())

    def test_history_facts(self):
        history_kwargs = dict(project=None, mode="setup",
                              kind="MODULE",
                              raw_inventory="inventory",
                              raw_stdout="text",
                              inventory=None,
                              status="OK",
                              start_time=now() - timedelta(hours=15),
                              stop_time=now() - timedelta(hours=14))
        history = self.get_model_class('History').objects.create(**history_kwargs)
        stdout = self._get_string_from_file("facts_stdout")
        history.raw_stdout = stdout
        history.save()
        url = self.get_url('history', history.id, 'facts')
        parsed = self.get_result("get", url)
        self.assertCount(parsed, 6)
        self.assertEquals(parsed['172.16.1.31']['status'], 'SUCCESS')
        self.assertEquals(parsed['test.vst.lan']['status'], 'SUCCESS')
        self.assertEquals(parsed['172.16.1.29']['status'], 'SUCCESS')
        self.assertEquals(parsed['172.16.1.32']['status'], 'FAILED!')
        self.assertEquals(parsed['172.16.1.30']['status'], 'UNREACHABLE!')
        self.assertEquals(parsed['172.16.1.31']['ansible_facts']
                          ['ansible_memfree_mb'], 736)
        self.assertCount(
            parsed['test.vst.lan']['ansible_facts']["ansible_devices"], 2
        )
        self.assertIn('No route to host',
                      parsed['172.16.1.30']['msg'])
        for status in ['RUN', 'DELAY']:
            history.status = status
            history.save()
            self.get_result("get", url, code=424)
        history.status = "OK"
        history.kind = "PLAYBOOK"
        history.save()
        self.get_result("get", url, code=404)

    def test_import_inventory(self):
        bulk_data = [
            dict(data_type=['project'], method='post', data=dict(name='testProj')),
            self.get_mod_bulk(
                'project', '<0[data][id]>',
                {'name': 'test-inventory', 'raw_data': inventory_data},
                ['inventory', 'import_inventory'],
            ),
            self.get_mod_bulk(
                'inventory',
                '<1[data][inventory_id]>',
                {},
                'all_hosts',
                method='get'
            ),
            self.get_mod_bulk(
                'inventory',
                '<1[data][inventory_id]>',
                {},
                'all_groups',
                method='get'
            ),
            self.get_mod_bulk(
                'inventory',
                '<1[data][inventory_id]>',
                {},
                'variables',
                method='get'
            ),
            self.get_mod_bulk(
                'project',
                '<0[data][id]>',
                {},
                ['inventory', '<1[data][inventory_id]>'],
                method='get'
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')

        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertIn('inventory_id', results[1]['data'])

        self.assertEqual(
            results[2]['data']['count'],
            len(valid_inventory['hosts'])
        )
        self.assertEqual(
            results[3]['data']['count'],
            len(valid_inventory['groups'])
        )
        self.assertEqual(
            results[4]['data']['count'],
            len(valid_inventory['vars'])
        )

        self.assertEqual(results[5]['status'], 200)
        self.assertEqual(results[5]['data']['name'], 'test-inventory')

        for host in results[2]['data']['results']:
            self.assertIn(host['name'], valid_inventory['hosts'].keys())
        for group in results[3]['data']['results']:
            self.assertIn(group['name'], valid_inventory['groups'].keys())
        for variable in results[4]['data']['results']:
            self.assertIn(variable['key'], valid_inventory['vars'].keys())

    def test_project_repos(self):
        bulk_data = [
            dict(data_type=['community_template'], method='get'),
            dict(data_type=['community_template', 1], method='get'),
            dict(data_type=['community_template', 2], method='get'),
            dict(data_type=['community_template', 3], method='get'),
            dict(data_type=['community_template', 3, 'use_it'], method='post'),
            dict(data_type=['project', '<4[data][project_id]>'], method='get'),
        ]
        response = requests.Response()
        response.status_code = 200
        response._content = str(project_template_response).encode('utf-8')
        with self.patch('requests.get', side_effect=[response]):
            results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 3)
        self.assertEqual(results[1]['data']['name'], 'test_template_1')
        self.assertEqual(results[1]['data']['type'], 'GIT')
        self.assertEqual(results[2]['data']['name'], 'test_template_2')
        self.assertEqual(results[2]['data']['type'], 'GIT')
        self.assertEqual(results[3]['data']['name'], 'test_template_3')
        self.assertEqual(results[3]['data']['type'], 'TAR')
        self.assertEqual(
            results[3]['data']['description'], 'Some text with\nnew\nlines\n'
        )
        self.assertEqual(results[4]['status'], 201)
        self.assertEqual(results[5]['status'], 200)
        self.assertIn('test_template_3', results[5]['data']['name'])
        self.assertEqual(
            results[5]['data']['repository'],
            'http://test.repo.url/path/to/project.tar.gz'
        )
