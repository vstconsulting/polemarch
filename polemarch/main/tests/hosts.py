import logging
from subprocess import check_output
from ._base import BaseTestCase, json

logger = logging.getLogger('polemarch')


class InvBaseTestCase(BaseTestCase):
    def setUp(self):
        super(InvBaseTestCase, self).setUp()
        self.hosts_data = [
            dict(name="test1", variables=dict(ansible_port="222", ansible_user="one")),
            dict(name="test2", variables=dict(ansible_port="221", ansible_user="one")),
            dict(name="test3", variables=dict(ansible_port='222', ansible_user="one")),
            dict(name="test4", variables=dict(ansible_port='221', ansible_user="rh")),
            dict(name="test5", variables=dict(ansible_port='222', ansible_user="rh")),
            dict(name="test6", variables=dict(ansible_port='221', ansible_user="rh"))
        ]

    def _filter_test(self, base_url, variables, count):
        filter_url = "{}?".format(base_url)
        for key, value in variables.items():
            filter_url += "{}={}&".format(key, value)
        result = self.get_result("get", filter_url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count, result)

    def _filter_vars(self, base_url, variables, count):
        filter_str = ['{}:{}'.format(k, v) for k, v in variables.items()]
        self._filter_test(base_url, dict(variables=','.join(filter_str)), count)

    def _check_vars(self, api_name, id, data):
        result = self.get_result('get', self.get_url(api_name, id, 'variables'))
        self.assertCount(data, result['count'])
        for var in result['results']:
            self.assertEqual(var['value'], data[var['key']])

    def _check_hidden(self, model_name, api_name, bulk_name):
        HIDDEN_VARS = getattr(self.get_model_class(model_name), 'HIDDEN_VARS', [])
        data = dict(name="test-hidden", variables={k: 'hidden' for k in HIDDEN_VARS})
        data['variables']['not_hidden'] = 'value'
        pk = self.mass_create_bulk(bulk_name, [data])[0]['data']['id']
        result = self.get_result('get', self.get_url(api_name, pk, 'variables'))
        for var in result['results']:
            if var['key'] == 'not_hidden':
                self.assertEqual(var['value'], 'value')
                continue
            self.assertEqual(var['value'], "[~~ENCRYPTED~~]")

    def _check_with_vars(self, model_name, data, api_name=None, bulk_name=None, **kw):
        copy_checks = kw.pop('copy_check', {})
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

        self._filter_vars(url, kw, hosts.var_filter(**kw).count())
        self._check_hidden(model_name, api_name, bulk_name)
        self._check_copy(model_name, bulk_name, copy_checks)

    def _check_copy(self, model_name, bulk_name, copy_checks=None):
        copy_checks = copy_checks or dict()
        obj = self.get_model_filter(model_name).first()
        for name in copy_checks.values():
            getattr(obj, name).create()
        results = self.bulk_transactional([
            dict(method='post', path=[bulk_name, obj.id, 'copy'], data={'name': 'copied'}),
            dict(method='get', path=[bulk_name, '<<0[data][id]>>', 'variables']),
            *[dict(method='get', path=[bulk_name, '<<0[data][id]>>', name]) for name in copy_checks.keys()],
            dict(method='delete', path=[bulk_name, '<<0[data][id]>>'])
        ])
        self.assertEqual(results[1]['data']['count'], len(obj.vars))
        for value in results[1]['data']['results']:
            self.assertEqual(value['value'], obj.vars[value['key']])
        for result, item_name in zip(results[2:-1], copy_checks.values()):
            self.assertEqual(
                result['data']['count'], getattr(obj, item_name).count()
            )

    def _check_dependent(self, model_name, data, child_name, child_data, **kwargs):
        copy_checks = kwargs.pop('copy_check', {})
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
        child_suburl = '{}/{}'.format(child_api_name, id)
        result = self.bulk([
            dict(method='post', path=[bulk_name, pk, child_api_name], data=child),
            dict(method='patch', path=[bulk_name, pk, child_suburl], data={'name': 'g'}),
            dict(method='get', path=[bulk_name, pk, child_suburl]),
            dict(method='put', path=[bulk_name, pk, child_suburl], data=child),
            dict(method='delete', path=[bulk_name, pk, child_suburl]),
        ])
        if should_fail:
            for res in result:
                self.assertIn(res['status'], [409, 400])
            return
        self.assertEqual(result[0]['status'], 201, result[0])
        self.assertEqual(result[1]['status'], 200, result[1])
        self.assertEqual(result[2]['status'], 200, result[2])
        self.assertEqual(result[2]['data']['id'], id, result[2])
        self.assertEqual(result[2]['data']['name'], 'g', result[2])
        self.assertEqual(result[3]['status'], 200, result[3])
        self.assertEqual(result[4]['status'], 204, result[4])
        self.assertTrue(self.get_model_filter(child_name, pk=id).exists())
        self._check_copy(model_name, bulk_name, copy_checks)


