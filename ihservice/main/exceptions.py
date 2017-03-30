class IHSException(Exception):
    def __init__(self, *args, **kwargs):
        self.msg = (list(args)[0:1]+[""])[0]
        super(IHSException, self).__init__(*args, **kwargs)

    def __repr__(self):
        return repr(self.msg)


class UnknownIntegrationException(IHSException):
    _def_message = "Unknown type {}."

    def __init__(self, tp):
        msg = self._def_message.format(tp)
        super(UnknownIntegrationException, self).__init__(msg)


class NodeFailedException(IHSException):
    pass


class NodeOfflineException(IHSException):
    pass


class AnsibleNotFoundException(IHSException):
    pass
