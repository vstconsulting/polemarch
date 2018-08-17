import six
from django.test import TestCase
from django.core.management import call_command
from ..utils import AnsibleArgumentsReference


class AnsibleTestCase(TestCase):
    def _is_exists(self, ref, key):
        return any([True for args in ref.raw_dict.values() if key in args])

    def test_rules(self):
        # pylint: disable=protected-access,
        reference = AnsibleArgumentsReference()
        for rule in AnsibleArgumentsReference._GUI_TYPES_CONVERSION_DIFFERENT:
            self.assertTrue(self._is_exists(reference, rule))
        self.assertTrue(not self._is_exists(reference, "error_case"))

    def test_modules(self):
        out = six.StringIO()
        call_command('update_ansible_modules', interactive=False, stdout=out)
        self.assertEqual(
            'The modules have been successfully updated.\n',
            out.getvalue().replace('\x1b[32;1m', '').replace('\x1b[0m', '')
        )
