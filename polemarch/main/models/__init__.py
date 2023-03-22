# pylint: disable=unused-argument,disable=invalid-name
from __future__ import absolute_import
from pathlib import Path
from typing import Any, Text, Iterable, Dict, Union
import sys
import json
import logging
from itertools import chain
from collections import OrderedDict
from django_celery_beat.models import IntervalSchedule, CrontabSchedule, PeriodicTask as CPTask
from django.db.models import signals, IntegerField, UUIDField, CharField
from django.db import transaction
from django.dispatch import receiver
from django.db.models.functions import Cast
from django.core.validators import ValidationError
from django.conf import settings
from rest_framework.exceptions import ValidationError as drfValidationError
from vstutils.utils import raise_context, KVExchanger, translate as _, lazy_translate as __

from .vars import Variable
from .hosts import Host, Group, Inventory, InventoryState
from .projects import Project, AnsiblePlaybook, Module, ProjectCommunityTemplate, list_to_choices
from .users import get_user_model, UserGroup, ACLPermission
from .history import History, HistoryLines
from .execution_templates import (
    ExecutionTemplate,
    ExecutionTemplateOption,
    TemplatePeriodicTask,
)
from .hooks import Hook
from ..validators import RegexValidator, validate_hostname, path_validator
from ..exceptions import UnknownTypeException, Conflict
from ..utils import CmdExecutor
from .utils import validate_inventory_arguments
from ...main.constants import ProjectVariablesEnum, ANSIBLE_REFERENCE


logger = logging.getLogger('polemarch')
BaseUser = get_user_model()


