from ..tests._base import BaseTestCase


class UsersTestCase(BaseTestCase):

    def test_del_user_settings(self):
        test_settings = self.get_model_class('UserSettings')()
        test_settings.data = 'something for test'
        del(test_settings.data)
        self.assertEqual(test_settings.data, {})
