import json
try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch
from fakeldap import MockLDAP
from ..tests._base import BaseTestCase
from ...api.v1.serializers import ModelRelatedField
from ...api.urls import router
from ...api.v1 import views as v1
from ..ldap_utils import LDAP


class ModelRelatedFieldTestCase(BaseTestCase):
    def test_modelrelatedfield(self):
        ModelRelatedField(model=self.get_model_class('Host'))


class RoutersTestCase(BaseTestCase):
    def test_uregister(self):
        router_v1 = router.routers[0][1]
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


class UsersTestCase(BaseTestCase):

    def test_del_user_settings(self):
        test_settings = self.get_model_class('UserSettings')()
        test_settings.data = 'something for test'
        del(test_settings.data)
        self.assertEqual(test_settings.data, {})

    @patch('polemarch.main.ldap_utils.ldap.initialize')
    def test_ldap_api(self, ldap_obj):
        admin = "admin@test.lan"
        admin_password = "ldaptest"
        admin_dict = {
            "objectCategory": ['top', 'user'],
            "userPassword": [admin_password],
            'cn': [admin]
        }
        tree = {
            admin: admin_dict,
            "dc=test,dc=lan": {
                'cn=admin,dc=test,dc=lan': admin_dict,
                'cn=test,dc=test,dc=lan': {"objectCategory": ['person', 'user']},
            }
        }
        LDAP_obj = MockLDAP(tree)
        ldap_obj.return_value = LDAP_obj
        ldap_backend = LDAP('ldap://10.10.10.22', admin, domain='test.lan')
        self.assertFalse(ldap_backend.isAuth())
        with self.assertRaises(LDAP.NotAuth):
            ldap_backend.group_list()
        ldap_backend.auth(admin, admin_password)
        self.assertTrue(ldap_backend.isAuth())
        self.assertEqual(
            json.loads(ldap_backend.group_list())["dc=test,dc=lan"],
            tree["dc=test,dc=lan"]
        )
