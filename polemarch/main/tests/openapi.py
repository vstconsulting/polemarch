from pathlib import Path
from unittest import skipUnless
import yaml
from ._base import BaseTestCase


openapi_schema_yaml = Path(__file__).parent.parent.parent.parent / 'doc' / 'api_schema.yaml'


class OApiTestCase(BaseTestCase):

    @skipUnless(openapi_schema_yaml.is_file(), "OpenApi schema file doesn't exist")
    def test_openapi_schema(self):
        schema = self.get_result('get', '/api/openapi/?format=openapi')

        with openapi_schema_yaml.open('r') as fin:
            openapi_schema_yml = yaml.load(fin, Loader=yaml.SafeLoader)

        openapi_schema_yml['host'] = self.server_name
        openapi_schema_yml['schemes'][0] = 'https'
        openapi_schema_yml['info']['contact'] = schema['info']['contact']
        openapi_schema_yml['info']['x-versions']['vstutils'] = schema['info']['x-versions']['vstutils']
        openapi_schema_yml['info']['x-versions']['ansible'] = schema['info']['x-versions']['ansible']

        self.assertDictEqual(openapi_schema_yml, schema)
