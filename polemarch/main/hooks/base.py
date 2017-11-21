from django.conf import settings


class BaseHook(object):
    def __init__(self, hook_object, **kwargs):
        self.when = None
        recipients = hook_object.recipients.split(' | ')
        self.setup(recipients=recipients, **kwargs)

    def get_settings(self, name, default=None):  # nocv
        return getattr(settings, name, default)

    def setup(self, **kwargs):
        self.conf = dict()
        self.conf.update(kwargs)

    def send(self, message, when):
        # pylint: disable=unused-argument
        self.when = when

    def on_execution(self, **kwargs):
        return self.send(kwargs, when='on_execution')
