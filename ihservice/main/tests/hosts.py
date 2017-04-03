from ._base import BaseTestCase, json
from ..models import Host


class ApiHostsTestCase(BaseTestCase):
    def setUp(self):
        super(ApiHostsTestCase, self).setUp()
        h1 = Host.objects.create(address="127.0.0.1",
                                 name="Host one",
                                 auth_user="centos")
        h2 = Host.objects.create(address="127.0.0.2",
                                 name="Host two")
        h3 = Host.objects.create(address="127.0.0.3")
        h4 = Host.objects.create(address="127.0.0.4",
                                 auth_user="ubuntu")
        self.h1, self.h2, self.h3, self.h4 = h1, h2, h3, h4

    def test_create_delete_host(self):
        data1 = dict(address="127.0.1.1", name="test-1", auth_user="centos")
        data2 = dict(address="127.0.1.2", name="test-2")
        data3 = dict(address="127.0.1.3")
        data4 = dict(address="127.0.1.4", auth_user="centos")
        data5 = dict(address="__as--", auth_user="centos")

        result = self.get_result("post", "/api/v1/hosts/", 201, data=data1)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["name"], data1["name"])
        self.assertEqual(result["address"], data1["address"])
        self.assertEqual(result["auth_user"], data1["auth_user"])
        self.assertEqual(result["auth_type"], "PASSWD")
        self.assertTrue(result.get("auth_data", None) is None)

        result = self.get_result("post", "/api/v1/hosts/", 201, data=data2)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["name"], data2["name"])
        self.assertEqual(result["address"], data2["address"])
        self.assertEqual(result["auth_user"], "")
        self.assertEqual(result["auth_type"], "PASSWD")
        self.assertTrue(result.get("auth_data", None) is None)

        result = self.get_result("post", "/api/v1/hosts/", 201, data=data3)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["name"], "null")
        self.assertEqual(result["address"], data3["address"])
        self.assertEqual(result["auth_user"], "")
        self.assertEqual(result["auth_type"], "PASSWD")
        self.assertTrue(result.get("auth_data", None) is None)

        result = self.get_result("post", "/api/v1/hosts/", 201, data=data4)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["name"], "null")
        self.assertEqual(result["address"], data4["address"])
        self.assertEqual(result["auth_user"], data4["auth_user"])
        self.assertEqual(result["auth_type"], "PASSWD")
        self.assertTrue(result.get("auth_data", None) is None)

        result = self.get_result("post", "/api/v1/hosts/", 400, data=data5)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["address"][0],
                         "Invalid hostname or IP '__as--'.")

    def test_filter_host(self):
        base_url = "/api/v1/hosts/"
        filter_url = "{}?address=127.0.0.1,127.0.0.2".format(base_url)
        result = self.get_result("get", filter_url, 200)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2)

        filter_url = "{}?address__not=127.0.0.3".format(base_url)
        result = self.get_result("get", filter_url, 200)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 3, result)
