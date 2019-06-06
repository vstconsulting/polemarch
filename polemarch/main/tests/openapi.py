import six
from unittest import skipUnless
from django.conf import settings
from ._base import BaseTestCase
from ... import __version__
import re

skip_it = (settings.VST_PROJECT == 'polemarch' or six.PY2)


class OApiTestCase(BaseTestCase):

    re_path = re.compile(r"(?<={).+?(?=})")
    pm_filters = [
        dict(name='id', description=True, required=False, type='string'),
        dict(name='id__not', description=True, required=False, type='string'),
    ]
    pm_name_filter = [
        dict(name='name', description=True, required=False, type='string'),
        dict(name='name__not', description=True, required=False, type='string'),
    ]
    default_filters = [
        dict(name='ordering', description=True, required=False, type='string'),
        dict(name='limit', description=True, required=False, type='integer'),
        dict(name='offset', description=True, required=False, type='integer'),
    ]

    @skipUnless(skip_it, 'Check only on CE.')
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

        definitions = schema['definitions']
        id_value = dict(type='integer', readOnly=True)
        name_value = dict(type='string', maxLength=512, minLength=1)
        notes_value = dict(type='string', format='textarea')
        # Test definitions
        group = definitions['Group']
        objName = 'Group'

        self.check_fields(objName, group['properties']['id'], **id_value)

        self.check_fields(objName, group['properties']['name'], **name_value)

        self.check_fields(
            objName, group['properties']['children'], type='boolean', readOnly=True
        )
        del group

        error = definitions['Error']
        objName = 'Error'

        self.check_fields(objName, error['required'], 'detail')
        self.check_fields(
            objName, error['properties']['detail'], **dict(type='string', minLength=1)
        )
        del error

        user = definitions['User']
        objName = 'User'

        self.check_fields(objName, user['required'], 'username')
        self.check_fields(objName, user['properties']['id'], **id_value)
        self.check_fields(
            objName, user['properties']['username'], type='string', pattern='^[\w.@+-]+$',
            maxLength=150, minLength=1, description=True
        )
        self.check_fields(
            objName, user['properties']['is_active'], type='boolean', default=True
        )
        del user

        groupCreateMaster = definitions['GroupCreateMaster']
        objName = 'GroupCreateMaster'
        ref = '#/definitions/User'

        self.check_fields(objName, groupCreateMaster['properties']['id'], **id_value)
        self.check_fields(objName, groupCreateMaster['properties']['name'], **name_value)
        self.check_fields(
            objName, groupCreateMaster['properties']['notes'], **notes_value
        )
        self.check_fields(
            objName, groupCreateMaster['properties']['children'],
            type='boolean', default=False
        )
        self.check_fields(
            objName, groupCreateMaster['properties']['owner'], **{'$ref': ref}
        )
        self.check_ref(schema, ref)
        del groupCreateMaster

        oneGroup = definitions['OneGroup']
        objName = 'OneGroup'

        self.check_fields(objName, oneGroup['properties']['id'], **id_value)
        self.check_fields(objName, oneGroup['properties']['name'], **name_value)
        self.check_fields(objName, oneGroup['properties']['notes'], **notes_value)
        self.check_fields(
            objName, oneGroup['properties']['children'], type='boolean', readOnly=True
        )
        self.check_fields(objName, oneGroup['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del oneGroup

        setOwner = definitions['SetOwner']
        objName = 'SetOwner'

        self.check_fields(objName, setOwner['required'], 'user_id')
        self.check_fields(
            objName, setOwner['properties']['user_id'],
            type='integer', format='fk',
            additionalProperties=dict(
                value_field='id', view_field='username', model={'$ref': ref}
            )
        )
        del setOwner

        inventoryVariable = definitions['InventoryVariable']
        objName = 'InventoryVariable'
        enum = [
            'ansible_host', 'ansible_port', 'ansible_user', 'ansible_connection',
            'ansible_ssh_pass', 'ansible_ssh_private_key_file', 'ansible_ssh_common_args',
            'ansible_sftp_extra_args', 'ansible_scp_extra_args', 'ansible_ssh_extra_args',
            'ansible_ssh_executable', 'ansible_ssh_pipelining', 'ansible_become',
            'ansible_become_method', 'ansible_become_user', 'ansible_become_pass',
            'ansible_become_exe', 'ansible_become_flags', 'ansible_shell_type',
            'ansible_python_interpreter', 'ansible_ruby_interpreter',
            'ansible_perl_interpreter', 'ansible_shell_executable'
        ]
        additional_properties = dict(
            field='key', choices={},
            types=dict(
                ansible_become='boolean',
                ansible_ssh_private_key_file='secretfile',
                ansible_ssh_pass='password',
                ansible_port='integer',
                ansible_become_pass='password',
            )
        )

        self.check_fields(objName, inventoryVariable['required'], 'key', 'value')
        self.check_fields(objName, inventoryVariable['properties']['id'], **id_value)
        self.check_fields(
            objName, inventoryVariable['properties']['value'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(
            objName, inventoryVariable['properties']['key'],
            type='string', format='autocomplete', enum=enum
        )
        del inventoryVariable

        host = definitions['Host']
        objName = 'Host'

        self.check_fields(objName, host['properties']['id'], **id_value)
        self.check_fields(objName, host['properties']['name'], **name_value)
        self.check_fields(
            objName, host['properties']['type'],
            type='string', default='HOST', enum=['HOST', 'RANGE']
        )
        del host

        oneHost = definitions['OneHost']
        objName = 'OneHost'

        self.check_fields(objName, oneHost['properties']['id'], **id_value)
        self.check_fields(objName, oneHost['properties']['name'], **name_value)
        self.check_fields(objName, oneHost['properties']['notes'], **notes_value)
        self.check_fields(
            objName, oneHost['properties']['type'],
            type='string', default='HOST', enum=['HOST', 'RANGE']
        )
        self.check_fields(objName, oneHost['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del oneHost

        history = definitions['History']
        objName = 'History'

        self.check_fields(objName, history['required'], 'mode')
        self.check_fields(objName, history['properties']['id'], **id_value)
        self.check_fields(
            objName, history['properties']['status'],
            type='string', enum=self.get_model_class('History').statuses
        )
        self.check_fields(objName, history['properties']['executor'], type='integer')
        self.check_fields(objName, history['properties']['project'], type='integer')
        self.check_fields(
            objName, history['properties']['kind'],
            type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            objName, history['properties']['mode'],
            type='string', maxLength=256, minLength=1
        )
        self.check_fields(objName, history['properties']['inventory'], type='integer')
        self.check_fields(
            objName, history['properties']['start_time'],
            type='string', format='date-time'
        )
        self.check_fields(
            objName, history['properties']['stop_time'], type='string', format='date-time'
        )
        self.check_fields(objName, history['properties']['initiator'], type='integer')
        self.check_fields(
            objName, history['properties']['initiator_type'],
            type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            objName, history['properties']['options'], type='string', readOnly=True
        )

        oneHistory = definitions['OneHistory']
        objName = 'OneHistory'

        self.check_fields(
            objName, oneHistory['required'], 'mode', 'execution_time'
        )
        self.check_fields(objName, oneHistory['properties']['id'], **id_value)
        self.check_fields(
            objName, oneHistory['properties']['status'],
            type='string', enum=self.get_model_class('History').statuses
        )
        self.check_fields(objName, oneHistory['properties']['executor'], type='integer')
        self.check_fields(objName, oneHistory['properties']['project'], type='integer')
        self.check_fields(
            objName, oneHistory['properties']['revision'], type='string', maxLength=256
        )
        self.check_fields(objName, oneHistory['properties']['inventory'], type='integer')
        self.check_fields(
            objName, oneHistory['properties']['kind'],
            type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            objName, oneHistory['properties']['mode'],
            type='string', maxLength=256, minLength=1
        )
        self.check_fields(
            objName, oneHistory['properties']['execute_args'],
            type='string', readOnly=True
        )
        self.check_fields(
            objName, oneHistory['properties']['execution_time'],
            type='integer', format='uptime'
        )
        self.check_fields(
            objName, oneHistory['properties']['start_time'],
            type='string', format='date-time'
        )
        self.check_fields(
            objName, oneHistory['properties']['stop_time'],
            type='string', format='date-time'
        )
        self.check_fields(objName, oneHistory['properties']['initiator'], type='integer')
        self.check_fields(
            objName, oneHistory['properties']['initiator_type'],
            type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            objName, oneHistory['properties']['options'], type='string', readOnly=True
        )
        self.check_fields(
            objName, oneHistory['properties']['raw_args'], type='string', minLength=1
         )
        self.check_fields(
            objName, oneHistory['properties']['raw_stdout'], type='string', readOnly=True
        )
        self.check_fields(
            objName, oneHistory['properties']['raw_inventory'], type='string', minLength=1
        )
        del oneHistory

        empty = definitions['Empty']
        self.assertTrue(not empty['properties'])
        del empty

        actionResponse = definitions['ActionResponse']
        objName = 'ActionResponse'

        self.check_fields(objName, actionResponse['required'], 'detail')
        self.check_fields(
            objName, actionResponse['properties']['detail'], type='string', minLength=1
        )
        del actionResponse

        data = definitions['Data']
        self.assertTrue(not data['properties'])
        del data

        hook = definitions['Hook']
        objName = 'Hook'
        enum = [
            'on_execution', 'after_execution', 'on_user_add', 'on_user_upd',
            'on_user_del', 'on_object_add', 'on_object_upd', 'on_object_del'
            ]

        self.check_fields(objName, hook['required'], 'type', 'recipients')
        self.check_fields(objName, hook['properties']['id'], **id_value)
        self.check_fields(objName, hook['properties']['name'], **name_value)
        self.check_fields(
            objName, hook['properties']['type'], type='string', enum=['HTTP', 'SCRIPT']
        )
        self.check_fields(objName, hook['properties']['when'], type='string', enum=enum)
        self.check_fields(objName, hook['properties']['enable'], type='boolean')
        self.check_fields(
            objName, hook['properties']['recipients'],
            type='string', minLength=1
        )
        del hook

        inventory = definitions['Inventory']
        objName = 'Inventory'

        self.check_fields(objName, inventory['properties']['id'], **id_value)
        self.check_fields(objName, inventory['properties']['name'], **name_value)
        del inventory

        oneInventory = definitions['OneInventory']
        objName = 'OneInventory'

        self.check_fields(objName, oneInventory['properties']['id'], **id_value)
        self.check_fields(objName, oneInventory['properties']['name'], **name_value)
        self.check_fields(objName, oneInventory['properties']['notes'], **notes_value)
        self.check_fields(objName, oneInventory['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del oneInventory

        project = definitions['Project']
        objName = 'Project'

        self.check_fields(objName, project['properties']['id'], **id_value)
        self.check_fields(objName, project['properties']['name'], **name_value)
        self.check_fields(
            objName, project['properties']['type'],
            type='string', readOnly=True, minLength=1
        )
        self.check_fields(
            objName, project['properties']['status'],
            type='string', readOnly=True, enum=self.get_model_class('Project').STATUSES
        )
        del project

        projectCreateMaster = definitions['ProjectCreateMaster']
        objName = 'ProjectCreateMaster'

        self.check_fields(objName, projectCreateMaster['required'], 'name')
        self.check_fields(objName, projectCreateMaster['properties']['id'], **id_value)
        self.check_fields(
            objName, projectCreateMaster['properties']['name'], **name_value
        )
        self.check_fields(
            objName, projectCreateMaster['properties']['status'],
            type='string', readOnly=True, minLength=1
        )
        self.check_fields(
            objName, projectCreateMaster['properties']['type'],
            type='string', default='MANUAL', enum=['MANUAL', 'GIT', 'TAR']
        )
        self.check_fields(
            objName, projectCreateMaster['properties']['repository'],
            type='string', default='MANUAL', minLength=1
        )
        self.check_fields(
            objName, projectCreateMaster['properties']['repo_auth'],
            type='string', format='dynamic', default='NONE',
            additionalProperties={}
        )
        additional_properties = dict(
            field='repo_auth', choices={},
            types=dict(KEY='secretfile', PASSWORD='password', NONE='hidden')
        )

        self.check_fields(
            objName, projectCreateMaster['properties']['auth_data'],
            type='string', format='dynamic', default='',
            additionalProperties=additional_properties
        )
        del projectCreateMaster

        oneProject = definitions['OneProject']
        objName = 'OneProject'

        self.check_fields(objName, oneProject['properties']['id'], **id_value)
        self.check_fields(objName, oneProject['properties']['name'], **name_value)
        self.check_fields(
            objName, oneProject['properties']['repository'],
            type='string', default='MANUAL', minLength=1
        )
        self.check_fields(
            objName, oneProject['properties']['status'],
            type='string', readOnly=True, enum=self.get_model_class('Project').STATUSES
        )
        self.check_fields(
            objName, oneProject['properties']['revision'],
            type='string', readOnly=True
        )
        self.check_fields(
            objName, oneProject['properties']['branch'],
            type='string', readOnly=True
        )
        self.check_fields(objName, oneProject['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        self.check_fields(objName, oneProject['properties']['notes'], **notes_value)
        self.check_fields(
            objName, oneProject['properties']['readme_content'],
            type='string', format='html', readOnly=True
        )
        del oneProject

        ansibleModule = definitions['AnsibleModule']
        objName = 'AnsibleModule'
        ref = '#/definitions/Module'
        additional_properties = dict(
            value_field='name', view_field='path', model={'$ref': ref}
        )

        self.check_fields(objName, ansibleModule['required'], 'module')
        self.check_fields(
            objName, ansibleModule['properties']['module'],
            type='string', format='autocomplete',
            additionalProperties=additional_properties
        )
        self.check_fields(
            objName, ansibleModule['properties']['args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['background'],
            type='integer', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['become'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansibleModule['properties']['become_method'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['become_user'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['check'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansibleModule['properties']['connection'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['diff'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansibleModule['properties']['extra_vars'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['forks'],
            type='integer', description=True
        )

        ref = '#/definitions/Inventory'
        additional_properties = dict(
            value_field='id', view_field='name', model={'$ref': ref}
        )

        self.check_fields(
            objName, ansibleModule['properties']['inventory'],
            type='string',
            format='autocomplete',
            description=True,
            additionalProperties=additional_properties
        )
        self.check_fields(
            objName, ansibleModule['properties']['key_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['limit'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['list_hosts'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['module_path'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['one_line'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['playbook_dir'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['poll'],
            type='integer', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['private_key'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['scp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['sftp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['ssh_common_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['ssh_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['syntax_check'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['timeout'],
            type='integer', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['tree'], type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['user'], type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['vault_id'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['vault_password_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['verbose'],
            type='integer', default=0, maximum=4, description=True
        )
        self.check_fields(
            objName, ansibleModule['properties']['group'], type='string', default='all'
        )
        del ansibleModule

        executeResponse = definitions['ExecuteResponse']
        objName = 'ExecuteResponse'

        self.check_fields(objName, executeResponse['required'], 'detail')
        self.check_fields(
            objName, executeResponse['properties']['detail'], type='string', minLength=1
        )
        self.check_fields(
            objName, executeResponse['properties']['executor'], type='integer'
        )
        self.check_fields(
            objName, executeResponse['properties']['history_id'],
            type='integer', additionalProperties=dict(redirect=True)
        )
        del executeResponse

        ansiblePlaybook = definitions['AnsiblePlaybook']
        objName = 'AnsiblePlaybook'
        ref = '#/definitions/Playbook'

        self.check_fields(objName, ansiblePlaybook['required'], 'playbook')

        additional_properties = dict(
            value_field='playbook', view_field='name', model={'$ref': ref})

        self.check_fields(
            objName, ansiblePlaybook['properties']['playbook'],
            type='string', format='autocomplete',
            additionalProperties=additional_properties
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['become'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['become_method'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['become_user'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['check'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['connection'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['diff'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['extra_vars'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['flush_cache'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['force_handlers'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['forks'],
            type='integer', description=True
        )

        ref = '#/definitions/Inventory'
        additional_properties = dict(
            value_field='id', view_field='name', model={'$ref': ref}
        )

        self.check_fields(
            objName, ansiblePlaybook['properties']['inventory'],
            type='string', format='autocomplete', description=True,
            additionalProperties=additional_properties
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['key_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['limit'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['list_hosts'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['list_tags'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['list_tasks'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['module_path'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['private_key'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['scp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['sftp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['skip_tags'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['ssh_common_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['ssh_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['start_at_task'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['step'],
            type='boolean', default=False, description=True
        )
        # self.check_fields(
        #     objName, ansiblePlaybook['properties']['su'],
        #     type='boolean', default=False, description=True
        # )
        # self.check_fields(
        #     objName, ansiblePlaybook['properties']['su_user'],
        #     type='string', description=True
        # )
        # self.check_fields(
        #     objName, ansiblePlaybook['properties']['sudo'],
        #     type='boolean', default=False, description=True
        # )
        # self.check_fields(
        #     objName, ansiblePlaybook['properties']['sudo_user'],
        #     type='string', description=True
        # )
        self.check_fields(
            objName, ansiblePlaybook['properties']['syntax_check'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['tags'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['timeout'],
            type='integer', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['user'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['vault_id'],
            type='string', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['vault_password_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            objName, ansiblePlaybook['properties']['verbose'],
            type='integer', default=0, maximum=4, description=True
        )
        del ansiblePlaybook

        projectHistory = definitions['ProjectHistory']
        objName = 'ProjectHistory'

        self.check_fields(objName, projectHistory['required'], 'mode')
        self.check_fields(objName, projectHistory['properties']['id'], **id_value)
        self.check_fields(
            objName, projectHistory['properties']['status'],
            type='string', enum=self.get_model_class('History').statuses
        )
        self.check_fields(
            objName, projectHistory['properties']['revision'],
            type='string', maxLength=256
        )
        self.check_fields(
            objName, projectHistory['properties']['executor'], type='integer'
        )
        self.check_fields(
            objName, projectHistory['properties']['kind'], type='string',
            maxLength=50, minLength=1
        )
        self.check_fields(
            objName, projectHistory['properties']['mode'],
            type='string', maxLength=256, minLength=1
        )
        self.check_fields(
            objName, projectHistory['properties']['inventory'], type='integer'
        )
        self.check_fields(
            objName, projectHistory['properties']['start_time'],
            type='string', format='date-time'
        )
        self.check_fields(
            objName, projectHistory['properties']['stop_time'],
            type='string', format='date-time'
        )
        self.check_fields(
            objName, projectHistory['properties']['initiator'], type='integer'
        )
        self.check_fields(
            objName, projectHistory['properties']['initiator_type'],
            type='string', minLength=1, maxLength=50
        )
        self.check_fields(
            objName, projectHistory['properties']['options'], type='string', readOnly=True
        )
        del projectHistory

        module = definitions['Module']
        objName = 'Module'

        self.check_fields(objName, module['required'], 'path')
        self.check_fields(objName, module['properties']['id'], **id_value)
        self.check_fields(
            objName, module['properties']['path'],
            type='string', minLength=1, maxLength=1024
        )
        self.check_fields(
            objName, module['properties']['name'], type='string', readOnly=True
        )
        del module

        oneModule = definitions['OneModule']
        objName = 'OneModule'
        ref = '#/definitions/Data'

        self.check_fields(objName, oneModule['required'], 'path', 'data')
        self.check_fields(objName, oneModule['properties']['id'], **id_value)
        self.check_fields(
            objName, oneModule['properties']['name'], type='string', readOnly=True
        )
        self.check_fields(
            objName, oneModule['properties']['path'],
            type='string', minLength=1, maxLength=1024
        )
        self.check_fields(objName, oneModule['properties']['data'], **{'$ref': ref})
        del oneModule

        periodicTask = definitions['Periodictask']
        objName = 'Periodictask'

        self.check_fields(objName, periodicTask['required'], 'schedule')
        self.check_fields(objName, periodicTask['properties']['id'], **id_value)
        self.check_fields(objName, periodicTask['properties']['name'], **name_value)
        self.check_fields(
            objName, periodicTask['properties']['type'],
            type='string', default='CRONTAB', enum=['CRONTAB', 'INTERVAL']
        )

        additional_properties = dict(
            field='type', choices={}, types=dict(CRONTAB='crontab', INTERVAL='integer')
        )
        self.check_fields(
            objName, periodicTask['properties']['schedule'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='fk_autocomplete', MODULE='fk_autocomplete', TEMPLATE='hidden')
        )
        self.check_fields(
            objName, periodicTask['properties']['mode'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        self.check_fields(
            objName, periodicTask['properties']['kind'],
            type='string', default='PLAYBOOK', enum=['PLAYBOOK', 'MODULE', 'TEMPLATE']
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='fk_autocomplete', MODULE='fk_autocomplete', TEMPLATE='hidden')
        )
        self.check_fields(
            objName, periodicTask['properties']['inventory'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        self.check_fields(
            objName, periodicTask['properties']['save_result'], type='boolean'
        )
        self.check_fields(
            objName, periodicTask['properties']['template'], type='integer'
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='hidden', MODULE='hidden', TEMPLATE='autocomplete')
        )
        self.check_fields(
            objName, periodicTask['properties']['template_opt'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(objName, periodicTask['properties']['enabled'], type='boolean')
        del periodicTask

        onePeriodicTask = definitions['OnePeriodictask']
        objName = 'OnePeriodictask'

        self.check_fields(objName, onePeriodicTask['required'], 'schedule')
        self.check_fields(objName, onePeriodicTask['properties']['id'], **id_value)
        self.check_fields(objName, onePeriodicTask['properties']['name'], **name_value)
        self.check_fields(objName, onePeriodicTask['properties']['notes'], **notes_value)
        self.check_fields(
            objName, onePeriodicTask['properties']['type'],
            type='string', default='CRONTAB', enum=['CRONTAB', 'INTERVAL']
        )

        additional_properties = dict(
            field='type', choices={}, types=dict(CRONTAB='crontab', INTERVAL='integer')
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['schedule'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(
                PLAYBOOK='fk_autocomplete', MODULE='fk_autocomplete', TEMPLATE='hidden'
            )
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['mode'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        self.check_fields(
            objName, onePeriodicTask['properties']['kind'],
            type='string', default='PLAYBOOK', enum=['PLAYBOOK', 'MODULE', 'TEMPLATE']
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(
                PLAYBOOK='fk_autocomplete', MODULE='fk_autocomplete', TEMPLATE='hidden'
            )
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['inventory'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['save_result'], type='boolean'
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['template'], type='integer'
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='hidden', MODULE='hidden', TEMPLATE='autocomplete')
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['template_opt'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(
            objName, onePeriodicTask['properties']['enabled'], type='boolean'
        )
        del onePeriodicTask

        periodicTaskVariable = definitions['PeriodicTaskVariable']
        objName = 'PeriodicTaskVariable'

        self.check_fields(objName, periodicTaskVariable['required'], 'key')
        self.check_fields(objName, periodicTaskVariable['properties']['id'], **id_value)
        self.check_fields(
            objName, periodicTaskVariable['properties']['key'],
            type='string', minLength=1, maxLength=512
        )
        self.check_fields(
            objName, periodicTaskVariable['properties']['value'],
            type='string', default=''
        )
        del periodicTaskVariable

        playbook = definitions['Playbook']
        objName = 'Playbook'

        self.check_fields(objName, playbook['required'], 'playbook')
        self.check_fields(objName, playbook['properties']['id'], **id_value)
        self.check_fields(
            objName, playbook['properties']['name'],
            type='string', maxLength=251, minLength=1
        )
        self.check_fields(
            objName, playbook['properties']['playbook'],
            type='string', minLength=1, maxLength=256
        )
        del playbook

        onePlaybook = definitions['OnePlaybook']
        objName = 'OnePlaybook'

        self.check_fields(objName, onePlaybook['properties']['id'], **id_value)
        self.check_fields(
            objName, onePlaybook['properties']['name'],
            type='string', maxLength=251, minLength=1
        )
        self.check_fields(
            objName, onePlaybook['properties']['playbook'],
            type='string', readOnly=True, minLength=1
        )
        del onePlaybook

        template = definitions['Template']
        objName = 'Template'
        ref = '#/definitions/Data'

        self.check_fields(objName, template['required'], 'name', 'data', 'options')
        self.check_fields(objName, template['properties']['id'], **id_value)
        self.check_fields(objName, template['properties']['name'], **name_value)
        self.check_fields(
            objName, template['properties']['kind'],
            type='string', default='Task', enum=['Task', 'Module']
        )
        self.check_fields(objName, template['properties']['data'], *{'$ref': ref})
        self.check_fields(objName, template['properties']['options'], **{'$ref': ref})
        self.check_fields(
            objName, template['properties']['options_list'],
            type='array', readOnly=True, items=dict(type='string')
        )
        del template

        oneTemplate = definitions['OneTemplate']
        objName = 'OneTemplate'

        self.check_fields(objName, oneTemplate['required'], 'name', 'data')
        self.check_fields(objName, oneTemplate['properties']['id'], **id_value)
        self.check_fields(objName, oneTemplate['properties']['name'], **name_value)
        self.check_fields(objName, oneTemplate['properties']['notes'], **notes_value)
        self.check_fields(
            objName, oneTemplate['properties']['kind'],
            type='string', default='Task', enum=['Task', 'Module']
        )
        self.check_fields(objName, oneTemplate['properties']['data'], **{'$ref': ref})
        self.check_fields(objName, oneTemplate['properties']['options'], **{'$ref': ref})
        self.check_fields(
            objName, oneTemplate['properties']['options_list'],
            type='array', readOnly=True, items=dict(type='string')
        )
        del oneTemplate

        templateExec = definitions['TemplateExec']
        objName = 'TemplateExec'

        self.check_fields(
            objName, templateExec['properties']['option'],
            type='string', minLength=0, description=True
        )
        del templateExec

        projectVariable = definitions['ProjectVariable']
        objName = 'ProjectVariable'

        self.check_fields(objName, projectVariable['required'], 'key', 'value')
        self.check_fields(objName, projectVariable['properties']['id'], **id_value)

        key_list = [
            'repo_type', 'repo_sync_on_run', 'repo_branch',
            'repo_password', 'repo_key'
        ]
        self.check_fields(
            objName, projectVariable['properties']['key'],
            type='string', format='autocomplete', enum=key_list
        )
        additional_properties = dict(
            field='key',
            types=dict(repo_password='password', repo_key='secretfile'),
            choices=dict(
                repo_type=['MANUAL', 'GIT', 'TAR'],
                repo_sync_on_run=[True, False]
            )
        )

        self.check_fields(
            objName, projectVariable['properties']['value'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        del projectVariable

        team = definitions['Team']
        objName = 'Team'

        self.check_fields(objName, team['required'], 'name')
        self.check_fields(objName, team['properties']['id'], **id_value)
        self.check_fields(
            objName, team['properties']['name'],
            type='string', maxLength=150, minLength=1
        )
        del team

        oneTeam = definitions['OneTeam']
        objName = 'OneTeam'

        self.check_fields(objName, oneTeam['required'], 'name')
        self.check_fields(objName, oneTeam['properties']['id'], **id_value)
        self.check_fields(
            objName, oneTeam['properties']['name'],
            type='string', minLength=1, maxLength=150
        )
        self.check_fields(objName, oneTeam['properties']['notes'], **notes_value)
        ref = '#/definitions/User'
        self.check_fields(objName, oneTeam['properties']['owner'], **{'$ref': ref})
        del oneTeam

        createUser = definitions['CreateUser']
        objName = 'CreateUser'

        self.check_fields(
            objName, createUser['required'], 'username', 'password', 'password2'
        )
        self.check_fields(objName, createUser['properties']['id'], **id_value)
        self.check_fields(
            objName, createUser['properties']['username'],
            description=True, type='string', pattern='^[\w.@+-]+$',
            maxLength=150, minLength=1
        )
        self.check_fields(
            objName, createUser['properties']['is_active'], type='boolean', default=True
        )
        self.check_fields(
            objName, createUser['properties']['first_name'], type='string', maxLength=30
        )
        self.check_fields(
            objName, createUser['properties']['last_name'], type='string', maxLength=150
        )
        self.check_fields(
            objName, createUser['properties']['email'],
            type='string', format='email', minLength=1
        )
        self.check_fields(
            objName, createUser['properties']['password'], type='string', minLength=1
        )
        self.check_fields(
            objName, createUser['properties']['password2'], type='string', minLength=1
        )
        del createUser

        oneUser = definitions['OneUser']
        objName = 'OneUser'

        self.check_fields(objName, oneUser['required'], 'username')
        self.check_fields(objName, oneUser['properties']['id'], **id_value)
        self.check_fields(
            objName, oneUser['properties']['username'],
            type='string',
            description=True,
            maxLength=150,
            minLength=1,
            pattern='^[\w.@+-]+$'
        )
        self.check_fields(
            objName, oneUser['properties']['is_active'], type='boolean', default=True
        )
        self.check_fields(
            objName, oneUser['properties']['first_name'], type='string', maxLength=30
        )
        self.check_fields(
            objName, oneUser['properties']['last_name'], type='string', maxLength=150
        )
        self.check_fields(
            objName, oneUser['properties']['email'],
            type='string', format='email', minLength=1
        )
        del oneUser

        changePassword = definitions['ChangePassword']
        objName = 'ChangePassword'
        self.check_fields(
            objName, changePassword['required'], 'old_password', 'password', 'password2'
        )
        self.check_fields(
            objName, changePassword['properties']['old_password'],
            type='string', minLength=1
        )
        self.check_fields(
            objName, changePassword['properties']['password'],
            type='string', minLength=1
        )
        self.check_fields(
            objName, changePassword['properties']['password2'],
            type='string', minLength=1
        )
        del changePassword

        chartLineSetting = definitions['ChartLineSetting']
        objName = 'ChartLineSetting'

        self.check_fields(
            objName, chartLineSetting['properties']['active'],
            type='boolean', default=True
        )
        del chartLineSetting

        chartLineSettings = definitions['ChartLineSettings']
        objName = 'ChartLineSettings'
        ref = '#/definitions/ChartLineSetting'
        chart_line_list = ['all_tasks', 'delay', 'ok', 'error', 'interrupted', 'offline']

        self.check_fields(objName, chartLineSettings['required'], *chart_line_list)

        self.check_fields(
            objName, chartLineSettings['properties']['all_tasks'], **{'$ref': ref}
        )
        self.check_fields(
            objName, chartLineSettings['properties']['delay'], **{'$ref': ref}
        )
        self.check_fields(
            objName, chartLineSettings['properties']['ok'], **{'$ref': ref}
        )
        self.check_fields(
            objName, chartLineSettings['properties']['error'], **{'$ref': ref}
        )
        self.check_fields(
            objName, chartLineSettings['properties']['interrupted'], **{'$ref': ref}
        )
        self.check_fields(
            objName, chartLineSettings['properties']['offline'], **{'$ref': ref}
        )

        del chartLineSettings

        counterWidgetSetting = definitions['CounterWidgetSetting']
        objName = 'CounterWidgetSetting'

        self.check_fields(
            objName, counterWidgetSetting['properties']['active'],
            type='boolean', default=True
        )
        self.check_fields(
            objName, counterWidgetSetting['properties']['collapse'],
            type='boolean', default=False, readOnly=True
        )
        self.check_fields(
            objName, counterWidgetSetting['properties']['sort'], type='integer', default=0
        )
        del counterWidgetSetting

        widgetSetting = definitions['WidgetSetting']
        objName = 'WidgetSetting'

        self.check_fields(
            objName, widgetSetting['properties']['active'], type='boolean', default=True
        )
        self.check_fields(
            objName, widgetSetting['properties']['collapse'],
            type='boolean', default=False
        )
        self.check_fields(
            objName, widgetSetting['properties']['sort'], type='integer', default=0
        )
        del widgetSetting

        widgetSettings = definitions['WidgetSettings']
        objName = 'WidgetSettings'

        widgetList = ['pmwUsersCounter', 'pmwProjectsCounter', 'pmwTemplatesCounter',
                      'pmwInventoriesCounter', 'pmwGroupsCounter', 'pmwHostsCounter',
                      'pmwChartWidget']
        self.check_fields(objName, widgetSettings['required'], *widgetList)
        ref = '#/definitions/CounterWidgetSetting'
        self.check_fields(
            objName, widgetSettings['properties']['pmwUsersCounter'], **{'$ref': ref}
        )
        self.check_fields(
            objName, widgetSettings['properties']['pmwProjectsCounter'], **{'$ref': ref}
        )
        self.check_fields(
            objName, widgetSettings['properties']['pmwInventoriesCounter'],
            **{'$ref': ref}
        )
        self.check_fields(
            objName, widgetSettings['properties']['pmwGroupsCounter'], **{'$ref': ref}
        )
        self.check_fields(
            objName, widgetSettings['properties']['pmwHostsCounter'], **{'$ref': ref}
        )
        ref = '#/definitions/WidgetSetting'
        self.check_fields(
            objName, widgetSettings['properties']['pmwChartWidget'], **{'$ref': ref}
        )
        del widgetSettings

        userSettings = definitions['UserSettings']
        objName = 'UserSettings'

        self.check_fields(
            objName, userSettings['required'], 'chartLineSettings', 'widgetSettings'
        )

        ref = '#/definitions/ChartLineSettings'
        self.check_fields(
            objName, userSettings['properties']['chartLineSettings'], **{'$ref': ref}
        )
        ref = '#/definitions/WidgetSettings'
        self.check_fields(
            objName, userSettings['properties']['widgetSettings'], **{'$ref': ref}
        )
        del userSettings

        for path in schema['paths']:
            p = path.split('/')
            p = list(filter(bool, p))
            keys = [
                'host', 'inventory', 'group', 'variables', 'project',
                'all_hosts', 'all_groups', 'history', 'playbook',
                'module', 'team', 'periodic_task', 'hook', 'user',
                'template'
            ]
            if '{' in p[-1]:
                name = p[-2]
                parent = p[-4] if len(p) > 4 else p[0]
                type = '_detail'
            else:
                name = p[-1]
                parent = p[-3] if len(p) > 3 else p[0]
                type = '_list'
            if name in keys:
                if name == 'variables' and parent == 'project':
                    ref = '#/definitions/ProjectVariable'
                    getattr(self, 'check_path_' + name + type)(schema, path, ref=ref)
                elif parent == 'periodic_task':
                    ref = '#/definitions/PeriodicTaskVariable'
                    getattr(self, 'check_path_' + name + type)(schema, path, ref=ref)
                else:
                    getattr(self, 'check_path_' + name + type)(
                        schema, path, parent=parent
                    )
            else:
                getattr(
                    self, 'check_path_' + name, self.check_path_default
                )(schema, path, parent=parent)

    def check_path_default(self, schema, path, *args, **kwargs):  # nocv
        self.models.logger.warning(
            "There are no checks for this path [{}]".format(path)
        )

    def check_fields(self, objname, obj, *args, **kwargs):
        if args:
            self.assertTrue(
                all(val in args for val in obj),
                'input_data doesn\'t have enough keys\nargs={}\nobj={}'.format(args, obj)
            )
            msg = '{} doesn\'t have enough keys'.format(objname)
            self.assertTrue(
                all(val in obj for val in args), msg
            )
        if kwargs:

            objKeys = list(obj.keys())
            objName = objname + ':' + obj.pop('title', '')
            exclude_fields = ['title', 'x-nullable']
            if 'minimum' not in kwargs.keys():
                exclude_fields.append('minimum')
            if 'maximum' not in kwargs.keys():
                exclude_fields.append('maximum')
            for key in exclude_fields:
                objKeys.remove(key) if key in objKeys else None

            keys_in_kwargs = all(key in kwargs for key in objKeys)
            keys_in_obj = all(key in obj for key in kwargs.keys())
            err_kw = (
                'kwargs doesn\'t have enough keys\nobj={}\nkwargs={}\nobjKeys={}'
            ).format(obj, kwargs.keys(), objKeys)
            err_obj = (
                'object doesn\'t have enough keys\nobj={}\nkwargs={}\nobjKeys={}'
            ).format(obj, kwargs.keys(), objKeys)
            self.assertTrue(keys_in_kwargs, err_kw)
            self.assertTrue(keys_in_obj, err_obj)

            if keys_in_kwargs and keys_in_obj:
                for key in objKeys:
                    if key == 'description':
                        self.assertTrue(
                            obj[key], 'Description is empty. [{}]'.format(objName)
                        )
                        continue
                    elif key == 'additionalProperties' or isinstance(obj[key], dict):
                        self.check_fields(objName, obj[key], **kwargs[key])
                    elif key == 'enum' or isinstance(obj[key], list):
                        self.check_fields(objName, obj[key], *kwargs[key])
                    else:
                        msg = 'input_data[{key}]:{in_val} != {obj}[{key}]:{obj_val}'
                        msg = msg.format(
                            key=key, in_val=kwargs[key], obj=objName, obj_val=obj[key]
                        )
                        self.assertEqual(obj[key], kwargs[key], msg)

    def check_ref(self, schema, ref, *args, **kwargs):
        path = ref[2:].split('/')
        obj = schema
        for val in path:
            try:
                obj = obj[val]
            except:  # nocv
                raise Exception('Definition \'#/' + '/'.join(path) + '\' doesn\'t exist')

    def get_params_checked_value_by_name(self, name, checked_value, *args, **kwargs):
        for index in range(len(checked_value)):
            if checked_value[index]['name'] == name:
                return checked_value[index]

    def check_parameters(self, object_parameters, *arg, **kwargs):
        checked_values = kwargs.pop('params', None)
        in_values = kwargs.pop('params_in_values', None)
        path = kwargs.pop('path', None)
        for index in range(len(object_parameters)):
            param_obj = object_parameters[index]
            if object_parameters[index]:
                self.assertEqual(param_obj['in'], in_values)
                del param_obj['in']
            param_checked_value = self.get_params_checked_value_by_name(
                param_obj['name'], checked_values
            )
            self.check_fields(path, param_obj, **param_checked_value)

    def check_request(self, obj, *args, **kwargs):
        response_code = kwargs.pop('response_code', '200')
        request_value = kwargs.pop('request_value', None)
        path = kwargs.pop('name', None)
        self.assertTrue(request_value, '{} doesn\'t have data for check'.format(obj))
        schema = kwargs.pop('schema', None)
        self.assertTrue(schema)

        # Check parameters
        params = request_value.pop('params', None)
        params_in_values = kwargs.pop('in_values', None)
        self.check_parameters(
            obj['parameters'],
            params=params, params_in_values=params_in_values, path=path
        )

        # Check responses
        responses = request_value.pop('responses', None)

        self.check_fields(path, obj['responses'][response_code], **responses)
        if response_code != '204':
            if responses['schema'].get('$ref', None):
                ref = responses['schema']['$ref']
            else:
                ref = responses['schema']['properties']['results']['items']['$ref']
            self.check_ref(schema, ref)

    def check_path(self, schema, path, requests=None, *args, **kwargs):
        path_parameters = self.re_path.findall(path)
        # If detail: `requests`={'GET', 'PUT', 'PATCH', 'DELETE'}
        # else this list: `requests`={'GET', 'POST'}
        if not requests:
            if path_parameters and path.split(path_parameters[-1])[-1] == '}/':
                requests = dict(get='query', put='body', patch='body', delete='')
            else:
                requests = dict(get='query', post='body')

        for request in requests.keys():
            request_value = kwargs.pop(request+'_value', None)
            response_code = request_value.pop('response_code', '200')
            self.check_request(
                schema['paths'][path][request],
                schema=schema, name=path, response_code=response_code,
                request_value=request_value, in_values=requests[request]
            )

        parameters = schema['paths'][path]['parameters']
        for parameter in parameters:
            if parameter['name'] in path_parameters:
                path_parameters.remove(parameter['name'])
            else:  # nocv
                msg = 'In \'{path}\'[parameters], have key \'{key}\' ' \
                      'doesn\'t exist in {path}'
                self.logging(msg, path=path, key=parameter['name'])
        msg = 'In `{path}`[parameters], not enough keys for path'.format(path=path)
        self.assertEqual(len(path_parameters), 0, msg)

    def logging(self, msg, *args, **kwargs):  # nocv
        output_msg = msg.format(*args, **kwargs)
        print(output_msg)

    def check_path_variables_list(self, schema, path, ref=None, *arg, **kwargs):
        if not ref:
            ref = '#/definitions/InventoryVariable'
        # Get data
        get_params = [
            dict(name='key', description=True, required=False, type='string'),
            dict(name='value', description=True, required=False, type='string'),
        ] + self.pm_filters + self.default_filters
        get_schema = dict(
            required=['count', 'results'],
            properties=dict(
                count=dict(type='integer'), next=dict(type='string', format='uri'),
                previous=dict(type='string', format='uri'),
                results=dict(type='array', items={'$ref': ref})
            ),
            type='object'
        )
        get_responses = dict(description=True, schema=get_schema)
        get_value = dict(
            responses=get_responses, params=get_params, response_code='200'
        )

        # Post data
        post_params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        post_response = dict(
            description=True, schema={'$ref': ref}
        )
        post_value = dict(
            responses=post_response, params=post_params, response_code='201'
        )
        self.check_path(schema, path, post_value=post_value, get_value=get_value)

    def check_path_variables_detail(self, schema, path, ref=None, *arg, **kwargs):
        if not ref:
            ref = '#/definitions/InventoryVariable'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )
        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_host_list(self, schema, path, *args, **kwargs):
        get_params = [
            dict(name='type', description=True, required=False, type='string'),
            dict(name='variables', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_schema = dict(
            required=['count', 'results'],
            properties=dict(
                count=dict(type='integer'), next=dict(type='string', format='uri'),
                previous=dict(type='string', format='uri'),
                results=dict(type='array', items={'$ref': '#/definitions/Host'})
            ),
            type='object'
        )
        get_responses = dict(description=True, schema=get_schema)
        get_value = dict(
            responses=get_responses, params=get_params, response_code='200'
        )

        ref = '#/definitions/OneHost'
        post_params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        post_response = dict(
            description=True, schema={'$ref': ref}
        )
        post_value = dict(
            responses=post_response, params=post_params, response_code='201'
        )
        self.check_path(schema, path, post_value=post_value, get_value=get_value)

    def check_path_host_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneHost'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_group_list(self, schema, path, *arg, **kwargs):
        get_params = [
            dict(name='variables', description=True, required=False, type='string'),
            ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_schema = dict(
            required=['count', 'results'],
            properties=dict(
                count=dict(type='integer'), next=dict(type='string', format='uri'),
                previous=dict(type='string', format='uri'),
                results=dict(type='array', items={'$ref': '#/definitions/Group'})
            ),
            type='object'
        )
        get_responses = dict(description=True, schema=get_schema)
        get_value = dict(
            responses=get_responses, params=get_params, response_code='200'
        )

        ref = '#/definitions/GroupCreateMaster'
        post_params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        post_response = dict(
            description=True, schema={'$ref': ref}
        )
        post_value = dict(
            responses=post_response, params=post_params, response_code='201'
        )
        self.check_path(schema, path, post_value=post_value, get_value=get_value)

    def check_path_group_detail(self, schema, path, *arg, **kwargs):
        ref = '#/definitions/OneGroup'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_inventory_list(self, schema, path, *arg, **kwargs):
        get_params = [
            dict(name='variables', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_schema = dict(
            required=['count', 'results'],
            properties=dict(
                count=dict(type='integer'), next=dict(type='string', format='uri'),
                previous=dict(type='string', format='uri'),
                results=dict(type='array', items={'$ref': '#/definitions/Inventory'})
            ),
            type='object'
        )
        get_responses = dict(description=True, schema=get_schema)
        get_value = dict(
            responses=get_responses, params=get_params, response_code='200'
        )

        ref = '#/definitions/OneInventory'
        post_params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        post_response = dict(
            description=True, schema={'$ref': ref}
        )
        post_value = dict(
            responses=post_response, params=post_params, response_code='201'
        )
        self.check_path(schema, path, post_value=post_value, get_value=get_value)

    def check_path_inventory_detail(self, schema, path, *arg, **kwargs):
        ref = '#/definitions/OneInventory'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_project_list(self, schema, path, *arg, **kwargs):
        get_params = [
            dict(name='status', description=True, required=False, type='string'),
            dict(name='variables', description=True, required=False, type='string'),
            dict(name='status__not', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_schema = dict(
            required=['count', 'results'],
            properties=dict(
                count=dict(type='integer'), next=dict(type='string', format='uri'),
                previous=dict(type='string', format='uri'),
                results=dict(type='array', items={'$ref': '#/definitions/Project'})
            ),
            type='object'
        )
        get_responses = dict(description=True, schema=get_schema)
        get_value = dict(
            responses=get_responses, params=get_params, response_code='200'
        )

        ref = '#/definitions/ProjectCreateMaster'
        post_params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        post_response = dict(
            description=True, schema={'$ref': ref}
        )
        post_value = dict(
            responses=post_response, params=post_params, response_code='201'
        )
        self.check_path(schema, path, post_value=post_value, get_value=get_value)

    def check_path_project_detail(self, schema, path, *arg, **kwargs):
        ref = '#/definitions/OneProject'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_copy(self, schema, path, *args, **kwargs):
        parent = kwargs.pop('parent', None)
        ref = '#/definitions/' + parent.capitalize()
        params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(responses=responses, params=params, response_code='201')

        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_set_owner(self, schema, path, *args, **kwargs):
        ref = '#/definitions/SetOwner'

        params = [dict(name='data', required=True, schema={'$ref': ref})]
        responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(responses=responses, params=params, response_code='201')

        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_all_hosts_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Host'

        params = [
            dict(name='type', description=True, required=False, type='string'),
            dict(name='variables', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(responses=responses, params=params, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_all_hosts_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneHost'

        responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(responses=responses, params=[], response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_all_groups_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Group'

        params = [
            dict(name='variables', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(responses=responses, params=params, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_all_groups_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneGroup'

        responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(responses=responses, params=[], response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_execute_playbook(self, schema, path, *args, **kwargs):
        ref = '#/definitions/AnsiblePlaybook'

        params = [dict(name='data', required=True, schema={'$ref': ref})]

        ref = '#/definitions/ExecuteResponse'
        responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(responses=responses, params=params, response_code='201')
        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_history_list(self, schema, path, *args, **kwargs):
        parent = kwargs.pop('parent', None)
        if parent == 'history':
            ref = '#/definitions/History'
        else:
            ref = '#/definitions/{}History'.format(parent.capitalize())

        params = [
            dict(name='mode', description=True, required=False, type='string'),
            dict(name='kind', description=True, required=False, type='string'),
            dict(name='status', description=True, required=False, type='string'),
            dict(name='older', description=True, required=False, type='string'),
            dict(name='newer', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'), next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(params=params, responses=responses, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_history_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneHistory'
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(params=[], responses=responses, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_settings(self, schema, path, *args, **kwargs):
        ref = '#/definitions/UserSettings'

        get_responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(params=[], responses=get_responses, response_code='200')

        post_params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        post_responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(
            params=post_params, responses=post_responses, response_code='201'
        )
        self.check_path(
            schema, path, requests=dict(get='query', post='body'),
            get_value=get_value, post_value=post_value
        )

    def check_path_playbook_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Playbook'

        params = [
            dict(name='playbook', description=True, required=False, type='string'),
            dict(name='playbook__not', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'), next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(responses=responses, params=params, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_playbook_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OnePlaybook'

        responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(params=[], responses=responses, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_sync(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Empty'
        params = [dict(name='data', required=True, schema={'$ref': ref})]
        ref = '#/definitions/ActionResponse'
        responses = dict(description=True, schema={'$ref': ref})

        post_value = dict(responses=responses, params=params, response_code='200')
        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_hook_list(self, schema, path, *args, **kwars):
        ref = '#/definitions/Hook'

        get_params = [
            dict(name='type', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'), next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(responses=get_responses, params=get_params, response_code='200')

        post_params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        post_responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(
            responses=post_responses, params=post_params, response_code='201'
        )
        self.check_path(
            schema, path, requests=dict(get='query', post='body'), post_value=post_value,
            get_value=get_value
        )

    def check_path_hook_detail(self, schema, path, *arg, **kwargs):
        ref = '#/definitions/Hook'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_execute_module(self, schema, path, *args, **kwargs):
        ref = '#/definitions/AnsibleModule'

        params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        ref = '#/definitions/ExecuteResponse'
        responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(responses=responses, params=params, response_code='201')
        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_module_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Module'

        params = [
            dict(name='path', description=True, required=False, type='string'),
            dict(name='path__not', description=True, required=False, type='string'),
        ] + self.default_filters
        responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(params=params, responses=responses, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_module_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneModule'

        responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(params=[], responses=responses, response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_cancel(self, schema, path, *arg, **kwargs):
        ref = '#/definitions/ActionResponse'

        params = [
            dict(name='data', required=True, schema={'$ref': '#/definitions/Empty'})
        ]
        responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(responses=responses, params=params, response_code='200')
        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_change_password(self, schema, path, *args, **kwargs):
        ref = '#/definitions/ChangePassword'

        params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        responses = dict(description=True, schema={'$ref': ref})

        post_value = dict(responses=responses, params=params, response_code='201')
        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_user_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/User'

        get_params = [
            dict(name='username', description=True, required=False, type='string'),
            dict(name='is_active', description=True, required=False, type='string'),
            dict(name='first_name', description=True, required=False, type='string'),
            dict(name='last_name', description=True, required=False, type='string'),
            dict(name='email', description=True, required=False, type='string'),
            dict(name='username__not', description=True, required=False, type='string'),
        ] + self.pm_filters + self.default_filters
        get_responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(responses=get_responses, params=get_params, response_code='200')

        ref = '#/definitions/CreateUser'
        post_params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        post_responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(
            responses=post_responses, params=post_params, response_code='201'
        )

        self.check_path(
            schema, path, requests=dict(get='query', post='body'),
            post_value=post_value, get_value=get_value
        )

    def check_path_user_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneUser'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_execute(self, schema, path, *args, **kwargs):
        parent = kwargs.pop('parent', None)
        if parent == 'template':
            ref = '#/definitions/TemplateExec'
        else:
            ref = '#/definitions/Empty'

        params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]

        ref = '#/definitions/ExecuteResponse'
        responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(responses=responses, params=params, response_code='201')
        self.check_path(schema, path, requests=dict(post='body'), post_value=post_value)

    def check_path_team_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Team'

        get_params = [] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )
        get_value = dict(params=get_params, responses=get_responses, response_code='200')

        ref = '#/definitions/OneTeam'
        post_params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        post_responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(
            params=post_params, responses=post_responses, response_code='201'
        )

        self.check_path(
            schema, path, requests=dict(get='query', post='body'),
            post_value=post_value, get_value=get_value
        )

    def check_path_team_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneTeam'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_facts(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Data'

        responses = dict(description=True, schema={'$ref': ref})
        get_value = dict(responses=responses, params=[], response_code='200')
        self.check_path(schema, path, requests=dict(get='query'), get_value=get_value)

    def check_path_periodic_task_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Periodictask'

        get_params = [
            dict(name='mode', description=True, required=False, type='string'),
            dict(name='kind', description=True, required=False, type='string'),
            dict(name='type', description=True, required=False, type='string'),
            dict(name='template', description=True, required=False, type='number'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )

        get_value = dict(responses=get_responses, params=get_params, response_code='200')

        ref = '#/definitions/OnePeriodictask'
        post_params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        post_responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(
            responses=post_responses, params=post_params, response_code='201'
        )
        self.check_path(
            schema, path, requests=dict(get='query', post='body'),
            post_value=post_value, get_value=get_value
        )

    def check_path_periodic_task_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OnePeriodictask'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )

    def check_path_clear(self, schema, path, *args, **kwargs):
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )
        self.check_path(schema, path, requests=dict(delete=''), delete_value=delete_value)

    def check_path_template_list(self, schema, path, *args, **kwargs):
        ref = '#/definitions/Template'

        get_params = [
            dict(name='kind', description=True, required=False, type='string'),
            dict(name='inventory', description=True, required=False, type='string'),
        ] + self.pm_filters + self.pm_name_filter + self.default_filters
        get_responses = dict(
            description=True,
            schema=dict(
                required=['count', 'results'], type='object',
                properties=dict(
                    count=dict(type='integer'),
                    next=dict(type='string', format='uri'),
                    previous=dict(type='string', format='uri'),
                    results=dict(type='array', items={'$ref': ref})
                )
            )
        )

        get_value = dict(responses=get_responses, params=get_params, response_code='200')

        ref = '#/definitions/OneTemplate'
        post_params = [
            dict(name='data', required=True, schema={'$ref': ref})
        ]
        post_responses = dict(description=True, schema={'$ref': ref})
        post_value = dict(
            responses=post_responses, params=post_params, response_code='201'
        )
        self.check_path(
            schema, path, requests=dict(get='query', post='body'),
            post_value=post_value, get_value=get_value
        )

    def check_path_template_detail(self, schema, path, *args, **kwargs):
        ref = '#/definitions/OneTemplate'
        # Get data
        params = [dict(
            name='data', required=True, schema={'$ref': ref}
        )]
        responses = dict(description=True, schema={'$ref': ref})

        get_value = dict(responses=responses, params=[], response_code='200')
        put_value = dict(responses=responses, params=params, response_code='200')
        patch_value = dict(responses=responses, params=params, response_code='200')
        delete_value = dict(
            responses=dict(description=True), params=[], response_code='204'
        )

        self.check_path(
            schema, path, get_value=get_value, put_value=put_value,
            patch_value=patch_value, delete_value=delete_value
        )
