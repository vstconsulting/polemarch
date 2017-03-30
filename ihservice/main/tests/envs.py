from django.conf import settings
from ..models import Environment
from ._base import BaseTestCase, json

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch


class ApiEnvsTestCase(BaseTestCase):
    def test_get_env_types(self):
        client = self._login()
        result = self.result(client.get, "/api/v1/environments/types/")
        self.assertEquals(len(result), len(getattr(settings,
                                                   "INTEGRATIONS", {})))
        self._logout(client)

    def test_get_env_additionals(self):
        client = self._login()
        # Default environment
        data = dict(data={})
        result = self.result(client.post, "/api/v1/environments/additionals/",
                             data=data)
        self.assertEqual(len(result), 0)
        self.assertTrue(isinstance(result, dict))
        self._logout(client)

    def test_create_environment(self):
        client = self._login()
        # Default environment
        data = dict(name="test_env", data={})
        result = self.result(client.post, "/api/v1/environments/", 201, data)
        test_env = Environment.objects.get(id=result['id'])
        self.assertEquals(test_env.type, "Default")
        res = client.get("/api/v1/environments/")
        self.assertRCode(res)
        res = client.delete("/api/v1/environments/{}/".format(result['id']))
        self.assertRCode(res, 204)
        data['name'] = "test_env_err"
        data['type'] = "UnknownType"
        self.result(client.post, "/api/v1/environments/", 415, data=data)
        data['type'] = "OpenStack"
        data['data'] = dict(user="cepreu", password="Bp78ADpmcSMzcpac",
                            url="https://mos.vst.lan:5000/v2.0",
                            project="cepreu", network=True)
        self.result(client.post, "/api/v1/environments/", 400,
                    data=json.dumps(data), content_type="application/json")
        self._logout(client)

    def test_fields_serializer(self):
        client = self._login()
        data = dict(name="test_env_fields", data=u"")
        env = Environment.objects.create(**data)
        self.result(client.get, "/api/v1/environments/{}/".format(env.id))
        data['data'] = "dfbsd"
        data['name'] = "lkdfsdlkfj"
        self.result(client.post, "/api/v1/environments/", 400,
                    data=json.dumps(data), content_type="application/json")
        self._logout(client)

    @patch("ihservice.main.environments.default.Integration.rm_host")
    @patch("ihservice.main.environments.default.Integration.rm")
    def test_clear_calls(self, rm, rm_serv):
        client = self._login()
        # Default environment
        data = dict(name="test_env_rm", data={})
        result = self.result(client.post, "/api/v1/environments/", 201, data)
        test_env = Environment.objects.get(id=result['id'])
        self.assertEqual(rm.call_count, 0)
        for i in range(3):
            sdata = dict(environment=test_env.id, type="DNS")
            self.result(client.post, "/api/v1/hosts/", 201, sdata)
        self.assertEqual(rm_serv.call_count, 0)
        client.delete("/api/v1/environments/{}/".format(test_env.id))
        self.assertEqual(rm.call_count, 1)
        self.assertEqual(rm_serv.call_count, 3)
        self._logout(client)
