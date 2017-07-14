import json

from .inventory import _ApiGHBaseTestCase
from .. import models


class ApiBulkTestCase(_ApiGHBaseTestCase):

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
                    type="INTERVAL", schedule="10", inventory=self.inv2.id,
                    playbook="ok.yml")
        new = dict(name="new-periodic-task")
        self.abstract_test_bulk(
            data, new, "/api/v1/periodic-tasks/", "periodictask"
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
        self.assertIn("add", result["operations_types"])
        self.assertIn("set", result["operations_types"])
        self.assertIn("del", result["operations_types"])
