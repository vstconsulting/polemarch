from __future__ import unicode_literals
from subprocess import CalledProcessError
from vstutils.utils import KVExchanger, tmp_file, ModelHandlers
from ..tests._base import BaseTestCase
from ..utils import CmdExecutor

try:
    from mock import MagicMock
except ImportError:  # nocv
    from unittest.mock import MagicMock

from ..models.utils import Executor


class ExecutorTestCase(BaseTestCase):
    def test_executor(self):
        # test output on `sleep --help`
        output = []

        def add_line(line, line_number, endl=''):
            # pylint: disable=unused-argument
            output.append(line)

        history = MagicMock()
        history.id = 999
        history.write_line = add_line
        executor = Executor(history)
        executor.execute(['echo', 'Hello'], '/')
        result = "\n".join(output)
        self.assertIn("Hello", result)
        # test interrupt on `sleep 5m`
        KVExchanger(Executor.CANCEL_PREFIX + str(history.id)).send(True, 10)
        executor = Executor(history)
        with self.assertRaises(CalledProcessError):
            executor.execute(['sleep', '5m'], '/')


class CMDExecutorTestCase(BaseTestCase):

    test_cmd_executor = CmdExecutor()

    def test_write_output(self):
        self.test_cmd_executor.write_output(5)
        self.assertEqual(self.test_cmd_executor.output, '5')


class tmp_fileTestCase(BaseTestCase):

    def test_magic_enter_exit(self):
        tmp = tmp_file(mode="r")
        with tmp as test_tmp_file:
            self.assertEqual(test_tmp_file, tmp)
        tmp = tmp_file(mode="r")
        self.assertEqual(tmp.__exit__(ValueError, 22, "Traceback"), False)


class ModelHandlerTestCase(BaseTestCase):

    def test_iter(self):
        test_model_handler = ModelHandlers("HOOKS", "'type' needed!")
        for i in test_model_handler:
            pass
