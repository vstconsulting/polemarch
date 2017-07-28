import json
import os
import re

from datetime import timedelta

import subprocess
from django.utils.timezone import now

try:
    from mock import patch
except ImportError:
    from unittest.mock import patch

from ..models import Project
from ..models import Task, PeriodicTask, History, Inventory, Template

from .inventory import _ApiGHBaseTestCase


class ApiTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiTasksTestCase, self).setUp()
        data = [dict(name="Prj1", repository="git@ex.us:dir/rep3.git",
                     vars=dict(repo_type="TEST"))]
        self.project_id = self.mass_create("/api/v1/projects/", data,
                                           "name", "repository")[0]
        self.task_proj = Project.objects.get(id=self.project_id)

        self.task1 = Task.objects.create(playbook="first.yml",
                                         project=self.task_proj)
        self.task2 = Task.objects.create(playbook="second.yml",
                                         project=self.task_proj)

    def test_get_tasks(self):
        url = "/api/v1/tasks/"
        self.list_test(url, Task.objects.all().count())

    correct_simple_inventory = "127.0.1.1 ansible_user=centos " +\
                               "ansible_ssh_private_key_file="

    def create_inventory(self):
        inventory_data = dict(name="Inv1", vars={})
        host_data = dict(name="127.0.1.1", type="HOST",
                         vars={"ansible_user": "centos",
                               "ansible_ssh_private_key_file": "somekey"})
        # make host, inventory
        inventory = self.post_result("/api/v1/inventories/",
                                     data=json.dumps(inventory_data))["id"]
        host = self.post_result("/api/v1/hosts/",
                                data=json.dumps(host_data))["id"]
        # put inventory to project and host to inventory
        self.post_result("/api/v1/inventories/{}/hosts/".
                         format(inventory), 200, data=json.dumps([host]))
        self.post_result("/api/v1/projects/{}/inventories/".
                         format(self.project_id), 200,
                         data=json.dumps([inventory]))
        return inventory, host

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_execute(self, subprocess_function):
        inv1, h1 = self.create_inventory()
        # mock side effect to get ansible-playbook args for assertions in test
        result = ["", ""]

        def side_effect(call_args, *args, **kwargs):
            inventory_path = call_args[3]
            with open(inventory_path, 'r') as inventory_file:
                inventory = inventory_file.read().split('\n')
                l = lambda x: x.startswith('127.')
                result[0] = list(filter(l, inventory))[0]
                key_path = result[0].split("=")[-1]
                with open(key_path, 'r') as key_file:
                    result[1] = key_file.read()
        subprocess_function.side_effect = side_effect
        # test that can't execute without inventory
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            400, data=json.dumps(dict(inventory=1100500)))
        # test simple execution
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv1, playbook="first.yml")))
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible-playbook"))
        self.assertTrue(call_args[1].endswith("first.yml"))
        self.assertTrue(result[0].startswith(self.correct_simple_inventory))
        self.assertEquals(result[1], "somekey")

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_execute_module(self, subprocess_function):
        inv1, h1 = self.create_inventory()
        # mock side effect to get ansible-playbook args for assertions in test
        result = ["", ""]

        def side_effect(call_args, *args, **kwargs):
            # check additional args
            self.assertIn("--user", call_args)
            self.assertIn("mysuperuser", call_args)
            # check inventory
            inventory_path = call_args[3]
            with open(inventory_path, 'r') as inventory_file:
                inventory = inventory_file.read().split('\n')
                l = lambda x: x.startswith('127.')
                result[0] = list(filter(l, inventory))[0]
                key_path = result[0].split("=")[-1]
                with open(key_path, 'r') as key_file:
                    result[1] = key_file.read()
        subprocess_function.side_effect = side_effect
        # test that can't execute without inventory
        self.post_result(
            "/api/v1/projects/{}/execute-module/".format(self.task_proj.id),
            400, data=json.dumps(dict(inventory=1100500, module="shell",
                                 group="all", args="ls -la")))
        # test simple execution
        answer = self.post_result(
            "/api/v1/projects/{}/execute-module/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv1, module="shell",
                                 group="all", args="ls -la",
                                 user="mysuperuser")))
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible"))
        self.assertTrue(call_args[1].endswith("all"))
        self.assertTrue(result[0].startswith(self.correct_simple_inventory))
        self.assertEquals(result[1], "somekey")
        history = History.objects.get(id=answer["history_id"])
        self.assertEquals(history.kind, "MODULE")
        self.assertEquals(history.mode, "shell")

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_complex_inventory_execute(self, subprocess_function):
        inventory_data = dict(name="Inv1",
                              vars={"ansible_ssh_private_key_file": "ikey",
                                    "custom_var1": "hello_world"})
        hosts_data = [dict(name="127.0.1.1", type="HOST", vars={}),
                      dict(name="hostlocl", type="HOST",
                           vars={"ansible_user": "centos",
                                 "ansible_ssh_private_key_file": "somekey"}),
                      dict(name="127.0.1.[3:4]", type="RANGE", vars={}),
                      dict(name="127.0.1.[5:6]", type="RANGE", vars={})]
        groups_data = [dict(name="groups1", vars={"ansible_user": "ubuntu",
                                                  "ansible_ssh_pass": "pass"},
                            children=True),
                       dict(name="groups2", vars={}, children=True),
                       dict(name="groups3", vars={}, children=True),
                       dict(name="hosts1", vars={}),
                       dict(name="hosts2", vars={})]
        # make hosts, groups, inventory
        inv1 = self.post_result("/api/v1/inventories/",
                                data=json.dumps(inventory_data))["id"]
        hosts_id = self._create_hosts(hosts_data)
        groups_id = self._create_groups(groups_data)
        # put inventory to project and hosts and groups to inventory
        self.post_result("/api/v1/groups/{}/groups/".
                         format(groups_id[0]), 200,
                         data=json.dumps(groups_id[1:3]))
        self.post_result("/api/v1/groups/{}/groups/".
                         format(groups_id[1]), 200,
                         data=json.dumps([groups_id[2]]))
        self.post_result("/api/v1/groups/{}/groups/".
                         format(groups_id[2]), 200,
                         data=json.dumps(groups_id[-2:]))
        self.post_result("/api/v1/groups/{}/hosts/".
                         format(groups_id[3]), 200,
                         data=json.dumps(hosts_id[0:2]))
        self.post_result("/api/v1/groups/{}/hosts/".
                         format(groups_id[4]), 200,
                         data=json.dumps(hosts_id[2:]))
        self.post_result("/api/v1/inventories/{}/hosts/".
                         format(inv1), 200, data=json.dumps(hosts_id[0:-1]))
        self.post_result("/api/v1/inventories/{}/groups/".
                         format(inv1), 200, data=json.dumps([groups_id[0]]))
        # execute task and get inventory
        result = [""]

        def side_effect(call_args, *args, **kwargs):
            inventory_path = call_args[3]
            with open(inventory_path, 'r') as inventory_file:
                inventory = inventory_file.read()
                result[0] = inventory
        subprocess_function.side_effect = side_effect
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv1, playbook="first.yml")))
        # check that inventory text is correct
        inventory = result[0]
        file_path = os.path.dirname(os.path.abspath(__file__))
        file_path += "/exemplary_complex_inventory"
        with open(file_path, 'r') as inventory_file:
            exemplary = inventory_file.read()
        inventory = re.sub("ansible_ssh_private_key_file=/.*",
                           "ansible_ssh_private_key_file=PATH",
                           inventory)
        self.assertEquals(list(map(str.strip, inventory.split("\n"))),
                          list(map(str.strip, exemplary.split("\n"))))

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_execute_error_handling(self, subprocess_function):
        extra_vars = '{"pacman":"mrs","ghosts":["inky","pinky","clyde","sue"]}'
        key_file = "-----BEGIN RSA PRIVATE KEY-----......"

        def check_status(exception, status):
            error = exception
            subprocess_function.side_effect = error
            url = "/api/v1/projects/{}/execute-playbook/"
            url = url.format(self.task_proj.id)
            self.post_result(
                url,
                data=json.dumps(dict(inventory=inv1,
                                     playbook="other/playbook.yml"))
            )
            history = get_history_item()
            self.assertEquals(history.status, status)

        def get_history_item():
            histories = History.objects.filter(mode="other/playbook.yml")
            self.assertEquals(histories.count(), 1)
            history = histories[0]
            # History.objects.all().delete()
            return history

        def side_effect(call_args, *args, **kwargs):
            self.assertIn("--limit", call_args)
            self.assertIn("limited-hosts", call_args)
            self.assertIn("--user", call_args)
            self.assertIn("some-def-user", call_args)
            self.assertIn("--key-file", call_args)
            self.assertIn(extra_vars, call_args)
            self.assertIn("other/playbook.yml", call_args[1])
            return "test_output"
        subprocess_function.side_effect = side_effect
        inv1, h1 = self.create_inventory()
        # check good run (without any problems)
        start_time = now()
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv1, playbook="other/playbook.yml",
                                 limit="limited-hosts", user="some-def-user",
                                 extra_vars=extra_vars, key_file=key_file))
        )
        end_time = now()
        history = get_history_item()
        inventory = history.raw_inventory
        res = self.get_result("get",
                              "/api/v1/history/{}/raw/".format(history.id))
        self.assertEquals(res, "test_output")
        self.assertTrue(self.correct_simple_inventory in inventory)
        self.assertEquals(history.raw_stdout, "test_output")
        self.assertEquals(history.status, "OK")
        self.assertTrue(history.start_time >= start_time and
                        history.start_time <= history.stop_time)
        self.assertTrue(history.stop_time <= end_time and
                        history.stop_time >= history.start_time)
        History.objects.all().delete()
        # node are offline
        check_status(subprocess.CalledProcessError(4, None, None), "OFFLINE")
        History.objects.all().delete()
        # error at node
        check_status(subprocess.CalledProcessError(None, None, None), "ERROR")
        History.objects.all().delete()

        result = self.get_result(
            "post",
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            400,
            data=json.dumps(dict(inventory=inv1, playbook="",
                                 limit="limited-hosts", user="some-def-user",
                                 extra_vars=extra_vars, key_file=key_file))
        )
        self.assertEqual(result["detail"], "Empty playbook/module name.")

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_cancel_task(self, subprocess_function):
        inv, _ = self.create_inventory()
        result = self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv, playbook="first.yml")))
        history = self.get_result("get",
                                  "/api/v1/history/{}/".format(
                                      result["history_id"]
                                  ))
        self.assertEquals(history["mode"], "first.yml")
        self.get_result("post",
                        "/api/v1/history/{}/cancel/".format(history['id']),
                        200)


class ApiPeriodicTasksTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiPeriodicTasksTestCase, self).setUp()

        repo = "git@ex.us:dir/rep3.git"
        data = [dict(name="Prj1", repository=repo,
                     vars=dict(repo_type="TEST"))]
        self.periodic_project_id = self.mass_create("/api/v1/projects/", data,
                                                    "name", "repository")[0]
        project = Project.objects.get(id=self.periodic_project_id)
        self.inventory = Inventory.objects.create()

        self.ptask1 = PeriodicTask.objects.create(mode="p1.yml",
                                                  name="test",
                                                  schedule="10",
                                                  type="INTERVAL",
                                                  project=project,
                                                  inventory=self.inventory)
        self.ptask2 = PeriodicTask.objects.create(mode="p2.yml",
                                                  name="test",
                                                  schedule="10",
                                                  type="INTERVAL",
                                                  project=project,
                                                  inventory=self.inventory)
        self.ph = Project.objects.create(name="Prj_History",
                                         repository=repo,
                                         vars=dict(repo_type="TEST"))
        self.default_kwargs = dict(project=self.ph, name="task.yml",
                                   raw_inventory="inventory",
                                   raw_stdout="text")
        self.histories = [
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
        self.default_kwargs["raw_stdout"] = "one\ntwo\nthree\nfour"
        self.default_kwargs["name"] = "task2.yml"
        self.histories.append(History.objects.create(
            status="ERROR", start_time=now() - timedelta(hours=35),
            stop_time=now() - timedelta(hours=34), **self.default_kwargs)
        )

    def test_history_of_executions(self):
        url = "/api/v1/history/"
        df = "%Y-%m-%dT%H:%M:%S.%fZ"
        self.list_test(url, len(self.histories))
        self.details_test(url + "{}/".format(self.histories[0].id),
                          name="task.yml",
                          status="OK", project=self.ph.id,
                          start_time=self.histories[0].start_time.strftime(df),
                          stop_time=self.histories[0].stop_time.strftime(df),
                          raw_inventory="inventory", raw_stdout="text")

        result = self.get_result("get", "{}?status={}".format(url, "OK"))
        self.assertEqual(result["count"], 1, result)

        res = self.get_result("get", "{}?name={}".format(url, "task.yml"))
        self.assertEqual(res["count"], 3, res)

        res = self.get_result("get", "{}?project={}".format(url, self.ph.id))
        self.assertEqual(res["count"], len(self.histories), res)

        st = self.histories[1].start_time.strftime(df)
        res = self.get_result("get", "{}?start_time__gte={}".format(url, st))
        self.assertEqual(res["count"], 2, res)
        res = self.get_result("get", "{}?start_time__gt={}".format(url, st))
        self.assertEqual(res["count"], 1, res)

        st = self.histories[1].stop_time.strftime(df)
        res = self.get_result("get", "{}?stop_time__gte={}".format(url, st))
        self.assertEqual(res["count"], 2, res)
        res = self.get_result("get", "{}?stop_time__gt={}".format(url, st))
        self.assertEqual(res["count"], 1, res)

        self.get_result("post", url, 405, data=dict(**self.default_kwargs))
        self.get_result("patch", url + "{}/".format(self.histories[0].id),
                        405, data=dict(**self.default_kwargs))
        self.get_result("put", url + "{}/".format(self.histories[0].id),
                        405, data=dict(**self.default_kwargs))

        # Lines pagination
        lines_url = url+"{}/lines/?limit=2".format(self.histories[3].id)
        result = self.get_result("get", lines_url)
        self.assertEqual(result["count"], 4, result)
        self.assertCount(result["results"], 2)
        lines_url = url
        lines_url += "{}/lines/?after=2&before=4".format(self.histories[3].id)
        result = self.get_result("get", lines_url)
        self.assertEqual(result["count"], 1, result)
        self.assertCount(result["results"], 1)
        line_number = result["results"][0]["line_number"]
        self.assertEqual(line_number, 3, result)

        self.get_result("delete", url + "{}/".format(self.histories[0].id))

        self.change_identity()
        self.list_test(url, 0)

    def test_create_delete_periodic_task(self):
        url = "/api/v1/periodic-tasks/"
        self.list_test(url, PeriodicTask.objects.all().count())
        self.details_test(url + "{}/".format(self.ptask1.id),
                          mode="p1.yml",
                          schedule="10",
                          type="INTERVAL",
                          project=self.periodic_project_id)

        variables = {"syntax-check": None, "limit": "host-1"}
        data = [dict(mode="p1.yml", schedule="10", type="INTERVAL",
                     project=self.periodic_project_id,
                     inventory=self.inventory.id, name="one", vars=variables),
                dict(mode="p2.yml",
                     schedule="* */2 1-15 * sun,fri",
                     type="CRONTAB", project=self.periodic_project_id,
                     inventory=self.inventory.id, name="two", vars=variables),
                dict(mode="p1.yml", schedule="", type="CRONTAB",
                     project=self.periodic_project_id,
                     inventory=self.inventory.id, name="thre", vars=variables),
                dict(mode="p1.yml", schedule="30 */4", type="CRONTAB",
                     project=self.periodic_project_id,
                     inventory=self.inventory.id, name="four", vars=variables)]
        results_id = self.mass_create(url, data, "mode", "schedule",
                                      "type", "project", "name", "vars")

        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        count = PeriodicTask.objects.filter(id__in=results_id).count()
        self.assertEqual(count, 0)

        # test with bad value
        data = dict(mode="p1.yml", schedule="30 */4 foo", type="CRONTAB",
                    project=self.periodic_project_id)
        self.get_result("post", url, 400, data=json.dumps(data))

        # test with with no project
        data = dict(mode="p1.yml", schedule="30 */4", type="CRONTAB")
        self.get_result("post", url, 400, data=json.dumps(data))

    def test_create_delete_periodic_task_module(self):
        details = dict(mode="ping",
                       name="test",
                       schedule="10",
                       kind="MODULE",
                       type="INTERVAL",
                       inventory=self.inventory)
        ptask = PeriodicTask.objects.create(**details)
        details['inventory'] = self.inventory.id
        url = "/api/v1/periodic-tasks/"
        self.details_test(url + "{}/".format(ptask.id), **details)
        variables = {"args": "ls -la", "group": "all"}
        data = [dict(mode="shell", schedule="10", type="INTERVAL",
                     project=self.periodic_project_id,
                     kind="MODULE",
                     inventory=self.inventory.id, name="one", vars=variables),
                dict(mode="shell",
                     schedule="* */2 1-15 * sun,fri",
                     kind="MODULE",
                     type="CRONTAB", project=self.periodic_project_id,
                     inventory=self.inventory.id, name="two", vars=variables),
                dict(mode="shell", schedule="", type="CRONTAB",
                     project=self.periodic_project_id,
                     kind="MODULE",
                     inventory=self.inventory.id, name="thre", vars=variables),
                dict(mode="shell", schedule="30 */4", type="CRONTAB",
                     project=self.periodic_project_id,
                     kind="MODULE",
                     inventory=self.inventory.id, name="four", vars=variables)]
        results_id = self.mass_create(url, data, "mode", "schedule",
                                      "type", "project", "name", "vars",
                                      "kind")
        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        count = PeriodicTask.objects.filter(id__in=results_id).count()
        self.assertEqual(count, 0)


class ApiTemplateTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiTemplateTestCase, self).setUp()

        self.pr_tmplt = Project.objects.create(**dict(
                name="TmpltProject",
                repository="git@ex.us:dir/rep3.git",
                vars=dict(repo_type="TEST")
            )
        )
        self.tmplt_data = dict(
            name="test_tmplt",
            kind="Task",
            data=dict(
                playbook="test.yml",
                vars=dict(
                    connection="paramiko",
                    tags="update",
                )
            )
        )
        self.job_template = Template.objects.create(**self.tmplt_data)

    def test_templates(self):
        url = "/api/v1/templates/"
        self.list_test(url, Template.objects.all().count())
        self.details_test(url + "{}/".format(self.job_template.id),
                          **self.tmplt_data)

        tmplt_data = dict()
        tmplt_data.update(self.tmplt_data)
        del tmplt_data["name"]

        self.get_result("patch", url + "{}/".format(self.job_template.id),
                        data=json.dumps(dict(name="test_tmplt")))
        self.details_test(url + "{}/".format(self.job_template.id),
                          name="test_tmplt", **tmplt_data)
        self.get_result("patch", url + "{}/".format(self.job_template.id),
                        400, data=json.dumps(dict(data=dict(test=1, tst=2))))
        self.get_result("patch", url + "{}/".format(self.job_template.id),
                        415, data=json.dumps(dict(kind="Test")))

        data = [dict(name="tmplt-{}".format(i), **tmplt_data)
                for i in range(5)]
        results_id = self.mass_create(url, data, "name", *tmplt_data.keys())

        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        count = Template.objects.filter(id__in=results_id).count()
        self.assertEqual(count, 0)

        result = self.get_result("get", url+"supported-kinds/")
        self.assertEqual(result, Template.template_fields)

        ptask_template_data = dict(
            name="test_ptask_template",
            kind="PeriodicTask",
            data=dict(
                mode="ping",
                type="INTERVAL",
                name="somename",
                project=2222332221,
                kind="MODULE",
                inventory=222233222,
                schedule="12",
                vars=dict(
                    group="all"
                )
            )
        )
        ptask_template = Template.objects.create(**ptask_template_data)
        self.details_test(url + "{}/".format(ptask_template.id),
                          **ptask_template_data)

        module_template_data = dict(
            name="test_ptask_template",
            kind="Module",
            data=dict(
                module="shell",
                group="all",
                inventory=222233222,
                args="ls -la",
                vars=dict(
                    user="centos"
                )
            )
        )
        module_template = Template.objects.create(**module_template_data)
        self.details_test(url + "{}/".format(module_template.id),
                          **module_template_data)


class ApiHistoryTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiHistoryTestCase, self).setUp()

        repo = "git@ex.us:dir/rep3.git"
        self.history_inventory = Inventory.objects.create()
        self.ph = Project.objects.create(name="Prj_History",
                                         repository=repo,
                                         vars=dict(repo_type="TEST"))
        self.default_kwargs = dict(project=self.ph, mode="task.yml",
                                   raw_inventory="inventory",
                                   raw_stdout="text",
                                   inventory=self.history_inventory)
        self.histories = [
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
        self.default_kwargs["raw_stdout"] = "one\ntwo\nthree\nfour"
        self.default_kwargs["mode"] = "task2.yml"
        self.histories.append(History.objects.create(
            status="ERROR", start_time=now() - timedelta(hours=35),
            stop_time=now() - timedelta(hours=34), **self.default_kwargs)
        )

    def test_history_of_executions(self):
        url = "/api/v1/history/"
        df = "%Y-%m-%dT%H:%M:%S.%fZ"
        self.list_test(url, len(self.histories))
        self.details_test(url + "{}/".format(self.histories[0].id),
                          name="task.yml",
                          status="OK", project=self.ph.id,
                          start_time=self.histories[0].start_time.strftime(df),
                          stop_time=self.histories[0].stop_time.strftime(df),
                          raw_inventory="inventory", raw_stdout="text",
                          inventory=self.history_inventory.id)

        result = self.get_result("get", "{}?status={}".format(url, "OK"))
        self.assertEqual(result["count"], 1, result)

        res = self.get_result("get", "{}?name={}".format(url, "task.yml"))
        self.assertEqual(res["count"], 3, res)

        res = self.get_result("get", "{}?project={}".format(url, self.ph.id))
        self.assertEqual(res["count"], len(self.histories), res)

        st = self.histories[1].start_time.strftime(df)
        res = self.get_result("get", "{}?start_time__gte={}".format(url, st))
        self.assertEqual(res["count"], 2, res)
        res = self.get_result("get", "{}?start_time__gt={}".format(url, st))
        self.assertEqual(res["count"], 1, res)

        st = self.histories[1].stop_time.strftime(df)
        res = self.get_result("get", "{}?stop_time__gte={}".format(url, st))
        self.assertEqual(res["count"], 2, res)
        res = self.get_result("get", "{}?stop_time__gt={}".format(url, st))
        self.assertEqual(res["count"], 1, res)

        self.get_result("post", url, 405, data=dict(**self.default_kwargs))
        self.get_result("patch", url + "{}/".format(self.histories[0].id),
                        405, data=dict(**self.default_kwargs))
        self.get_result("put", url + "{}/".format(self.histories[0].id),
                        405, data=dict(**self.default_kwargs))

        # Lines pagination
        lines_url = url+"{}/lines/?limit=2".format(self.histories[3].id)
        result = self.get_result("get", lines_url)
        self.assertEqual(result["count"], 4, result)
        self.assertCount(result["results"], 2)
        lines_url = url
        lines_url += "{}/lines/?after=2&before=4".format(self.histories[3].id)
        result = self.get_result("get", lines_url)
        self.assertEqual(result["count"], 1, result)
        self.assertCount(result["results"], 1)
        line_number = result["results"][0]["line_number"]
        self.assertEqual(line_number, 3, result)

        self.get_result("delete", url + "{}/".format(self.histories[0].id))

        self.change_identity()
        self.list_test(url, 0)
