from .inventory import _ApiGHBaseTestCase
from ..models import Project


class ApiProjectsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiProjectsTestCase, self).setUp()
        self.prj1 = Project.objects.create(name="First project",
                                           repository="git@ex.us:dir/rep1.git")
        self.prj2 = Project.objects.create(name="Second project",
                                           repository="git@ex.us:dir/rep2.git")

    def test_create_delete_project(self):
        url = "/api/v1/projects/"
        self.list_test(url, 4)
        self.details_test(url + "{}/".format(self.prj1.id),
                          name=self.prj1.name,
                          repository="git@ex.us:dir/rep1.git")

        data = [dict(name="Prj3", repository="git@ex.us:dir/rep3.git"),
                dict(name="Prj4", repository="git@ex.us:dir/rep4.git")]
        results_id = self.mass_create(url, data, "name", "repository")

        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        self.assertEqual(Project.objects.filter(id__in=results_id).count(), 0)

    def test_access_rights(self):
        self._test_access_rights("/api/v1/projects/",
                                 dict(name="Prj3",
                                      repository="git@ex.us:dir/rep3.git"),
                                 ["inventories", "tasks", "periodic-tasks"])

    def test_inventories_in_project(self):
        url = "/api/v1/projects/"  # URL to projects layer

        inventories_data = [dict(name="Inv1", vars={}),
                            dict(name="Inv2", vars={}),
                            dict(name="Inv2", vars={})]
        inventories_id = self._create_inventories(inventories_data)

        data = dict(name="Prj1", repository="git@ex.us:dir/rep1.git")
        prj_id = self.get_result("post", url, 201, data=data)["id"]

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

    # TODO: uncomment when tasks will come =)
    def _test_tasks_in_project(self):
        url = "/api/v1/projects/"  # URL to projects layer

        inventories_data = [dict(name="Inv1", vars={})]
        inventory_id = self._create_inventories(inventories_data)[0]

        tasks_data = [dict(inventory=inventory_id, playbook="play1.yml"),
                      dict(inventory=inventory_id, playbook="play2.yml"),
                      dict(inventory=inventory_id, playbook="play3.yml")]
        tasks_id = self._create_tasks(tasks_data)

        data = dict(name="Prj1", repository="git@ex.us:dir/rep1.git")
        prj_id = self.get_result("post", url, 201, data=data)["id"]

        # Test tasks
        # Just put two tasks in project
        self._compare_list(url, "post", 200, prj_id, tasks_id[0:2],
                           "tasks", tasks_id[0:2])
        # Delete one of tasks in project
        self._compare_list(url, "delete", 200, prj_id, [tasks_id[0]],
                           "tasks", tasks_id[1:2])
        # Full update tasks of project
        self._compare_list(url, "put", 200, prj_id, tasks_id, "tasks",
                           tasks_id)

    def _test_periodic_tasks_in_project(self):
        url = "/api/v1/projects/"  # URL to projects layer

        schedules_data = [dict(playbook="p1.yml", schedule="10", type="DELTA"),
                          dict(playbook="p2.yml", schedule="5", type="DELTA"),
                          dict(playbook="p1.yml", schedule="1", type="DELTA")]
        schedules_id = self._create_periodic_tasks(schedules_data)

        data = dict(name="Prj1", repository="git@ex.us:dir/rep1.git")
        prj_id = self.get_result("post", url, 201, data=data)["id"]

        # Test tasks
        # Just put two periodic tasks in project
        self._compare_list(url, "post", 200, prj_id, schedules_id[0:2],
                           "periodic-tasks", schedules_id[0:2])
        # Delete one of periodic tasks in project
        self._compare_list(url, "delete", 200, prj_id, [schedules_id[0]],
                           "periodic-tasks", schedules_id[1:2])
        # Full update periodic tasks of project
        self._compare_list(url, "put", 200, prj_id, schedules_id,
                           "periodic-tasks", schedules_id)
