# pylint: disable=unused-argument,no-member
from __future__ import absolute_import

import json

import django_celery_beat
from django_celery_beat.models import IntervalSchedule, CrontabSchedule
from django.db.models import signals
from django.dispatch import receiver
from django.core.validators import ValidationError

from .vars import Variable
from .hosts import Host, Group, Inventory
from .projects import Project
from .users import TypesPermissions
from .tasks import Task, PeriodicTask, History, HistoryLines, Template
from ..validators import validate_hostname, RegexValidator
from ..exceptions import UnknownTypeException
from ..utils import raise_context, AnsibleArgumentsReference


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
    if action in ["pre_add", "post_add"]:
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
def validate_hosts(instance, **kwargs):
    if instance.variables.filter(key="ansible_host").count():
        validate_hostname(instance.variables.get("ansible_host"))
    elif instance.type == "HOST":
        validate_hostname(instance.name)
    elif instance.type == "RANGE":
        validate_name = RegexValidator(
            regex=r'^[a-zA-Z0-9\-\._\[\]\:]*$',
            message='Name must be Alphanumeric'
        )
        validate_name(instance.name)


@receiver(signals.pre_save, sender=Host)
def validate_type(instance, **kwargs):
    if instance.type not in instance.types:
        raise UnknownTypeException(instance.type)


@receiver(signals.pre_save, sender=Template)
def validate_template(instance, **kwargs):
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
    command = "playbook"
    ansible_args = dict(instance.data['vars'])
    if instance.kind == "Module":
        command = "module"
    if instance.kind == "PeriodicTask" and instance.data["kind"] == "MODULE":
        command = "module"
    AnsibleArgumentsReference().validate_args(command, ansible_args)


@receiver(signals.pre_delete, sender=Project)
@raise_context()
def clean_dirs(instance, **kwargs):
    instance.repo_class.delete()


@receiver(signals.post_save, sender=PeriodicTask)
def save_to_beat(instance, **kwargs):
    manager = django_celery_beat.models.PeriodicTask.objects
    delete_from_beat(instance)
    if instance.type == "INTERVAL":
        units = IntervalSchedule.SECONDS
        secs = instance.get_schedule()
        schedule, _ = IntervalSchedule.objects.get_or_create(every=secs,
                                                             period=units)
        manager.create(interval=schedule,
                       name=str(instance.id),
                       task='polemarch.main.tasks.tasks.ScheduledTask',
                       args=json.dumps([instance.id]))
    elif instance.type == "CRONTAB":
        cron_data = instance.crontab_kwargs
        schedule, _ = CrontabSchedule.objects.get_or_create(**cron_data)
        manager.create(crontab=schedule,
                       name=str(instance.id),
                       task='polemarch.main.tasks.tasks.ScheduledTask',
                       args=json.dumps([instance.id]))


@receiver(signals.post_delete, sender=PeriodicTask)
def delete_from_beat(instance, **kwargs):
    django_celery_beat.models.PeriodicTask.objects.\
        filter(name=str(instance.id)).delete()
