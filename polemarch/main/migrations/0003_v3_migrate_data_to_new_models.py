import json
import logging
from copy import deepcopy
from django.db import migrations
from django.utils.text import slugify
from ...main.utils import AnsibleModules


logger = logging.getLogger('polemarch')


kind_plugin_map = {
    'Task': 'ANSIBLE_PLAYBOOK',
    'PLAYBOOK': 'ANSIBLE_PLAYBOOK',
    'Module': 'ANSIBLE_MODULE',
    'MODULE': 'ANSIBLE_MODULE',
}

template_plugin_kind_map = {
    'ANSIBLE_PLAYBOOK': 'Task',
    'ANSIBLE_MODULE': 'Module',
}

periodic_task_plugin_kind_map = {
    'ANSIBLE_PLAYBOOK': 'PLAYBOOK',
    'ANSIBLE_MODULE': 'MODULE',
}


ansible_modules_name_path_map = {
    path.rsplit('.', maxsplit=1)[-1]: path
    for path in AnsibleModules().all()
}


def set_booleans(data):
    return {
        k: v == 'True' if v in ('True', 'False') else v
        for k, v in data.items()
    }


def get_module_path(module_name: str):
    return ansible_modules_name_path_map.get(module_name, module_name)


def get_module_name(module_path: str):
    if '.' in module_path:
        return module_path.rsplit('.', maxsplit=1)[-1]
    return module_path


def to_arguments(apps, *data, inventory=None):
    arguments = {}
    for item in data:
        copied = deepcopy(item)
        if 'module' in copied:
            arguments['module'] = get_module_path(copied.pop('module'))
        arguments.update({**copied.pop('vars', {}), **copied})
    if inventory is not None:
        try:
            arguments['inventory'] = apps.get_model('main', 'Inventory').objects.get(id=int(inventory)).id
        except (KeyError, ValueError):
            arguments['inventory'] = inventory
    return set_booleans(arguments)


def get_periodic_task_vars(apps, periodic_task):
    content_type = apps.get_model('contenttypes', 'ContentType').objects.get(app_label='main', model='periodictask')
    vars_qs = apps.get_model('main', 'Variable').objects.filter(content_type=content_type, object_id=periodic_task.id)
    return set_booleans(dict(vars_qs.values_list('key', 'value')))


def to_template_data(option):
    data = {'vars': {}}
    args = option.arguments

    if option.template.plugin == 'ANSIBLE_MODULE':
        data['module'] = get_module_name(args.pop('module'))
        data['group'] = args.pop('group', 'all')
        data['args'] = args.pop('args', '')
        data['vars'] = args
    elif option.template.plugin == 'ANSIBLE_PLAYBOOK':
        data['playbook'] = args.pop('playbook')
        data['vars'] = args
    else:
        data = {**data, **args}

    return data


def to_options_data(options_qs):
    return {
        slugify(option.name): to_template_data(option)
        for option in options_qs
    }


