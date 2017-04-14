from ._base import BaseTestCase, json
from ..models import Task, Scenario


class ApiTasksTestCase(BaseTestCase):
    def setUp(self):
        super(ApiTasksTestCase, self).setUp()
        self.tst_sc = Scenario.objects.create(name="test-scenario-0")

    def test_create_delete_task(self):
        data = dict(data="Some data", name="Some task")
        result = self.get_result("post", "/api/v1/tasks/", 201, data=data)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["name"], data["name"])
        self.assertEqual(result["data"], data["data"])
        self.get_result("delete", "/api/v1/tasks/{}/".format(result["id"]))
        result = self.get_result("get", "/api/v1/tasks/")
        self.assertEqual(result["count"], 100)
        self.get_result("post", "/api/v1/tasks/", 400, data={})

    def test_update_taks(self):
        data = dict(data="test-data", name="test-task")
        result = self.get_result("post", "/api/v1/tasks/", 201, data=data)
        url = "/api/v1/tasks/{}/".format(result["id"])
        update_data = dict(data="new-data")
        self.get_result("patch", url, data=json.dumps(update_data))
        result = self.get_result("get", url)
        self.assertEqual(result["data"], update_data["data"])

    def test_create_delete_scenario(self):
        data = dict(name="Some task")
        result = self.get_result("post", "/api/v1/scenarios/", 201, data=data)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["name"], data["name"])
        self.get_result("delete", "/api/v1/scenarios/{}/".format(result["id"]))
        result = self.get_result("get", "/api/v1/scenarios/")
        self.assertEqual(result["count"], 1)
        self.get_result("post", "/api/v1/scenarios/", 400, data=dict(some=1))

    def test_update_scenario(self):
        data = dict(name="test-scenario")
        result = self.get_result("post", "/api/v1/scenarios/", 201, data=data)
        url = "/api/v1/scenarios/{}/".format(result["id"])
        update_data = dict(name="new-name")
        self.get_result("patch", url, data=json.dumps(update_data))
        result = self.get_result("get", url)
        self.assertEqual(result["name"], update_data["name"])

    def test_set_tasks_for_scenario(self):
        tsc_id = self.tst_sc.id  # ID of base test Scenario
        tasks = [1, 3, 5, 4, 100, 55]  # IDs of tasks to be setted for Scenario
        data = json.dumps(tasks)
        base_url = "/api/v1/scenarios/{}/".format(tsc_id)
        url_set_tasks = base_url + "tasks/"
        result = self.get_result("post", url_set_tasks, code=200, data=data)
        self.assertEqual(result["created"], len(tasks))
        self.assertEqual(self.tst_sc.tasks.count(), len(tasks))
        # Check tasks that returns in needed order
        result = self.get_result("get", base_url)
        cnt = 0
        for task in result["tasks"]:
            self.assertEqual(task["id"], Task.objects.get(id=tasks[cnt]).id)
            cnt += 1
        # Change task list
        tasks = [8, 3, 99, 1, 7, 33, 12, 83]
        data = json.dumps(tasks)
        result = self.get_result("post", url_set_tasks, code=200, data=data)
        self.assertEqual(result["created"], 6)
        self.assertEqual(result["updated"], 2)
        # Check tasks that returns in needed order
        result = self.get_result("get", base_url)
        cnt = 0
        for task in result["tasks"]:
            self.assertEqual(task["id"], Task.objects.get(id=tasks[cnt]).id)
            cnt += 1
