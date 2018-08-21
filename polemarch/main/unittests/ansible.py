import six
from django.test import TestCase
from django.core.management import call_command


class AnsibleTestCase(TestCase):
    def test_modules(self):
        out = six.StringIO()
        call_command('update_ansible_modules', interactive=False, stdout=out)
        self.assertEqual(
            'The modules have been successfully updated.\n',
            out.getvalue().replace('\x1b[32;1m', '').replace('\x1b[0m', '')
        )
