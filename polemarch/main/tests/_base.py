import json  # noqa: F401

import copy
import os
from django.conf import settings
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from ...main import models


class BaseTestCase(VSTBaseTestCase):
    models = models

    def _settings(self, item, default=None):
        return getattr(settings, item, default)

    def get_url(self, item=None, pk=None, sub=None):
        url = '/{}/{}/'.format(
            self._settings('VST_API_URL'), self._settings('VST_API_VERSION')
        )
        url += "{}/".format(item) if item else ''
        url += "{}/".format(pk) if pk else ''
        url += '{}/'.format(sub) if sub else ''
        return url

    def _get_string_from_file(self, name):
        file_path = os.path.dirname(os.path.abspath(__file__))
        file_path += "/" + name
        with open(file_path, 'r') as inventory_file:
            return inventory_file.read()

    def abstract_test_bulk_mod(self, objs, types, item, method="PUT"):
        for tp, data in types.items():
            bulk_data = []
            for obj in objs:
                bulk_data += [
                    {
                        "type": "mod", "item": item,
                        'pk': obj.id, "data": data,
                        "method": method, "data_type": tp
                    }
                ]
            self.get_result(
                "post", self.get_url('_bulk'), 200, data=json.dumps(bulk_data)
            )

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
        self.get_result("post", self.get_url('_bulk'), 200, data=json.dumps(bulk_data))
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

    def _get_bulk_mod(self, item, index, data):
        return {
            'type': "mod", 'item': item,
            'pk': "<{}[data][id]>".format(index),
            "method": 'POST', "data_type": 'variables',
            'data': data
        }

    def make_bulk(self, data):
        return self.get_result(
            "post", self.get_url('_bulk'), 200, data=json.dumps(data)
        )

    def mass_create_bulk(self, item, data):
        bulk_data = list()
        counter = 0
        for dt in [dict(i) for i in data]:
            variables = dt.pop('variables', None)
            bulk_data.append({'type': "add", 'item': item, 'data': dt})
            if variables:
                inner_counter = 0
                for k, v in variables.items():
                    md = dict(key=k, value=v)
                    bulk_data.append(self._get_bulk_mod(item, counter, md))
                    inner_counter += 1
                counter += inner_counter
            counter += 1
        result = self.make_bulk(bulk_data)
        for res in result:
            self.assertEqual(res['status'], 201, res)
        return result


class AnsibleArgsValidationTest(BaseTestCase):
    _MISTAKES = [
        ("non-existent-ansible-arg", "blablabla"),
        ("forks", "234bnl"),
        ("sudo", "makaka"),
        ("group", "bugaga"),
    ]

    def make_test(self, url, required_args, update_func, exception=None):
        for arg, val in self._MISTAKES:
            if exception == arg:
                continue
            args = copy.deepcopy(required_args)
            update_func(args, {arg: val})
            result = self.get_result("post", url, 400, data=json.dumps(args))
            tp = "playbook" if "playbook" in result['detail'] else "module"
            self.assertIn("Incorrect argument", result["detail"][tp][0])
            self.assertIn(arg, result["detail"]['argument'][0])
