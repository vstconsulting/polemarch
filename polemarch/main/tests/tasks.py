import json

from .inventory import _ApiGHBaseTestCase


class ApiTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiTasksTestCase, self).setUp()
        self.task1 = Tasks.objects.create(playbook="first.yml")
        self.task2 = Tasks.objects.create(playbook="second.yml")

    def test_get_tasks(self):
        url = "/api/v1/tasks/"
        self.list_test(url, 2)


class ApiPeriodicTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiPeriodicTasksTestCase, self).setUp()
        self.ptask1 = PeriodicTasks.objects.create(playbook="p1.yml",
                                                   schedule="10",
                                                   type="DELTA")
        self.ptask2 = PeriodicTasks.objects.create(playbook="p2.yml",
                                                   schedule="10",
                                                   type="DELTA")

    def test_create_delete_periodic_task(self):
        url = "/api/v1/periodic-tasks/"
        self.list_test(url, 2)
        self.details_test(url + "{}/".format(self.ptask1.id),
                          playbook="p1.yml",
                          schedule="10",
                          type="DELTA")

        data = [dict(playbook="p1.yml", schedule="10", type="DELTA"),
                dict(playbook="p2.yml",
                     schedule="* */2 1-15 * sun,fri 2000-2100",
                     type="CRONTAB"),
                dict(playbook="p1.yml", schedule="", type="CRONTAB"),
                dict(playbook="p1.yml", schedule="30 */4", type="CRONTAB")]
        results_id = self.mass_create(url, data, "name", "repository")

        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        count = PeriodicTasks.objects.filter(id__in=results_id).count()
        self.assertEqual(count, 0)

        # test with bad value
        data = [dict(playbook="p1.yml", schedule="30 */4 foo", type="CRONTAB")]
        self.get_result("post", url, 400, data=json.dumps(data))

    def test_access_rights(self):
        self._test_access_rights("/api/v1/periodic-tasks/",
                                 dict(playbook="p1.yml",
                                      schedule="10",
                                      type="DELTA"))
