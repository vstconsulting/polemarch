class PMException(Exception):
    def __init__(self, *args, **kwargs):
        self.msg = (list(args)[0:1]+[""])[0]
        super(PMException, self).__init__(*args, **kwargs)

    def __repr__(self):
        return repr(self.msg)


class UnknownTypeException(PMException):
    _def_message = "Unknown type {}."

    def __init__(self, tp, msg=None):
        self._def_message = self._def_message if msg is None else msg
        msg = self._def_message.format(tp)
        super(UnknownTypeException, self).__init__(msg)


class NodeFailedException(PMException):
    pass


class NodeOfflineException(PMException):
    pass


class AnsibleNotFoundException(PMException):
    pass


class DataNotReady(PMException):
    pass


class NotApplicable(PMException):
    pass
