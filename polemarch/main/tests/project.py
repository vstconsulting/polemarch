import logging
import json
import sys
import os
from .inventory import _ApiGHBaseTestCase
from ..models import Project


class ApiProjectsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiProjectsTestCase, self).setUp()
        self.prj1 = Project.objects.create(name="First project",
                                           repository="git@ex.us:dir/rep1.git",
                                           vars=dict(repo_type="TEST"))
        self.prj2 = Project.objects.create(name="Second project",
                                           repository="git@ex.us:dir/rep2.git",
                                           vars=dict(repo_type="TEST"))

    def test_create_delete_project(self):
        url = "/api/v1/projects/"
        self.list_test(url, 5)
        self.details_test(url + "{}/".format(self.prj1.id),
                          name=self.prj1.name,
                          repository="git@ex.us:dir/rep1.git")

        result = self.get_result("get", url+"supported-repos/")
        self.assertCount(result, 3)
        self.assertIn("TEST", result, result)
        self.assertIn("GIT", result, result)
        self.assertIn("TAR", result, result)

        data = [dict(name="Prj3", repository="git@ex.us:dir/rep3.git",
                     vars=dict(repo_type="TEST", repo_password="1234")),
                dict(name="Prj4", repository="git@ex.us:dir/rep4.git",
                     vars=dict(repo_type="TEST", repo_password="qwerty"))]
        results_id = self.mass_create(url, data, "name", "repository")

        for project_id in results_id:
            proj_obj = Project.objects.get(pk=project_id)
            self.assertEqual(proj_obj.vars["repo_type"], "TEST")
            self.assertEqual(proj_obj.status, "OK")
            file = "/f{}.yml".format(sys.version_info[0])
            with open(proj_obj.path + file) as f:
                self.assertEqual(f.readline(), "clone")
            self.get_result("post", url + "{}/sync/".format(project_id), 200)
            with open(proj_obj.path + file) as f:
                self.assertEqual(f.readline(), "update")
            self.get_result("delete", url + "{}/".format(project_id))
            self.assertTrue(not os.path.exists(proj_obj.path + file))
        self.assertEqual(Project.objects.filter(id__in=results_id).count(), 0)

        repo_url = "git@git.vst.lan:cepreu/ansible-experiments.git"
        data = dict(name="GitProject{}".format(sys.version_info[0]),
                    repository=repo_url,
                    vars=dict(repo_type="GIT",
                              repo_password="pN6BQnjCdVybFaaA"))
        logging.disable(logging.CRITICAL)
        with self.settings(LOG_LEVEL="CRITICAL"):
            prj_id = self.get_result("post", url, data=json.dumps(data))['id']
        self.get_result("delete", url + "{}/".format(prj_id))
        logging.disable(logging.NOTSET)

    def test_inventories_in_project(self):
        url = "/api/v1/projects/"  # URL to projects layer

        inventories_data = [dict(name="Inv1", vars={}),
                            dict(name="Inv2", vars={}),
                            dict(name="Inv2", vars={})]
        inventories_id = self._create_inventories(inventories_data)

        data = dict(name="Prj1", repository="git@ex.us:dir/rep1.git",
                    vars=dict(repo_type="TEST"))
        prj_id = self.mass_create(url, [data], "name", "repository")[0]

        # Test inventories
        # Just put two inventory in project
        self._compare_list(url, "post", 200, prj_id, inventories_id[0:2],
                           "inventories", inventories_id[0:2])
        # Delete one of inventory in project
        self._compare_list(url, "delete", 200, prj_id, [inventories_id[0]],
                           "inventories", inventories_id[1:2])
        # Full update list of project
        self._compare_list(url, "put", 200, prj_id, inventories_id,
                           "inventories", inventories_id)
