# pylint: disable=unused-argument,no-member
from __future__ import absolute_import
from typing import Any, Text, NoReturn, Iterable
import sys
import json
import logging
from collections import OrderedDict
import django_celery_beat
from django_celery_beat.models import IntervalSchedule, CrontabSchedule
from django.db.models import signals, IntegerField
from django.dispatch import receiver
from django.db.models.functions import Cast
from django.core.validators import ValidationError
from django.conf import settings
from vstutils.utils import raise_context, KVExchanger

from .vars import Variable
from .hosts import Host, Group, Inventory
from .projects import Project, Task, Module, ProjectTemplate, list_to_choices
from .users import BaseUser, UserGroup, ACLPermission, UserSettings
from .tasks import PeriodicTask, History, HistoryLines, Template
from .hooks import Hook
from ..validators import RegexValidator, validate_hostname
from ..exceptions import UnknownTypeException
from ..utils import AnsibleArgumentsReference, CmdExecutor


logger = logging.getLogger('polemarch')


#####################################
# FUNCTIONS
#####################################
def send_hook(when: Text, target: Any) -> NoReturn:
    msg = OrderedDict(when=when)
    msg['target'] = target
    if 'loaddata' not in sys.argv:
        Hook.objects.all().execute(when, msg)


@raise_context()
def send_user_hook(when: Text, instance: Any) -> None:
    send_hook(
        when, OrderedDict(
            user_id=instance.id,
            username=instance.username,
            admin=instance.is_staff
        )
    )


@raise_context()
def send_polemarch_models(when: Text, instance: Any, **kwargs) -> None:
    target = OrderedDict(id=instance.id, name=instance.name, **kwargs)
    send_hook(when, target)


def raise_linked_error(exception_class=ValidationError, **kwargs):
    raise exception_class(kwargs)


