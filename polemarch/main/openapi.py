HOOKS_MENU = {
    'name': 'Hooks',
    'url': '/hook',
    'span_class': 'fa fa-plug'
}

PROJECT_MENU = [
    {
        'name': 'Projects',
        'url': '/project',
        'span_class': 'fas fa-cubes',
    },
    {
        'name': 'Community',
        'url': '/community_template',
        'span_class': 'fa fa-cloud',
    },
    {
        'name': 'Inventories',
        'url': '/inventory',
        'span_class': 'fa fa-folder',
        'sublinks': [
            {
                'name': 'Groups',
                'url': '/group',
                'span_class': 'fas fa-server',
            },
            {
                'name': 'Hosts',
                'url': '/host',
                'span_class': 'fas fa-hdd',
            },
        ]
    },
    {
        'name': 'History',
        'url': '/history',
        'span_class': 'fa fa-calendar',
    },
]


def get_system_menu(is_superuser):
    system = {
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
    if is_superuser:
        system['sublinks'].append(HOOKS_MENU)
    return system


def set_gui_menu_ce(request, schema):
    schema['info']['x-menu'] = PROJECT_MENU + [
        get_system_menu(request.user.is_superuser or request.user.is_staff)
    ]  # noee


def set_inventory_field(request, schema):
    def set_inventory(model):
        for name, field in model['properties'].items():
            if name == 'inventory':
                if field.get('format') == 'dynamic' and field['x-options']['types']:
                    for type_field in field['x-options']['types'].values():
                        if isinstance(type_field, dict):
                            type_field['format'] = 'inventory'
                else:
                    field['format'] = 'inventory'

            elif field.get('format') == 'dynamic':
                for type_field in field['x-options']['types'].values():
                    if isinstance(type_field, dict) and type_field['type'] == 'object':
                        set_inventory(type_field)

            elif field.get('type') == 'object':
                set_inventory(field)

    for model in schema['definitions'].values():
        set_inventory(model)


def set_periodic_task_variable_value_field(request, schema):  # pylint: disable=invalid-name
    definitions = schema['definitions']
    module_vars = {
        k: v
        for k, v
        in definitions['ExecuteModule']['properties'].items()
        if k not in {'module', 'inventory'}
    }
    playbook_vars = {
        k: v
        for k, v
        in definitions['ExecutePlaybook']['properties'].items()
        if k not in {'playbook', 'inventory'}
    }
    definitions['PeriodicTaskVariable']['properties']['key'] = {
        'type': 'string',
        'format': 'dynamic',
        'name': 'key',
        'title': 'Key',
        'x-options': {
            'field': 'kind',
            'types': {
                'MODULE': {
                    'type': 'string',
                    'enum': tuple(module_vars.keys()),
                },
                'PLAYBOOK': {
                    'type': 'string',
                    'enum': tuple(playbook_vars.keys()),
                },
            }
        }
    }
    definitions['PeriodicTaskVariable']['properties']['value'] = {
        'type': 'string',
        'name': 'value',
        'title': 'Value',
        'format': 'dynamic',
        'x-options': {
            'field': 'kind',
            'types': {
                'MODULE': {
                    'type': 'string',
                    'format': 'dynamic',
                    'x-options': {
                        'field': 'key',
                        'types': module_vars,
                    }
                },
                'PLAYBOOK': {
                    'type': 'string',
                    'format': 'dynamic',
                    'x-options': {
                        'field': 'key',
                        'types': playbook_vars,
                    }
                },
            }
        }
    }
    definitions['PeriodicTaskVariable']['properties']['kind'] = {
        'type': 'string',
        'name': 'kind',
        'readOnly': True,
        'x-hidden': True,
    }
