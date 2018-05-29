from ..tests._base import BaseTestCase
from ...api.v1.serializers import ModelRelatedField


class ModelRelatedFieldTestCase(BaseTestCase):
    def test_modelrelatedfield(self):
        ModelRelatedField(model=self.get_model_class('Host'))


class UsersTestCase(BaseTestCase):

    def test_del_user_settings(self):
        test_settings = self.get_model_class('UserSettings')()
        test_settings.data = 'something for test'
        del(test_settings.data)
        self.assertEqual(test_settings.data, {})
