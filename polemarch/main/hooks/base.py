from django.conf import settings


class BaseHook(object):
    def __init__(self, hook_object, when_types=None, **kwargs):
        self.when_types = when_types or []
        self.hook_object = hook_object
        self.when = None
        recipients = hook_object.reps
        self.setup(recipients=recipients, **kwargs)

    def get_settings(self, name, default=None):
        return getattr(settings, name, default)

    def setup(self, **kwargs):
        self.conf = dict()
        self.conf.update(kwargs)

    def validate(self):
        errors = {}
        when = self.hook_object.when
        if when is not None and when not in self.when_types:
            errors['when'] = ("Unknown 'when'. "
                              "Should be {}".format(self.when_types))
        return errors

    def send(self, message, when):
        # pylint: disable=unused-argument
        self.when = when

    def on_execution(self, message):
        return self.send(message, when='on_execution')

    def after_execution(self, message):
        return self.send(message, when='after_execution')

    def on_user_add(self, message):
        return self.send(message, when='on_user_add')

    def on_user_upd(self, message):
        return self.send(message, when='on_user_upd')

    def on_user_del(self, message):
        return self.send(message, when='on_user_del')

    def on_object_add(self, message):
        return self.send(message, when='on_object_add')

    def on_object_upd(self, message):
        return self.send(message, when='on_object_upd')

    def on_object_del(self, message):
        return self.send(message, when='on_object_del')
