import uuid
import time

from django.conf import settings
from novaclient import client as novaclientapi
from novaclient.exceptions import NotFound
from requests.packages.urllib3 import exceptions, disable_warnings

from ..utils import raise_context

from ._base import BaseCloudIntegration

disable_warnings(exceptions.InsecureRequestWarning)


class Integration(BaseCloudIntegration):
    def __init__(self, *args, **kwargs):
        super(Integration, self).__init__(*args, **kwargs)
        if not self._fields:
            raise self.IntegrationsException
        self._nova = self._instantiate_nova()

    def additionals(self):
        images = self._nova.images.list()
        flavors = self._nova.flavors.list()
        networks = [(e.human_id, e.id) for e in self._nova.networks.list()]
        return dict(image=self._convert_to_list_of_tuples(images),
                    flavor=self._convert_to_list_of_tuples(flavors),
                    network=networks)

    def _convert_to_list_of_tuples(self, original):
        result = []
        for element in original:
            result.append((element.name, element.id))
        return result

    def _update_service(self, server, service):
        host = list(server.networks.values())[-1][-1]
        service.host = host
        service.auth_user = self._OS_USERNAME
        service.auth_data = self.environment.key
        service.auth_type = self._OS_AUTH_TYPE
        service.nodeid = server.id
        service.environment = self.environment

    def _associate_floating_IP(self, server):
        server.add_floating_ip(self._nova.floating_ips.create())

    def __server_online(self, instance):
        for _ in range(getattr(settings, "CREATE_INSTANCE_ATTEMPTS")):
            server = self._nova.servers.get(instance.id)
            if server.status == u'ACTIVE':
                return server
            elif server.status == u"ERROR":
                break  # pragma: no cover
            time.sleep(self._TIMEOUT_BETWEEN_CHECKS)
        raise self.IntegrationsException("Server can't come to ACTIVE state.")

    def prepare_service(self, service):
        if service.nodeid is not None:
            return False
        image = self._nova.images.get(self._fields["image"])
        flavor = self._nova.flavors.get(self._fields["flavor"])
        nics = [{'net-id': self._fields["network"]}]
        keypair_name = self._generate_name("key")
        name = str(uuid.uuid1())
        instance = self._nova.servers.create(name=name, image=image,
                                             flavor=flavor,
                                             key_name=keypair_name, nics=nics)
        server = self.__server_online(instance)
        if self._fields.get("floatIPs", False):
            self._associate_floating_IP(server)
            server = self._nova.servers.get(instance.id)
        security_group_name = self._generate_name("group")
        server.add_security_group(security_group_name)
        self._update_service(server, service)
        service.save()
        self._wait_until_online(service)
        return True

    def _network_security_rules(self, **add):
        return [dict(ip_protocol=rule['protocol'],
                     from_port=rule['port'],
                     to_port=rule['port'])
                for rule in self._SEC_GROUP_RULES + ([add] if add else [])]

    def prepare_environment(self):
        # Fix for import backup
        if self.environment.key:
            return
        nova = self._nova  # pragma: no cover
        # creating keypair
        try:
            nova.keypairs.delete(self._generate_name("key"))
        except NotFound:
            pass
        keypair_name = self._generate_name("key")
        keypair = nova.keypairs.create(name=keypair_name)
        # creating security group
        security_group_name = self._generate_name("group")
        groups = nova.security_groups.findall(name=security_group_name)
        for group in groups:
            nova.security_groups.delete(group)  # pragma: no cover
        group = nova.security_groups.create(name=security_group_name,
                                            description="")
        for kwargs in self._network_security_rules():
            nova.security_group_rules.create(group.id, **kwargs)
        self.environment.key = keypair.private_key

    def _instantiate_nova(self):
        fields = self._fields
        creds = {'version': '2', 'username': fields['user'],
                 'password': fields['password'], 'auth_url': fields['url'],
                 'project_name': fields['project'], 'insecure': True}
        return novaclientapi.Client(**creds)

    def _generate_name(self, type_name):
        name = "cloudns{}_{}_{}_{}"
        return name.format(type_name, self._fields['user'],
                           self._fields['project'],
                           self.environment.name)

    @staticmethod
    def required_fields():
        fields = super(Integration, Integration).required_fields()
        fields['auth'] = {
                               "user":     {"type": "string"},
                               "password": {"type": "password"},
                               "url":      {"type": "string"},
                               "project":  {"type": "string"},
                          }
        fields["instance"] = {
                               "image":    {"type": "string"},
                               "flavor":   {"type": "string"},
                               "network":  {"type": "string"},
                               "floatIPs": {"type": "boolean"},
                              }
        fields['service_fields'] = {"auth_user": {'default': "centos",
                                                  'name': "Image user",
                                                  'placeholder': "Username "
                                                                 "for image"}}
        return fields

    def rm(self):
        self._remove_key()
        self._remove_security_group()

    @raise_context()
    def rm_host(self, host):
        self._nova.servers.get(host.nodeid).delete()
        for ip in self._nova.floating_ips.findall(ip=host.host):
            ip.delete()

    @raise_context()
    def _remove_security_group(self):
        name = self._generate_name("group")
        group = self._nova.security_groups.find(name=name)
        group.delete()

    @raise_context()
    def _remove_key(self):
        self._nova.keypairs.delete(self._generate_name("key"))
