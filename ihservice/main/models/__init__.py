# pylint: disable=unused-argument
from __future__ import absolute_import

import json
from django.db.models import signals
from django.dispatch import receiver

from .hosts import Host, Environment
from .tasks import Task, Scenario


#####################################
# SIGNALS
#####################################
@receiver(signals.pre_save, sender=Environment)
def validate_integrations(instance, **kwargs):
    json.loads(instance.data)


@receiver(signals.pre_delete, sender=Environment)
def clear_environment(instance, **kwargs):
    if not instance.no_signal:
        instance.integration.rm()


@receiver(signals.pre_delete, sender=Host)
def clear_service(instance, **kwargs):
    if not instance.no_signal:
        instance.integration.rm_host(host=instance)
