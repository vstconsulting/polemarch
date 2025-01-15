from __future__ import unicode_literals

import collections
import logging
import uuid
from typing import Text, Any, List

from django.db import models
from vstutils.models import BModel, BQuerySet
from vstutils.utils import raise_context, ModelHandlers

logger = logging.getLogger('polemarch')


class HookHandlers(ModelHandlers):
    when_types_names = collections.OrderedDict((
        ('on_execution', "Before start task"),
        ('after_execution', "After end task"),
        ('on_user_add', "When new user register"),
        ('on_user_upd', "When user update data"),
        ('on_user_del', "When user was removed"),
        ('on_object_add', "When new Polemarch object was added"),
        ('on_object_upd', "When Polemarch object was updated"),
        ('on_object_del', "When Polemarch object was removed"),
    ))
    when_types = tuple(when_types_names.keys())

    def get_handler(self, obj: BModel):
        return self[obj.type](obj, self.when_types, **self.opts(obj.type))

    @raise_context(AttributeError, exclude=True)
    def handle(self, obj: BModel, when: Text, message: Any):
        logger.debug(f"Send hook {obj.name} triggered by {when}.")
        return getattr(self.get_handler(obj), when)(message)

    def validate(self, obj: BModel):
        return self.get_handler(obj).validate()


class HooksQuerySet(BQuerySet):
    use_for_related_fields = True

    def when(self, when: Text) -> BQuerySet:
        return self.filter(enable=True).filter(models.Q(when=when) | models.Q(when=None))

    def execute(self, when: Text, message: Any) -> None:
        for hook in self.when(when):
            with raise_context():
                hook.run(when, message)


class Hook(BModel):
    # pylint: disable=no-member
    objects = HooksQuerySet.as_manager()
    handlers = HookHandlers("HOOKS", "'type' needed!")
    name       = models.CharField(max_length=512, default=uuid.uuid1)
    type       = models.CharField(max_length=32, null=False, db_index=True)
    when       = models.CharField(max_length=32, null=True, default=None, db_index=True)
    enable     = models.BooleanField(default=True, db_index=True)
    recipients = models.TextField()

    @property
    def reps(self) -> List[Text]:
        return self.recipients.split(' | ')

    def run(self, when: Text = 'on_execution', message: Any = None):
        return (
            self.handlers.handle(self, when, message)
            if self.when is None or self.when == when else ''
        )
