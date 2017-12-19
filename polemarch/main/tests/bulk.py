import json
from datetime import timedelta
from django.utils.timezone import now
from .inventory import _ApiGHBaseTestCase
from .. import models


class ApiBulkTestCase(_ApiGHBaseTestCase):
    def abstract_test_bulk_mod(self, objs, types, item):
        for tp, data in types.items():
            bulk_data = []
            for obj in objs:
                bulk_data += [
                    {
                        "type": "mod", "item": item,
                        'pk': obj.id, "data": data,
                        "method": "PUT", "data_type": tp
                    }
                ]
            self.get_result("post", "/api/v1/_bulk/", 200,
                            data=json.dumps(bulk_data))

    def abstract_test_bulk(self, single_data, new_single_data, url,
                           item):
        data = [single_data, single_data]
        to_delete = self.mass_create(url, data, *single_data.keys())
        to_edit = self.mass_create(url, data, *single_data.keys())
        bulk_data = []
        bulk_data += [
            {'type': "add", 'item': item, 'data': single_data},
            {'type': "add", 'item': item, 'data': single_data},
        ]
        bulk_data += [
            {'type': "del", 'item': item, 'pk': to_delete[0]},
            {'type': "del", 'item': item, 'pk': to_delete[1]},
        ]
        bulk_data += [
            {'type': "set", 'item': item, 'pk': to_edit[0],
             'data': new_single_data},
            {'type': "set", 'item': item, 'pk': to_edit[1],
             'data': new_single_data},
        ]
        self.get_result("post", "/api/v1/_bulk/", 200,
                        data=json.dumps(bulk_data))
        results = self.get_result("get", url)
        self.assertTrue(isinstance(results, dict))
        self.assertEqual(results["count"], 4)
        for el in results["results"]:
            details = self.get_result("get", "{}{}/".format(url, el["id"]))
            # deleted
            self.assertNotIn(details['id'], to_delete)
            if details['id'] not in to_edit:
                # added
                current = single_data.copy()
            else:
                # changed
                current = single_data.copy()
                current.update(new_single_data)
            for key in current:
                self.assertEquals(current[key], details[key])

    def test_bulk_hosts(self):
        models.Host.objects.all().delete()
        data = dict(name="host", type="HOST")
        new = dict(name="host[1:3]", type="RANGE")
        self.abstract_test_bulk(data, new, "/api/v1/hosts/", "host")

    def test_bulk_groups(self):
        models.Group.objects.all().delete()
        models.Host.objects.all().delete()
        data = dict(name="group", children=True)
        new = dict(name="new_group", children=False)
        raised = False
        try:
            self.abstract_test_bulk(data, new, "/api/v1/groups/", "group")
        except AssertionError:
            raised = True
        self.assertTrue(raised)
        new.pop("children")
        models.Group.objects.all().delete()
        self.abstract_test_bulk(data, new, "/api/v1/groups/", "group")

        # Bulk add hosts
        group1 = models.Group.objects.create(name="test1")
        group2 = models.Group.objects.create(name="test2")
        hdata = dict(name="host", type="HOST")
        types = dict(hosts=self.mass_create("/api/v1/hosts/", data=[hdata]))
        self.abstract_test_bulk_mod([group1, group2], types, "group")
        self.assertCount(group1.hosts.all(), 1)
        self.assertCount(group2.hosts.all(), 1)

    def test_bulk_inventories(self):
        models.Inventory.objects.all().delete()
        data = dict(name="inventory")
        new = dict(name="new_inventory")
        self.abstract_test_bulk(data, new, "/api/v1/inventories/", "inventory")

    def test_bulk_projects(self):
        models.Project.objects.all().delete()
        data = dict(name="proj", repository="rep", vars=dict(repo_type="TEST"))
        new = dict(name="new_project")
        self.abstract_test_bulk(data, new, "/api/v1/projects/", "project")

    def test_bulk_periodictasks(self):
        models.PeriodicTask.objects.all().delete()
        data = dict(name="periodic-task", project=self.prj1.id,
                    type="INTERVAL", schedule="10",
                    inventory=str(self.inv2.id), mode="ok.yml")
        new = dict(name="new-periodic-task")
        self.abstract_test_bulk(
            data, new, "/api/v1/periodic-tasks/", "periodictask"
        )

    def test_bulk_templates(self):
        models.Template.objects.all().delete()
        data = dict(
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
        new = dict(**data)
        new["name"] = "test2_tmplt"
        self.abstract_test_bulk(
            data, new, "/api/v1/templates/", "template"
        )

    def test_bulk_history(self):
        models.History.objects.all().delete()
        repo = "git@ex.us:dir/rep3.git"
        ph = self.get_model_filter("Project").create(
            name="Prj_History", repository=repo, vars=dict(repo_type="TEST")
        )
        default_kwargs = dict(
            project=ph, mode="task.yml", raw_inventory="inventory",
            raw_stdout="text", initiator=self.user.id
        )
        h = self.get_model_class("History").objects.create(
            status="OK", start_time=now() - timedelta(hours=15),
            stop_time=now() - timedelta(hours=14), **default_kwargs)
        bulk_data = [
            {'type': "get", 'item': "history", 'pk': h.id},
            {'type': "del", 'item': "history", 'pk': h.id},
        ]
        result = self.get_result(
            "post", "/api/v1/_bulk/", 200, data=json.dumps(bulk_data)
        )
        self.assertEqual(result[0]['data']['id'], h.id)
        self.assertEqual(result[0]['status'], 200)
        self.assertEqual(result[0]['type'], 'get')
        self.assertEqual(result[1]['status'], 200)
        self.assertEqual(result[1]['data']['detail'], "Ok")
        self.assertCount(models.History.objects.all(), 0)
        bulk_data = [
            {'type': "mod", 'item': "history", 'pk': h.id},
        ]
        self.get_result(
            "post", "/api/v1/_bulk/", 415, data=json.dumps(bulk_data)
        )

    def test_bulk_unsupported(self):
        data = dict(username="some_user", password="some_password")
        bulk_data = [
            {'type': "add", 'item': "user", 'data': data}
        ]
        self.get_result("post", "/api/v1/_bulk/", 415,
                        data=json.dumps(bulk_data))

        result = self.get_result("get", "/api/v1/_bulk/")
        self.assertIn("host", result["allowed_types"])
        self.assertIn("group", result["allowed_types"])
        self.assertIn("inventory", result["allowed_types"])
        self.assertIn("project", result["allowed_types"])
        self.assertIn("periodictask", result["allowed_types"])
        self.assertIn("template", result["allowed_types"])
        self.assertIn("add", result["operations_types"])
        self.assertIn("set", result["operations_types"])
        self.assertIn("del", result["operations_types"])
