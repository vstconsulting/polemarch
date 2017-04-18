from ._base import BaseTestCase, json
from ..models import Host


class ApiHostsTestCase(BaseTestCase):
    def setUp(self):
        super(ApiHostsTestCase, self).setUp()
        self.vars = dict(auth_user="centos")
        self.vars2 = dict(ansible_port="2222")
        self.vars3 = dict(ansible_host="127.0.0.2")
        self.vars3.update(self.vars)
        self.vars3.update(self.vars2)
        self.h1 = Host.objects.create(name="127.0.0.1",
                                      type="HOST", variables=self.vars)
        self.h2 = Host.objects.create(name="hostonlocal",
                                      type="HOST", variables=self.vars3)
        self.h3 = Host.objects.create(name="127.0.0.[3:4]",
                                      type="RANGE", variables=self.vars)
        self.h4 = Host.objects.create(name="127.0.0.[5:6]",
                                      type="RANGE", variables=self.vars2)

    def test_create_delete_host(self):
        url = "/api/v1/hosts/"
        data = [dict(name="127.0.1.1", type="HOST", variables=self.vars),
                dict(name="hostlocl", type="HOST", variables=self.vars3),
                dict(name="127.0.1.[3:4]", type="RANGE", variables=self.vars),
                dict(name="127.0.1.[5:6]", type="RANGE", variables=self.vars2)]
        results_id = []

        for dt in data:
            result = self.get_result("post", url, 201, data=dt)
            self.assertTrue(isinstance(result, dict))
            self.assertEqual(result["name"], data[0]["name"])
            self.assertEqual(result["type"], data[0]["type"])
            self.assertEqual(result["variables"], data[0]["variables"])
            results_id.append(result["id"])

        for host_id in results_id:
            self.get_result("delete", url + "{}/".format(host_id))
        self.assertEqual(Host.objects.filter(id__in=results_id).count(), 0)

    def test_filter_host(self):
        base_url = "/api/v1/hosts/"
        filter_url = "{}?name=127.0.0.1,127.0.0.2".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2)

        filter_url = "{}?name__not=127.0.0.3".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 3, result)

    def test_update_host(self):
        url = "/api/v1/hosts/{}/".format(self.h1.id)
        data = dict(variables=dict(auth_user="ubuntu"))
        self.get_result("patch", url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["variables"], data["variables"], result)
