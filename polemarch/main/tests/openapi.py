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

        definitions = schema['definitions']
        id_value = dict(type='integer', readOnly=True)
        name_value = dict(type='string', maxLength=512, minLength=1)
        notes_value = dict(type='string', format='textarea')
        # Test definitions
        group = definitions['Group']

        self.check_fields(group['properties']['id'], **id_value)

        self.check_fields(group['properties']['name'], **name_value)

        self.check_fields(
            group['properties']['children'], type='boolean', readOnly=True
        )
        del group

        error = definitions['Error']

        self.check_fields(error['required'], 'detail')
        self.check_fields(
            error['properties']['detail'], **dict(type='string', minLength=1)
        )
        del error

        user = definitions['User']

        self.check_fields(user['required'], 'username')
        self.check_fields(user['properties']['id'], **id_value)
        self.check_fields(
            user['properties']['username'], type='string', pattern='^[\w.@+-]+$',
            maxLength=150, minLength=1, description=True
        )
        self.check_fields(
            user['properties']['is_active'], type='boolean', default=True
        )
        del user

        groupCreateMaster = definitions['GroupCreateMaster']
        ref = '#/definitions/User'

        self.check_fields(groupCreateMaster['properties']['id'], **id_value)
        self.check_fields(groupCreateMaster['properties']['name'], **name_value)
        self.check_fields(groupCreateMaster['properties']['notes'], **notes_value)
        self.check_fields(
            groupCreateMaster['properties']['children'],
            type='boolean', default=False
        )
        self.check_fields(groupCreateMaster['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del groupCreateMaster

        oneGroup = definitions['OneGroup']

        self.check_fields(oneGroup['properties']['id'], **id_value)
        self.check_fields(oneGroup['properties']['name'], **name_value)
        self.check_fields(oneGroup['properties']['notes'], **notes_value)
        self.check_fields(
            oneGroup['properties']['children'], type='boolean', readOnly=True
        )
        self.check_fields(oneGroup['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del oneGroup

        setOwner = definitions['SetOwner']

        self.check_fields(setOwner['required'], 'user_id')
        self.check_fields(
            setOwner['properties']['user_id'],
            type='integer', format='select2',
            additionalProperties=dict(
                value_field='id', view_field='username', model={'$ref': ref}
            )
        )
        del setOwner

        inventoryVariable = definitions['InventoryVariable']
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

        self.check_fields(inventoryVariable['required'], 'key')
        self.check_fields(inventoryVariable['properties']['id'], **id_value)
        self.check_fields(
            inventoryVariable['properties']['value'], type='string', default=''
        )
        self.check_fields(
            inventoryVariable['properties']['key'],
            type='string', format='autocomplete', enum=enum
        )
        del inventoryVariable

        host = definitions['Host']

        self.check_fields(host['properties']['id'], **id_value)
        self.check_fields(host['properties']['name'], **name_value)
        self.check_fields(
            host['properties']['type'],
            type='string', default='HOST', enum=['HOST', 'RANGE']
        )
        del host

        oneHost = definitions['OneHost']

        self.check_fields(oneHost['properties']['id'], **id_value)
        self.check_fields(oneHost['properties']['name'], **name_value)
        self.check_fields(oneHost['properties']['notes'], **notes_value)
        self.check_fields(
            oneHost['properties']['type'],
            type='string', default='HOST', enum=['HOST', 'RANGE']
        )
        self.check_fields(oneHost['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del oneHost

        history = definitions['History']

        self.check_fields(history['required'], 'status', 'mode')
        self.check_fields(history['properties']['id'], **id_value)
        self.check_fields(
            history['properties']['status'], type='string', maxLength=50, minLength=1
        )
        self.check_fields(history['properties']['executor'], type='integer')
        self.check_fields(history['properties']['project'], type='integer')
        self.check_fields(
            history['properties']['kind'], type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            history['properties']['mode'], type='string', maxLength=256, minLength=1
        )
        self.check_fields(history['properties']['inventory'], type='integer')
        self.check_fields(
            history['properties']['start_time'], type='string', format='date-time'
        )
        self.check_fields(
            history['properties']['stop_time'], type='string', format='date-time'
        )
        self.check_fields(history['properties']['initiator'], type='integer')
        self.check_fields(history['properties']['initiator_type'],
                          type='string', maxLength=50, minLength=1
                          )
        self.check_fields(
            history['properties']['options'], type='string', readOnly=True
        )

        oneHistory = definitions['OneHistory']

        self.check_fields(oneHistory['required'], 'status', 'mode', 'execution_time')
        self.check_fields(oneHistory['properties']['id'], **id_value)
        self.check_fields(
            oneHistory['properties']['status'], type='string', maxLength=50, minLength=1
        )
        self.check_fields(oneHistory['properties']['executor'], type='integer')
        self.check_fields(oneHistory['properties']['project'], type='integer')
        self.check_fields(
            oneHistory['properties']['revision'], type='string', maxLength=256
        )
        self.check_fields(oneHistory['properties']['inventory'], type='integer')
        self.check_fields(
            oneHistory['properties']['kind'], type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            oneHistory['properties']['mode'], type='string', maxLength=256, minLength=1
        )
        self.check_fields(
            oneHistory['properties']['execute_args'], type='string', readOnly=True
        )
        self.check_fields(
            oneHistory['properties']['execution_time'], type='integer', format='uptime'
        )
        self.check_fields(
            oneHistory['properties']['start_time'], type='string', format='date-time'
        )
        self.check_fields(
            oneHistory['properties']['stop_time'], type='string', format='date-time'
        )
        self.check_fields(oneHistory['properties']['initiator'], type='integer')
        self.check_fields(
            oneHistory['properties']['initiator_type'],
            type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            oneHistory['properties']['options'], type='string', readOnly=True
        )
        self.check_fields(
            oneHistory['properties']['raw_args'], type='string', minLength=1
         )
        self.check_fields(
            oneHistory['properties']['raw_stdout'], type='string', readOnly=True
        )
        self.check_fields(
            oneHistory['properties']['raw_inventory'], type='string', minLength=1
        )
        del oneHistory

        empty = definitions['Empty']
        self.assertTrue(not empty['properties'])
        del empty

        actionResponse = definitions['ActionResponse']

        self.check_fields(actionResponse['required'], 'detail')
        self.check_fields(
            actionResponse['properties']['detail'], type='string', minLength=1
        )
        del actionResponse

        data = definitions['Data']
        self.assertTrue(not data['properties'])
        del data

        hook = definitions['Hook']
        enum = [
            'on_execution', 'after_execution', 'on_user_add', 'on_user_upd',
            'on_user_del', 'on_object_add', 'on_object_upd', 'on_object_del'
            ]

        self.check_fields(hook['required'], 'type', 'recipients')
        self.check_fields(hook['properties']['id'], **id_value)
        self.check_fields(hook['properties']['name'], **name_value)
        self.check_fields(
            hook['properties']['type'], type='string', enum=['HTTP', 'SCRIPT']
        )
        self.check_fields(hook['properties']['when'], type='string', enum=enum)
        self.check_fields(hook['properties']['enable'], type='boolean')
        self.check_fields(
            hook['properties']['recipients'], type='string', maxLength=16383, minLength=1
        )
        del hook

        inventory = definitions['Inventory']

        self.check_fields(inventory['properties']['id'], **id_value)
        self.check_fields(inventory['properties']['name'], **name_value)
        del inventory

        oneInventory = definitions['OneInventory']

        self.check_fields(oneInventory['properties']['id'], **id_value)
        self.check_fields(oneInventory['properties']['name'], **name_value)
        self.check_fields(oneInventory['properties']['notes'], **notes_value)
        self.check_fields(oneInventory['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        del oneInventory

        project = definitions['Project']

        self.check_fields(project['properties']['id'], **id_value)
        self.check_fields(project['properties']['name'], **name_value)
        self.check_fields(
            project['properties']['type'], type='string', readOnly=True, minLength=1
        )
        self.check_fields(
            project['properties']['status'], type='string', readOnly=True, minLength=1
        )
        del project

        projectCreateMaster = definitions['ProjectCreateMaster']

        self.check_fields(projectCreateMaster['required'], 'name')
        self.check_fields(projectCreateMaster['properties']['id'], **id_value)
        self.check_fields(projectCreateMaster['properties']['name'], **name_value)
        self.check_fields(
            projectCreateMaster['properties']['status'],
            type='string', readOnly=True, minLength=1
        )
        self.check_fields(
            projectCreateMaster['properties']['type'],
            type='string', default='MANUAL', enum=['MANUAL', 'GIT', 'TAR']
        )
        self.check_fields(
            projectCreateMaster['properties']['repository'],
            type='string', default='MANUAL', minLength=1
        )
        self.check_fields(
            projectCreateMaster['properties']['repo_auth'],
            type='string', default='NONE', enum=['NONE', 'KEY', 'PASSWORD']

        )
        additional_properties = dict(
            field='repo_auth', choices={},
            types=dict(KEY='secretfile', PASSWORD='password', NONE='disabled')
        )

        self.check_fields(
            projectCreateMaster['properties']['auth_data'],
            type='string', format='dynamic', default='',
            additionalProperties=additional_properties
        )
        del projectCreateMaster

        oneProject = definitions['OneProject']

        self.check_fields(oneProject['properties']['id'], **id_value)
        self.check_fields(oneProject['properties']['name'], **name_value)
        self.check_fields(
            oneProject['properties']['repository'],
            type='string', default='MANUAL', minLength=1
        )
        self.check_fields(
            oneProject['properties']['status'],
            type='string', readOnly=True, minLength=1
        )
        self.check_fields(
            oneProject['properties']['revision'],
            type='string', readOnly=True
        )
        self.check_fields(
            oneProject['properties']['branch'],
            type='string', readOnly=True
        )
        self.check_fields(oneProject['properties']['owner'], **{'$ref': ref})
        self.check_ref(schema, ref)
        self.check_fields(oneProject['properties']['notes'], **notes_value)
        self.check_fields(
            oneProject['properties']['readme_content'],
            type='string', format='html', readOnly=True
        )
        del oneProject

        ansibleModule = definitions['AnsibleModule']
        ref = '#/definitions/Module'
        additional_properties = dict(
            value_field='name', view_field='path', model={'$ref': ref}
        )

        self.check_fields(ansibleModule['required'], 'module')
        self.check_fields(
            ansibleModule['properties']['module'],
            type='string', format='autocomplete',
            additionalProperties=additional_properties
        )
        self.check_fields(
            ansibleModule['properties']['args'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['background'],
            type='integer', description=True
        )
        self.check_fields(
            ansibleModule['properties']['become'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansibleModule['properties']['become_method'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['become_user'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['check'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansibleModule['properties']['connection'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['diff'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansibleModule['properties']['extra_vars'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['forks'],
            type='integer', description=True
        )

        ref = '#/definitions/Inventory'
        additional_properties = dict(
            value_field='id', view_field='name', model={'$ref': ref}
        )

        self.check_fields(
            ansibleModule['properties']['inventory'],
            type='string',
            format='autocomplete',
            description=True,
            additionalProperties=additional_properties
        )
        self.check_fields(
            ansibleModule['properties']['key_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            ansibleModule['properties']['limit'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['list_hosts'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansibleModule['properties']['module_path'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['one_line'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansibleModule['properties']['playbook_dir'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['poll'],
            type='integer', description=True
        )
        self.check_fields(
            ansibleModule['properties']['private_key'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            ansibleModule['properties']['scp_extra_args'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['sftp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['ssh_common_args'],
            type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['ssh_extra_args'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['su'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansibleModule['properties']['su_user'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['sudo'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansibleModule['properties']['sudo_user'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['syntax_check'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansibleModule['properties']['timeout'], type='integer', description=True
        )
        self.check_fields(
            ansibleModule['properties']['tree'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['user'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['vault_id'], type='string', description=True
        )
        self.check_fields(
            ansibleModule['properties']['vault_password_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            ansibleModule['properties']['verbose'],
            type='integer', default=0, maximum=4, description=True
        )
        self.check_fields(
            ansibleModule['properties']['group'], type='string', default='all'
        )
        del ansibleModule

        executeResponse = definitions['ExecuteResponse']

        self.check_fields(executeResponse['required'], 'detail')
        self.check_fields(
            executeResponse['properties']['detail'], type='string', minLength=1
        )
        self.check_fields(executeResponse['properties']['executor'], type='integer')
        self.check_fields(
            executeResponse['properties']['history_id'],
            type='integer', additionalProperties=dict(redirect=True)
        )
        del executeResponse

        ansiblePlaybook = definitions['AnsiblePlaybook']
        ref = '#/definitions/Playbook'

        self.check_fields(ansiblePlaybook['required'], 'playbook')

        additional_properties = dict(
            value_field='playbook', view_field='name', model={'$ref': ref})

        self.check_fields(
            ansiblePlaybook['properties']['playbook'],
            type='string', format='autocomplete',
            additionalProperties=additional_properties
        )
        self.check_fields(
            ansiblePlaybook['properties']['become'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansiblePlaybook['properties']['become_method'],
            type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['become_user'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['check'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansiblePlaybook['properties']['connection'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['diff'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansiblePlaybook['properties']['extra_vars'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['flush_cache'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansiblePlaybook['properties']['force_handlers'],
            type='boolean', description=True, default=False
        )
        self.check_fields(
            ansiblePlaybook['properties']['forks'], type='integer', description=True
        )

        ref = '#/definitions/Inventory'
        additional_properties = dict(
            value_field='id', view_field='name', model={'$ref': ref}
        )

        self.check_fields(
            ansiblePlaybook['properties']['inventory'],
            type='string', format='autocomplete', description=True,
            additionalProperties=additional_properties
        )
        self.check_fields(
            ansiblePlaybook['properties']['key_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['limit'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['list_hosts'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['list_tags'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['list_tasks'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['module_path'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['private_key'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['scp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['sftp_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['skip_tags'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['ssh_common_args'],
            type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['ssh_extra_args'],
            type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['start_at_task'],
            type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['step'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['su'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['su_user'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['sudo'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['sudo_user'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['syntax_check'],
            type='boolean', default=False, description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['tags'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['timeout'], type='integer', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['user'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['vault_id'], type='string', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['vault_password_file'],
            type='string', format='secretfile', description=True
        )
        self.check_fields(
            ansiblePlaybook['properties']['verbose'],
            type='integer', default=0, maximum=4, description=True
        )
        del ansiblePlaybook

        projectHistory = definitions['ProjectHistory']

        self.check_fields(projectHistory['required'], 'status', 'mode')
        self.check_fields(projectHistory['properties']['id'], **id_value)
        self.check_fields(
            projectHistory['properties']['status'],
            type='string', minLength=1, maxLength=50
        )
        self.check_fields(
            projectHistory['properties']['revision'], type='string', maxLength=256
        )
        self.check_fields(projectHistory['properties']['executor'], type='integer')
        self.check_fields(
            projectHistory['properties']['kind'], type='string', maxLength=50, minLength=1
        )
        self.check_fields(
            projectHistory['properties']['mode'],
            type='string', maxLength=256, minLength=1
        )
        self.check_fields(
            projectHistory['properties']['inventory'], type='integer'
        )
        self.check_fields(
            projectHistory['properties']['start_time'], type='string', format='date-time'
        )
        self.check_fields(
            projectHistory['properties']['stop_time'], type='string', format='date-time'
        )
        self.check_fields(projectHistory['properties']['initiator'], type='integer')
        self.check_fields(
            projectHistory['properties']['initiator_type'],
            type='string', minLength=1, maxLength=50
        )
        self.check_fields(
            projectHistory['properties']['options'], type='string', readOnly=True
        )
        del projectHistory

        module = definitions['Module']

        self.check_fields(module['required'], 'path')
        self.check_fields(module['properties']['id'], **id_value)
        self.check_fields(
            module['properties']['path'], type='string', minLength=1, maxLength=1024
        )
        self.check_fields(module['properties']['name'], type='string', readOnly=True)
        del module

        oneModule = definitions['OneModule']
        ref = '#/definitions/Data'

        self.check_fields(oneModule['required'], 'path', 'data')
        self.check_fields(oneModule['properties']['id'], **id_value)
        self.check_fields(oneModule['properties']['name'], type='string', readOnly=True)
        self.check_fields(
            oneModule['properties']['path'], type='string', minLength=1, maxLength=1024
        )
        self.check_fields(oneModule['properties']['data'], **{'$ref': ref})
        del oneModule

        periodicTask = definitions['Periodictask']

        self.check_fields(periodicTask['required'], 'schedule')
        self.check_fields(periodicTask['properties']['id'], **id_value)
        self.check_fields(periodicTask['properties']['name'], **name_value)
        self.check_fields(
            periodicTask['properties']['type'],
            type='string', default='CRONTAB', enum=['CRONTAB', 'INTERVAL']
        )

        additional_properties = dict(
            field='type', choices={}, types=dict(CRONTAB='crontab', INTERVAL='integer')
        )
        self.check_fields(
            periodicTask['properties']['schedule'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='autocomplete', MODULE='autocomplete', TEMPLATE='hidden')
        )
        self.check_fields(
            periodicTask['properties']['mode'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        self.check_fields(
            periodicTask['properties']['kind'],
            type='string', default='PLAYBOOK', enum=['PLAYBOOK', 'MODULE', 'TEMPLATE']
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='select2', MODULE='select2', TEMPLATE='hidden')
        )
        self.check_fields(
            periodicTask['properties']['inventory'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        self.check_fields(periodicTask['properties']['save_result'], type='boolean')
        self.check_fields(periodicTask['properties']['template'], type='integer')

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='hidden', MODULE='hidden', TEMPLATE='autocomplete')
        )
        self.check_fields(
            periodicTask['properties']['template_opt'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(periodicTask['properties']['enabled'], type='boolean')
        del periodicTask

        onePeriodicTask = definitions['OnePeriodictask']

        self.check_fields(onePeriodicTask['required'], 'schedule')
        self.check_fields(onePeriodicTask['properties']['id'], **id_value)
        self.check_fields(onePeriodicTask['properties']['name'], **name_value)
        self.check_fields(onePeriodicTask['properties']['notes'], **notes_value)
        self.check_fields(
            onePeriodicTask['properties']['type'],
            type='string', default='CRONTAB', enum=['CRONTAB', 'INTERVAL']
        )

        additional_properties = dict(
            field='type', choices={}, types=dict(CRONTAB='crontab', INTERVAL='integer')
        )
        self.check_fields(
            onePeriodicTask['properties']['schedule'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='autocomplete', MODULE='autocomplete', TEMPLATE='hidden')
        )
        self.check_fields(
            onePeriodicTask['properties']['mode'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )

        self.check_fields(
            onePeriodicTask['properties']['kind'],
            type='string', default='PLAYBOOK', enum=['PLAYBOOK', 'MODULE', 'TEMPLATE']
        )

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='select2', MODULE='select2', TEMPLATE='hidden')
        )
        self.check_fields(
            onePeriodicTask['properties']['inventory'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(onePeriodicTask['properties']['save_result'], type='boolean')
        self.check_fields(onePeriodicTask['properties']['template'], type='integer')

        additional_properties = dict(
            field='kind', choices={},
            types=dict(PLAYBOOK='hidden', MODULE='hidden', TEMPLATE='autocomplete')
        )
        self.check_fields(
            onePeriodicTask['properties']['template_opt'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        self.check_fields(onePeriodicTask['properties']['enabled'], type='boolean')
        del onePeriodicTask

        periodicTaskVariable = definitions['PeriodicTaskVariable']

        self.check_fields(periodicTaskVariable['required'], 'key')
        self.check_fields(periodicTaskVariable['properties']['id'], **id_value)
        self.check_fields(
            periodicTaskVariable['properties']['key'],
            type='string', minLength=1, maxLength=128
        )
        self.check_fields(
            periodicTaskVariable['properties']['value'], type='string', default=''
        )
        del periodicTaskVariable

        playbook = definitions['Playbook']

        self.check_fields(playbook['required'], 'playbook')
        self.check_fields(playbook['properties']['id'], **id_value)
        self.check_fields(
            playbook['properties']['name'], type='string', maxLength=256, minLength=1
        )
        self.check_fields(
            playbook['properties']['playbook'], type='string', minLength=1, maxLength=256
        )
        del playbook

        onePlaybook = definitions['OnePlaybook']

        self.check_fields(onePlaybook['properties']['id'], **id_value)
        self.check_fields(
            onePlaybook['properties']['name'], type='string', maxLength=256, minLength=1
        )
        self.check_fields(
            onePlaybook['properties']['playbook'],
            type='string', readOnly=True, minLength=1
        )
        del onePlaybook

        template = definitions['Template']
        ref = '#/definitions/Data'

        self.check_fields(template['required'], 'name', 'data', 'options')
        self.check_fields(template['properties']['id'], **id_value)
        self.check_fields(template['properties']['name'], **name_value)
        self.check_fields(
            template['properties']['kind'],
            type='string', default='Task', enum=['Task', 'Module']
        )
        self.check_fields(template['properties']['data'], *{'$ref': ref})
        self.check_fields(template['properties']['options'], **{'$ref': ref})
        self.check_fields(
            template['properties']['options_list'],
            type='array', readOnly=True, items=dict(type='string')
        )
        del template

        oneTemplate = definitions['OneTemplate']

        self.check_fields(oneTemplate['required'], 'name', 'data')
        self.check_fields(oneTemplate['properties']['id'], **id_value)
        self.check_fields(oneTemplate['properties']['name'], **name_value)
        self.check_fields(oneTemplate['properties']['notes'], **notes_value)
        self.check_fields(
            oneTemplate['properties']['kind'],
            type='string', default='Task', enum=['Task', 'Module']
        )
        self.check_fields(oneTemplate['properties']['data'], **{'$ref': ref})
        self.check_fields(oneTemplate['properties']['options'], **{'$ref': ref})
        self.check_fields(
            oneTemplate['properties']['options_list'],
            type='array', readOnly=True, items=dict(type='string')
        )
        del oneTemplate

        templateExec = definitions['TemplateExec']

        self.check_fields(
            templateExec['properties']['option'],
            type='string', minLength=0, description=True
        )
        del templateExec

        projectVariable = definitions['ProjectVariable']

        self.check_fields(projectVariable['required'], 'key', 'value')
        self.check_fields(projectVariable['properties']['id'], **id_value)

        key_list = [
            'repo_type', 'repo_sync_on_run', 'repo_branch',
            'repo_password', 'repo_key'
        ]
        self.check_fields(projectVariable['properties']['key'],
                          type='string', enum=key_list
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
            projectVariable['properties']['value'],
            type='string', format='dynamic', additionalProperties=additional_properties
        )
        del projectVariable

        team = definitions['Team']

        self.check_fields(team['required'], 'name')
        self.check_fields(team['properties']['id'], **id_value)
        self.check_fields(
            team['properties']['name'], type='string', maxLength=80, minLength=1
        )
        del team

        oneTeam = definitions['OneTeam']

        self.check_fields(oneTeam['required'], 'name')
        self.check_fields(oneTeam['properties']['id'], **id_value)
        self.check_fields(
            oneTeam['properties']['name'], type='string', minLength=1, maxLength=80
        )
        self.check_fields(oneTeam['properties']['notes'], **notes_value)
        ref = '#/definitions/User'
        self.check_fields(oneTeam['properties']['owner'], **{'$ref': ref})
        del oneTeam

        createUser = definitions['CreateUser']

        self.check_fields(createUser['required'], 'username', 'password', 'password2')
        self.check_fields(createUser['properties']['id'], **id_value)
        self.check_fields(
            createUser['properties']['username'],
            description=True, type='string', pattern='^[\w.@+-]+$',
            maxLength=150, minLength=1
        )
        self.check_fields(
            createUser['properties']['is_active'], type='boolean', default=True
        )
        self.check_fields(
            createUser['properties']['first_name'], type='string', maxLength=30
        )
        self.check_fields(
            createUser['properties']['last_name'], type='string', maxLength=30
        )
        self.check_fields(
            createUser['properties']['email'], type='string', format='email', minLength=1
        )
        self.check_fields(
            createUser['properties']['password'], type='string', minLength=1
        )
        self.check_fields(
            createUser['properties']['password2'], type='string', minLength=1
        )
        del createUser

        oneUser = definitions['OneUser']

        self.check_fields(oneUser['required'], 'username')
        self.check_fields(oneUser['properties']['id'], **id_value)
        self.check_fields(
            oneUser['properties']['username'],
            type='string',
            description=True,
            maxLength=150,
            minLength=1,
            pattern='^[\w.@+-]+$'
        )
        self.check_fields(
            oneUser['properties']['is_active'], type='boolean', default=True
        )
        self.check_fields(
            oneUser['properties']['first_name'], type='string', maxLength=30
        )
        self.check_fields(
            oneUser['properties']['last_name'], type='string', maxLength=30
        )
        self.check_fields(
            oneUser['properties']['email'], type='string', format='email', minLength=1
        )
        del oneUser

        chartLineSetting = definitions['ChartLineSetting']

        self.check_fields(
            chartLineSetting['properties']['active'], type='boolean', default=True
        )
        del chartLineSetting

        chartLineSettings = definitions['ChartLineSettings']
        ref = '#/definitions/ChartLineSetting'
        chart_line_list = ['all_tasks', 'delay', 'ok', 'error', 'interrupted', 'offline']

        self.check_fields(chartLineSettings['required'], *chart_line_list)

        self.check_fields(chartLineSettings['properties']['all_tasks'], **{'$ref': ref})
        self.check_fields(chartLineSettings['properties']['delay'], **{'$ref': ref})
        self.check_fields(chartLineSettings['properties']['ok'], **{'$ref': ref})
        self.check_fields(chartLineSettings['properties']['error'], **{'$ref': ref})
        self.check_fields(chartLineSettings['properties']['interrupted'], **{'$ref': ref})
        self.check_fields(chartLineSettings['properties']['offline'], **{'$ref': ref})

        del chartLineSettings

        counterWidgetSetting = definitions['CounterWidgetSetting']

        self.check_fields(
            counterWidgetSetting['properties']['active'], type='boolean', default=True
        )
        self.check_fields(
            counterWidgetSetting['properties']['collapse'],
            type='boolean', default=False, readOnly=True
        )
        self.check_fields(
            counterWidgetSetting['properties']['sort'], type='integer', default=0
        )
        del counterWidgetSetting

        widgetSetting = definitions['WidgetSetting']

        self.check_fields(
            widgetSetting['properties']['active'], type='boolean', default=True
        )
        self.check_fields(
            widgetSetting['properties']['collapse'], type='boolean', default=False
        )
        self.check_fields(
            widgetSetting['properties']['sort'], type='integer', default=0
        )
        del widgetSetting

        widgetSettings = definitions['WidgetSettings']

        widgetList = ['pmwUsersCounter', 'pmwProjectsCounter', 'pmwInventoriesCounter',
                      'pmwGroupsCounter', 'pmwHostsCounter', 'pmwChartWidget',
                      'pmwAnsibleModuleWidget'
                      ]
        self.check_fields(widgetSettings['required'], *widgetList)
        ref = '#/definitions/CounterWidgetSetting'
        self.check_fields(
            widgetSettings['properties']['pmwUsersCounter'], **{'$ref': ref}
        )
        self.check_fields(
            widgetSettings['properties']['pmwProjectsCounter'], **{'$ref': ref}
        )
        self.check_fields(
            widgetSettings['properties']['pmwInventoriesCounter'], **{'$ref': ref}
        )
        self.check_fields(
            widgetSettings['properties']['pmwGroupsCounter'], **{'$ref': ref}
        )
        self.check_fields(
            widgetSettings['properties']['pmwHostsCounter'], **{'$ref': ref}
        )
        ref = '#/definitions/WidgetSetting'
        self.check_fields(
            widgetSettings['properties']['pmwChartWidget'], **{'$ref': ref}
        )
        self.check_fields(
            widgetSettings['properties']['pmwAnsibleModuleWidget'], **{'$ref': ref}
        )
        del widgetSettings

        userSettings = definitions['UserSettings']

        self.check_fields(
            userSettings['required'], 'chartLineSettings', 'widgetSettings'
        )

        ref = '#/definitions/ChartLineSettings'
        self.check_fields(
            userSettings['properties']['chartLineSettings'], **{'$ref': ref}
        )
        ref = '#/definitions/WidgetSettings'
        self.check_fields(
            userSettings['properties']['widgetSettings'], **{'$ref': ref}
        )
        del userSettings

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

        # Check responses via cycle for path
        # for key in obj

        response_schema = group['get']['responses']['200']['schema']
        self.assertEqual(response_schema['required'], ['count', 'results'])
        self.assertEqual(response_schema['type'], 'object')
        self.assertEqual(response_schema['properties']['results']['type'], 'array')
        self.assertEqual(
            response_schema['properties']['results']['items']['$ref'],
            '#/definitions/Group'
        )

        # paths = schema['paths']

        # group_pk_vars = paths['/group/{pk}/variables/']
        # self.check_variables(group_pk_vars)

    def check_fields(self, obj, *args, **kwargs):
        if args:
            self.assertTrue(
                all(val in args for val in obj), 'args doesn\'t have enough keys'
            )
            self.assertTrue(
                all(val in obj for val in args), 'object doesn\'t have enough keys'
            )
        if kwargs:

            objKeys = obj.keys()
            try:
                objKeys.remove('title')
            except:
                pass

            keys_in_kwargs = all(key in kwargs for key in objKeys)
            keys_in_obj = all(key in obj for key in kwargs.keys())
            self.assertTrue(keys_in_kwargs, 'kwargs doesn\'t have enough keys')
            self.assertTrue(keys_in_obj, 'object doesn\'t have enough keys')

            if keys_in_kwargs and keys_in_obj:
                for key in objKeys:
                    if key == 'description':
                        self.assertTrue(obj[key], 'Description is empty')
                        continue
                    elif key == 'additionalProperties' or isinstance(obj[key], dict):
                        self.check_fields(obj[key], **kwargs[key])
                    elif key == 'enum' or isinstance(obj[key], list):
                        self.check_fields(obj[key], *kwargs[key])
                    else:
                        msg = 'Value for \'{}\' in obj and kwargs different'.format(key)
                        self.assertEqual(obj[key], kwargs[key], msg)

    def check_ref(self, schema, ref, *args, **kwargs):
        path = ref[2:].split('/')
        obj = schema
        for val in path:
            try:
                obj = obj[val]
            except:
                raise Exception('Definition \'#/' + '/'.join(path) + '\' doesn\'t exist')
