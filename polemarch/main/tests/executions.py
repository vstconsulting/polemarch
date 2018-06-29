import shutil
import uuid
import six
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
                name=name, repository=kwargs.get('repository', repo_type),
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
        project_data = self.create_project_test(str(uuid.uuid1()), repo_type)
        self.remove_project_dir(**project_data)
        self.remove_project(**project_data)
        project_data = self.create_project_test(str(uuid.uuid1()), repo_type)
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
        for i in range(count):
            file_path = self.get_file_path('{}-{}.yml'.format(name, i), path)
            with open(file_path, 'w') as playbook:
                playbook.write(data)

    def playbook_tests(self, prj, playbook_count=1, execute=None, inventory="localhost"):
        _exec = dict(
            connection="local", limit="docker",
            playbook="<1[data][results][0][playbook]>", inventory=inventory
        )
        bulk_data = [
            self.get_mod_bulk('project', prj['id'], {}, 'sync', 'post'),
            self.get_mod_bulk('project', prj['id'], {}, 'playbook', 'get'),
        ]
        bulk_data += [
            self.get_mod_bulk('project', prj['id'], _exec, 'execute-playbook'),
        ] if execute else []
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], playbook_count)
        if not execute:
            return
        self.assertEqual(results[2]['status'], 201)


class ProjectTestCase(BaseExecutionsTestCase):

    def wip_manual(self, project_data):
        self.generate_playbook(self.get_project_dir(**project_data))
        return dict(playbook_count=1, execute=True)

    def test_project_manual(self):
        self.project_workflow('MANUAL', execute=True)

    def test_project_tar(self):
        with self.patch('polemarch.main.repo._base._ArchiveRepo._download') as download:
            download.side_effect = [self.tests_path + '/test_repo.tar.gz'] * 10
            self.project_workflow(
                'TAR', repository='http://localhost:8000/test_repo.tar.gz', execute=True
            )
