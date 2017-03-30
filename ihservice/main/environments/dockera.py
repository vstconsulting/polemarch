import uuid

import docker

from ..utils import tmp_file
from ._base import BaseCloudIntegration


class Integration(BaseCloudIntegration):
    _D_USERNAME = "centos"
    _D_AUTH_TYPE = "PASSWD"

    def __init__(self, *args, **kwargs):
        super(Integration, self).__init__(*args, **kwargs)
        if not self._fields:
            raise self.IntegrationsException
        self.client = self._client()

    def additionals(self):
        result = super(Integration, self).additionals()
        default_images = ["vstconsulting/centos7-ssh-password"]
        images = self.options.get("images", default_images)
        result.update({"image": [(image, image) for image in images]})
        return result

    def _client(self):
        fields = self._fields
        pems = [fields.get("ca_cert"), fields.get("client_cert"),
                fields.get("client_key")]
        opts = dict(base_url=fields["url"])
        if (None in pems or "" in pems) and "".join([i for i in pems if i]):
            raise self.IntegrationsException("Not provided required pem")
        elif None not in pems and "" not in pems:
            self.ca_cert = tmp_file()
            self.ca_cert.write(fields["ca_cert"])
            self.client_cert = tmp_file()
            self.client_cert.write(fields["client_cert"])
            self.client_key = tmp_file()
            self.client_key.write(fields["client_key"])
            client_cert = (self.client_cert.name,
                           self.client_key.name)
            opts['tls'] = docker.tls.TLSConfig(ca_cert=self.ca_cert.name,
                                               client_cert=client_cert)
        return docker.DockerClient(**opts)

    def prepare_service(self, service):
        if service.nodeid is not None:
            return False
        client = self.client
        password = str(uuid.uuid1())
        env_variables = {'SSH_USER': 'centos', 'SSH_USER_PASSWORD': password,
                         'SSH_SUDO': 'ALL=(ALL) NOPASSWD:ALL'}
        image = self._fields.get("image", "vstconsulting/centos7-ssh-password")
        container = client.containers.run(image,
                                          detach=True,
                                          environment=env_variables)
        container = client.containers.get(container.id)
        ip = container.attrs['NetworkSettings']['Networks']
        ip = ip['bridge']['IPAddress']  # can't write in one line due to PEP
        service.host = ip
        service.auth_type = Integration._D_AUTH_TYPE
        service.auth_user = Integration._D_USERNAME
        service.auth_data = password
        service.nodeid = container.id
        service.environment = self.environment
        service.save()
        return service

    def prepare_environment(self):
        pass

    @staticmethod
    def required_fields():
        fields = super(Integration, Integration).required_fields()
        fields['auth'] = {
                               "url":           {"type": "string"},
                               "ca_cert":       {"type": "file"},
                               "client_cert":   {"type": "file"},
                               "client_key":    {"type": "file"},
        }
        fields["instance"] = {
                               "image":         {"type": "string"},
        }
        fields['service_fields'] = {}
        return fields
