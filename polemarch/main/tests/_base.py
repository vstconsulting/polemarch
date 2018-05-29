import json  # noqa: F401

import copy
import os
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from ...main import models


class BaseTestCase(VSTBaseTestCase):
    models = models

    def _get_string_from_file(self, name):
        file_path = os.path.dirname(os.path.abspath(__file__))
        file_path += "/" + name
        with open(file_path, 'r') as inventory_file:
            return inventory_file.read()


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
