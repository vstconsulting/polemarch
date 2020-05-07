from pathlib import Path
from unittest import skipUnless
import yaml
from ._base import BaseTestCase


openapi_schema_yaml = Path.cwd().parent.parent / 'doc' / 'api_schema.yaml'
if not openapi_schema_yaml.exists():
    openapi_schema_yaml = Path(__file__).parent.parent.parent.parent / 'doc' / 'api_schema.yaml'


class OApiTestCase(BaseTestCase):
    maxDiff = None

    @skipUnless(openapi_schema_yaml.is_file(), "OpenApi schema file doesn't exist")
    def test_openapi_schema(self):
        '''
        Regenerate new doc schema:

        Examples:
        .. sourcecode:: bash

            python -m polemarch generate_swagger \
                                    --format yaml \
                                    --overwrite \
                                    --url 'http://localhost:8080/' \
                                    --user admin \
                                    -m doc/api_schema.yaml
        '''
        schema = self.get_result('get', '/api/endpoint/?format=openapi')

        with openapi_schema_yaml.open('r') as fin:
            openapi_schema_yml = yaml.load(fin, Loader=yaml.SafeLoader)

        openapi_schema_yml['host'] = self.server_name
        openapi_schema_yml['schemes'][0] = 'https'
        openapi_schema_yml['info']['contact'] = schema['info']['contact']
        openapi_schema_yml['info']['x-versions'] = schema['info']['x-versions']
        openapi_schema_yml['info']['x-links'] = schema['info']['x-links']
        openapi_schema_yml['info']['x-user-id'] = schema['info']['x-user-id']

        for key in list(filter(lambda x: 'Ansible' in x, openapi_schema_yml['definitions'].keys())):
            del openapi_schema_yml['definitions'][key]
            del schema['definitions'][key]

        for key, value in openapi_schema_yml.items():
            cmp_value = schema.get(key, None)
            if isinstance(value, dict):
                self.assertDictEqual(value, cmp_value, key)
            elif isinstance(value, list):
                self.assertListEqual(value, cmp_value, key)
            else:
                self.assertEqual(value, cmp_value, key)
