import tempfile
import shutil
import uuid
import six
import git
from ._base import BaseTestCase, os


test_playbook_content = '''
---
- hosts: all
  gather_facts: False
  tasks:
    - name: Some local task
      command: uname
'''


class BaseExecutionsTestCase(BaseTestCase):
    def setUp(self):
        super(BaseExecutionsTestCase, self).setUp()
        self.path = self._settings('PROJECTS_DIR', '/tmp/unknown')

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

    def project_workflow(self, repo_type, **kwargs):
        execute = kwargs.pop('execute', False)
        project_data = self.create_project_test(str(uuid.uuid1()), repo_type, **kwargs)
        self.remove_project_dir(**project_data)
        self.remove_project(**project_data)
        project_data = self.create_project_test(str(uuid.uuid1()), repo_type, **kwargs)
        try:
            if not execute:
                return
            kwargs = getattr(self, 'wip_{}'.format(repo_type.lower()), str)(project_data)
            kwargs = kwargs if not isinstance(kwargs, six.string_types) else dict()
            self.playbook_tests(project_data, **kwargs)
        finally:
            self.remove_project(**project_data)

    def get_file_path(self, name, path):
        return "{}/{}".format(path, name)

    def generate_playbook(self, path, name='test', count=1, data=test_playbook_content):
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

    def playbook_tests(self, prj, playbook_count=1, execute=None, inventory="localhost"):
        _exec = dict(
            connection="local", limit="docker",
            playbook="<1[data][results][0][playbook]>", inventory=inventory
        )
        bulk_data = self.project_bulk_sync_and_playbooks(prj['id'])
        bulk_data += [
            self.get_mod_bulk('project', prj['id'], _exec, 'execute-playbook'),
        ] if execute else []
        results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], playbook_count)
        if not execute:
            return
        self.assertEqual(results[2]['status'], 201)

    def get_complex_bulk(self, item, op='add', **kwargs):
        return self.get_bulk(item, kwargs, op)


class ProjectTestCase(BaseExecutionsTestCase):

    def tearDown(self):
        super(ProjectTestCase, self).tearDown()
        repo_dir = getattr(self, 'repo_dir', None)
        if repo_dir:
            shutil.rmtree(repo_dir)

    def wip_manual(self, project_data):
        files = self.generate_playbook(self.get_project_dir(**project_data))
        return dict(playbook_count=len(files), execute=True)

    def wip_git(self, project_data):
        self.assertEqual(project_data['revision'], self.revisions[-1])
        self.assertEqual(project_data['branch'], 'master')
        new_branch_var = dict(key='repo_branch', value='new_branch')
        self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var)
        ])
        project_data = self.sync_project(project_data['id'])
        self.assertEqual(project_data['revision'], self.revisions[0])
        self.assertEqual(project_data['branch'], 'new_branch')
        new_branch_var['value'] = 'master'
        self.make_bulk([
            self.get_mod_bulk('project', project_data['id'], new_branch_var)
        ])
        project_data = self.sync_project(project_data['id'])
        self.assertEqual(project_data['revision'], self.revisions[-1])
        self.assertEqual(project_data['branch'], 'master')
        return dict(playbook_count=len(self.revisions), execute=True)

    def test_project_manual(self):
        self.project_workflow('MANUAL', execute=True)

    def test_project_tar(self):
        with self.patch('polemarch.main.repo._base._ArchiveRepo._download') as download:
            download.side_effect = [self.tests_path + '/test_repo.tar.gz'] * 10
            self.project_workflow(
                'TAR', repository='http://localhost:8000/test_repo.tar.gz', execute=True
            )

    def test_project_git(self):
        # Prepare repo
        self.repo_dir = tempfile.mkdtemp()
        self.generate_playbook(self.repo_dir, ['main.yml'])
        repo = git.Repo.init(self.repo_dir)
        repo.index.add(["main.yml"])
        repo.index.commit("no message")
        first_revision = repo.head.object.hexsha
        repo.create_head('new_branch')
        self.generate_playbook(self.repo_dir, ['other.yml'])
        repo.index.add(["other.yml"])
        repo.index.commit("no message 2")
        second_revision = repo.head.object.hexsha

        # Test project
        self.revisions = [first_revision, second_revision]
        self.project_workflow('GIT', repository=self.repo_dir, execute=True)
        self.project_workflow('GIT', repository=self.repo_dir, repo_branch='new_branch')

    def test_complex(self):
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
        # Execute actions
        _exec = dict(
            connection="local", inventory="<9[data][id]>",
            module="ping", group="all", args=""
        )
        bulk_data += [
            self.get_mod_bulk(
                'project', "<10[data][id]>", _exec, 'sync',
            ),
            self.get_mod_bulk(
                'project', "<10[data][id]>", _exec, 'execute-module',
            ),
            self.get_bulk(
                'history', {}, 'get', pk="<{}[data][history_id]>".format(len(bulk_data)+1)
            ),
            self.get_mod_bulk(
                'history', "<{}[data][history_id]>".format(len(bulk_data)+1), {},
                'raw', 'get'
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')
        for result in results[:-4]+results[-3:-2]:
            self.assertEqual(result['status'], 201 or 200, result)
        inventory_data = results[9]['data']
        self.assertEqual(inventory_data['name'], 'complex_inventory')
        # Check history
        history = results[-2]['data']
        self.assertEqual(history['revision'], "NO VCS")
        self.assertEqual(history['mode'], _exec['module'])
        self.assertEqual(history['kind'], 'MODULE')
        self.assertEqual(history['inventory'], results[9]['data']['id'])
        self.assertEqual(history['status'], "OK")
        etalon = self._get_string_from_file('exemplary_complex_inventory')
        etalon = etalon.replace('PATH', '[~~ENCRYPTED~~]')
        etalon = etalon.replace('mypass', '[~~ENCRYPTED~~]')
        self.assertEqual(
            list(map(str.strip, str(history['raw_inventory']).split("\n"))),
            list(map(str.strip, etalon.split("\n")))
        )
        # Check all_hosts
        self.mass_create_bulk('host', [
            dict(name='complex{}'.format(i)) for i in range(3)
        ])
        bulk_data = [
            self.get_mod_bulk(
                'inventory', results[9]['data']['id'], {}, 'all_hosts', 'get',
            ),
            self.get_mod_bulk(
                'inventory', results[9]['data']['id'], {}, 'all_hosts', 'post',
            ),
            self.get_mod_bulk(
                'inventory', results[9]['data']['id'], {}, 'all_groups', 'get',
            ),
            self.get_mod_bulk(
                'inventory', results[9]['data']['id'], {}, 'all_groups', 'post',
            ),
        ]
        new_results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(new_results[0]['status'], 200)
        self.assertEqual(new_results[0]['data']['count'], 4)
        self.assertEqual(new_results[1]['status'], 405)
        self.assertEqual(new_results[2]['status'], 200)
        self.assertEqual(new_results[2]['data']['count'], 5)
        self.assertEqual(new_results[3]['status'], 405)
