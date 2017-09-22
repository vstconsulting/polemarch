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
        self.assertIn("args", result['module'])
        self.assertIn("forks", result['module'])
        self.assertIn("list-tasks", result['playbook'])
        self.assertEquals("keyfile", result['module']['private-key']['type'])
        self.assertNotIn("verbose", result['module'])
        self.assertNotIn("verbose", result['playbook'])
        self.assertIn("args", result['periodic_module'])
        self.assertIn("forks", result['periodic_module'])
        self.assertIn("list-tasks", result['periodic_playbook'])
        self.assertNotIn("verbose", result['periodic_module'])
        self.assertNotIn("verbose", result['periodic_playbook'])
        self.assertIn("f", result['module']['forks']['shortopts'])
        # test filter
        result = self.get_result("get", url + "?filter=module")
        result.pop('module')
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
        url = url + "?detailed=1&fields=module,short_description,description"
        url += "&filter=^cloud.amazon"
        result = self.get_result("get", url)
        self.assertCount(result, len(_mods.get(filter_str)))
        self.assertIn("module", result[0]['data'])
        self.assertIn("short_description", result[0]['data'])
        self.assertIn("description", result[0]['data'])
        self.assertIn("path", result[0])
        self.assertNotIn("notes", result[0])
