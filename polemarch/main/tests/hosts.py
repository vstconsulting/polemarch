from ._base import BaseTestCase, json
from ..models import Host, Group, Inventory


class _ApiGHBaseTestCase(BaseTestCase):
    def _compare_list(self, url, rtype, code, gr_id, req_entries, list_url,
                      res_entries):
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
        self.get_result(rtype, gr_lists_url, code, data=req_entries)
        rhosts = self.get_result("get", single_url)["hosts"]
        self.assertCount(rhosts, len(res_entries))
        self.assertCount(set(rhosts).intersection(res_entries), len(res_entries))

    def _create_hosts(self, hosts):
        return self._mass_create("/api/v1/hosts/", hosts,
                                 "name", "type", "variables")

    def _create_groups(self, groups):
        return self._mass_create("/api/v1/groups/", groups,
                                 "name", "variables")

    def _create_inventories(self, inventories):
        return self._mass_create("/api/v1/inventories/", inventories,
                                 "name", "variables")

    def _create_tasks(self, tasks):
        return self._mass_create("/api/v1/tasks/", tasks,
                                 "inventory", "playbook")


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

        # Test for group with hosts
        # Just put two hosts in group
        self._compare_list(url, "post", 200, gr_id, hosts_id[0:2], "hosts",
                           hosts_id[0:2])
        # Delete one of hosts in group
        self._compare_list(url, "delete", 204, gr_id, [hosts_id[0]], "hosts",
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
        self._compare_list(url, "post", 200, gr_ch_id, groups_id[0:2],
                           "groups", groups_id[0:2])
        # Delete one of groups in group
        self._compare_list(url, "delete", 204, gr_ch_id, [groups_id[0]],
                           "groups", groups_id[1:2])
        # Full update groups of group
        self._compare_list(url, "put", 200, gr_ch_id, groups_id, "groups",
                           [])
        # Error on operations with hosts
        self._compare_list(url, "post", 409, gr_id, hosts_id[0:2], "hosts",
                           [])
        self._compare_list(url, "delete", 409, gr_id, [hosts_id[0]], "hosts",
                           [])
        self._compare_list(url, "put", 409, gr_id, hosts_id, "hosts",
                           [])

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
        self.inv1 = Inventory.objects.create(name="First_inventory")
        self.inv2 = Inventory.objects.create(name="Second_inventory")

    def test_create_delete_inventory(self):
        url = "/api/v1/inventories/"
        self._list_test(url, 2)
        self._details_test(url+"{}/".format(self.inv1.id),
                           name=self.inv1.name, hosts=[], groups=[])

        data = [dict(name="Inv1", variables=self.vars),
                dict(name="Inv2", variables=self.vars2),
                dict(name="Inv3", variables=self.vars3), ]
        results_id = self._mass_create(url, data, "name", "variables")

        for host_id in results_id:
            self.get_result("delete", url + "{}/".format(host_id))
        self.assertEqual(Host.objects.filter(id__in=results_id).count(), 0)

    def test_hosts_in_inventory(self):
        url = "/api/v1/inventories/"  # URL to inventories layer

        groups_data = [dict(name="one", variables=self.vars),
                       dict(name="two", variables=self.vars2),
                       dict(name="three", variables=self.vars3)]
        hosts_data = [dict(name="127.0.1.1", type="HOST", variables=self.vars),
                      dict(name="hostlocl", type="HOST", variables=self.vars3)]
        groups_id = self._create_groups(groups_data)
        hosts_id = self._create_hosts(hosts_data)

        data = dict(name="Inv3", variables=self.vars3)
        inv_id = self.get_result("post", url, 201, data=data)["id"]

        # Test hosts
        # Just put two hosts in inventory
        self._compare_list(url, "post", 200, inv_id, hosts_id[0:2], "hosts",
                           hosts_id[0:2])
        # Delete one of hosts in inventory
        self._compare_list(url, "delete", 204, inv_id, [hosts_id[0]], "hosts",
                           hosts_id[1:2])
        # Full update list of inventory
        self._compare_list(url, "put", 200, inv_id, hosts_id, "hosts",
                           hosts_id)

        # Test groups
        # Just put two groups in inventory
        self._compare_list(url, "post", 200, inv_id, groups_id[0:2], "groups",
                           groups_id[0:2])
        # Delete one of groups in inventory
        self._compare_list(url, "delete", 204, inv_id, [groups_id[0]], "groups",
                           groups_id[1:2])
        # Full update groups of inventory
        self._compare_list(url, "put", 200, inv_id, groups_id, "groups",
                           groups_id)

    def test_filter_inventory(self):
        base_url = "/api/v1/inventories/"
        filter_url = "{}?name=First_inventory,Second_inventory".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 2)

        filter_url = "{}?name__not=Second_inventory".format(base_url)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], 1, result)

    def test_update_inventory(self):
        url = "/api/v1/inventories/{}/".format(self.inv1.id)
        data = dict(variables=dict(auth_user="ubuntu"))
        self.get_result("patch", url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["variables"], data["variables"], result)


