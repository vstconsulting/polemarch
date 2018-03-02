import shutil
import sys

import json
import tempfile

import git

try:
    from mock import patch
except ImportError:
    from unittest.mock import patch
from django.test import override_settings
from .inventory import _ApiGHBaseTestCase
from ..repo._base import _Base, logger, os


class Test(_Base):
    # pylint: disable=unused-argument
    def make_clone(self, options):
        import sys
        self._set_status("SYNC")
        logger.info("Cloning repo")
        os.mkdir(self.path) if not os.path.exists(self.path) else None
        with open(self.path+"/f{}.yml".format(sys.version_info[0]), "w") as fl:
            fl.write("clone")
        self._set_status("OK")
        return None, None

    def make_update(self, options):
        import sys
        self._set_status("SYNC")
        logger.info("Update repo from url.")
        with open(self.path+"/f{}.yml".format(sys.version_info[0]), "w") as fl:
            fl.write("update")
        self._set_status("OK")
        return None, None


class RepoBackendsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(RepoBackendsTestCase, self).setUp()
        self.tests_path = os.path.dirname(os.path.abspath(__file__))
        self.projects_to_delete = []
        self.url = "/api/v1/projects/"

    def tearDown(self):
        super(RepoBackendsTestCase, self).tearDown()
        for pr in self.projects_to_delete:
            self.get_result("delete", self.url + "{}/".format(pr))

    def test_git_import(self):
        # create test repository
        repo_dir = tempfile.mkdtemp()
        open(repo_dir + "/main.yml", 'a').close()
        repo = git.Repo.init(repo_dir)
        repo.index.add(["main.yml"])
        repo.index.commit("no message")
        first_revision = repo.head.object.hexsha
        repo.create_head('new_branch')
        open(repo_dir + "/other.yml", 'a').close()
        repo.index.add(["other.yml"])
        repo.index.commit("no message 2")
        second_revision = repo.head.object.hexsha
        # actual test
        data = dict(name="GitProject{}".format(sys.version_info[0]),
                    repository=repo_dir,
                    vars=dict(repo_type="GIT",
                              repo_password="pN6BQnjCdVybFaaA"))
        prj_id = self.get_result("post", self.url, data=json.dumps(data))['id']
        self.projects_to_delete.append(prj_id)
        single_url = self.url + "{}/".format(prj_id)
        project = self.get_result("get", single_url)
        self.assertEqual(project['status'], "OK")
        self.assertEqual(project['vars']['repo_branch'], "master")
        self.assertEqual(project['branch'], "master")
        tasks_url = "/api/v1/tasks/?project={}".format(prj_id)
        tasks = self.get_result("get", tasks_url, 200)
        self.assertEquals(tasks["count"], 2)
        self.assertEquals(tasks["results"][0]["name"], "main")
        self.assertEquals(tasks["results"][1]["name"], "other")
        self.assertEqual(project["revision"], second_revision)

        self.get_result("post", single_url+"sync/", 200)

        # change project branch
        data['vars']['repo_branch'] = "new_branch"
        self.get_result("patch", single_url, data=json.dumps(data))
        project = self.get_result("get", single_url)
        self.assertEqual(project['vars']['repo_branch'], "new_branch")
        self.assertEqual(project['branch'], "master")
        self.get_result("post", single_url + "sync/", 200)
        project = self.get_result("get", single_url)
        self.assertEqual(project['status'], "OK")
        self.assertEqual(project['vars']['repo_branch'], "new_branch")
        self.assertEqual(project['branch'], "new_branch")
        self.assertEqual(project["revision"], first_revision)

        # clone with branch name
        prj_id = self.get_result("post", self.url, data=json.dumps(data))['id']
        self.projects_to_delete.append(prj_id)
        project = self.get_result("get", single_url)
        self.assertEqual(project['status'], "OK")
        self.assertEqual(project['vars']['repo_branch'], "new_branch")
        self.assertEqual(project["revision"], first_revision)
        # delete test repository
        shutil.rmtree(repo_dir)

    @patch('polemarch.main.repo._base._ArchiveRepo._download')
    @override_settings(PROJECTS_DIR="/tmp/test_projs{}".format(sys.hexversion))
    def test_tar_import(self, download):
        download.side_effect = [self.tests_path + '/test_repo.tar'] * 10
        url = "/api/v1/projects/"
        repo_url = "http://localhost:8000/test_repo.tar"
        data = dict(name="GitProject{}-2".format(sys.version_info[0]),
                    repository=repo_url,
                    vars=dict(repo_type="TAR"))
        prj_id = self.get_result("post", url, data=json.dumps(data))['id']
        self.projects_to_delete.append(prj_id)

        single_url = self.url + "{}/".format(prj_id)
        self.assertEqual(self.get_result("get", single_url)['status'], "OK")
        tasks_url = "/api/v1/tasks/?project={}".format(prj_id)
        tasks = self.get_result("get", tasks_url, 200)
        self.assertEquals(tasks["count"], 1)
        self.assertEquals(tasks["results"][0]["name"], "main")

        self.get_result("post", single_url + "sync/", 200)

        # TODO:
        # pull not cloned repo
        # ssh repository with key access
        # broken tar
