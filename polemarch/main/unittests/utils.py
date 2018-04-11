from subprocess import CalledProcessError

from ..tests._base import BaseTestCase
from ..utils import KVExchanger, model_lock_decorator, Lock, CmdExecutor, \
    tmp_file, ModelHandlers

try:
    from mock import MagicMock
except ImportError:  # nocv
    from unittest.mock import MagicMock

from ..models.utils import Executor


class ExecutorTestCase(BaseTestCase):
    def test_executor(self):
        # test output on `sleep --help`
        output = []

        def add_line(line, line_number):
            # pylint: disable=unused-argument
            output.append(line)

        history = MagicMock()
        history.id = 999
        history.write_line = add_line
        executor = Executor(history)
        executor.execute(['sleep', '--version'], '/')
        result = "\n".join(output)
        self.assertIn("sleep", result)
        # test interrupt on `sleep 5m`
        KVExchanger(Executor.CANCEL_PREFIX + str(history.id)).send(True, 10)
        executor = Executor(history)
        with self.assertRaises(CalledProcessError):
            executor.execute(['sleep', '5m'], '/')


class KVExchangerTestCase(BaseTestCase):
    def test_kvexchanger(self):
        KVExchanger("somekey").send(True, 10)
        KVExchanger("somekey").prolong()
        self.assertTrue(KVExchanger("somekey").get())


class LocksTestCase(BaseTestCase):
    def test_locks(self):
        @model_lock_decorator()
        def method(pk):
            # pylint: disable=unused-argument
            pass

        @model_lock_decorator()
        def method2(pk):
            method(pk=pk)

        method(pk=123)
        method(pk=None)
        with self.assertRaises(Lock.AcquireLockException):
            method2(pk=123)


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