def migrate_templates_data_direct(apps, schema_editor):
    Template = apps.get_model('main', 'Template')
    PeriodicTask = apps.get_model('main', 'PeriodicTask')
    History = apps.get_model('main', 'History')

    ExecutionTemplate = apps.get_model('main', 'ExecutionTemplate')
    ExecutionTemplateOption = apps.get_model('main', 'ExecutionTemplateOption')
    TemplatePeriodicTask = apps.get_model('main', 'TemplatePeriodicTask')

    db_alias = schema_editor.connection.alias
    history_to_update = []

    for old_template in Template.objects.all():
        new_template = ExecutionTemplate.objects.using(db_alias).create(
            name=old_template.name,
            project=old_template.project,
            plugin=kind_plugin_map.get(old_template.kind, old_template.kind),
            notes=old_template.notes,
            old_template_id=old_template.id,
        )
        template_data = json.loads(old_template.template_data)
        default_option = ExecutionTemplateOption(
            name='default',
            arguments=to_arguments(apps, template_data, inventory=old_template.inventory),
            template=new_template,
        )
        other_options = [
            ExecutionTemplateOption(
                name=old_option_key,
                arguments=to_arguments(apps, template_data, old_option_value, inventory=old_template.inventory),
                template=new_template,
            )
            for old_option_key, old_option_value in json.loads(old_template.options_data or '{}').items()
        ]

        other_options_created = ExecutionTemplateOption.objects.using(db_alias).bulk_create(
            [default_option, *other_options]
        )

        history_to_update_qs = History.objects \
            .using(db_alias) \
            .filter(initiator_type='template', initiator=old_template.id)
        for history in history_to_update_qs:
            history.initiator = new_template.id
            options = json.loads(history.json_options)
            old_template_option = options.get('template_option')
            if old_template_option is None:
                options['template_option'] = str(default_option.id)
            else:
                try:
                    new_option = [
                        option for option in other_options_created
                        if slugify(option.name) == old_template_option
                    ][0]
                    options['template_option'] = str(new_option.id)
                except IndexError:
                    pass
            history.json_options = json.dumps(options)
            history_to_update.append(history)

        for old_periodic_task in old_template.periodic_task.all():
            new_periodic_task = TemplatePeriodicTask.objects.using(db_alias).create(
                name=old_periodic_task.name,
                template_option=default_option if not old_periodic_task.template_opt else [
                    option for option in other_options
                    if slugify(option.name) == old_periodic_task.template_opt
                ][0],
                notes=old_periodic_task.notes,
                type=old_periodic_task.type,
                schedule=old_periodic_task.schedule,
                enabled=old_periodic_task.enabled,
                save_result=old_periodic_task.save_result,
            )

            history_to_update_qs = History.objects \
                .using(db_alias) \
                .filter(initiator_type='scheduler', initiator=old_periodic_task.id)
            for history in history_to_update_qs:
                history.initiator = new_periodic_task.id
                history.json_options = json.dumps({
                    'template': new_periodic_task.template_option.template.id,
                    'template_option': str(new_periodic_task.template_option.id),
                })
                history_to_update.append(history)

    for old_periodic_task in PeriodicTask.objects.filter(template_id=None):
        variables = {}
        if old_periodic_task.kind == 'PLAYBOOK':
            variables['playbook'] = old_periodic_task.mode
        elif old_periodic_task.kind == 'MODULE':
            variables['module'] = old_periodic_task.mode
        else:
            logger.warning(
                f'Got invalid PeriodicTask {old_periodic_task.id} with kind: {old_periodic_task.kind}. '
                'Migration to new model skipped.'
            )
            continue

        variables = {**variables, **get_periodic_task_vars(apps, old_periodic_task)}

        new_template = ExecutionTemplate.objects.using(db_alias).create(
            name=f'[PeriodicTask] {old_periodic_task.name}',
            project=old_periodic_task.project,
            plugin=kind_plugin_map.get(old_periodic_task.kind, old_periodic_task.kind),
            notes=old_periodic_task.notes,
        )
        default_option = ExecutionTemplateOption.objects.using(db_alias).create(
            name='default',
            arguments=to_arguments(
                apps,
                variables,
                inventory=old_periodic_task._inventory_id or old_periodic_task.inventory_file),
            template=new_template,
        )
        new_periodic_task = TemplatePeriodicTask.objects.using(db_alias).create(
            name=old_periodic_task.name,
            template_option=default_option,
            notes='',
            type=old_periodic_task.type,
            schedule=old_periodic_task.schedule,
            enabled=old_periodic_task.enabled,
            save_result=old_periodic_task.save_result,
        )

        history_to_update_qs = History.objects \
            .using(db_alias) \
            .filter(initiator_type='scheduler', initiator=old_periodic_task.id)
        for history in history_to_update_qs:
            history.initiator = new_periodic_task.id
            history.json_options = json.dumps({
                'template': new_periodic_task.template_option.template.id,
                'template_option': str(new_periodic_task.template_option.id),
            })
            history_to_update.append(history)

    History.objects.using(db_alias).bulk_update(history_to_update, fields=['initiator', 'json_options'])


