import json

from .inventory import _ApiGHBaseTestCase


class ApiBulkTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        pass

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
            {'type': "delete", 'item': item, 'pk': to_delete[0]},
            {'type': "delete", 'item': item, 'pk': to_delete[1]},
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
        for element in results["results"]:
            # deleted
            self.assertNotIn(element['id'], to_delete)
            if element['id'] not in to_edit:
                # added
                current = single_data.copy()
            else:
                # changed
                current = single_data.copy()
                current.update(new_single_data)
            for key in current:
                self.assertEquals(current[key], element[key])

    def test_bulk_hosts(self):
        data = dict(name="host", type="HOST")
        new = dict(name="host[1:3]", type="RANGE")
        self.abstract_test_bulk(data, new, "/api/v1/hosts/", "host")
