from __future__ import unicode_literals
import uuid
from .base import BModel, BQuerySet, models
from ..utils import ModelHandlers, raise_context


class HookHandlers(ModelHandlers):
    @raise_context(AttributeError, exclude=True)
    def handle(self, name, obj, when, **kwargs):
        return getattr(self.get_object(name, obj), when)(**kwargs)


class HooksQuerySet(BQuerySet):
    use_for_related_fields = True

    def when(self, when):
        return self.filter(models.Q(when=when) | models.Q(when=None))

    def execute(self, when, **kwargs):
        for hook in self.when(when):
            with raise_context():
                hook.run(when, **kwargs)


class Hook(BModel):
    objects = HooksQuerySet.as_manager()
    handlers = HookHandlers("HOOKS", "'type' needed!")
    name       = models.CharField(max_length=512, default=uuid.uuid1)
    type       = models.CharField(max_length=32, null=False)
    when       = models.CharField(max_length=32, null=True, default=None)
    recipients = models.TextField()

    when_types = ['on_execution', 'after_execution']

    @property
    def reps(self):
        return self.recipients.split(' | ')

    def run(self, when='on_execution', **kwargs):
        return (
            self.handlers.handle(self.type, self, when, **kwargs)
            if self.when is None or self.when == when else ''
        )
