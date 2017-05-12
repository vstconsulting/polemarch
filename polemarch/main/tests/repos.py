import os
import sys
import inspect
import json
from vcr_unittest import VCRMixin

from .inventory import _ApiGHBaseTestCase


class VCRTestCase(VCRMixin, _ApiGHBaseTestCase):
    def _get_cassette_library_dir(self):
        testdir = os.path.dirname(inspect.getfile(self.__class__))
        return os.path.join(testdir, 'cassettes' + str(sys.version_info[0]))


class ApiProjectsVCSTestCase(VCRTestCase):
    def setUp(self):
        super(ApiProjectsVCSTestCase, self).setUp()
        self.projects_to_delete = []

    def tearDown(self):
        url = "/api/v1/projects/"
        for pr in self.projects_to_delete:
            self.get_result("delete", url + "{}/".format(pr))

    def test_git_import(self):
        repo_url = "http://cepreu@git.vst.lan/cepreu/ansible-experiments.git"
        url = "/api/v1/projects/"
        data = dict(name="GitProject{}".format(sys.version_info[0]),
                    repository=repo_url,
                    vars=dict(repo_type="GIT",
                              repo_password="pN6BQnjCdVybFaaA"))
        prj_id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        self.projects_to_delete.append(prj_id)
        single_url = url + "{}/".format(prj_id)
        self.assertEqual(self.get_result("get", single_url)['status'], "OK")
        tasks_url = "/api/v1/tasks/?project={}".format(prj_id)
        tasks = self.get_result("get", tasks_url, 200)
        self.assertEquals(tasks["count"], 1)
        self.assertEquals(tasks["results"][0]["name"], "main")

        self.get_result("post", single_url+"sync/", 200)
