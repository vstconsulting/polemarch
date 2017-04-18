from ._base import BaseTestCase, json
from ..models import Host, Group


class _ApiGHBaseTestCase(BaseTestCase):
    def _mass_create(self, url, data):
        '''
        Mass creation objects in api-abstration
        :param url: - url to abstract layer
        :param data: - fields of model
        :return: - list of id by every resulted models
        '''
        results_id = []
        for dt in data:
            result = self.get_result("post", url, 201, data=dt)
            self.assertTrue(isinstance(result, dict))
            self.assertEqual(result["name"], data[0]["name"])
            self.assertEqual(result["type"], data[0]["type"])
            self.assertEqual(result["variables"], data[0]["variables"])
            results_id.append(result["id"])
        return results_id

    def _create_hosts(self, hosts):
        return self._mass_create("/api/v1/hosts/", hosts)

    def _create_groups(self, groups):
        return self._mass_create("/api/v1/groups/", groups)

    def _list_test(self, url, count):
        '''
        Test for get list of models
        :param url: - url to abstract layer
        :param count: - count of objects in DB
        :return: None
        '''
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count)

    def _details_test(self, url, **kwargs):
        '''
        Test for get details of model
        :param url: - url to abstract layer
        :param **kwargs: - params thats should be
                          (key - field name, value - field value)
        :return: None
        '''
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for key, value in kwargs:
            self.assertEqual(result[key], value)


class ApiHostsTestCase(_ApiGHBaseTestCase):
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
        self._list_test(url, 3)
        self._details_test(url+"{}/".format(self.h1.id), name=self.h1.name)

        data = [dict(name="127.0.1.1", type="HOST", variables=self.vars),
                dict(name="hostlocl", type="HOST", variables=self.vars3),
                dict(name="127.0.1.[3:4]", type="RANGE", variables=self.vars),
                dict(name="127.0.1.[5:6]", type="RANGE", variables=self.vars2)]
        results_id = self._create_hosts(data)

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


class ApiGroupsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiGroupsTestCase, self).setUp()
        self.vars = dict(auth_user="centos")
        self.vars2 = dict(ansible_port="2222")
        self.vars3 = dict(ansible_ssh_pass="qwerty")
        self.vars3.update(self.vars)
        self.vars3.update(self.vars2)
        self.gr1 = Group.objects.create(name="base_one")
        self.gr2 = Group.objects.create(name="base_two")
        self.gr3 = Group.objects.create(name="base_three")

    def test_create_delete_group(self):
        url = "/api/v1/groups/"
        self._list_test(url, 3)
        self._details_test(url+"{}/".format(self.gr1.id), name=self.gr1.name)

        data = [dict(name="one", variables=self.vars),
                dict(name="two", variables=self.vars2),
                dict(name="three", variables=self.vars3)]
        results_id = self._create_groups(data)

        for host_id in results_id:
            self.get_result("delete", url + "{}/".format(host_id))
        self.assertEqual(Host.objects.filter(id__in=results_id).count(), 0)

    def test_hosts_in_group(self):
        url = "/api/v1/groups/"  # URL to groups layer
        data = [dict(name="hosted_group1"), dict(name="hosted_group2")]
        gr_id = self.get_result("post", url, 201, data=data[0])["id"]
        gr_url = url + "{}/".format(gr_id)  # URL to created group
        gr_hosts_url = gr_url + "hosts/"    # URL to hosts list in group
        data = [dict(name="127.0.1.1", type="HOST", variables=self.vars),
                dict(name="hostlocl", type="HOST", variables=self.vars3),
                dict(name="127.0.1.[5:6]", type="RANGE", variables=self.vars2)]
        results_id = self._create_hosts(data)

        def compare_list(rtype, code, hosts):
            self.get_result(rtype, gr_hosts_url, code, data=hosts)
            rhosts = self.get_result("get", gr_url)["hosts"]
            self.assertCount(rhosts, len(hosts))
            self.assertCount(set(rhosts).intersection(hosts), len(hosts))

        # Check empty group
        self.assertCount(self.get_result("get", gr_url)["hosts"], 0)
        # Just put two hosts in group
        compare_list("post", 200, results_id[0:2])
        # Delete one of hosts in group
        compare_list("delete", 204, [results_id[0]])
        # Full update list of hosts
        compare_list("put", 200, results_id)

        #TODO: Наследуюемые группы.

    def test_filter_group(self):
        base_url = "/api/v1/groups/"
        filter_url = "{}?name=127.0.0.1,127.0.0.2".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2)

        filter_url = "{}?name__not=127.0.0.3".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 3, result)

    def test_update_group(self):
        url = "/api/v1/groups/{}/".format(self.gr1.id)
        data = dict(variables=dict(auth_user="ubuntu"))
        self.get_result("patch", url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["variables"], data["variables"], result)
