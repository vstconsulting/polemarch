from .inventory import _ApiGHBaseTestCase
from ..utils import AnsibleModules


class ApiAnsibleTestCase(_ApiGHBaseTestCase):
    def test_ansible(self):
        url = "/api/v1/ansible/"
        result = self.get_result("get", url)
        self.assertIn("modules", result)
        self.assertIn("cli-reference", result)

    def test_ansible_cli_reference(self):
        url = "/api/v1/ansible/cli_reference/"
        result = self.get_result("get", url)
        self.assertIn("args", result['ansible'])
        self.assertIn("forks", result['ansible'])
        self.assertIn("list-tasks", result['ansible-playbook'])
        self.assertNotIn("verbose", result['ansible'])
        self.assertNotIn("verbose", result['ansible-playbook'])
        # test filter
        result = self.get_result("get", url + "?filter=ansible")
        result.pop('ansible')
        self.assertEquals(result, {})
        # test empty if filter by non-exist
        result = self.get_result("get", url + "?filter=byaka", 200)
        self.assertEquals(result, {})

    def test_ansible_modules(self):
        url = "/api/v1/ansible/modules/"
        _mods = AnsibleModules()
        self.assertCount(self.get_result("get", url), len(_mods.all()))
        filter_str = "cloud.amazon"
        self.assertCount(self.get_result("get", url+"?filter="+filter_str),
                         len(_mods.get(filter_str)))
