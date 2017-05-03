import json

from ..models import Task, PeriodicTask

from .inventory import _ApiGHBaseTestCase


class ApiTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiTasksTestCase, self).setUp()
        data = [dict(name="Prj1", repository="git@ex.us:dir/rep3.git")]
        project_id = self.mass_create("/api/v1/projects/", data,
                                      "name", "repository")[0]["id"]

        self.task1 = Task.objects.create(playbook="first.yml",
                                         project=project_id)
        self.task2 = Task.objects.create(playbook="second.yml",
                                         project=project_id)

    def test_get_tasks(self):
        url = "/api/v1/tasks/"
        self.list_test(url, 2)


class ApiPeriodicTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiPeriodicTasksTestCase, self).setUp()

        data = [dict(name="Prj1", repository="git@ex.us:dir/rep3.git")]
        self.project_id = self.mass_create("/api/v1/projects/", data,
                                           "name", "repository")[0]

        self.ptask1 = PeriodicTask.objects.create(playbook="p1.yml",
                                                  schedule="10",
                                                  type="DELTA",
                                                  project=self.project_id)
        self.ptask2 = PeriodicTask.objects.create(playbook="p2.yml",
                                                  schedule="10",
                                                  type="DELTA",
                                                  project=self.project_id)

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
        results_id = self.mass_create(url, data, "name", "repository")

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

    def test_access_rights(self):
        url = "/api/v1/periodic-tasks/"
        data = dict(playbook="p1.yml",
                    schedule="10",
                    type="DELTA",
                    project=self.project_id)
        id = self.mass_create(url, [data], data.keys())[0]
        single_url = url + "{}/".format(id)

        # another user can't do anything with this object
        nonprivileged_user = self.user
        self.change_identity()
        self._ensure_no_rights(url, data, [], single_url)

        # superuser can do anything
        self.change_identity(is_super_user=True)
        self._ensure_have_rights(url, data, [], single_url)

        perm_url = "/api/v1/projects/permissions/"

        # we can add rights for user
        self.get_result("post", perm_url, 201,
                        data=json.dumps([nonprivileged_user.id]))
        self.user = nonprivileged_user
        self._ensure_have_rights(url, data, [], single_url)

        # we can remove rights for user
        self.change_identity(is_super_user=True)
        self.get_result("delete", perm_url, 201,
                        data=json.dumps([nonprivileged_user.id]))
        self.user = nonprivileged_user
        self._ensure_no_rights(url, data, [], single_url)