def migrate_templates_data_backwards(apps, schema_editor):
    Template = apps.get_model('main', 'Template')
    PeriodicTask = apps.get_model('main', 'PeriodicTask')
    History = apps.get_model('main', 'History')

    ExecutionTemplate = apps.get_model('main', 'ExecutionTemplate')
    ExecutionTemplateOption = apps.get_model('main', 'ExecutionTemplateOption')
    TemplatePeriodicTask = apps.get_model('main', 'TemplatePeriodicTask')

    db_alias = schema_editor.connection.alias

    for new_template in ExecutionTemplate.objects.using(db_alias).exclude(options=None):
        options_qs = ExecutionTemplateOption.objects.filter(template_id=new_template.id)
        default_option = options_qs.filter(name='default').first()
        if not default_option:
            default_option = options_qs.first()
        other_options = options_qs.exclude(id=default_option.id)
        old_template = Template.objects.using(db_alias).create(
            name=new_template.name,
            notes=new_template.notes,
            kind=template_plugin_kind_map.get(new_template.plugin, new_template.plugin),
            project=new_template.project,
            owner=new_template.project.owner,
            inventory=default_option.arguments.pop('inventory', None),
            template_data=json.dumps(to_template_data(default_option)),
            options_data=json.dumps(to_options_data(other_options)),
            new_template_id=new_template.id,
        )

        history_to_update = []

        history_to_update_qs = History.objects \
            .using(db_alias) \
            .filter(initiator_type='template', initiator=new_template.id)
        for history in history_to_update_qs:
            history.initiator = old_template.id
            options = json.loads(history.json_options)
            template_option_id = options.get('template_option')
            if str(default_option.id) == template_option_id:
                del options['template_option']
            elif template_option_id is not None:
                option = other_options.filter(id=template_option_id).first()
                if option:
                    options['template_option'] = option.name
            history.json_options = json.dumps(options)
            history_to_update.append(history)

        for periodic_task in default_option.periodic_tasks.all():
            old_periodic_task = PeriodicTask.objects.create(
                name=periodic_task.name,
                notes=periodic_task.notes,
                mode='',
                kind='TEMPLATE',
                inventory_file=None,
                schedule=periodic_task.schedule,
                type=periodic_task.type,
                save_result=periodic_task.save_result,
                enabled=periodic_task.enabled,
                template_opt=None,
                _inventory_id=None,
                owner=new_template.project.owner,
                project=new_template.project,
                template=old_template,
            )
            history_to_update_qs = History.objects \
                .using(db_alias) \
                .filter(initiator_type='scheduler', initiator=periodic_task.id)
            for history in history_to_update_qs:
                history.initiator = old_periodic_task.id
                options = json.loads(history.json_options)
                if 'template' in options:
                    del options['template']
                if 'template_option' in options:
                    del options['template_option']
                history.json_options = json.dumps(options)
                history_to_update.append(history)

        for periodic_task in TemplatePeriodicTask.objects.filter(template_option__in=other_options):
            old_periodic_task = PeriodicTask.objects.create(
                name=periodic_task.name,
                notes=periodic_task.notes,
                mode='',
                kind='TEMPLATE',
                inventory_file=None,
                schedule=periodic_task.schedule,
                type=periodic_task.type,
                save_result=periodic_task.save_result,
                enabled=periodic_task.enabled,
                template_opt=slugify(periodic_task.template_option.name),
                _inventory_id=None,
                owner=new_template.project.owner,
                project=new_template.project,
                template=old_template,
            )
            history_to_update_qs = History.objects \
                .using(db_alias) \
                .filter(initiator_type='scheduler', initiator=periodic_task.id)
            for history in history_to_update_qs:
                history.initiator = old_periodic_task.id
                options = json.loads(history.json_options)
                if 'template' in options:
                    del options['template']
                options['template_option'] = old_periodic_task.template_opt
                history.json_options = json.dumps(options)
                history_to_update.append(history)

        History.objects.using(db_alias).bulk_update(history_to_update, fields=['initiator', 'json_options'])

def migrate_history_data_direct(apps, schema_editor):
    History = apps.get_model('main', 'History')

    History.objects.filter(kind='MODULE').update(kind='ANSIBLE_MODULE')
    History.objects.filter(kind='PLAYBOOK').update(kind='ANSIBLE_PLAYBOOK')

    for history in History.objects.filter(kind='ANSIBLE_MODULE', json_args__contains='"module":'):
        args = json.loads(history.json_args)
        if history.mode == args['module']:
            history.mode = get_module_path(history.mode)
            args['module'] = history.mode
            history.json_args = json.dumps(args)
            history.save(update_fields=('mode', 'json_args'))


def migrate_history_data_backwards(apps, schema_editor):
    History = apps.get_model('main', 'History')

    for history in History.objects.filter(kind='ANSIBLE_MODULE', json_args__contains='"module":'):
        args = json.loads(history.json_args)
        if history.mode == args['module']:
            history.mode = get_module_name(history.mode)
            args['module'] = history.mode
            history.json_args = json.dumps(args)
            history.save(update_fields=('mode', 'json_args'))


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0002_v3_new_template_and_periodic_task_models'),
    ]

    operations = [
        migrations.RunPython(
            migrate_templates_data_direct,
            migrate_templates_data_backwards,
            atomic=True,
        ),
        migrations.RunPython(
            migrate_history_data_direct,
            migrate_history_data_backwards,
            atomic=True,
        ),
    ]
