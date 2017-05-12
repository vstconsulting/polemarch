import inspect
import os
import time

import sys
from vcr_unittest import VCRMixin

from .inventory import _ApiGHBaseTestCase


class VCRTestCase(VCRMixin, _ApiGHBaseTestCase):
    def _get_cassette_library_dir(self):
        testdir = os.path.dirname(inspect.getfile(self.__class__))
        return os.path.join(testdir, 'cassettes' + str(sys.version_info[0]))


class ApiProjectsVCSTestCase(VCRTestCase):
    def setUp(self):
        super(ApiProjectsVCSTestCase, self).setUp()

    def test_git_import(self):
        repo_url = "http://cepreu@git.vst.lan/cepreu/ansible-experiments.git"
        url = "/api/v1/projects/"
        data = dict(name="GitProject",
                    repository=repo_url,
                    vars=dict(repo_type="GIT",
                              repo_password="pN6BQnjCdVybFaaA"))
        prj_id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        single_url = url + "{}/".format(prj_id)
        status = None
        while status != "OK":
            time.sleep(0.1)
            status = self.get_result("get", single_url)['status']
        tasks_url = single_url + "tasks/"
        tasks = self.get_result("get", tasks_url, 200)
        self.assertEquals(['main.yml'], tasks)