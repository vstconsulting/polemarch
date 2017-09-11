from subprocess import CalledProcessError

from django.test import TestCase

from ..utils import KVExchanger

try:
    from mock import MagicMock
except ImportError:
    from unittest.mock import MagicMock

from ..models.utils import Executor


class ExecutorTestCase(TestCase):
    def test_executor(self):
        # test output on `sleep --help`
        output = []

        def add_line(history, line_number, line):
            # pylint: disable=unused-argument
            output.append(line)

        history = MagicMock()
        history.id = 999
        history.raw_history_line.create = add_line
        executor = Executor(history)
        executor.execute(['sleep', '--version'], '/')
        result = "\n".join(output)
        self.assertIn("sleep", result)
        # test interrupt on `sleep 5m`
        KVExchanger(Executor.CANCEL_PREFIX + str(history.id)).send(True, 10)
        executor = Executor(history)
        with self.assertRaises(CalledProcessError):
            executor.execute(['sleep', '5m'], '/')
