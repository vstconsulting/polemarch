from typing import Dict
from django.conf import settings


class BaseHook:
    __slots__ = (
        'when_types',
        'hook_object',
        'when',
        'conf',
    )

    def __init__(self, hook_object, when_types=None, **kwargs):
        self.when_types = when_types or []
        self.hook_object = hook_object
        self.when = None
        recipients = hook_object.reps
        self.setup(recipients=recipients, **kwargs)

    def get_settings(self, name, default=None):
        return getattr(settings, name, default)

    def setup(self, **kwargs):
        self.conf = {}
        self.conf.update(kwargs)

    def validate(self) -> Dict:
        errors = {}
        when = self.hook_object.when
        if when is not None and when not in self.when_types:
            errors['when'] = ("Unknown 'when'. "
                              "Should be {}".format(self.when_types))
        return errors

    def modify_message(self, message):
        return message

    def execute(self, recipient, when, message):  # nocv
        raise NotImplementedError

    def execute_many(self, recipients, when, message) -> str:
        return '\n'.join(map(lambda r: self.execute(r, when, message), recipients))

    def send(self, message, when: str) -> str:
        self.when = when
        return self.execute_many(
            recipients=filter(lambda r: r, self.conf['recipients']),
            when=when,
            message=self.modify_message(message),
        )

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
