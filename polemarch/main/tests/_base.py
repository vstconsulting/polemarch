import json  # noqa: F401

import copy
import os
from django.conf import settings
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from ...main import models


class BaseTestCase(VSTBaseTestCase):
    models = models
    tests_path = os.path.dirname(os.path.abspath(__file__))

    def get_test_filepath(self, name):
        file_path = os.path.dirname(os.path.abspath(__file__))
        file_path += "/" + name
        return file_path

    def _get_string_from_file(self, name):
        with open(self.get_test_filepath(name), 'r') as fd:
            return fd.read()

    def get_mod_bulk(self, item, pk, data, mtype="variables", *args, **kwargs):
        return super(BaseTestCase, self).get_mod_bulk(
            item, pk, data, mtype, *args, **kwargs
        )

    def _get_bulk_mod(self, item, index, data, mtype='variables'):
        return self.get_mod_bulk(item, "<{}[data][id]>".format(index), data, mtype)

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
