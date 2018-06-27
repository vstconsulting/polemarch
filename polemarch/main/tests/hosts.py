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

    def _check_with_vars(self, model_name, data, api_name=None, bulk_name=None, **kw):
        api_name = api_name or '{}s'.format(model_name.lower())
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


class InventoriesTestCase(InvBaseTestCase):
    def setUp(self):
        super(InventoriesTestCase, self).setUp()
        self.hosts_data = [
            dict(name="h1", variables=dict(ansible_port="222", ansible_user="one")),
            dict(name="h2", variables=dict(ansible_port="221", ansible_user="one")),
            dict(name="h3", variables=dict(ansible_port='222', ansible_user="one")),
            dict(name="h4", variables=dict(ansible_port='221', ansible_user="rh")),
            dict(name="h5", variables=dict(ansible_port='222', ansible_user="rh")),
            dict(name="h6", variables=dict(ansible_port='221', ansible_user="rh"))
        ]

    def test_hosts(self):
        self._check_with_vars(
            'Host', self.hosts_data, ansible_port='222', ansible_user='one'
        )

    def test_groups(self):
        self._check_with_vars(
            'Group', self.hosts_data, ansible_port='222', ansible_user='one'
        )
