import json

import re

from datetime import timedelta

import subprocess

from django.conf import settings
from django.utils.timezone import now
from django.core.validators import ValidationError

try:
    from mock import patch
except ImportError:
    from unittest.mock import patch

from ..models import Project
from ..models import Task, PeriodicTask, History, Inventory, Template
from ..tasks.tasks import ScheduledTask

from .inventory import _ApiGHBaseTestCase
from ._base import AnsibleArgsValidationTest


class ApiTasksTestCase(_ApiGHBaseTestCase, AnsibleArgsValidationTest):
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

    correct_simple_inventory = (
        "127.0.1.1 ansible_user=centos "
        "ansible_ssh_private_key_file=[~~ENCRYPTED~~] "
        "ansible_become_pass=[~~ENCRYPTED~~]"
    )

    def create_inventory(self):
        inventory_data = dict(name="Inv1", vars={})
        host_data = dict(name="127.0.1.1", type="HOST",
                         vars={"ansible_user": "centos",
                               "ansible_become_pass": "secret",
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
        result = dict()

        def side_effect(call_args, *args, **kwargs):
            inventory_path = call_args[3]
            with open(inventory_path, 'r') as inventory_file:
                inventory = inventory_file.read().split('\n')
                sHst = inventory[1].split(" ")
                result['host'] = sHst[0]
                result['ansible_user'] = sHst[1].split("=")[1]
                result['ansible_become_pass'] = sHst[1].split("=")[1]
                with open(sHst[2].split("=")[1], 'r') as key_file:
                    result['ansible_ssh_private_key_file'] = key_file.read()
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
        self.assertEquals(result['host'], "127.0.1.1")
        self.assertEquals(result['ansible_user'], "centos")
        self.assertEquals(result['ansible_ssh_private_key_file'], "somekey")
        # test simple execution sync
        subprocess_function.reset_mock()
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv1, playbook="first.yml",
                                 sync=True)))
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible-playbook"))
        self.assertTrue(call_args[1].endswith("first.yml"))
        self.assertEquals(result['host'], "127.0.1.1")
        self.assertEquals(result['ansible_user'], "centos")
        self.assertEquals(result['ansible_ssh_private_key_file'], "somekey")

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_execute_module(self, subprocess_function):
        inv1, h1 = self.create_inventory()
        # mock side effect to get ansible-playbook args for assertions in test
        result = dict()

        def side_effect(call_args, *args, **kwargs):
            # check additional args
            self.assertIn("--user", call_args)
            self.assertIn("mysuperuser", call_args)
            penguin_exists = False
            for arg in call_args:
                if "penguin" in arg:
                    penguin_exists = True
            self.assertTrue(penguin_exists)
            # check inventory
            inventory_path = call_args[3]
            with open(inventory_path, 'r') as inventory_file:
                inventory = inventory_file.read().split('\n')
                sHst = inventory[1].split(" ")
                result['host'] = sHst[0]
                result['ansible_user'] = sHst[1].split("=")[1]
                result['ansible_become_pass'] = sHst[3].split("=")[1]
                with open(sHst[2].split("=")[1], 'r') as key_file:
                    result['ansible_ssh_private_key_file'] = key_file.read()
        subprocess_function.side_effect = side_effect
        # test that can't execute without inventory
        self.post_result(
            "/api/v1/projects/{}/execute-module/".format(self.task_proj.id),
            400, data=json.dumps(dict(inventory=1100500, module="shell",
                                 group="all", args="ls -la")))
        # test simple execution
        answer = self.post_result(
            "/api/v1/projects/{}/execute-module/".format(self.task_proj.id),
            data=json.dumps({"inventory": inv1, "module": "shell",
                             "group": "all", "args": "ls -la",
                             "user": "mysuperuser", "key-file": "penguin"}))
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible"))
        self.assertTrue(call_args[1].endswith("all"))
        self.assertEquals(result['host'], "127.0.1.1")
        self.assertEquals(result['ansible_user'], "centos")
        self.assertEquals(result['ansible_ssh_private_key_file'], "somekey")
        self.assertEquals(result['ansible_become_pass'], "secret")
        history = History.objects.get(id=answer["history_id"])
        self.assertEquals(history.kind, "MODULE")
        self.assertEquals(history.mode, "shell")
        self.assertIn(
            "ansible_become_pass=[~~ENCRYPTED~~]", history.raw_inventory,
            "\n"+history.raw_inventory
        )
        # test simple execution without args
        kw_list = [dict(args=""), dict(args=None), dict()]
        for kwargs in kw_list:
            subprocess_function.reset_mock()
            proj_id = self.task_proj.id
            answer = self.post_result(
                "/api/v1/projects/{}/execute-module/".format(proj_id),
                data=json.dumps(dict(inventory=inv1, module="ping",
                                     group="all", user="mysuperuser",
                                     **kwargs)))
            self.assertEquals(subprocess_function.call_count, 1)
            call_args = subprocess_function.call_args[0][0]
            self.assertNotIn("--args", call_args)

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_complex_inventory_execute(self, subprocess_function):
        inventory_data = dict(name="Inv1",
                              vars={"ansible_ssh_private_key_file": "ikey",
                                    "custom_var1": "hello_world"})
        hosts_data = [dict(name="127.0.1.1", type="HOST", vars={}),
                      dict(name="hostlocl", type="HOST",
                           vars={"ansible_user": "centos",
                                 "ansible_ssh_private_key_file":
                                     "mykey"}),
                      dict(name="127.0.1.[3:4]", type="RANGE", vars={}),
                      dict(name="127.0.1.[5:6]", type="RANGE", vars={})]
        groups_data = [dict(name="groups1",
                            vars={"ansible_user": "ubuntu",
                                  "ansible_ssh_pass": "mypass"},
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
        exemplary = self._get_string_from_file("exemplary_complex_inventory")
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
        url = "/api/v1/projects/{}/execute-playbook/"
        # check good run (without any problems)
        start_time = now()
        self.post_result(
            url.format(self.task_proj.id),
            data=json.dumps({
                "inventory": inv1,
                "playbook": "other/playbook.yml",
                "limit": "limited-hosts",
                "user": "some-def-user",
                "extra-vars": extra_vars,
                "key-file": key_file
            })
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
        self.assertEqual(history.initiator_object, self.user)
        History.objects.all().delete()
        # node are offline
        check_status(subprocess.CalledProcessError(4, None, ""), "OFFLINE")
        History.objects.all().delete()
        # error at node
        check_status(subprocess.CalledProcessError(None, None, None), "ERROR")
        History.objects.all().delete()
        result = self.get_result(
            "post",
            url.format(self.task_proj.id),
            400,
            data=json.dumps(dict(inventory=inv1, playbook="",
                                 limit="limited-hosts", user="some-def-user",
                                 extra_vars=extra_vars, key_file=key_file))
        )
        self.assertEqual(result["detail"], "Empty playbook/module name.")

    def test_ansible_args_validate_at_execution(self):
        def update_func(args, mistake):
            args.update(mistake)

        inv1, h1 = self.create_inventory()
        # you can't destroy world if you even does not know ansible arguments )
        # test playbook execution errors with incorrect arguments:
        playbook_url = "/api/v1/projects/" \
                       "{}/execute-playbook/".format(self.task_proj.id)
        required_args_playbook = {
            "inventory": inv1,
            "playbook": "destroy_world.yml",
            "user": "evil_genius",
            "key-file": "key_to_absolute_weapon"
        }
        self.make_test(playbook_url, required_args_playbook, update_func)
        # argument not exists error during module execution
        module_url = "/api/v1/projects/" \
                     "{}/execute-module/".format(self.task_proj.id)
        required_args_module = {
            "inventory": inv1,
            "module": "ping",
            "group": "penguin",
            "user": "evil_genius",
            "key-file": "key_to_absolute_weapon"
        }
        self.make_test(module_url, required_args_module, update_func, "group")

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

    @patch('polemarch.main.hooks.http.Backend._execute')
    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_hook_task(self, subprocess_function, execute_method):
        result = self.get_result('get', "/api/v1/hooks/types/")
        self.assertIn('HTTP', result['types'])
        self.assertIn('SCRIPT', result['types'])
        self.assertIn('on_execution', result['when'])
        self.assertIn('after_execution', result['when'])
        self.assertIn('on_user_add', result['when'])
        self.assertIn('on_user_upd', result['when'])
        self.assertIn('on_user_del', result['when'])
        self.assertIn('on_object_add', result['when'])
        self.assertIn('on_object_upd', result['when'])
        self.assertIn('on_object_del', result['when'])
        inv, _ = self.create_inventory()
        hook_url = 'http://ex.com'
        hook_data = dict(
            name="test", type='HTTP', recipients=hook_url, when='on_execution'
        )
        self.post_result("/api/v1/hooks/", data=json.dumps(hook_data))
        self.post_result("/api/v1/hooks/", data=json.dumps(hook_data))
        self.sended = False
        self.count = 0
        playbook = "first.yml"

        def side_effect(url, when, message):
            self.assertEqual(url, hook_url)
            self.assertEqual(when, 'on_execution')
            json.dumps(message)
            self.assertEqual(message['execution_type'], "PLAYBOOK")
            self.assertEqual(message['target']['name'], playbook)
            self.assertEqual(
                message['target']['inventory']['id'], inv
            )
            self.assertEqual(
                message['target']['project']['id'], self.task_proj.id
            )
            self.sended = True
            self.count += 1
            if self.count == 1:
                raise Exception("Test exception")
            return '200 OK: {"result": "ok"}'

        execute_method.side_effect = side_effect
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory=inv, playbook=playbook, sync=1))
        )
        self.assertTrue(self.sended, "Raised on sending.")
        self.assertEquals(execute_method.call_count, 2)
        self.assertEquals(subprocess_function.call_count, 1)
        execute_method.reset_mock()
        for when in ['on_object_add', 'on_object_upd', 'on_object_del']:
            hook_data_obj = dict(**hook_data)
            hook_data_obj['when'] = when
            self.post_result("/api/v1/hooks/", data=json.dumps(hook_data_obj))
        range_int = 3
        for i in range(range_int):
            self.get_model_class('Host').objects.create(name="h-{}".format(i))
        hosts = self.get_model_class('Host').objects.filter(
            name__in=["h-{}".format(i) for i in range(range_int)]
        )
        for h in hosts:
            h.type = 'RANGE'
            h.save()
        hosts.delete()
        self.assertEquals(execute_method.call_count, 9)

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_execute_inventory_file(self, subprocess_function):

        def side_effect(call_args, *args, **kwargs):
            # check inventory
            inventory_path = call_args[3]
            expected = "{}/{}/{}".format(
                settings.PROJECTS_DIR, self.task_proj.id, "inventory"
            )
            self.assertEqual(inventory_path, expected)

        subprocess_function.side_effect = side_effect
        with open("{}/12".format(self.task_proj.path), 'w') as file:
            file.write("burda")
        with open("{}/inventory".format(self.task_proj.path), 'w') as file:
            file.write("burda")
        self.post_result(
            "/api/v1/projects/{}/execute-module/".format(self.task_proj.id),
            data=json.dumps(dict(inventory="./12", module="ping", group="all"))
        )
        self.post_result(
            "/api/v1/projects/{}/execute-playbook/".format(self.task_proj.id),
            data=json.dumps(dict(inventory="inventory", playbook="first.yml"))
        )
        # fail with outside access
        self.post_result(
            "/api/v1/projects/{}/execute-module/".format(self.task_proj.id),
            data=json.dumps(dict(inventory="../inventory",
                                 module="ping", group="all")),
            code=400
        )
        self.assertEquals(subprocess_function.call_count, 2)


