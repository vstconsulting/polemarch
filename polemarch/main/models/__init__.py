# pylint: disable=unused-argument
from __future__ import absolute_import

import json
from django.db.models import signals
from django.dispatch import receiver
from django.core.validators import ValidationError

from .hosts import Host, Group, Inventory, Variable, Environment
from .projects import Project
from .users import TypesPermissions
from .tasks import Task, PeriodicTask, History
from ..validators import validate_hostname


#####################################
# SIGNALS
#####################################
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
