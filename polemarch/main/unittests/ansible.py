import six
from django.test import TestCase
from django.core.management import call_command
from ..utils import AnsibleInventoryParser

inventory_data = '''
test-host-single ansible_host=10.10.10.10

[test-group]
test-host ansible_host=10.10.10.20

[test-group:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=example-key

[child-group]
test-host-2

[parent-group:children]
child-group

[all:vars]
ansible_connection=ssh
'''
valid_inventory = {
    'groups': {
        'test-group': {
            'name': 'test-group',
            'groups': [],
            'hosts': ['test-host'],
            'vars': {
                'ansible_ssh_private_key_file': 'example-key',
                'ansible_user': 'ubuntu',
            },
        },
        'child-group': {
            'name': 'child-group',
            'groups': [],
            'hosts': ['test-host-2'],
            'vars': {},
        },
        'parent-group': {
            'name': 'parent-group',
            'groups': ['child-group'],
            'hosts': [],
            'vars': {},
        },
    },
    'hosts': {
        'test-host-single': {
            'name': 'test-host-single',
            'vars': {
                'ansible_host': '10.10.10.10',
            }
        },
        'test-host': {
            'name': 'test-host',
            'vars': {
                'ansible_host': '10.10.10.20',
            }
        },
        'test-host-2': {
            'name': 'test-host-2',
            'vars': {}
        }
    },
    'vars': {
        'ansible_connection': 'ssh',
    },
}


class AnsibleTestCase(TestCase):
    def test_modules(self):
        out = six.StringIO()
        call_command('update_ansible_modules', interactive=False, stdout=out)
        self.assertEqual(
            'The modules have been successfully updated.\n',
            out.getvalue().replace('\x1b[32;1m', '').replace('\x1b[0m', '')
        )

    def test_inventory_parser(self):
        parser = AnsibleInventoryParser()
        inv_json = parser.get_inventory_data(inventory_data)
        for record in inv_json['groups']:
            self.assertIn(record['name'], valid_inventory['groups'].keys())
            self.assertEqual(
                list(valid_inventory['groups'][record['name']]['hosts']),
                list(record['hosts'])
            )
            self.assertEqual(
                list(valid_inventory['groups'][record['name']]['groups']),
                list(record['groups'])
            )
            valid_list = list(valid_inventory['groups'][record['name']]['vars'].keys())
            record_list = list(record['vars'].keys())
            valid_list.sort()
            record_list.sort()
            self.assertEqual(valid_list, record_list)
            for key, value in valid_inventory['groups'][record['name']]['vars'].items():
                self.assertEqual(record['vars'][key], value)
        for record in inv_json['hosts']:
            self.assertIn(record['name'], valid_inventory['hosts'].keys())
            self.assertEqual(
                list(valid_inventory['hosts'][record['name']]['vars'].keys()),
                list(record['vars'].keys())
            )
            for key, value in valid_inventory['hosts'][record['name']]['vars'].items():
                self.assertEqual(record['vars'][key], value)

        self.assertEqual(
            list(valid_inventory['vars'].keys()),
            list(inv_json['vars'].keys())
        )
        for key, value in valid_inventory['vars'].items():
            self.assertEqual(inv_json['vars'][key], value)
