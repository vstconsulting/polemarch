from __future__ import unicode_literals
from .base import BModel, models
from ..utils import ModelHandlers, raise_context


class HookHandlers(ModelHandlers):
    @raise_context(AttributeError, exclude=True)
    def handle(self, name, obj, when, **kwargs):
        return getattr(self.get_object(name, obj), when)(**kwargs)


class Hook(BModel):
    handlers = HookHandlers("HOOKS", "'type' needed!")
    type       = models.CharField(max_length=32, null=False)
    recipients = models.TextField()

    def run(self, when='on_execution', **kwargs):
        return self.handlers.handle(self.type, self, when, **kwargs)
