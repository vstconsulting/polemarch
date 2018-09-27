from ._base import BaseTestCase
from ... import __version__


class OApiTestCase(BaseTestCase):
    def test_openapi_schema(self):
        api_version = self._settings('VST_API_VERSION')
        api_path = self._settings('API_URL')
        schema = self.get_result('get', '/api/openapi/?format=openapi')

        # Test base info
        self.assertEqual(schema.get('swagger', None), '2.0')
        self.assertEqual(schema['info']['title'], 'Polemarch')
        self.assertEqual(schema['info']['x-versions']['application'], __version__)
        self.assertEqual(schema['info']['version'], api_version)
        self.assertEqual(schema['basePath'], '/{}/{}'.format(api_path, api_version))

        # Test definitions
        group = schema['definitions']['Group']
        self.assertEqual(group['type'], 'object')
        self.assertEqual(group['properties']['id']['type'], 'integer')
        self.assertEqual(group['properties']['id']['readOnly'], True)
        self.assertEqual(group['properties']['name']['type'], 'string')
        self.assertEqual(group['properties']['children']['type'], 'boolean')
        self.assertEqual(group['properties']['children']['readOnly'], True)

        # Test path responses and schemas
        default_params = ['ordering', 'limit', 'offset']
        pm_default_params = ['id', 'name', 'id__not', 'name__not']
        inv_params = ['variables']

        group = schema['paths']['/group/']
        self.assertEqual(group['get']['operationId'], 'group_list')
        self.assertTrue(group['get']['description'])
        for param in group['get']['parameters']:
            self.assertIn(param['name'], default_params + pm_default_params + inv_params)
            self.assertEqual(param['in'], 'query')
            self.assertEqual(param['required'], False)
            self.assertIn(param['type'], ['string', 'integer'])

        response_schema = group['get']['responses']['200']['schema']
        self.assertEqual(response_schema['required'], ['count', 'results'])
        self.assertEqual(response_schema['type'], 'object')
        self.assertEqual(response_schema['properties']['results']['type'], 'array')
        self.assertEqual(
            response_schema['properties']['results']['items']['$ref'],
            '#/definitions/Group'
        )
