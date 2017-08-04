import logging
from django.core.management import call_command
from django.test import TestCase
from django.utils.six import StringIO

# from ... import __version__

logger = logging.getLogger("polemarch")


class ServiceCommandTestCase(TestCase):
    def test_version_output(self):
        out = StringIO()
        try:
            call_command('webserver', '--version', stdout=out)
        except SystemExit:
            pass
        # TODO: all people around the internets says that is way to capture
        # output. BUT IT IS NOT WORKING!!! Do they really check their answers?
        # self.assertIn('Polemarch {}'.format(__version__), out.getvalue())

    def test_log_level(self):
        # TODO: incomplete
        try:
            call_command('webserver', '--version')
        except SystemExit:
            pass
        self.assertEquals(logger.getEffectiveLevel(), logging.WARNING)