#####################################
# SIGNALS
#####################################
@receiver(signals.post_save, sender=Variable)
def remove_existed(instance: Variable, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    Variable.objects.filter(
        object_id=instance.object_id,
        content_type=instance.content_type,
        key=instance.key
    ).exclude(pk=instance.id).delete()


@receiver(signals.pre_save, sender=Variable)
def check_variables_values(instance: Variable, *args, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    content_object = instance.content_object
    if isinstance(content_object, PeriodicTask):
        cmd = "module" if content_object.kind == "MODULE" else "playbook"
        AnsibleArgumentsReference().validate_args(cmd, {instance.key: instance.value})
    elif isinstance(content_object, Host):
        if instance.key == 'ansible_host':
            validate_hostname(instance.value)
    elif isinstance(content_object, Project):
        if instance.key[0:4] != 'env_' and instance.key not in Project.VARS_KEY:
            msg = 'Unknown variable key \'{}\'. Key must be in {} or starts from \'env_\''
            raise ValidationError(msg.format(instance.key, Project.VARS_KEY))


@receiver(signals.pre_save, sender=Group)
def validate_group_name(instance: Group, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    validate_name = RegexValidator(
        regex=r'^[a-zA-Z0-9\-\._]*$',
        message='Name must be Alphanumeric'
    )
    validate_name(instance.name)


@receiver(signals.m2m_changed, sender=Group.parents.through)
def check_circular_deps(instance: Group, action: Text, pk_set: Iterable, *args, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if (action in ["pre_add", "post_add"]) and ('loaddata' not in sys.argv):
        if instance.id in pk_set:
            raise instance.CiclicDependencyError("The group can not refer to itself.")
        parents = instance.parents.all().get_parents()
        childrens = instance.groups.all().get_subgroups()
        if instance in (parents | childrens) or parents.filter(id__in=pk_set).count():
            raise instance.CiclicDependencyError("The group has a dependence on itself.")


@receiver(signals.pre_save, sender=PeriodicTask)
def validate_types(instance: PeriodicTask, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if (instance.kind not in instance.kinds) or (instance.type not in instance.types):
        # Deprecated, because moved to serializers
        raise UnknownTypeException(instance.kind, "Unknown kind {}.")  # nocv


@receiver(signals.pre_save, sender=PeriodicTask)
def validate_crontab(instance: PeriodicTask, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    try:
        instance.get_schedule()
    except ValueError as ex:
        msg = dict(schedule=["{}".format(ex)])
        raise ValidationError(msg)


@receiver(signals.pre_save, sender=Host)
def validate_type_and_name(instance: Host, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if instance.type not in instance.types:  # nocv
        # Deprecated, because moved to serializers
        raise UnknownTypeException(instance.type)
    if instance.type == 'HOST':
        validate_hostname(instance.name)
    if instance.type == "RANGE":
        instance.range_validator(instance.name)


@receiver(signals.pre_save, sender=Template)
def validate_template_keys(instance: Template, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    # Deprecated, because moved to serializers
    if instance.kind not in instance.template_fields.keys():
        raise UnknownTypeException(instance.kind)
    errors = {}
    for key in instance.data.keys():
        if key not in instance.template_fields[instance.kind]:
            errors[key] = "Unknown key. Keys should be {}".format(
                instance.template_fields[instance.kind]
            )
    if errors:
        raise ValidationError(errors)


@receiver(signals.pre_save, sender=Template)
def validate_template_args(instance: Template, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    if instance.kind in ["Host", "Group"]:
        return  # nocv
    command = "playbook"
    ansible_args = dict(instance.data['vars'])
    if instance.kind == "Module":
        command = "module"
    AnsibleArgumentsReference().validate_args(command, ansible_args)
    for _, data in dict(instance.options).items():
        AnsibleArgumentsReference().validate_args(
            command, data.get('vars', {})
        )


@receiver(signals.pre_delete, sender=Project)
@raise_context()
def clean_dirs(instance: Project, **kwargs) -> None:
    instance.repo_class.delete()


@receiver(signals.post_save, sender=PeriodicTask)
def save_to_beat(instance: PeriodicTask, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    task = settings.TASKS_HANDLERS["SCHEDUER"]["BACKEND"]
    manager = django_celery_beat.models.PeriodicTask.objects
    delete_from_beat(instance)
    if not instance.enabled:
        return #nocv
    if instance.type == "INTERVAL":
        units = IntervalSchedule.SECONDS
        secs = instance.get_schedule()
        schedule, _ = IntervalSchedule.objects.get_or_create(every=secs,
                                                             period=units)
        manager.create(interval=schedule,
                       name=str(instance.id),
                       task=task,
                       args=json.dumps([instance.id]))
    elif instance.type == "CRONTAB":
        cron_data = instance.crontab_kwargs
        schedule, _ = CrontabSchedule.objects.get_or_create(**cron_data)
        manager.create(crontab=schedule,
                       name=str(instance.id),
                       task=task,
                       args=json.dumps([instance.id]))


@receiver(signals.post_delete, sender=PeriodicTask)
def delete_from_beat(instance: PeriodicTask, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    manager = django_celery_beat.models.PeriodicTask.objects
    celery_tasks = manager.filter(name=str(instance.id))
    for task in celery_tasks:
        qs_dict = {
            'crontab_id': CrontabSchedule.objects.all(),
            'interval_id': IntervalSchedule.objects.all(),
        }
        for field in ['crontab_id', 'interval_id']:
            pk = getattr(task, field)
            if pk is None:
                continue
            others = manager.filter(**{field: pk}).exclude(pk=task.id)
            if not others.exists():
                qs_dict[field].get(id=pk).delete()
    celery_tasks.delete()


@receiver(signals.m2m_changed, sender=Project.inventories.through)
def check_if_inventory_linked(instance: Inventory, action: Text, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if action != "pre_remove":
        return
    removing_inventories = instance.inventories.filter(pk__in=kwargs['pk_set'])
    check_id = removing_inventories.values_list('id', flat=True)
    linked_templates = Template.objects.filter(inventory__iregex=r'^[0-9]{1,128}$').\
        annotate(inventory__id=Cast('inventory', IntegerField())).\
        filter(inventory__id__in=check_id)
    linked_periodic_tasks = PeriodicTask.objects.filter(_inventory__in=check_id)
    if linked_periodic_tasks.exists() or linked_templates.exists():
        raise_linked_error(
            linked_templates=list(linked_templates.values_list('id', flat=True)),
            linked_periodic_tasks=list(
                linked_periodic_tasks.values_list('id', flat=True)
            ),
        )


@receiver(signals.pre_delete, sender=Inventory)
def check_if_inventory_linked_project(instance: Inventory, **kwargs) -> NoReturn:
    # pylint: disable=invalid-name
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if instance.projects.exists():
        raise_linked_error(
            linked_projects=list(instance.projects.values_list('id', flat=True))
        )


@receiver(signals.pre_save, sender=Hook)
def check_hook(instance: Hook, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    errors = instance.handlers.validate(instance)
    if errors:
        raise ValidationError(errors)


@receiver([signals.post_save, signals.post_delete], sender=BaseUser,
          dispatch_uid='user_add_hook')
def user_add_hook(instance: BaseUser, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    created = kwargs.get('created', None)
    when = None
    if created is None:
        when = "on_user_del"
    elif not created:
        when = "on_user_upd"
    elif created:
        when = "on_user_add"
    send_user_hook(when, instance) if when else None


@receiver([signals.post_save, signals.post_delete], sender=Variable)
@receiver([signals.post_save, signals.post_delete], sender=Project)
@receiver([signals.post_save, signals.post_delete], sender=PeriodicTask)
@receiver([signals.post_save, signals.post_delete], sender=Template)
@receiver([signals.post_save, signals.post_delete], sender=Inventory)
@receiver([signals.post_save, signals.post_delete], sender=Group)
@receiver([signals.post_save, signals.post_delete], sender=Host)
def polemarch_hook(instance: Any, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    created = kwargs.get('created', None)
    when = "on_object_add"
    if isinstance(instance, Variable):
        instance = instance.content_object
        if instance is None:
            return
        when = "on_object_upd"
    elif created is None:
        when = "on_object_del"
    elif not created:
        when = "on_object_upd"
    send_polemarch_models(when, instance)


@receiver(signals.post_save, sender=BaseUser)
def create_settings_for_user(instance: BaseUser, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    UserSettings.objects.get_or_create(user=instance)


@receiver(signals.pre_save, sender=Template)
def update_ptasks_with_templates(instance: Template, **kwargs) -> NoReturn:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # noce
        return
    instance.periodic_task.all().update(project=instance.project)


@receiver(signals.pre_delete, sender=History)
def cancel_task_on_delete_history(instance: History, **kwargs) -> NoReturn:
    exchange = KVExchanger(CmdExecutor.CANCEL_PREFIX + str(instance.id))
    exchange.send(True, 60) if instance.working else None
