from django.test import TestCase

from ...api.urls import router_v1


class RoutersTestCase(TestCase):
    def test_uregister(self):
        router_v1.unregister("users")
        for pattern in router_v1.get_urls():
            self.assertIsNone(pattern.regex.search("users/1/"))