#####################################
# FUNCTIONS
#####################################
def send_hook(when: Text, target: Any) -> None:
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
def remove_existed(instance: Variable, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    Variable.objects.filter(
        object_id=instance.object_id,
        content_type=instance.content_type,
        key=instance.key
    ).exclude(pk=instance.id).delete()


@receiver(signals.pre_save, sender=Variable)
def check_variables_values(instance: Variable, *args, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    content_object = instance.content_object
    if isinstance(content_object, Host):
        if instance.key == 'ansible_host':
            validate_hostname(instance.value)
    elif isinstance(content_object, Project):
        if instance.key == 'env_ANSIBLE_CONFIG':
            path_validator(instance.value)


@receiver(signals.pre_save, sender=Variable)
def check_project_variables_values(instance: Variable, *args, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if not isinstance(instance.content_object, Project):
        return
    if instance.key == 'playbook_path':
        path_validator(instance.value)

    project = instance.content_object

    is_ci_var = instance.key.startswith('ci_')
    key_startswith = instance.key.startswith('env_') or is_ci_var
    if not key_startswith and instance.key not in ProjectVariablesEnum.get_values():
        msg = 'Unknown variable key \'{}\'. Key must be in {} or starts from \'env_\' or \'ci_\'.'
        raise ValidationError(msg.format(instance.key, ProjectVariablesEnum.get_values()))

    is_ci_template = instance.key == 'ci_template'
    qs_variables = project.variables.all()

    if is_ci_var and qs_variables.filter(key__startswith='repo_sync_on_run').exists():
        raise Conflict(_('Couldn\'t set CI/CD to project with "repo_sync_on_run" setting.'))
    if instance.key.startswith('repo_sync_on_run') and project.get_vars_prefixed('ci'):
        raise Conflict(_('Couldn\'t set "repo_sync_on_run" setting for CI/CD project.'))
    if is_ci_template and not project.execution_templates.filter(options__id=instance.value).exists():
        raise ValidationError('Template option does not exist in this project.')


@receiver(signals.pre_delete, sender=ExecutionTemplateOption)
def check_linked_ci_templates(instance: ExecutionTemplateOption, *args, **kwargs):
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return

    project: Project = instance.template.project
    ci_template = project.get_vars_prefixed('ci').get('template')
    if str(instance.id) == ci_template:
        raise ValidationError(_(
            "Cannot delete option {} because it's used by project as CI template."
        ).format(instance.id))


@receiver(signals.pre_save, sender=Group)
def validate_group_name(instance: Group, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    validate_name = RegexValidator(
        regex=r'^[a-zA-Z0-9\-\._]*$',
        message='Name must be Alphanumeric'
    )
    validate_name(instance.name)


@receiver(signals.m2m_changed, sender=Group.parents.through)
def check_circular_deps(instance: Group, action: Text, pk_set: Iterable, *args, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if (action in ["pre_add", "post_add"]) and ('loaddata' not in sys.argv):
        if instance.id in pk_set:
            raise instance.CyclicDependencyError("The group can not refer to itself.")
        parents = instance.parents.all().get_parents()
        children = instance.groups.all().get_children()
        if instance in (parents | children) or parents.filter(id__in=pk_set).count():
            raise instance.CyclicDependencyError("The group has a dependence on itself.")


@receiver(signals.pre_save, sender=TemplatePeriodicTask)
def validate_crontab(instance: TemplatePeriodicTask, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    try:
        instance.get_schedule()
    except ValueError as ex:
        msg = {'schedule': str(ex)}
        raise ValidationError(msg) from ex


@receiver(signals.pre_save, sender=Host)
def validate_type_and_name(instance: Host, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if instance.type not in instance.types:  # nocv
        # Deprecated, because moved to serializers
        raise UnknownTypeException(instance.type)
    if instance.type == 'HOST':
        validate_hostname(instance.name)
    if instance.type == "RANGE":
        instance.range_validator(instance.name)


@receiver(signals.pre_save, sender=ExecutionTemplateOption)
def validate_template_option_inventory_fields(instance: ExecutionTemplateOption, **kwargs):
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    validate_inventory_arguments(instance.plugin, instance.arguments, instance.project)


@receiver(signals.pre_delete, sender=Project)
@raise_context()
def clean_dirs(instance: Project, **kwargs) -> None:
    instance.repo_class.delete()


def compare_schedules(new_schedule_data: Dict, old_schedule: Union[CrontabSchedule, IntervalSchedule]):
    """
    Method for compare parameters for Schedule from instance and current Periodic Task Schedule Params
    :param new_schedule_data: Dictionary contains data for new Schedule
    :param old_schedule: Schedule object from Periodic Task
    :return: Boolean result of compare args
    """
    for key, value in new_schedule_data.items():
        if value != getattr(old_schedule, key, None):
            return False
    return True


@receiver(signals.post_save, sender=TemplatePeriodicTask)
@transaction.atomic()
def save_to_beat(instance: TemplatePeriodicTask, **kwargs) -> None:
    """
    Signal handle create and edit for Polemarch Periodic Task objects
    :param instance: Polemarch Periodic Task object
    :param kwargs:
    :return:
    """
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return

    if not instance.enabled:
        delete_from_beat(instance)
        return

    instance_pt_type = instance.type.lower()
    types_dict = dict(
        interval=IntervalSchedule,
        crontab=CrontabSchedule,
    )

    # Try get Celery Periodic Task, that linked with Polemarch Periodic Task
    celery_task = CPTask.objects.filter(
        name=str(instance.id), task=settings.TASKS_HANDLERS["SCHEDULER"]["BACKEND"]
    ).last()

    # Prepare data for Schedule
    if instance_pt_type == 'interval':
        schedule_data = dict(
            every=instance.get_schedule(),
            period=types_dict[instance_pt_type].SECONDS
        )
    elif instance_pt_type == 'crontab':
        schedule_data = instance.crontab_kwargs
        schedule_data['timezone'] = settings.TIME_ZONE
    else:
        raise ValidationError("Unknown periodic task type `{}`.".format(instance.type))  # nocv


    if celery_task:
        # Check changed schedule or not
        schedule_old = getattr(celery_task, instance_pt_type, None)
        if compare_schedules(schedule_data, schedule_old):
            return

        # Create new Schedule from data
        schedule_new, _ = types_dict[instance_pt_type].objects.get_or_create(**schedule_data)

        if schedule_old is None:
            # Get old Schedule and it type.
            for type_name in filter(lambda k: k != instance_pt_type, types_dict.keys()):
                schedule_old = getattr(celery_task, type_name, None)
                if schedule_old is not None:
                    setattr(celery_task, type_name, None)
                    break

            # Update data for old schedule type and new schedule type
            setattr(celery_task, instance_pt_type, schedule_new)
        else:
            # Update celery periodic task schedule
            setattr(celery_task, instance_pt_type, schedule_new)

        celery_task.save()
        # Delete old schedule if it doesn't have any linked Celery Periodic Tasks
        if schedule_old is not None and not schedule_old.periodictask_set.exists():
            schedule_old.delete()
    else:
        # Create new Celery Periodic Task, if it doesn't  exist
        CPTask.objects.create(
            name=str(instance.id),
            task=settings.TASKS_HANDLERS["SCHEDULER"]["BACKEND"],
            args=json.dumps([instance.id]),
            **{instance_pt_type: types_dict[instance_pt_type].objects.get_or_create(**schedule_data)[0]}
        )


@receiver(signals.post_delete, sender=TemplatePeriodicTask)
@transaction.atomic()
def delete_from_beat(instance: TemplatePeriodicTask, **kwargs) -> None:
    """
    Signal handle delete or disable for Polemarch Periodic Task objects
    :param instance: Polemarch Periodic Task object
    :param kwargs:
    :return:
    """
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return

    # Get Celery Periodic Task
    celery_task = CPTask.objects.filter(
        name=str(instance.id), task=settings.TASKS_HANDLERS["SCHEDULER"]["BACKEND"]
    ).last()

    if celery_task:
        # Check links to this celery task Schedule, and delete if it linked only with this periodic task
        for field in ['crontab', 'interval']:
            schedule = getattr(celery_task, field, None)
            if schedule is not None and not schedule.periodictask_set.exclude(id=celery_task.id).exists():
                schedule.delete()
                break
        celery_task.delete()


@receiver(signals.m2m_changed, sender=Project.inventories.through)
def check_if_inventory_linked(instance: Inventory, action: Text, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if action != "pre_remove":
        return
    removing_inventories = instance.inventories.filter(pk__in=kwargs['pk_set'])
    check_id = removing_inventories \
        .annotate(inventory_id=Cast('id', CharField())) \
        .values_list('inventory_id', flat=True)
    ExecutionTemplateOption.objects \
        .annotate(inventory=Cast('arguments__inventory', CharField())) \
        .filter(inventory__in=check_id) \
        .delete()


@receiver(signals.post_delete, sender=Inventory)
def delete_inventory_state(instance: Inventory, **kwargs) -> None:
    # pylint: disable=protected-access
    if instance._inventory_state_id is not None:
        InventoryState.objects.filter(id=instance._inventory_state_id).delete()


@receiver(signals.pre_delete, sender=Inventory)
def check_if_inventory_linked_project(instance: Inventory, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    if instance.projects.exists():
        raise_linked_error(
            linked_projects=list(instance.projects.values_list('id', flat=True))
        )


@receiver(signals.pre_save, sender=Hook)
def check_hook(instance: Hook, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
        return
    errors = instance.handlers.validate(instance)
    if errors:
        raise ValidationError(errors)


@receiver([signals.post_save, signals.post_delete], sender=BaseUser,
          dispatch_uid='user_add_hook')
def user_add_hook(instance: BaseUser, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
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
@receiver([signals.post_save, signals.post_delete], sender=ExecutionTemplate)
@receiver([signals.post_save, signals.post_delete], sender=ExecutionTemplateOption)
@receiver([signals.post_save, signals.post_delete], sender=TemplatePeriodicTask)
@receiver([signals.post_save, signals.post_delete], sender=Inventory)
@receiver([signals.post_save, signals.post_delete], sender=Group)
@receiver([signals.post_save, signals.post_delete], sender=Host)
def polemarch_hook(instance: Any, **kwargs) -> None:
    if 'loaddata' in sys.argv or kwargs.get('raw', False):  # nocv
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


@receiver(signals.pre_delete, sender=History)
def cancel_task_on_delete_history(instance: History, **kwargs) -> None:
    instance.cancel()


@receiver(signals.post_migrate)
def update_crontab_timezone_ptasks(*args, **kwargs):
    # pylint: disable=no-member
    qs = CrontabSchedule.objects.exclude(timezone=settings.TIME_ZONE)
    qs.filter(periodictask__task__startswith='polemarch').update(timezone=settings.TIME_ZONE)
    qs.filter(periodictask__task__startswith='pmlib').update(timezone=settings.TIME_ZONE)
