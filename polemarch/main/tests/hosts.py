from ._base import BaseTestCase, json


class InvBaseTestCase(BaseTestCase):
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

    def _check_vars(self, api_name, id, data):
        result = self.get_result('get', self.get_url(api_name, id, 'variables'))
        self.assertCount(data, result['count'])
        vars_id = []
        for var in result['results']:
            self.assertEqual(var['value'], data[var['key']])

    def _check_hidden(self, model_name, api_name, bulk_name):
        HIDDEN_VARS = getattr(self.get_model_class(model_name), 'HIDDEN_VARS', [])
        data = dict(name="test-hidden", variables={k:'hidden' for k in HIDDEN_VARS})
        data['variables']['not_hidden'] = 'value'
        pk = self.mass_create_bulk(bulk_name, [data])[0]['data']['id']
        result = self.get_result('get', self.get_url(api_name, pk, 'variables'))
        for var in result['results']:
            if var['key'] == 'not_hidden':
                self.assertEqual(var['value'], 'value')
                continue
            self.assertEqual(var['value'], "[~~ENCRYPTED~~]")

    def _check_with_vars(self, model_name, data, api_name=None, bulk_name=None, **kw):
        self.get_model_filter(model_name).delete()
        api_name = api_name or model_name.lower()
        bulk_name = bulk_name or model_name.lower()
        url = self.get_url(api_name)
        self.mass_create_bulk(bulk_name, data)
        hosts = self.get_model_filter(model_name)
        last_host = hosts.last()
        self.list_test(url, 6)
        self.details_test(self.get_url(api_name, last_host.id), name=last_host.name)
        for dt in data:
            obj = hosts.get(name=dt['name'])
            self._check_vars(api_name, obj.id, dt['variables'])

        filter_str = ['{}:{}'.format(k, v) for k, v in kw.items()]
        self._filter_vars(url, ','.join(filter_str), hosts.var_filter(**kw).count())
        self._check_hidden(model_name, api_name, bulk_name)

    def _check_dependent(self, model_name, data, child_name, child_data, **kwargs):
        api_name = kwargs.get('api_name', model_name.lower())
        child_api_name = kwargs.get('child_api_name', child_name.lower())
        bulk_name = kwargs.get('bulk_name', api_name)
        child_bulk_name = kwargs.get('child_bulk_name', child_api_name)
        should_fail = kwargs.get('should_fail', False)
        self.get_model_filter(model_name).delete()
        self.get_model_filter(child_name).delete()
        parent = self.mass_create_bulk(bulk_name, [data])[0]['data']
        child = self.mass_create_bulk(child_bulk_name, [child_data])[0]['data']
        pk = parent['id']
        id = child['id']
        child_suburl = '{}/{}/'.format(child_api_name, id)
        bulk_data = [
            self.get_mod_bulk(bulk_name, pk, child, child_api_name, 'post'),
            self.get_mod_bulk(bulk_name, pk, {'name': 'g'}, child_suburl, 'patch'),
            self.get_mod_bulk(bulk_name, pk, {}, child_suburl, 'get'),
            self.get_mod_bulk(bulk_name, pk, child, child_suburl, 'put'),
            self.get_mod_bulk(bulk_name, pk, {}, child_suburl, 'delete'),
        ]
        result = self.make_bulk(bulk_data)
        if should_fail:
            for res in result:
                self.assertEqual(res['status'], 400)
            return
        self.assertEqual(result[0]['status'], 201, result[0])
        self.assertEqual(result[1]['status'], 200, result[1])
        self.assertEqual(result[2]['status'], 200, result[2])
        self.assertEqual(result[2]['data']['id'], id, result[2])
        self.assertEqual(result[2]['data']['name'], 'g', result[2])
        self.assertEqual(result[3]['status'], 200, result[3])
        self.assertEqual(result[4]['status'], 204, result[4])
        self.assertTrue(self.get_model_filter(child_name, pk=id).exists())


class InventoriesTestCase(InvBaseTestCase):
    def setUp(self):
        super(InventoriesTestCase, self).setUp()
        self.hosts_data = [
            dict(name="test1", variables=dict(ansible_port="222", ansible_user="one")),
            dict(name="test2", variables=dict(ansible_port="221", ansible_user="one")),
            dict(name="test3", variables=dict(ansible_port='222', ansible_user="one")),
            dict(name="test4", variables=dict(ansible_port='221', ansible_user="rh")),
            dict(name="test5", variables=dict(ansible_port='222', ansible_user="rh")),
            dict(name="test6", variables=dict(ansible_port='221', ansible_user="rh"))
        ]

    def test_hosts(self):
        self._check_with_vars(
            'Host', self.hosts_data, ansible_port='222', ansible_user='one'
        )

    def test_groups(self):
        self._check_with_vars(
            'Group', self.hosts_data, ansible_port='222', ansible_user='one'
        )
        self._check_dependent(
            'Group', dict(name='g_children', children=True),
            'Group', dict(name='g_child', children=False),
        )
        self._check_dependent(
            'Group', dict(name='g_children', children=False),
            'Group', dict(name='g_child', children=False),
            should_fail=True
        )
        self._check_dependent(
            'Group', dict(name='g_children', children=False),
            'Host', dict(name='hchild'),
        )
        self._check_dependent(
            'Group', dict(name='g_children', children=True),
            'Host', dict(name='hchild'),
            should_fail=True
        )

    def test_inventories(self):
        self._check_with_vars(
            'Inventory', self.hosts_data, ansible_port='222', ansible_user='one'
        )
        self._check_dependent(
            'Inventory', dict(name='inventory'),
            'Group', dict(name='inv-group', children=False),
        )
        self._check_dependent(
            'Inventory', dict(name='inventory'),
            'Host', dict(name='inv-host'),
        )
