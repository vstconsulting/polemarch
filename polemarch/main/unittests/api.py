from django.test import TestCase

from ..models import Host
from ...api.v1.serializers import ModelRelatedField
from ...api.urls import router_v1, v1
from ..models.users import UserGroup, UserSettings

class ModelRelatedFieldTestCase(TestCase):
    def test_modelrelatedfield(self):
        ModelRelatedField(model=Host)


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

class UserGroupTestCase(TestCase):

    def test_unicode(self):
        testing_use_group = UserGroup.objects.create(name="test_group_{}".format(9))
        testing_use_group.__unicode__()

class UserSettingsTestCase(TestCase):

    def test_del_user_settings(self):
        test_settings = UserSettings()
        test_settings.data = 'something for test'
        del(test_settings.data)
        self.assertEqual(test_settings.data, {})