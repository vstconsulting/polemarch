from ..exceptions import PMException


class TaskError(PMException):
    _default_message = "{}"

    def __init__(self, message):
        msg = self._default_message.format(message)
        super(TaskError, self).__init__(msg)
