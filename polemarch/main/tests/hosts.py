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
        data = [dict(name="hosted_group1"),
                dict(name="hosted_group2"),
                dict(name="hosted_group3"),
                dict(name="hosted_group4",
                     children=True)]
        gr_id = self.get_result("post", url, 201, data=data[0])["id"]
        gr_ch_id = self.get_result("post", url, 201, data=data[3])["id"]
        data = [dict(name="127.0.1.1", type="HOST", variables=self.vars),
                dict(name="hostlocl", type="HOST", variables=self.vars3),
                dict(name="127.0.1.[5:6]", type="RANGE", variables=self.vars2)]
        hosts_id = self._create_hosts(data)
        groups_id = [self.get_result("post", url, 201, data=data[1])["id"],
                     self.get_result("post", url, 201, data=data[2])["id"],
                     gr_id]

        def compare_list(rtype, code, gr_id, entries, list_url):
            gr_url = url + "{}/".format(gr_id)      # URL to created group
            gr_lists_url = gr_url + list_url + "/"  # URL to list in group
            self.get_result(rtype, gr_lists_url, code, data=entries)
            rhosts = self.get_result("get", gr_url)["hosts"]
            self.assertCount(rhosts, len(entries))
            self.assertCount(set(rhosts).intersection(entries), len(entries))

        # Test for group with hosts
        # Just put two hosts in group
        compare_list("post", 200, gr_id, hosts_id[0:2], "hosts")
        # Delete one of hosts in group
        compare_list("delete", 204, gr_id, [hosts_id[0]], "hosts")
        # Full update list of hosts
        compare_list("put", 200, gr_id, hosts_id, "hosts")
        # Error on operations with subgroups
        compare_list("post", 409, gr_id, groups_id[0:2], "groups")
        compare_list("delete", 409, gr_id, [groups_id[0]], "groups")
        compare_list("put", 409, gr_id, groups_id, "groups")

        # Test for group:children
        # Just put two groups in group
        compare_list("post", 200, gr_ch_id, groups_id[0:2], "groups")
        # Delete one of groups in group
        compare_list("delete", 204, gr_ch_id, [groups_id[0]], "groups")
        # Full update groups of group
        compare_list("put", 200, gr_ch_id, groups_id, "groups")
        # Error on operations with hosts
        compare_list("post", 409, gr_id, groups_id[0:2], "hosts")
        compare_list("delete", 409, gr_id, [groups_id[0]], "hosts")
        compare_list("put", 409, gr_id, groups_id, "hosts")

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


class ApiInventoriesTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiInventoriesTestCase, self).setUp()
        self.vars = dict(auth_user="centos")
        self.vars2 = dict(ansible_port="2222")
        self.vars3 = dict(ansible_ssh_pass="qwerty")
        self.vars3.update(self.vars)
        self.vars3.update(self.vars2)
        inv1 = Inventories.objects.create(name="First inventory")
        inv2 = Inventories.objects.create(name="Second inventory")

    def test_create_delete_inventory(self):
        url = "/api/v1/inventories/"
        self._list_test(url, 2)
        self._details_test(url+"{}/".format(self.inv1.id),
                           name=self.inv1.name, hosts=[], groups=[])

        data = [dict(name="Inv1", variables=self.vars),
                dict(name="Inv2", variables=self.vars2),
                dict(name="Inv3", variables=self.vars3), ]
        results_id = self._mass_create(url, data)

        for host_id in results_id:
            self.get_result("delete", url + "{}/".format(host_id))
        self.assertEqual(Host.objects.filter(id__in=results_id).count(), 0)

    def test_hosts_in_group(self):
        url = "/api/v1/inventories/"  # URL to groups layer

        groups_data = [dict(name="one", variables=self.vars),
                       dict(name="two", variables=self.vars2),
                       dict(name="three", variables=self.vars3)]
        hosts_data = [dict(name="127.0.1.1", type="HOST", variables=self.vars),
                      dict(name="hostlocl", type="HOST", variables=self.vars3)]
        groups_id = self._create_groups(groups_data)
        hosts_id = self._create_hosts(hosts_data)

        data = dict(name="Inv3", variables=self.vars3)
        inv_id = self.get_result("post", url, 201, data=data)["id"]

        def compare_list(rtype, code, gr_id, entries, list_url):
            inv_url = url + "{}/".format(gr_id)      # URL to created group
            gr_lists_url = inv_url + list_url + "/"  # URL to list in group
            self.get_result(rtype, gr_lists_url, code, data=entries)
            rhosts = self.get_result("get", inv_url)["hosts"]
            self.assertCount(rhosts, len(entries))
            self.assertCount(set(rhosts).intersection(entries), len(entries))

        # Test hosts
        # Just put two hosts in inventory
        compare_list("post", 200, inv_id, hosts_id[0:2], "hosts")
        # Delete one of hosts in inventory
        compare_list("delete", 204, inv_id, [hosts_id[0]], "hosts")
        # Full update list of inventory
        compare_list("put", 200, inv_id, hosts_id, "hosts")

        # Test groups
        # Just put two groups in inventory
        compare_list("post", 200, inv_id, groups_id[0:2], "groups")
        # Delete one of groups in inventory
        compare_list("delete", 204, inv_id, [groups_id[0]], "groups")
        # Full update groups of inventory
        compare_list("put", 200, inv_id, groups_id, "groups")
