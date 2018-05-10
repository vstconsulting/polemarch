import logging
import json
import sys
import os
from .inventory import _ApiGHBaseTestCase


class ApiProjectsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiProjectsTestCase, self).setUp()
        self.prj1 = self.get_model_class('Project').objects.create(
            name="First_project",
            repository="git@ex.us:dir/rep1.git",
            vars=dict(repo_type="TEST"),
            notes="Description example"
        )
        self.prj2 = self.get_model_class('Project').objects.create(
            name="Second_project",
            repository="git@ex.us:dir/rep2.git",
            vars=dict(repo_type="TEST", some_arg="search_arg")
        )

    def test_pagenated(self):
        for project in self.get_model_class('Project').objects.all().paged(chunk_size=1):
            project.id

    def test_create_delete_project(self):
        url = "/api/v1/projects/"
        self.list_test(url, self.get_model_class('Project').objects.all().count())
        self.details_test(url + "{}/".format(self.prj1.id),
                          name=self.prj1.name,
                          repository="git@ex.us:dir/rep1.git")

        result = self.get_result("get", url)
        for pr in result['results']:
            self.assertEqual(pr['type'], "TEST")

        result = self.get_result("get", url+"supported-repos/")
        self.assertCount(result, 4)
        self.assertIn("TEST", result, result)
        self.assertIn("GIT", result, result)
        self.assertIn("TAR", result, result)
        self.assertIn("MANUAL", result, result)

        data = [dict(name="Prj3", repository="git@ex.us:dir/rep3.git",
                     vars=dict(repo_type="TEST", repo_password="1234")),
                dict(name="Prj4", repository="git@ex.us:dir/rep4.git",
                     vars=dict(repo_type="TEST", repo_password="qwerty"))]
        results_id = self.mass_create(url, data, "name", "repository")

        for project_id in results_id:
            proj_obj = self.get_model_class('Project').objects.get(pk=project_id)
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
        qs = self.get_model_class('Project').objects.filter(id__in=results_id)
        self.assertEqual(qs.count(), 0)

        repo_url = "git@sdf:cepreu/ansible-experiments.git"
        data = dict(name="GitProject{}".format(sys.version_info[0]),
                    repository=repo_url,
                    vars=dict(repo_type="GIT",
                              repo_password="pN6BQnjCdVybFaaA"))
        logging.disable(logging.CRITICAL)
        with self.settings(LOG_LEVEL="CRITICAL"):
            prj_id = self.get_result("post", url, data=json.dumps(data))['id']
        self.get_result("delete", url + "{}/".format(prj_id))
        # Unsupported repos error
        data = dict(name="asdad", repository="kflk")
        self.get_result("post", url, 415, data=json.dumps(data))
        logging.disable(logging.NOTSET)

        self._filter_test(url, dict(name__not="First_project"), 5)
        self._filter_test(url, dict(name="Prj"), 3)
        self._filter_test(url, dict(status="OK", name__not="First_project"), 5)
        self._filter_vars(url, "repo_type:TEST", 6)
        self._filter_vars(url, "some_arg:search_arg", 1)

        # Create hidden projects for selfcare
        data = dict(
            name="TestHiddenProject",
            vars=dict(repo_type='MANUAL'),
            hidden=True
        )
        hidden_prj = self.get_model_class('Project').objects.create(**data)
        self._filter_test(url, dict(name="TestHidden"), 0)
        self.get_result("get", url + "{}/".format(hidden_prj.id), 404)
        self.get_result("delete", url + "{}/".format(hidden_prj.id), 404)
        with open(hidden_prj.path + "/hidden_test.yml", 'w+') as plbook:
            plbook.write("")
        hidden_prj.sync()
        self.assertCount(hidden_prj.tasks.all(), 1)
        result = self.get_result("get", '/api/v1/tasks/?name=hidden')
        self.assertEqual(result['count'], 0)
        hidden_prj.delete()

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

    def test_manual_repo(self):
        url = "/api/v1/projects/"
        task_url = "/api/v1/tasks/?project={}"
        project_url = "/api/v1/projects/{}/"

        data = dict(name="Manual project", repository="manual",
                    vars=dict(repo_type="MANUAL"))
        prj_id = self.mass_create(url, [data], "name", "repository")[0]
        project = self.get_model_class('Project').objects.get(pk=prj_id)
        self.assertEqual(project.vars["repo_type"], "MANUAL")
        self.assertEqual(project.status, "OK")
        task_url = task_url.format(project.id)
        project_url = project_url.format(project.id)

        def check_tasks(count):
            result = self.get_result("get", task_url)
            self.assertEqual(result["count"], count)
            self.assertCount(result['results'], count)

        check_tasks(0)
        with open(project.path+"/test.yml", "w") as f:
            f.write("some_playbook")
        self.get_result("post", project_url + "sync/", 200)
        check_tasks(1)

        self.get_result("delete", project_url)
