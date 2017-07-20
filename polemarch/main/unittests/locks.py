from django.test import TestCase

from ..utils import model_lock_decorator, Lock


class LocksTestCase(TestCase):
    def test_locks(self):
        @model_lock_decorator()
        def method(pk):
            # pylint: disable=unused-argument
            pass

        @model_lock_decorator()
        def method2(pk):
            method(pk=pk)

        method(pk=123)
        with self.assertRaises(Lock.AcquireLockException):
            method2(pk=123)
