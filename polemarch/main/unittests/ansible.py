from django.test import TestCase

from ..utils import AnsibleArgumentsReference, AnsibleModules


class AnsibleTestCase(TestCase):
    def _is_exists(self, ref, key):
        return any([True for args in ref.raw_dict.values() if key in args])

    def test_rules(self):
        # pylint: disable=protected-access,
        reference = AnsibleArgumentsReference()
        for rule in AnsibleArgumentsReference._GUI_TYPES_CONVERSION_DIFFERENT:
            self.assertTrue(self._is_exists(reference, rule))
        self.assertTrue(not self._is_exists(reference, "error_case"))
