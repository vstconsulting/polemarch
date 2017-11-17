import json


class BaseHook(object):

    def send(self, message):
        raise NotImplementedError()

    def on_execution(self, **kwargs):
        return self.send(json.dumps(kwargs))