class ApiProjectsTestCase(_ApiGHBaseTestCase):
    def setUp(self):
        super(ApiProjectsTestCase, self).setUp()
        self.prj1 = Project.objects.create(name="First project",
                                           repository="git@ex.us:dir/rep1.git")
        self.prj2 = Project.objects.create(name="Second project",
                                           repository="git@ex.us:dir/rep2.git")

    def test_create_delete_project(self):
        url = "/api/v1/projects/"
        self._list_test(url, 2)
        self._details_test(url+"{}/".format(self.prj1.id),
                           name=self.prj1.name,
                           repository="git@ex.us:dir/rep1.git")

        data = [dict(name="Prj3", repository="git@ex.us:dir/rep3.git"),
                dict(name="Prj4", repository="git@ex.us:dir/rep4.git")]
        results_id = self._mass_create(url, data, "name", "repository")

        for project_id in results_id:
            self.get_result("delete", url + "{}/".format(project_id))
        self.assertEqual(Host.objects.filter(id__in=results_id).count(), 0)

    def test_inventories_in_project(self):
        url = "/api/v1/projects/"  # URL to projects layer

        inventories_data = [dict(name="Inv1", variables={}),
                            dict(name="Inv2", variables={}),
                            dict(name="Inv2", variables={})]
        inventories_id = self._create_inventories(inventories_data)

        data = dict(name="Prj1", repository="git@ex.us:dir/rep1.git")
        prj_id = self.get_result("post", url, 201, data=data)["id"]

        # Test inventories
        # Just put two inventory in project
        self._compare_list(url, "post", 200, prj_id, inventories_id[0:2],
                           "inventories", inventories_id[0:2])
        # Delete one of inventory in project
        self._compare_list(url, "delete", 204, prj_id, [inventories_id[0]],
                           "hosts", inventories_id[1:2])
        # Full update list of project
        self._compare_list(url, "put", 200, prj_id, inventories_id, "hosts",
                           inventories_id)

    def test_tasks_in_project(self):
        url = "/api/v1/projects/"  # URL to projects layer

        inventories_data = [dict(name="Inv1", variables={})]
        inventory_id = self._create_inventories(inventories_data)[0]


        tasks_data = [dict(inventory=inventory_id, playbook="play1.yml"),
                      dict(inventory=inventory_id, playbook="play2.yml"),
                      dict(inventory=inventory_id, playbook="play3.yml")]
        tasks_id = self._create_tasks(tasks_data)

        data = dict(name="Prj1", repository="git@ex.us:dir/rep1.git")
        prj_id = self.get_result("post", url, 201, data=data)["id"]

        # Test tasks
        # Just put two tasks in project
        self._compare_list(url, "post", 200, prj_id, tasks_id[0:2],
                           "inventories", tasks_id[0:2])
        # Delete one of tasks in project
        self._compare_list(url, "delete", 204, prj_id, [tasks_id[0]],
                           "hosts", tasks_id[1:2])
        # Full update tasks of project
        self._compare_list(url, "put", 200, prj_id, tasks_id, "hosts",
                           tasks_id)
