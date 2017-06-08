# pylint: disable=unused-argument,no-member
from __future__ import absolute_import

import json

import django_celery_beat
from django_celery_beat.models import IntervalSchedule, CrontabSchedule
from django.db.models import signals
from django.dispatch import receiver
from django.core.validators import ValidationError

from .vars import Variable
from .hosts import Host, Group, Inventory, Environment
from .projects import Project
from .users import TypesPermissions
from .tasks import Task, PeriodicTask, History
from ..validators import validate_hostname
from ..utils import raise_context


#####################################
# SIGNALS
#####################################
@receiver(signals.m2m_changed, sender=Group.parents.through)
def check_circular_deps(instance, action, pk_set, *args, **kw):
    if action in ["pre_add", "post_add"]:
        if instance.id in pk_set:
            raise instance.CiclicDependencyError("The group can "
                                                 "not refer to itself.")
        parents = instance.parents.get_parents()
        childrens = instance.groups.get_subgroups()
        if instance in (parents | childrens) or \
                parents.filter(id__in=pk_set).count():
            raise instance.CiclicDependencyError("The group has a "
                                                 "dependence on itself.")


@receiver(signals.pre_save, sender=Environment)
def validate_integrations(instance, **kwargs):
    json.loads(instance.data)


@receiver(signals.pre_save, sender=PeriodicTask)
def validate_crontab(instance, **kwargs):
    try:
        instance.get_schedule()
    except ValueError as ex:
        msg = dict(schedule=["{}".format(ex)])
        raise ValidationError(msg)


@receiver(signals.pre_save, sender=Host)
def validate_hosts(instance, **kwargs):
    if instance.type == "HOST" and \
       instance.variables.filter(key="ansible_host").count():
        validate_hostname(instance.name)
    elif instance.variables.filter(key="ansible_host").count():
        validate_hostname(instance.variables.get("ansible_host"))


@receiver(signals.pre_delete, sender=Environment)
def clear_environment(instance, **kwargs):
    if not instance.no_signal:
        instance.integration.rm()


@receiver(signals.pre_delete, sender=Host)
def clear_service(instance, **kwargs):
    if not instance.no_signal:
        instance.integration.rm_host(host=instance)


@receiver(signals.pre_delete, sender=Project)
@raise_context()
def clean_dirs(instance, **kwargs):
    instance.repo_class.delete()


@receiver(signals.post_save, sender=PeriodicTask)
def save_to_beat(instance, **kwargs):
    manager = django_celery_beat.models.PeriodicTask.objects
    if instance.type == "INTERVAL":
        units = IntervalSchedule.SECONDS
        secs = instance.get_schedule()
        schedule, _ = IntervalSchedule.objects.get_or_create(every=secs,
                                                             period=units)
        manager.create(interval=schedule,
                       name=str(instance.id),
                       task='polemarch.main.tasks.ScheduledTask',
                       args=json.dumps([instance.id]))
    elif instance.type == "CRONTAB":
        cron_data = instance.crontab_kwargs
        schedule, _ = CrontabSchedule.objects.get_or_create(**cron_data)
        manager.create(crontab=schedule,
                       name=str(instance.id),
                       task='polemarch.main.tasks.ScheduledTask',
                       args=json.dumps([instance.id]))


@receiver(signals.post_delete, sender=PeriodicTask)
def delete_from_beat(instance, **kwargs):
    manager = django_celery_beat.models.PeriodicTask.objects
    manager.get(name=str(instance.id)).delete()
