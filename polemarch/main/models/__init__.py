# pylint: disable=unused-argument,no-member
from __future__ import absolute_import
import os
import sys
import json
from collections import OrderedDict
import django_celery_beat
from django_celery_beat.models import IntervalSchedule, CrontabSchedule
from django.db.models import signals
from django.dispatch import receiver
from django.core.validators import ValidationError
from django.conf import settings

from .vars import Variable
from .hosts import Host, Group, Inventory
from .projects import Project
from .users import BaseUser, UserGroup, ACLPermission, UserSettings
from .tasks import Task, PeriodicTask, History, HistoryLines, Template
from .hooks import Hook
from ..validators import RegexValidator
from ..exceptions import UnknownTypeException
from ..utils import raise_context, AnsibleArgumentsReference
from ..tasks import SendHook


#####################################
# FUNCTIONS
#####################################
def send_hook(when, target):
    msg = OrderedDict(when=when)
    msg['target'] = target
    SendHook.delay(when, msg)


@raise_context()
def send_user_hook(when, instance):
    send_hook(
        when, OrderedDict(
            user_id=instance.id,
            username=instance.username,
            admin=instance.is_staff
        )
    )


@raise_context()
def send_polemarch_models(when, instance, **kwargs):
    target = OrderedDict(id=instance.id, name=instance.name, **kwargs)
    send_hook(when, target)


#####################################
# SIGNALS
#####################################
@receiver(signals.pre_save, sender=Group)
def validate_group_name(instance, **kwargs):
    validate_name = RegexValidator(
        regex=r'^[a-zA-Z0-9\-\._]*$',
        message='Name must be Alphanumeric'
    )
    validate_name(instance.name)


@receiver(signals.m2m_changed, sender=Group.parents.through)
def check_circular_deps(instance, action, pk_set, *args, **kw):
    if action in ["pre_add", "post_add"] and 'loaddata' not in sys.argv:
        if instance.id in pk_set:
            raise instance.CiclicDependencyError("The group can "
                                                 "not refer to itself.")
        parents = instance.parents.all().get_parents()
        childrens = instance.groups.all().get_subgroups()
        if instance in (parents | childrens) or \
                parents.filter(id__in=pk_set).count():
            raise instance.CiclicDependencyError("The group has a "
                                                 "dependence on itself.")


@receiver(signals.pre_save, sender=PeriodicTask)
def validate_types(instance, **kwargs):
    if instance.kind not in instance.kinds or \
                    instance.type not in instance.types:
        raise UnknownTypeException(instance.kind, "Unknown kind {}.")


@receiver(signals.pre_save, sender=PeriodicTask)
def validate_crontab(instance, **kwargs):
    try:
        instance.get_schedule()
    except ValueError as ex:
        msg = dict(schedule=["{}".format(ex)])
        raise ValidationError(msg)


@receiver(signals.pre_save, sender=Host)
def validate_type(instance, **kwargs):
    if instance.type not in instance.types:
        raise UnknownTypeException(instance.type)


@receiver(signals.pre_save, sender=Template)
def validate_template_keys(instance, **kwargs):
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
def validate_template_executes(instance, **kwargs):
    if instance.kind in ["Host", "Group"]:
        return  # nocv
    errors = {}
    if "inventory" not in instance.data.keys():
        errors["inventory"] = "Inventory have to set."
    if "project" not in instance.data.keys():
        errors["project"] = "Project have to set."
    if errors:
        raise ValidationError(errors)


@receiver(signals.pre_save, sender=Template)
def validate_template_args(instance, **kwargs):
    if instance.kind in ["Host", "Group"]:
        return  # nocv
    command = "playbook"
    ansible_args = dict(instance.data['vars'])
    if instance.kind == "Module":
        command = "module"
    if instance.kind == "PeriodicTask" and instance.data["kind"] == "MODULE":
        command = "module"
    AnsibleArgumentsReference().validate_args(command, ansible_args)
    for _, data in dict(instance.options).items():
        AnsibleArgumentsReference().validate_args(
            command, data.get('vars', {})
        )


@receiver(signals.pre_delete, sender=Project)
@raise_context()
def clean_dirs(instance, **kwargs):
    instance.repo_class.delete()


@receiver(signals.post_save, sender=PeriodicTask)
def save_to_beat(instance, **kwargs):
    task = settings.TASKS_HANDLERS["SCHEDUER"]["BACKEND"]
    manager = django_celery_beat.models.PeriodicTask.objects
    delete_from_beat(instance)
    if not instance.enabled:
        return
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
def delete_from_beat(instance, **kwargs):
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


@receiver(signals.pre_save, sender=Hook)
def check_hook(instance, **kwargs):
    errors = instance.handlers.validate(instance)
    if errors:
        raise ValidationError(errors)


@receiver([signals.post_save, signals.post_delete], sender=BaseUser,
          dispatch_uid='user_add_hook')
def user_add_hook(instance, **kwargs):
    created = kwargs.get('created', None)
    when = None
    if created is None:
        when = "on_user_del"
    elif not created:
        when = "on_user_upd"
    elif created:
        when = "on_user_add"
    send_user_hook(when, instance) if when else None


@receiver([signals.post_save, signals.post_delete], sender=Project)
@receiver([signals.post_save, signals.post_delete], sender=PeriodicTask)
@receiver([signals.post_save, signals.post_delete], sender=Inventory)
@receiver([signals.post_save, signals.post_delete], sender=Group)
@receiver([signals.post_save, signals.post_delete], sender=Host)
def polemarch_hook(instance, **kwargs):
    created = kwargs.get('created', None)
    when = "on_object_add"
    if created is None:
        when = "on_object_del"
    elif not created:
        when = "on_object_upd"
    send_polemarch_models(when, instance)


@receiver(signals.post_save, sender=BaseUser)
def create_settings_for_user(instance, **kwargs):
    UserSettings.objects.get_or_create(user=instance)
