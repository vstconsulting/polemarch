from ...api.v1.views import HostViewSet
from ._base import BaseTestCase, json
from ..models import Host, Group, Inventory


class _ApiGHBaseTestCase(BaseTestCase):
    def _compare_list(self, url, rtype, code, gr_id, req_entries, list_url,
                      res_entries, failed=0):
        '''
        ensure that after executed operation object contains only enumerated
        entries
        :param url: - root url for this kind of objects (group, inventory, etc)
        :param rtype: - type of request to make (get, post, delete, etc)
        :param code: - code, which must be in response
        :param gr_id: - id of object to work with
        :param req_entries: - list of entries to put in request
        :param list_url: - part of url to get this entries via get request
        :param res_entries: - list of entries which should be in result
        :return: None
        '''
        single_url = url + "{}/".format(gr_id)  # URL to created group
        gr_lists_url = single_url + list_url + "/"  # URL to list in group
        op_result = self.get_result(rtype, gr_lists_url, code,
                                    data=json.dumps(req_entries))

        if code != 409:
            self.assertEqual(op_result['total'], len(req_entries))
            self.assertEqual(op_result['operated'], len(req_entries) - failed)
            self.assertEqual(op_result['not_found'], failed)
            for id in op_result['failed_list']:
                self.assertNotIn(id, res_entries)
                self.assertIn(id, req_entries)

        if code != 409:
            rlist = self.get_result("get", single_url)[list_url]
            rlist = [i["id"] for i in rlist]
            self.assertCount(rlist, len(res_entries))
            self.assertCount(set(rlist).intersection(res_entries),
                             len(res_entries))

    def _create_hosts(self, hosts):
        return self.mass_create("/api/v1/hosts/", hosts,
                                "name", "type", "vars")

    def _create_groups(self, groups):
        return self.mass_create("/api/v1/groups/", groups,
                                "name", "vars")

    def _create_inventories(self, inventories):
        return self.mass_create("/api/v1/inventories/", inventories,
                                "name", "vars")

    def _create_tasks(self, tasks):
        return self.mass_create("/api/v1/tasks/", tasks,
                                "inventory", "playbook")

    def _create_periodic_tasks(self, tasks):
        return self.mass_create("/api/v1/periodic-tasks/", tasks,
                                "task", "schedule", "type")

    def _filter_test(self, base_url, variables, count):
        filter_url = "{}?".format(base_url)
        for key, value in variables.items():
            filter_url += "{}={}&".format(key, value)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count, result)

    def _filter_vars(self, base_url, variables, count):
        filter_url = "{}?variables={}".format(base_url, variables)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count, result)


class ApiHostsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiHostsTestCase, self).setUp()
        self.vars = dict(auth_user="centos")
        self.vars2 = dict(ansible_port="2222")
        self.vars3 = dict(ansible_host="127.0.0.2")
        self.vars3.update(self.vars)
        self.vars3.update(self.vars2)
        self.h1 = Host.objects.create(name="127.0.0.1",
                                      type="HOST", vars=self.vars)
        self.h2 = Host.objects.create(name="hostonlocal",
                                      type="HOST", vars=self.vars3)
        self.h3 = Host.objects.create(name="127.0.0.[3:4]",
                                      type="RANGE", vars=self.vars)
        self.h4 = Host.objects.create(name="127.0.0.[5:6]",
                                      type="RANGE", vars=self.vars2)

    def test_string_vars(self):
        vars3 = json.dumps(self.vars3)
        host = Host.objects.create(name="127.0.0.1",
                                   type="HOST", vars=vars3)
        self.assertEquals(host.vars['auth_user'], 'centos')

    def test_create_delete_host(self):
        url = "/api/v1/hosts/"
        self.list_test(url, 4)
        self.details_test(url + "{}/".format(self.h1.id), name=self.h1.name)

        data = [dict(name="127.0.1.1", type="HOST", vars=self.vars),
                dict(name="hostlocl", type="HOST", vars=self.vars3),
                dict(name="127.0.1.[3:4]", type="RANGE", vars=self.vars),
                dict(name="127.0.1.[5:6]", type="RANGE", vars=self.vars2)]
        results_id = self._create_hosts(data)

        for host_id in results_id:
            self.get_result("delete", url + "{}/".format(host_id))
        self.assertEqual(Host.objects.filter(id__in=results_id).count(), 0)

        data = dict(name="127.0.1.1", type="host", vars=self.vars)
        self.get_result("post", url, 415, data=json.dumps(data))

    def hosts_validation(self):
        url = "/api/v1/hosts/"
        data = [dict(name="???", type="HOST", vars={}),
                dict(name="hostlocl", type="HOST",
                     vars={"ansible_host": "???"})]
        for h in data:
            result = self.get_result("post", url, 400, data=json.dumps(h))
            self.assertIn("Invalid hostname or IP", str(result))
        data = dict(name="???", type="RANGE", vars={})
        result = self.get_result("post", url, 400, data=json.dumps(data))
        self.assertIn("Name must be Alphanumeric", str(result))

    def test_filter_host(self):
        base_url = "/api/v1/hosts/"
        filter_url = "{}?name=hostonlocal".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 1)

        filter_url = "{}?name__not=127.0.0.1".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 3, result)

        # Test variables filter
        hosts_d = [
            dict(name="h1", vars=dict(ansible_port="222", ansible_user="one")),
            dict(name="h2", vars=dict(ansible_port="221", ansible_user="one")),
            dict(name="h3", vars=dict(ansible_port='222', ansible_user="one")),
            dict(name="h4", vars=dict(ansible_port='221', ansible_user="rh")),
            dict(name="h5", vars=dict(ansible_port='222', ansible_user="rh")),
            dict(name="h6", vars=dict(ansible_port='221', ansible_user="rh"))
        ]
        results_id = self.mass_create(base_url, hosts_d, "name", "vars")

        self._filter_vars(base_url, "ansible_port:222,ansible_user:one", 2)
        self._filter_vars(base_url, "ansible_port:221,ansible_user:rh", 2)

        filter_data = dict(
            filter=dict(variables__key="ansible_port", variables__value="222"),
            exclude=dict(variables__key="ansible_user", variables__value="rh")
        )
        result = self.get_result("post", base_url+"filter/?detail=1", code=200,
                                 data=json.dumps(filter_data))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2, result)

        for host_id in results_id:
            self.get_result("delete", base_url + "{}/".format(host_id))

    def test_pagination_off_hosts(self):
        base_url = "/api/v1/hosts/"
        clazz = HostViewSet.pagination_class
        HostViewSet.pagination_class = None
        hosts_d = [
            dict(name="h1", vars=dict(ansible_port="222", ansible_user="one")),
            dict(name="h2", vars=dict(ansible_port="221", ansible_user="one")),
        ]
        self.mass_create(base_url, hosts_d, "name", "vars")
        filter_data = dict(
            filter=dict(variables__key="ansible_port", variables__value="222")
        )
        result = self.get_result("post", base_url+"filter/", code=200,
                                 data=json.dumps(filter_data))
        self.assertCount(result, 1)
        HostViewSet.pagination_class = clazz

    def test_update_host(self):
        url = "/api/v1/hosts/{}/".format(self.h1.id)
        data1 = dict(vars=dict(auth_user="ubuntu"))
        self._check_update(url, data1, vars=data1["vars"], name=self.h1.name)
        data2 = dict(name="127.1.0.1")
        self._check_update(url, data2, vars=data1["vars"], name=data2["name"])

    def test_secret_host_vars(self):
        url = "/api/v1/hosts/"
        data = dict(
            name="127.0.1.1", type="HOST", vars=dict(
                ansible_ssh_pass="secret",
                ansible_ssh_private_key_file="secret",
                ansible_become_pass="secret",
            )
        )

        host = self.post_result(url, data=json.dumps(data))
        single_url = "{}{}/".format(url, host['id'])
        host_again = self.get_result("get", single_url)

        for h in [host, host_again]:
            for val in h['vars'].values():
                self.assertEqual(val, "[~~ENCRYPTED~~]")

        data = dict(
            name="127.0.1.1", type="HOST", vars=dict(
                ansible_ssh_pass="[~~ENCRYPTED~~]",
                ansible_ssh_private_key_file="[~~ENCRYPTED~~]",
                ansible_become_pass="[~~ENCRYPTED~~]",
                ansible_host='lopuhost'
            )
        )

        host = self.get_result("patch", single_url, data=json.dumps(data))

        for key, val in host['vars'].items():
            if key != "ansible_host":
                self.assertEqual(val, "[~~ENCRYPTED~~]")
            else:
                self.assertEqual(val, "lopuhost")

        val = Host.objects.get(pk=host['id']).vars['ansible_become_pass']
        self.assertEqual(val, "secret")


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

    def test_circular_deps(self):
        url = "/api/v1/groups/"  # URL to groups layer
        groups = [
            Group.objects.create(name="base_0", children=True),
            Group.objects.create(name="base_1", children=True),
            Group.objects.create(name="base_2", children=True),
            Group.objects.create(name="base_3", children=True),
            Group.objects.create(name="base_4", children=True),
            Group.objects.create(name="base_5", children=True),
            Group.objects.create(name="base_6", children=True)
        ]
        groups[1].groups.add(*[groups[2], groups[3], groups[5]])
        groups[2].groups.add(groups[4])
        groups[3].groups.add(groups[5])
        groups[4].groups.add(groups[5])
        groups[5].groups.add(groups[6])

        # test get subgroups
        test_url = "{}{}/groups/".format(url, groups[1].id)
        result = self.get_result("get", test_url, 200)
        self.assertIn(groups[2].id, result)
        # test cyclic dependency
        test_url = "{}{}/groups/".format(url, groups[6].id)
        result = self.get_result("post", test_url, 400,
                                 data=json.dumps([groups[1].id]))
        self.assertEqual(result["error_type"], "CiclicDependencyError")
        result = self.get_result("post", test_url, 400,
                                 data=json.dumps([groups[6].id]))
        self.assertEqual(result["error_type"], "CiclicDependencyError")
        # Fix for clear group if CiclicDependencyError
        g1 = Group.objects.create(name="base_01")
        g2 = Group.objects.create(name="base_02", children=True)
        g3 = Group.objects.create(name="base_03", children=True)
        g3.groups.add(g2)
        g2.groups.add(g1)
        test_url = "{}{}/groups/".format(url, g2.id)
        result = self.get_result("post", test_url, 400,
                                 data=json.dumps([g3.id]))
        self.assertEqual(result["error_type"], "CiclicDependencyError")
        self.assertCount(g2.groups.all(), 1)

    def test_create_delete_group(self):
        url = "/api/v1/groups/"
        self.list_test(url, Group.objects.count())
        self.details_test(url + "{}/".format(self.gr1.id), name=self.gr1.name)

        data = [dict(name="one", vars=self.vars),
                dict(name="two", vars=self.vars2),
                dict(name="three", vars=self.vars3)]
        results_id = self._create_groups(data)

        for group_id in results_id:
            self.get_result("delete", url + "{}/".format(group_id))
        self.assertEqual(self.get_result("get", url)["count"],
                         Group.objects.count())

    def test_hosts_in_group(self):
        url = "/api/v1/groups/"  # URL to groups layer
        d_groups = [dict(name="hosted_group1"),
                    dict(name="hosted_group2"),
                    dict(name="hosted_group3"),
                    dict(name="hosted_group4", children=True)]
        groups_id = [self.get_result("post", url, 201, data=d_groups[0])["id"],
                     self.get_result("post", url, 201, data=d_groups[1])["id"],
                     self.get_result("post", url, 201, data=d_groups[2])["id"],
                     self.get_result("post", url, 201, data=d_groups[3])["id"]]
        gr_id, grch_id = groups_id[0], groups_id[3]
        d_hosts = [dict(name="127.0.1.1", type="HOST", vars=self.vars),
                   dict(name="hostlocl", type="HOST", vars=self.vars3),
                   dict(name="127.0.1.[5:6]", type="RANGE", vars=self.vars2)]
        hosts_id = self._create_hosts(d_hosts)

        # Check childrens flag update
        self.get_result("patch", url+"{}/".format(groups_id[3]), 400,
                        data=json.dumps(dict(children=False)))

        # Test for group with hosts
        # Just put two hosts in group
        self._compare_list(url, "post", 200, gr_id, hosts_id[0:2], "hosts",
                           hosts_id[0:2])
        # Delete one of hosts in group
        self._compare_list(url, "delete", 200, gr_id, [hosts_id[0]], "hosts",
                           hosts_id[1:2])
        # Full update list of hosts
        self._compare_list(url, "put", 200, gr_id, hosts_id, "hosts",
                           hosts_id)
        # Error on operations with subgroups
        self._compare_list(url, "post", 409, gr_id, groups_id[0:2], "groups",
                           groups_id[0:2])
        self._compare_list(url, "delete", 409, gr_id, [groups_id[0]], "groups",
                           groups_id[1:2])
        self._compare_list(url, "put", 409, gr_id, groups_id, "groups",
                           groups_id)

        # Test for group:children
        # Just put two groups in group
        self._compare_list(url, "post", 200, grch_id, groups_id[0:2],
                           "groups", groups_id[0:2])
        # Delete one of groups in group
        self._compare_list(url, "delete", 200, grch_id, [groups_id[0]],
                           "groups", groups_id[1:2])
        # Full update groups of group
        self._compare_list(url, "put", 200, grch_id, groups_id[:-1], "groups",
                           groups_id[:-1])
        # Error on operations with hosts
        self._compare_list(url, "post", 409, grch_id, hosts_id[0:2], "hosts",
                           [])
        self._compare_list(url, "delete", 409, grch_id, [hosts_id[0]], "hosts",
                           [])
        self._compare_list(url, "put", 409, grch_id, hosts_id, "hosts",
                           [])

    def test_filter_group(self):
        base_url = "/api/v1/groups/"
        filter_url = "{}?name=base_t".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2)

        filter_url = "{}?name__not=base_three".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2, result)

        # Test variables filter
        groups_d = [
            dict(name="g1", vars=dict(ansible_port="222", ansible_user="one")),
            dict(name="g2", vars=dict(ansible_port="221", ansible_user="one")),
            dict(name="g3", vars=dict(ansible_port='222', ansible_user="one")),
            dict(name="g4", vars=dict(ansible_port='221', ansible_user="rh")),
            dict(name="g5", vars=dict(ansible_port='222', ansible_user="rh")),
            dict(name="g6", vars=dict(ansible_port='221', ansible_user="rh"))
        ]
        results_id = self.mass_create(base_url, groups_d, "name", "vars")

        self._filter_vars(base_url, "ansible_port:222,ansible_user:one", 2)
        self._filter_vars(base_url, "ansible_port:221,ansible_user:rh", 2)

        for group_id in results_id:
            self.get_result("delete", base_url + "{}/".format(group_id))

    def test_update_group(self):
        url = "/api/v1/groups/{}/".format(self.gr1.id)
        data1 = dict(vars=dict(auth_user="ubuntu"))
        self._check_update(url, data1, vars=data1["vars"], name=self.gr1.name)
        data2 = dict(name="new_group_name")
        self._check_update(url, data2, vars=data1["vars"], name=data2["name"])


class ApiInventoriesTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiInventoriesTestCase, self).setUp()
        self.vars = dict(auth_user="centos")
        self.vars2 = dict(ansible_port="2222")
        self.vars3 = dict(ansible_ssh_pass="qwerty")
        self.vars3.update(self.vars)
        self.vars3.update(self.vars2)
        self.inv1 = Inventory.objects.create(name="First_inventory")
        self.inv2 = Inventory.objects.create(name="Second_inventory")

    def test_create_delete_inventory(self):
        url = "/api/v1/inventories/"
        self.list_test(url, Inventory.objects.count())
        self.details_test(url + "{}/".format(self.inv1.id),
                          name=self.inv1.name, hosts=[], groups=[])

        data = [dict(name="Inv1", vars=self.vars),
                dict(name="Inv2", vars=self.vars2),
                dict(name="Inv3", vars=self.vars3), ]
        results_id = self._create_inventories(data)

        for inventory_id in results_id:
            self.get_result("delete", url + "{}/".format(inventory_id))
        self.assertEqual(self.get_result("get", url)["count"], 4)

    def test_hosts_in_inventory(self):
        url = "/api/v1/inventories/"  # URL to inventories layer

        groups_data = [dict(name="one", vars=self.vars),
                       dict(name="two", vars=self.vars2),
                       dict(name="three", vars=self.vars3)]
        hosts_data = [dict(name="127.0.1.1", type="HOST", vars=self.vars),
                      dict(name="hostlocl", type="HOST", vars=self.vars3),
                      dict(name="h3", type="HOST", vars={})]
        groups_id = self._create_groups(groups_data)
        hosts_id = self._create_hosts(hosts_data)

        data = dict(name="Inv4", vars=self.vars3)
        inv_id = self._create_inventories([data])[0]

        # Test hosts
        # Just put two hosts in inventory
        self._compare_list(url, "post", 200, inv_id, hosts_id[0:2], "hosts",
                           hosts_id[0:2])
        # Delete one of hosts in inventory
        self._compare_list(url, "delete", 200, inv_id, [hosts_id[0]], "hosts",
                           hosts_id[1:2])
        # Full update list of inventory
        self._compare_list(url, "put", 200, inv_id, hosts_id, "hosts",
                           hosts_id)

        # Test groups
        # Just put two groups in inventory
        self._compare_list(url, "post", 200, inv_id, groups_id[0:2],
                           "groups", groups_id[0:2])
        # Delete one of groups in inventory
        self._compare_list(url, "delete", 200, inv_id, [groups_id[0]],
                           "groups", groups_id[1:2])
        # Full update groups of inventory
        self._compare_list(url, "put", 200, inv_id, groups_id,
                           "groups", groups_id)

        # Test for failed_list stats
        for h_id in hosts_id[0:2]:
            self.get_result("delete", "{}{}/".format("/api/v1/hosts/", h_id))

        self._compare_list(url, "put", 200, inv_id, hosts_id, "hosts",
                           hosts_id[2:3], 2)

    def test_inventory_errors(self):
        inv_url = '/api/v1/inventories'
        inv_data = dict(name="inventory-test321", vars={})
        hst_data = dict(name="inventory-test321", type="HOST", vars={})
        inv_id = self._create_inventories([inv_data])[0]
        hst_id = self._create_hosts([hst_data])[0]
        data = [hst_id, 99999999]
        url = "{}/{}/hosts/".format(inv_url, inv_id)
        result = self.get_result('put', url, 200, data=json.dumps(data))
        self.assertNotIn(hst_id, result['failed_list'])
        data = [str(hst_id), 9999]
        result = self.get_result('put', url, 200, data=json.dumps(data))
        self.assertNotIn(hst_id, result['failed_list'])

    def test_filter_inventory(self):
        base_url = "/api/v1/inventories/"
        f_url = "{}?name=_inventory".format(base_url)
        result = self.get_result("get", f_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2)

        f_url = "{}?name__not=Second_inventory".format(base_url)
        result = self.get_result("get", f_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 3, result)

        # Test variables filter
        inventories_d = [
            dict(name="i1", vars=dict(ansible_port="222", ansible_user="one")),
            dict(name="i2", vars=dict(ansible_port="221", ansible_user="one")),
            dict(name="i3", vars=dict(ansible_port='222', ansible_user="one")),
            dict(name="i4", vars=dict(ansible_port='221', ansible_user="rh")),
            dict(name="i5", vars=dict(ansible_port='222', ansible_user="rh")),
            dict(name="i6", vars=dict(ansible_port='221', ansible_user="rh"))
        ]
        results_id = self.mass_create(base_url, inventories_d, "name", "vars")

        self._filter_vars(base_url, "ansible_port:222,ansible_user:one", 2)
        self._filter_vars(base_url, "ansible_port:221,ansible_user:rh", 2)

        for inventory_id in results_id:
            self.get_result("delete", base_url + "{}/".format(inventory_id))

    def test_update_inventory(self):
        url = "/api/v1/inventories/{}/".format(self.inv1.id)
        data = dict(vars=dict(auth_user="ubuntu"))
        self.get_result("patch", url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["vars"], data["vars"], result)