class InventoriesTestCase(InvBaseTestCase):

    def test_hosts(self):

        self._check_with_vars(
            'Host', self.hosts_data, ansible_port='222', ansible_user='one'
        )
        bulk_data = [
            dict(method='post', path='host', data=dict(name='some-valid')),
            dict(method='post', path='host', data=dict(name='some^invalid')),
            dict(method='post', path=['host', '<<0[data][id]>>', 'variables'],
                 data=dict(key='ansible_host', value='valid')),
            dict(method='post', path=['host', '<<0[data][id]>>', 'variables'],
                 data=dict(key='ansible_host', value='^invalid')),
            dict(method='post', path='host', data=dict(name='some^invalid', type="RANGE")),
            dict(method='post', path='host', data=dict(name='host', type="UNKNOWN")),
            dict(method='delete', path=['host', '<<0[data][id]>>']),
        ]
        # additionally test hooks
        self.hook_model.objects.all().delete()
        scripts = ['one.sh', 'two.sh']
        recipients = ' | '.join(scripts)
        data = [
            dict(type='SCRIPT', recipients=recipients, when='on_object_add'),
            dict(type='SCRIPT', recipients=recipients, when='on_object_upd'),
            dict(type='SCRIPT', recipients=recipients, when='on_object_del'),
        ]
        self.generate_hooks(scripts)
        self.mass_create_bulk('hook', data)

        ##

        def side_effect_for_hooks(*args, **kwargs):
            result = check_output(*args, **kwargs)
            logger.debug(result)
            return result

        with self.patch('subprocess.check_output') as mock:
            iterations = 3 * len(scripts)
            mock.side_effect = side_effect_for_hooks
            results = self.bulk(bulk_data)
            self.assertEqual(mock.call_count, iterations)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[2]['status'], 201)
        self.assertEqual(results[6]['status'], 204)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[3]['status'], 400)
        self.assertEqual(results[4]['status'], 400)
        self.assertEqual(results[5]['status'], 400)

    def test_groups(self):
        self._check_with_vars('Group', self.hosts_data, ansible_port='222', ansible_user='one')
        self._check_dependent(
            'Group', dict(name='g_children', children=True),
            'Group', dict(name='g_child', children=False),
            copy_check=dict(group='groups')
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
        # Check cyclic dependency
        results = self.bulk_transactional([
            *[dict(method='post', path='group', data=dict(name=f'cicl-{i}', children=True))
              for i in range(4)],
            *[dict(method='post', path=['group', '<<0[data][id]>>', 'group'], data=dict(id=f'<<{i}[data][id]>>'))
              for i in range(1, 4)]
        ])
        for result in results:
            self.assertEqual(result['status'], 201)

        group_id = results[0]['data']['id']
        results = self.bulk([
            dict(method='post', path=['group', results[0]['data']['id'], 'group'],
                 data=dict(id=results[0]['data']['id'])),
            dict(method='post', path=['group', results[1]['data']['id'], 'group'],
                 data=dict(id=results[0]['data']['id'])),
            dict(method='post', path=['group', results[2]['data']['id'], 'group'],
                 data=dict(id=results[0]['data']['id'])),
            dict(method='post', path=['group', results[3]['data']['id'], 'group'],
                 data=dict(id=results[0]['data']['id'])),
        ])
        for result in results:
            self.assertEqual(result['status'], 400)
            self.assertEqual(result['data']['error_type'], "CiclicDependencyError")

        # Check update children
        self.get_result('patch', self.get_url('group', group_id), 200, data=json.dumps(dict(children=True)))

    def test_inventories(self):
        self._check_with_vars(
            'Inventory', self.hosts_data, ansible_port='222', ansible_user='one'
        )
        self._check_dependent(
            'Inventory', dict(name='inventory'),
            'Group', dict(name='inv-group', children=False),
            copy_check=dict(group='groups')
        )
        self._check_dependent(
            'Inventory', dict(name='inventory'),
            'Host', dict(name='inv-host'),
            copy_check=dict(host='hosts')
        )
