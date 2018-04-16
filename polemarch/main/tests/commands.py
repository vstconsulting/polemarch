import logging

from django.core.management import call_command
from django.test import TestCase

from ..management.base import ServiceCommand
from ... import __version__

logger = logging.getLogger("polemarch")


class ServiceCommandTestCase(TestCase):
    def test_log_level_command_argument_exist(self):
        for arg in ['-l', '--log-level']:
            try:
                call_command('webserver', arg, "NOTEXISTLEVEL")
            except ValueError as e:
                self.assertIn("Unknown level", str(e))

    def test_version_output(self):
        vstr = ServiceCommand().get_version()
        self.assertIn("Polemarch", vstr)
        self.assertIn(__version__, vstr)

    def test_log_level_command_argument(self):
        command = ServiceCommand()
        command.handle(**{"log-level": "INFO"})
        self.assertEquals(command.LOG_LEVEL, "INFO")
        self.assertEquals(logger.getEffectiveLevel(), logging.INFO)
