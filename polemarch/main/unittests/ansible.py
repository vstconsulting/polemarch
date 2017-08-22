from django.test import TestCase

from ..utils import AnsibleArgumentsReference


class AnsibleTestCase(TestCase):
    def test_rules(self):
        # pylint: disable=protected-access,
        reference = AnsibleArgumentsReference()
        for rule in AnsibleArgumentsReference._EXCLUSIONS:
            self.assertTrue(reference.is_exists(rule))
