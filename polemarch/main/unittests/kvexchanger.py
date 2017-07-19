from django.test import TestCase

from ..utils import KVExchanger


class KVExchangerTestCase(TestCase):
    def test_kvexchanger(self):
        KVExchanger("somekey").send(True, 10)
        self.assertTrue(KVExchanger("somekey").get())
