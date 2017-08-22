from .inventory import _ApiGHBaseTestCase


class ApiAnsibleTestCase(_ApiGHBaseTestCase):
    def test_ansible_cli_reference(self):
        result = self.get_result("get",
                                 "/api/v1/ansible/ansible_cli_reference/",
                                 200)
        self.assertIn("args", result)
        self.assertIn("module-name", result)
