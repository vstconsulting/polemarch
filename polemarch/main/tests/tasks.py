import json

from datetime import timedelta
from django.utils.timezone import now

from ..models import Project
from ..models import Task, PeriodicTask, History

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

        repo = "git@ex.us:dir/rep3.git"
        data = [dict(name="Prj1", repository=repo)]
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
        self.ph = Project.objects.create(name="Prj_History",
                                         repository=repo)
        self.default_kwargs = dict(project=self.ph, playbook="task.yml",
                                   raw_inventory="inventory",
                                   raw_stdout="text")
        self.historys = [
            History.objects.create(status="OK",
                                   start_time=now() - timedelta(hours=15),
                                   stop_time=now() - timedelta(hours=14),
                                   **self.default_kwargs),
            History.objects.create(status="STOP",
                                   start_time=now() - timedelta(hours=25),
                                   stop_time=now() - timedelta(hours=24),
                                   **self.default_kwargs),
            History.objects.create(status="ERROR",
                                   start_time=now() - timedelta(hours=35),
                                   stop_time=now() - timedelta(hours=34),
                                   **self.default_kwargs),
        ]

    def test_history_of_executions(self):
        url = "/api/v1/history/"
        df = "%Y-%m-%dT%H:%M:%S.%fZ"
        self.list_test(url, 3)
        self.details_test(url + "{}/".format(self.historys[0].id),
                          playbook="task.yml",
                          status="OK", project=self.ph.id,
                          start_time=self.historys[0].start_time.strftime(df),
                          stop_time=self.historys[0].stop_time.strftime(df),
                          raw_inventory="inventory", raw_stdout="text")

        result = self.get_result("get", "{}?status={}".format(url, "OK"))
        self.assertEqual(result["count"], 1, result)

        res = self.get_result("get", "{}?playbook={}".format(url, "task.yml"))
        self.assertEqual(res["count"], 3, res)

        res = self.get_result("get", "{}?project={}".format(url, self.ph.id))
        self.assertEqual(res["count"], len(self.historys), res)

        st = self.historys[1].start_time.strftime(df)
        res = self.get_result("get", "{}?start_time__gte={}".format(url, st))
        self.assertEqual(res["count"], 2, res)
        res = self.get_result("get", "{}?start_time__gt={}".format(url, st))
        self.assertEqual(res["count"], 1, res)

        st = self.historys[1].stop_time.strftime(df)
        res = self.get_result("get", "{}?stop_time__gte={}".format(url, st))
        self.assertEqual(res["count"], 2, res)
        res = self.get_result("get", "{}?stop_time__gt={}".format(url, st))
        self.assertEqual(res["count"], 1, res)

        self.get_result("post", url, 405, data=dict(**self.default_kwargs))
        self.get_result("patch", url + "{}/".format(self.historys[0].id),
                        405, data=dict(**self.default_kwargs))
        self.get_result("put", url + "{}/".format(self.historys[0].id),
                        405, data=dict(**self.default_kwargs))

        self.get_result("delete", url + "{}/".format(self.historys[0].id))

        self.change_identity()
        self.list_test(url, 0)

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
                     schedule="* */2 sun,fri 1-15 *",
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
        data = dict(playbook="p1.yml", schedule="30 */4 foo", type="CRONTAB",
                    project=self.project_id)
        self.get_result("post", url, 400, data=json.dumps(data))

        # test with with no project
        data = dict(playbook="p1.yml", schedule="30 */4", type="CRONTAB")
        self.get_result("post", url, 400, data=json.dumps(data))
