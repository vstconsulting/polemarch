from django.test import TestCase

from ...api.urls import router_v1, v1


class RoutersTestCase(TestCase):
    def test_uregister(self):
        router_v1.unregister("history")
        for pattern in router_v1.get_urls():
            self.assertIsNone(pattern.regex.search("history/1/"))
        router_v1.register('history', v1.UserViewSet)
        checked = False
        for pattern in router_v1.registry:
            if pattern[0] == 'history':
                checked = True
                self.assertEqual(pattern[1], v1.UserViewSet)
        self.assertTrue(checked, "Not registered!")
