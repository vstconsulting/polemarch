# pylint: disable=unused-argument,lost-exception
import json
import logging
import time

import six

from django.conf import settings
from rest_framework.validators import ValidationError

from ...main import exceptions

logger = logging.getLogger("polemarch")


class ImplementationError(NotImplementedError):
    def __init__(self, method):
        msg = "Method {} not implemented".format(method)
        super(ImplementationError, self).__init__(msg)


_field_types = {
    "string": (six.text_type, six.string_types),
    "password": (six.text_type, six.string_types),
    "file": (six.text_type, six.string_types),
    "boolean": (bool,)
}


class BaseIntegration(object):
    is_cloud = False
    _errors = {}

    class IntegrationsException(exceptions.PMException):
        _d_msg = "Incorrect data on environment."

        def __init__(self, msg=None, amsg=None):
            msg = msg or self._d_msg
            msg += " " + amsg if amsg else ""
            super(BaseIntegration.IntegrationsException,
                  self).__init__(msg)

    def __init__(self, environment, **kwargs):
        self.options = kwargs
        self.environment = environment
        self._load_fields()

    def _load_fields(self):
        if isinstance(self.environment.data, (six.string_types,
                                              six.text_type)):
            self._fields = json.loads(self.environment.data)
        elif isinstance(self.environment.data, dict):   # pragma: no cover
            self._fields = self.environment.data
        else:
            self._fields = {}   # pragma: no cover

    def is_valid(self, raise_on_exception=True):
        self._errors = {}
        valid_fields = self.required_fields()
        valid_fields.pop("service_fields")
        for field_set_name, field_set in valid_fields.items():
            for field_name, field in field_set.items():
                self._validate_field(field_set_name, field_name, field)
        if raise_on_exception and len(self._errors):
            raise ValidationError(self._errors)
        return len(self._errors) == 0

    def _validate_field(self, fset, fname, field):
        if fname not in self._fields:
            self._errors[fset] = {fname: "not set."}
        elif not isinstance(self._fields[fname], _field_types[field['type']]):
            self._errors[fset] = {fname: "has unknown type"}

    def additionals(self):
        return {}

    def prepare_service(self, service):
        raise ImplementationError("prepare_service")

    def prepare_environment(self):
        raise ImplementationError("prepare_environment")

    def rm_host(self, host):
        pass

    def rm(self):
        pass

    @staticmethod
    def required_fields(*args, **kwargs):
        srv_fields = dict(host={"name": "Host IP",
                                "placeholder": "Remote IP address"},
                          auth_user={"default": "centos",
                                     "name": "Auth User",
                                     "placeholder": "Enter ssh username"},
                          auth_type={"name": "Auth type"},
                          auth_data={"name": "Auth data"})
        return {"auth": {}, "instance": {}, "service_fields": srv_fields}


class BaseCloudIntegration(BaseIntegration):
    _OS_USERNAME = "centos"
    _OS_AUTH_TYPE = "KEY"
    _TIMEOUT_BETWEEN_CHECKS = 10
    _SEC_GROUP_RULES = [
        {'protocol': "tcp", 'port': 22},
    ]

    is_cloud = True

    def _network_security_rules(self):
        raise ImplementationError("network_security_rules")

    def _wait_until_online(self, service):
        sl = {"ok": dict(err=False),
              "retcodes": {"other": {"err": exceptions.NodeFailedException},
                           4: {"err": exceptions.NodeOfflineException}}}
        for _ in range(getattr(settings, "CREATE_INSTANCE_ATTEMPTS")):
            try:
                service.execute_playbook("ping.yml", status_logics=sl)
                break
            except exceptions.NodeOfflineException:
                time.sleep(self._TIMEOUT_BETWEEN_CHECKS)