class ApiPeriodicTasksTestCase(_ApiGHBaseTestCase, AnsibleArgsValidationTest):
    def setUp(self):
        super(ApiPeriodicTasksTestCase, self).setUp()

        repo = "git@ex.us:dir/rep3.git"
        data = [dict(name="Prj1", repository=repo,
                     vars=dict(repo_type="TEST"))]
        self.periodic_project_id = self.mass_create("/api/v1/projects/", data,
                                                    "name", "repository")[0]
        self.project = Project.objects.get(id=self.periodic_project_id)
        self.inventory = Inventory.objects.create()

        self.ptask1 = PeriodicTask.objects.create(mode="p1.yml",
                                                  name="test",
                                                  schedule="10",
                                                  type="INTERVAL",
                                                  project=self.project,
                                                  inventory=self.inventory)
        self.ptask2 = PeriodicTask.objects.create(mode="p2.yml",
                                                  name="test",
                                                  schedule="10",
                                                  type="INTERVAL",
                                                  project=self.project,
                                                  inventory=self.inventory)

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
                    project=self.periodic_project_id,
                    inventory=self.inventory.id)
        result = self.get_result("post", url, 400, data=json.dumps(data))
        self.assertIn("Invalid weekday", str(result))

        # test with with no project
        data = dict(mode="p1.yml", schedule="30 */4", type="CRONTAB")
        self.get_result("post", url, 400, data=json.dumps(data))
        data = dict(mode="p1.yml", schedule="30 */4", type="crontab",
                    project=self.periodic_project_id,
                    inventory=self.inventory.id, name="four", vars=variables)
        self.get_result("post", url, 415, data=json.dumps(data))

    def test_create_delete_periodic_task_module(self):
        details = dict(mode="ping",
                       name="test",
                       schedule="10",
                       kind="MODULE",
                       type="INTERVAL",
                       inventory=self.inventory,
                       project=self.project)
        ptask = PeriodicTask.objects.create(**details)
        details['inventory'] = str(self.inventory.id)
        details['project'] = self.project.id
        url = "/api/v1/periodic-tasks/"
        self.details_test(url + "{}/".format(ptask.id), **details)
        variables = {"args": "ls -la", "group": "all"}
        data = [dict(mode="shell", schedule="10", type="INTERVAL",
                     project=self.periodic_project_id,
                     kind="MODULE", name="one", vars=variables,
                     inventory=str(self.inventory.id)),
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

    def test_periodic_task_ansible_args_validation(self):
        def update_func(args, mistake):
            args['vars'].update(mistake)

        url = "/api/v1/periodic-tasks/"
        old_count = PeriodicTask.objects.count()
        variables = {"limit": "host-1"}
        # playbook
        data = dict(mode="p1.yml", schedule="10", type="INTERVAL",
                    project=self.periodic_project_id,
                    inventory=self.inventory.id, name="one", vars=variables)
        self.make_test(url, data, update_func)
        # module
        data['kind'] = "MODULE"
        self.make_test(url, data, update_func, "group")
        # none of PeriodicTasks created in DB
        self.assertEquals(old_count, PeriodicTask.objects.count())

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_periodic_task_execution(self, subprocess_function):
        url = "/api/v1/periodic-tasks/"
        # module
        data = dict(mode="shell", schedule="10", type="INTERVAL",
                    project=self.periodic_project_id,
                    kind="MODULE",
                    inventory=self.inventory.id, name="one",
                    vars={"args": "ls -la", "group": "all"})
        id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        ScheduledTask.delay(id)
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible"))
        self.assertIn("shell", call_args)
        subprocess_function.reset_mock()
        # playbook
        data = dict(mode="p1.yml", schedule="10", type="INTERVAL",
                    project=self.periodic_project_id,
                    inventory=self.inventory.id, name="one", vars={})
        id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        ScheduledTask.delay(id)
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible-playbook"))
        self.assertTrue(call_args[1].endswith("p1.yml"))
        subprocess_function.reset_mock()
        data['save_result'] = False
        id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        count = History.objects.all().count()
        ScheduledTask.delay(id)
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        self.assertTrue(call_args[0].endswith("ansible-playbook"))
        self.assertTrue(call_args[1].endswith("p1.yml"))
        self.assertCount(History.objects.all(), count)

        def side_effect(*args, **kwargs):
            raise Exception("Test text")

        subprocess_function.reset_mock()
        subprocess_function.side_effect = side_effect
        ScheduledTask(id)
        self.assertEquals(subprocess_function.call_count, 1)
        self.assertCount(History.objects.all(), count)

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_periodictask_inventory_file(self, subprocess_function):
        url = "/api/v1/periodic-tasks/"
        # module
        with open("{}/inventory".format(self.project.path), 'w') as file:
            file.write("burda")
        data = dict(mode="shell", schedule="10", type="INTERVAL",
                    project=self.periodic_project_id,
                    kind="MODULE",
                    inventory="inventory", name="one",
                    vars={"args": "ls -la", "group": "all"})
        id = self.get_result("post", url, 201, data=json.dumps(data))['id']
        ScheduledTask.delay(id)
        self.assertEquals(subprocess_function.call_count, 1)
        call_args = subprocess_function.call_args[0][0]
        inventory_path = call_args[3]
        expected = "{}/{}/{}".format(
            settings.PROJECTS_DIR, self.periodic_project_id, "inventory"
        )
        self.assertEquals(inventory_path, expected)
        # can't save with "../"
        data['inventory'] = "../inventory"
        self.get_result("post", url, 400, data=json.dumps(data))

    def test_secret_periodictask_vars(self):
        url = "/api/v1/periodic-tasks/"
        data = dict(
            mode="p1.yml", schedule="10", type="INTERVAL",
            project=self.periodic_project_id,
            inventory=self.inventory.id, name="one", vars={
                "key-file": "secret",
                "private-key": "secret",
                "vault-password-file": "secret"
            }
        )

        host = self.post_result(url, data=json.dumps(data))
        host_again = self.get_result("get", "{}{}/".format(url, host['id']))

        for h in [host, host_again]:
            for val in h['vars'].values():
                self.assertEqual(val, "[~~ENCRYPTED~~]")

    @patch("polemarch.main.models.projects.Project.execute")
    def test_periodictask_execute_now(self, execute):
        def side(*args, **kwargs):
            self.assertEqual(args[0], self.ptask1.kind)
            self.assertEqual(args[1], self.ptask1.mode)
            self.assertEqual(args[2], self.inventory)
            self.assertEqual(kwargs["initiator_type"], "scheduler")
            self.assertEqual(kwargs["initiator"], self.ptask1.id)
            self.assertEqual(kwargs["save_result"], self.ptask1.save_result)
            self.assertTrue(not kwargs["sync"])
            return 0

        execute.side_effect = side
        url = "/api/v1/periodic-tasks/"
        result = self.get_result(
            "post", "{}{}/execute/".format(url, self.ptask1.id)
        )
        self.assertEqual(
            "Started at inventory {}.".format(self.inventory), result['detail']
        )
        self.assertEquals(result["history_id"], 0)
        self.assertEquals(execute.call_count, 1)


class ApiTemplateTestCase(_ApiGHBaseTestCase, AnsibleArgsValidationTest):
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
                project=self.pr_tmplt.id,
                inventory=self.history_inventory.id,
                vars=dict(
                    connection="paramiko",
                    tags="update",
                )
            )
        )
        self.job_template = Template.objects.create(**self.tmplt_data)
        # Ugly hack for fix some errors
        self.tmplt_data.update(dict(
            name=self.job_template.name,
            kind=self.job_template.kind,
            data=self.job_template.data
        ))

    @patch('polemarch.main.utils.CmdExecutor.execute')
    def test_templates_execution(self, subprocess_function):
        # prepare mock and some vars
        ansible_args = []

        def side_effect(call_args, *args, **kwargs):
            ansible_args.extend(call_args)
        subprocess_function.side_effect = side_effect
        url = "/api/v1/templates/"
        tmplt = self.post_result(url, data=json.dumps(self.tmplt_data))
        single_url = "{}{}/".format(url, tmplt['id'])
        # test playbook execution
        self.post_result(single_url + "execute/", code=201)
        self.assertIn('test.yml', ansible_args)
        # test module execution
        ansible_args = []
        module_data = dict(
            kind="Module",
            data=dict(
                module="shell",
                group="all",
                project=self.pr_tmplt.id,
                inventory=self.history_inventory.id,
                args="ls -la",
                vars={},
            )
        )
        self.get_result("patch", single_url, data=json.dumps(module_data))
        res = self.post_result(single_url + "execute/", code=201)
        self.assertIsNotNone(res["history_id"])
        self.assertIn('shell', ansible_args)
        # test incorrect template
        ptask_data = dict(
            kind="Host",
            data=dict(
                name="somename",
                vars={}
            )
        )
        self.get_result("patch", single_url, data=json.dumps(ptask_data))
        self.post_result(single_url + "execute/", code=415)

        # Execution with options
        ansible_args = []
        tmpl_with_opts = dict(
            kind="Module",
            name='Test opts',
            data=dict(
                module="shell",
                group="all",
                project=self.pr_tmplt.id,
                inventory=self.history_inventory.id,
                args="ls -la",
                vars=dict(
                    forks=8,
                ),
            ),
            options=dict(
                one=dict(group='test_group'),
                two=dict(args='pwd', vars=dict(forks=1))
            )
        )
        tmplt = self.post_result(url, data=json.dumps(tmpl_with_opts))
        for option in tmpl_with_opts['options'].keys():
            self.assertIn(option, tmplt['options_list'], tmplt)
        single_url = "{}{}/".format(url, tmplt['id'])
        # test playbook execution default
        self.post_result(single_url + "execute/", 201)
        self.assertIn(tmpl_with_opts['data']['module'], ansible_args)
        self.assertIn(tmpl_with_opts['data']['group'], ansible_args)
        self.assertIn('--forks', ansible_args)
        self.assertIn(
            str(tmpl_with_opts['data']['vars']['forks']), ansible_args
        )

        # test playbook execution one option
        ansible_args = []
        self.post_result(single_url + "execute/", 201, data=dict(option='one'))
        self.assertIn(tmpl_with_opts['data']['module'], ansible_args)
        self.assertIn(tmpl_with_opts['options']['one']['group'], ansible_args)
        self.assertIn('--forks', ansible_args)
        self.assertIn(
            str(tmpl_with_opts['data']['vars']['forks']), ansible_args
        )

        # test playbook execution two option
        ansible_args = []
        self.post_result(single_url + "execute/", 201, data=dict(option='two'))
        self.assertIn(tmpl_with_opts['data']['module'], ansible_args)
        self.assertIn(tmpl_with_opts['options']['two']['args'], ansible_args)
        self.assertIn('--forks', ansible_args)
        self.assertIn(
            str(tmpl_with_opts['options']['two']['vars']['forks']),
            ansible_args
        )

        # test invalid attrs for options
        invalid_inventory = dict(**tmpl_with_opts)
        invalid_inventory['options']['three'] = dict(inventory='some_str')
        res = self.post_result(url, 400, data=json.dumps(invalid_inventory))
        self.assertIn(
            'Disallowed to override inventory.', res['detail']['options'], res
        )

        # test encrypted keys
        enc_keys = dict(**tmpl_with_opts)
        enc_keys['options']['three'] = dict(
            vars={"key-file": "some_very_secret_data"}
        )
        res = self.post_result(url, data=json.dumps(enc_keys))
        single_url = "{}{}/".format(url, res['id'])
        res = self.get_result("get", single_url)
        self.assertEqual(
            res['options']['three']['vars']['key-file'], '[~~ENCRYPTED~~]', res
        )

    def test_string_template_data(self):
        tmplt_data = dict(
            name="test_tmplt",
            kind="Task",
            data=dict(
                project=self.pr_tmplt.id,
                inventory=self.history_inventory.id,
                vars=dict()
            )
        )
        job_template = Template.objects.create(**tmplt_data)
        job_template.data = json.dumps(dict(
                playbook="test.yml",
                project=self.pr_tmplt.id,
                inventory=self.history_inventory.id,
                vars=dict(
                    connection="paramiko",
                    tags="update",
                )
            ))
        self.assertTrue(isinstance(job_template.data, dict))
        with self.assertRaises(ValueError):
            job_template.data = object()

        with self.assertRaises(ValidationError):
            Template.objects.create(**tmplt_data)

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
                project=self.pr_tmplt.id,
                kind="MODULE",
                inventory=222233222,
                schedule="12",
                vars=dict(
                    group="all"
                )
            )
        )
        ptask_template = Template.objects.create(**ptask_template_data)
        ptask_template_data.update(dict(
            name=ptask_template.name,
            kind=ptask_template.kind,
            data=ptask_template.data
        ))
        self.details_test(url + "{}/".format(ptask_template.id),
                          **ptask_template_data)

        module_template_data = dict(
            name="test_ptask_template",
            kind="Module",
            data=dict(
                module="shell",
                group="all",
                project=self.pr_tmplt.id,
                inventory=222233222,
                args="ls -la",
                vars=dict(
                    user="centos",
                    group="asddf"
                )
            )
        )
        module_template = Template.objects.create(**module_template_data)
        module_template_data.update(dict(
            name=module_template.name,
            kind=module_template.kind,
            data=module_template.data
        ))
        self.details_test(url + "{}/".format(module_template.id),
                          **module_template_data)
        # test validation

        def update_func(args, mistake):
            args['data']['vars'].update(mistake)

        self.make_test(url, self.tmplt_data, update_func)
        self.make_test(url, module_template_data, update_func, "group")
        self.make_test(url, ptask_template_data, update_func, "group")

        # Filters
        # by Project
        search_url = "{}?project={}".format(url, self.pr_tmplt.id)
        real_count = Template.objects.filter(project=self.pr_tmplt).count()
        res = self.get_result("get", search_url)
        self.assertEqual(res["count"], real_count, [res, real_count])
        # by Inventory
        search_url = "{}?inventory={}".format(url, self.history_inventory.id)
        real_count = Template.objects.filter(
            inventory=str(self.history_inventory.id)
        ).count()
        res = self.get_result("get", search_url)
        self.assertEqual(res["count"], real_count, [res, real_count])

    def test_secret_template_vars(self):
        url = "/api/v1/templates/"
        data = dict(
            name="test_tmplt",
            kind="Task",
            data=dict(
                playbook="test.yml",
                project=self.pr_tmplt.id,
                inventory=self.history_inventory.id,
                vars={
                    "vault-password-file": "secret",
                }
            )
        )

        t = self.post_result(url, data=json.dumps(data))
        t_again = self.get_result("get", "{}{}/".format(url, t['id']))

        for i in [t, t_again]:
            for val in i['data']['vars'].values():
                self.assertEqual(val, "[~~ENCRYPTED~~]")

        data['data']['vars']['vault-password-file'] = "[~~ENCRYPTED~~]"
        self.get_result("patch", "{}{}/".format(url, t['id']),
                        data=json.dumps(data))

        for val in Template.objects.get(pk=t['id']).data['vars'].values():
            self.assertEqual(val, "secret")


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
                                   inventory=self.history_inventory,
                                   initiator=self.user.id)
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
                          mode="task.yml",
                          status="OK", project=self.ph.id,
                          start_time=self.histories[0].start_time.strftime(df),
                          stop_time=self.histories[0].stop_time.strftime(df),
                          raw_inventory="inventory",
                          inventory=self.history_inventory.id,
                          initiator=self.user.id, initiator_type="users")

        result = self.get_result("get", "{}?status={}".format(url, "OK"))
        self.assertEqual(result["count"], 1, result)

        res = self.get_result("get", "{}?mode={}".format(url, "task.yml"))
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

    def test_history_raw_output(self):
        raw_stdout = "[0;35mdeprecate" \
                     "[0;32mok" \
                     "[1;31munreachable" \
                     "[0;36mskipping" \
                     "[1;35mwarning" \
                     "[0;33mchanged" \
                     "[0;31mfatal"
        nocolor = "deprecate" \
                  "ok" \
                  "unreachable" \
                  "skipping" \
                  "warning" \
                  "changed" \
                  "fatal"
        default_kwargs = dict(project=self.ph, mode="task.yml",
                              raw_inventory="inventory",
                              inventory=self.history_inventory,
                              initiator=self.user.id,
                              status="OK",
                              start_time=now() - timedelta(hours=15),
                              stop_time=now() - timedelta(hours=14))
        default_kwargs['raw_stdout'] = raw_stdout
        history = History.objects.create(**default_kwargs)
        url = "/api/v1/history/{}/raw/".format(history.id)
        result = self.get_result("get", url)
        self.assertEquals(result, nocolor)
        result = self.get_result("get", url + "?color=yes")
        self.assertEquals(result, raw_stdout)

        # Clear output
        history.status = "RUN"
        history.save()
        url = "/api/v1/history/{}/clear/".format(history.id)
        self.get_result("delete", url, 406)
        history.status = "OK"
        history.save()
        self.get_result("delete", url)
        url = "/api/v1/history/{}/raw/".format(history.id)
        result = self.get_result("get", url)
        self.assertEquals(result, "Output trancated.\n")

    def test_history_facts(self):
        history_kwargs = dict(project=self.ph, mode="setup",
                              kind="MODULE",
                              raw_inventory="inventory",
                              raw_stdout="text",
                              inventory=self.history_inventory,
                              status="OK",
                              start_time=now() - timedelta(hours=15),
                              stop_time=now() - timedelta(hours=14))
        history = History.objects.create(**history_kwargs)
        stdout = self._get_string_from_file("facts_stdout")
        history.raw_stdout = stdout
        history.save()
        url = "/api/v1/history/{}/facts/".format(history.id)
        parsed = self.get_result("get", url)
        self.assertCount(parsed, 6)
        self.assertEquals(parsed['172.16.1.31']['status'], 'SUCCESS')
        self.assertEquals(parsed['test.vst.lan']['status'], 'SUCCESS')
        self.assertEquals(parsed['172.16.1.29']['status'], 'SUCCESS')
        self.assertEquals(parsed['172.16.1.32']['status'], 'FAILED!')
        self.assertEquals(parsed['172.16.1.30']['status'], 'UNREACHABLE!')
        self.assertEquals(parsed['172.16.1.31']['ansible_facts']
                          ['ansible_memfree_mb'], 736)
        self.assertCount(
            parsed['test.vst.lan']['ansible_facts']["ansible_devices"], 2
        )
        self.assertIn('No route to host',
                      parsed['172.16.1.30']['msg'])
        for status in ['RUN', 'DELAY']:
            history.status = status
            history.save()
            self.get_result("get", url, code=424)
        history.status = "OK"
        history.kind = "PLAYBOOK"
        history.save()
        self.get_result("get", url, code=404)
