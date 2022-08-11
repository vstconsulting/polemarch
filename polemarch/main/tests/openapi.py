from pathlib import Path
from unittest import skipUnless
from django.conf import settings
import yaml
from ._base import BaseTestCase
from ..openapi import PROJECT_MENU

openapi_schema_yaml = Path.cwd().parent.parent / 'doc' / 'api_schema.yaml'
if not openapi_schema_yaml.exists():
    openapi_schema_yaml = Path(__file__).parent.parent.parent.parent / 'doc' / 'api_schema.yaml'


class OApiTestCase(BaseTestCase):
    maxDiff = None

    @skipUnless(openapi_schema_yaml.is_file(), "OpenApi schema file doesn't exist")
    def test_openapi_schema(self):
        """
        Regenerate new doc schema:

        Examples:
        .. sourcecode:: bash

            python -m polemarch generate_swagger \
                                    --format yaml \
                                    --overwrite \
                                    --url 'http://localhost:8080/' \
                                    --user admin \
                                    -m doc/api_schema.yaml
        """
        schema = self.endpoint_schema()

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

        del openapi_schema_yml['definitions']['_MainSettings']
        del schema['definitions']['_MainSettings']

        try:
            openapi_schema_yml['definitions']['ProjectDir']['properties']['content']["x-options"]['types'] = \
                schema['definitions']['ProjectDir']['properties']['content']["x-options"]['types']
        except Exception:  # pylint: disable=broad-except
            pass

        # MENU SCHEMA TEST
        for module in ('paths', 'definitions'):
            for key, value in openapi_schema_yml[module].items():
                self.assertDictEqual(value, schema[module].get(key, None), key)

        # REGULAR USER
        user_reg = self._create_user(False)
        with self.user_as(self, user_reg):
            reg_schema = self.endpoint_schema()

        if settings.VST_PROJECT == 'polemarch':  # noee
            system_user = {
                'name': 'System',
                'span_class': 'fa fa-cog',
                'sublinks': [
                    {
                        'name': 'Users',
                        'url': '/user',
                        'span_class': 'fa fa-user',
                    },
                ]
            }

            system_staff = {
                'name': 'System',
                'span_class': 'fa fa-cog',
                'sublinks': [
                    {
                        'name': 'Users',
                        'url': '/user',
                        'span_class': 'fa fa-user',
                    },
                    {
                        'name': 'Hooks',
                        'url': '/hook',
                        'span_class': 'fa fa-plug'
                    }
                ]
            }
            self.assertEqual(reg_schema['info']['x-menu'], PROJECT_MENU + [system_user])

            # SUPERUSER SCHEMA
            self.assertEqual(schema['info']['x-menu'], PROJECT_MENU + [system_staff])

        elif settings.VST_PROJECT == 'polemarchplus':  # noce
            system_user = {
                'name': 'System',
                'span_class': 'fa fa-cog',
                'sublinks': [
                    {
                        'name': 'Users',
                        'url': '/user',
                        'span_class': 'fa fa-user',
                    },
                    {
                        'name': 'Teams',
                        'url': '/team',
                        'span_class': 'fa fa-users',
                    },
                    {
                        'name': 'RPC Workers',
                        'url': '/worker',
                        'span_class': 'fas fa-exchange-alt'
                    }
                ]
            }

            system_staff = {
                'name': 'System',
                'span_class': 'fa fa-cog',
                'sublinks': [
                    {
                        'name': 'Users',
                        'url': '/user',
                        'span_class': 'fa fa-user',
                    },
                    {
                        'name': 'Hooks',
                        'url': '/hook',
                        'span_class': 'fa fa-plug'
                    },
                    {
                        'name': 'Teams',
                        'url': '/team',
                        'span_class': 'fa fa-users',
                    },
                    {
                        'name': 'RPC Workers',
                        'url': '/worker',
                        'span_class': 'fas fa-exchange-alt'
                    },
                    {
                        'name': 'Event Log',
                        'url': '/eventlog',
                        'span_class': 'fa fa-history'
                    },
                    {
                        'name': 'License',
                        'url': '/plk',
                        'span_class': 'fa fa-id-card'
                    }
                ]
            }
            self.assertEqual(reg_schema['info']['x-menu'], PROJECT_MENU + [system_user])

            # SUPERUSER SCHEMA
            self.assertEqual(schema['info']['x-menu'], PROJECT_MENU + [system_staff])
