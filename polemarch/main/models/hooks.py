from __future__ import unicode_literals
import uuid
from .base import BModel, BQuerySet, models
from ..utils import ModelHandlers, raise_context


class HookHandlers(ModelHandlers):
    when_types = ['on_execution', 'after_execution']

    def get_handler(self, obj):
        return self[obj.type](obj, self.when_types, **self.opts(obj.type))

    @raise_context(AttributeError, exclude=True)
    def handle(self, obj, when, message):
        return getattr(self.get_handler(obj), when)(message)

    def validate(self, obj):
        return self.get_handler(obj).validate()


class HooksQuerySet(BQuerySet):
    use_for_related_fields = True

    def when(self, when):
        return self.filter(models.Q(when=when) | models.Q(when=None))

    def execute(self, when, message):
        for hook in self.when(when):
            with raise_context():
                hook.run(when, message)


class Hook(BModel):
    objects = HooksQuerySet.as_manager()
    handlers = HookHandlers("HOOKS", "'type' needed!")
    name       = models.CharField(max_length=512, default=uuid.uuid1)
    type       = models.CharField(max_length=32, null=False)
    when       = models.CharField(max_length=32, null=True, default=None)
    recipients = models.TextField()

    @property
    def reps(self):
        return self.recipients.split(' | ')

    def run(self, when='on_execution', message=None):
        return (
            self.handlers.handle(self, when, message)
            if self.when is None or self.when == when else ''
        )
