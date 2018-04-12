from ..tests._base import BaseTestCase
from ...api.v1.serializers import ModelRelatedField
from ...api.urls import router_v1, v1


class ModelRelatedFieldTestCase(BaseTestCase):
    def test_modelrelatedfield(self):
        ModelRelatedField(model=self.get_model_class('Host'))


class RoutersTestCase(BaseTestCase):
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


class UserSettingsTestCase(BaseTestCase):

    def test_del_user_settings(self):
        test_settings = self.get_model_class('UserSettings')()
        test_settings.data = 'something for test'
        del(test_settings.data)
        self.assertEqual(test_settings.data, {})
