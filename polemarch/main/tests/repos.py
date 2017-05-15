import os
import sys
import inspect
import json
from vcr_unittest import VCRMixin

from .inventory import _ApiGHBaseTestCase


ssh_key = '''-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----
'''


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

        # With ssh connection
        # TODO: now it does not work. Try with other repos.
        # repo_url = "git@git.vst.lan:cepreu/ansible-experiments.git"
        # data = dict(name="GitProject{}-2".format(sys.version_info[0]),
        #             repository=repo_url,
        #             vars=dict(repo_type="GIT",
        #                       repo_key=ssh_key))
        # prj_id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        # self.projects_to_delete.append(prj_id)
        # single_url = url + "{}/".format(prj_id)
        # self.assertEqual(self.get_result("get", single_url)['status'], "OK")
        # tasks_url = "/api/v1/tasks/?project={}".format(prj_id)
        # tasks = self.get_result("get", tasks_url, 200)
        # self.assertEquals(tasks["count"], 1)
        # self.assertEquals(tasks["results"][0]["name"], "main")
        #
        # self.get_result("post", single_url + "sync/", 200)
