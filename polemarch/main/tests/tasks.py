import json

from ..models import Project
from ..models import Task, PeriodicTask

from .inventory import _ApiGHBaseTestCase


class ApiTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiTasksTestCase, self).setUp()
        data = [dict(name="Prj1", repository="git@ex.us:dir/rep3.git")]
        project_id = self.mass_create("/api/v1/projects/", data,
                                      "name", "repository")[0]
        project = Project.objects.get(id=project_id)

        self.task1 = Task.objects.create(playbook="first.yml",
                                         project=project)
        self.task2 = Task.objects.create(playbook="second.yml",
                                         project=project)

    def test_get_tasks(self):
        url = "/api/v1/tasks/"
        self.list_test(url, 2)


class ApiPeriodicTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiPeriodicTasksTestCase, self).setUp()

        data = [dict(name="Prj1", repository="git@ex.us:dir/rep3.git")]
        self.project_id = self.mass_create("/api/v1/projects/", data,
                                           "name", "repository")[0]
        project = Project.objects.get(id=self.project_id)

        self.ptask1 = PeriodicTask.objects.create(playbook="p1.yml",
                                                  schedule="10",
                                                  type="DELTA",
                                                  project=project)
        self.ptask2 = PeriodicTask.objects.create(playbook="p2.yml",
                                                  schedule="10",
                                                  type="DELTA",
                                                  project=project)

    def test_create_delete_periodic_task(self):
        url = "/api/v1/periodic-tasks/"
        self.list_test(url, 2)
        self.details_test(url + "{}/".format(self.ptask1.id),
                          playbook="p1.yml",
                          schedule="10",
                          type="DELTA",
                          project=self.project_id)

        data = [dict(playbook="p1.yml", schedule="10", type="DELTA",
                     project=self.project_id),
                dict(playbook="p2.yml",
                     schedule="* */2 1-15 * sun,fri 2000-2100",
                     type="CRONTAB", project=self.project_id),
                dict(playbook="p1.yml", schedule="", type="CRONTAB",
                     project=self.project_id),
                dict(playbook="p1.yml", schedule="30 */4", type="CRONTAB",
                     project=self.project_id)]
        results_id = self.mass_create(url, data, "playbook", "schedule",
                                      "type", "project")

        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        count = PeriodicTask.objects.filter(id__in=results_id).count()
        self.assertEqual(count, 0)

        # test with bad value
        data = [dict(playbook="p1.yml", schedule="30 */4 foo", type="CRONTAB",
                     project=self.project_id)]
        self.get_result("post", url, 400, data=json.dumps(data))

        # test with with no project
        data = [dict(playbook="p1.yml", schedule="30 */4", type="CRONTAB")]
        self.get_result("post", url, 400, data=json.dumps(data))
