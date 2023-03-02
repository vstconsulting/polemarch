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


def hide_project_template_options_view(request, schema):  # pylint: disable=invalid-name
    for method, _ in schema['paths']['/project/{id}/_project_template_options/'].operations:
        schema['paths']['/project/{id}/_project_template_options/'][method]['x-hidden'] = True
