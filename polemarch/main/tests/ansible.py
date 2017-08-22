from .inventory import _ApiGHBaseTestCase
from ..utils import AnsibleModules


class ApiAnsibleTestCase(_ApiGHBaseTestCase):
    def test_ansible_cli_reference(self):
        result = self.get_result("get", "/api/v1/ansible/cli_reference/")
        self.assertIn("args", result)
        self.assertIn("module-name", result)

    def test_ansible_modules(self):
        url = "/api/v1/ansible/modules/"
        _mods = AnsibleModules()
        self.assertCount(self.get_result("get", url), len(_mods.all()))
        filter_str = "cloud.amazon"
        self.assertCount(self.get_result("get", url+"?filter="+filter_str),
                         len(_mods.get(filter_str)))
