import boto3

from ._base import BaseCloudIntegration
from ..utils import raise_context


class Integration(BaseCloudIntegration):
    def __init__(self, *args, **kwargs):
        super(Integration, self).__init__(*args, **kwargs)
        self.session = self._instantiate_boto_session()
        self._ec2 = self.session.resource('ec2')
        self._retrieve_net_ids()

    def _retrieve_net_ids(self):
        # save ids of resources for creating instances in future
        name = self._generate_resource_name()
        filter = [{'Name': 'tag:Name', 'Values': [name]}]
        for subnet in self._ec2.subnets.filter(Filters=filter):
            self.subnet_id = subnet.id
        for security_group in self._ec2.security_groups.filter(Filters=filter):
            self.security_group_id = security_group.id

    def _instantiate_boto_session(self):
        fields = self._fields
        creds = {'aws_access_key_id': fields['id'],
                 'aws_secret_access_key': fields['key'],
                 'region_name': fields['region']}
        return boto3.Session(**creds)

    def additionals(self):
        default_images = [('CentOS 7', 'ami-d2c924b2')]
        default_flavors = [('t2.micro', 't2.micro')]
        images = self.options.get("images", default_images)
        flavors = self.options.get("flavors", default_flavors)
        return dict(image=images, flavor=flavors)

    def _update_service(self, server, service):
        service.host = server.public_ip_address
        service.auth_user = self._OS_USERNAME
        service.auth_data = self.environment.key
        service.auth_type = self._OS_AUTH_TYPE
        service.nodeid = server.id
        service.environment = self.environment

    def prepare_service(self, service):
        if service.nodeid is not None:
            return False
        params = {'ImageId': self._fields["image"],
                  'InstanceType': self._fields["flavor"],
                  'NetworkInterfaces': [{
                      'DeviceIndex': 0,
                      'SubnetId': self.subnet_id,
                      'Groups': [self.security_group_id],
                      'AssociatePublicIpAddress': True,
                  }],
                  'KeyName': self._generate_resource_name(),
                  'MinCount': 1,
                  'MaxCount': 1}
        instance = self._ec2.create_instances(**params)[0]
        instance.wait_until_running()
        instance.load()
        self._update_service(instance, service)
        service.save()
        self._wait_until_online(service)
        return True

    def _generate_resource_name(self):
        name = "cloudns_integration_{}_{}"
        return name.format(self.environment.name, self._fields['id'])

    def _get_vpc(self):
        name = self._generate_resource_name()
        filter = [{'Name': 'tag:Name', 'Values': [name]}]
        for vpc in self._ec2.vpcs.filter(Filters=filter):
            return vpc

    @raise_context()
    def _delete_vpc(self):
        vpc = self._get_vpc()
        if vpc is not None:
            with raise_context():
                # strange bug of feature: some things you can't delete
                # from VPC, but if you don't try to delete it, VPC itself
                # remain unremovable
                for security_group in vpc.security_groups.all():
                    security_group.delete()
            for subnet in vpc.subnets.all():
                subnet.delete()
            for gateway in vpc.internet_gateways.all():
                gateway.detach_from_vpc(VpcId=vpc.id)
                gateway.delete()
            vpc.delete()

    @raise_context()
    def _delete_keypair(self):
        key_pair_name = self._generate_resource_name()
        for key_pair in self._ec2.key_pairs.all():
            if key_pair.name == key_pair_name:
                key_pair.delete()

    def _set_name(self, resource):
        tags = [{'Key': 'Name', 'Value': self._generate_resource_name()}]
        self._ec2.create_tags(Resources=[resource.id], Tags=tags)

    def _network_security_rules(self, **add):
        return [dict(IpProtocol=rule['protocol'],
                     FromPort=rule['port'],
                     ToPort=rule['port'],
                     CidrIp='0.0.0.0/0')
                for rule in self._SEC_GROUP_RULES + ([add] if add else [])]

    def prepare_environment(self):
        if self.environment.key:
            return
        # create vpc and gateway
        self._delete_vpc()
        vpc = self._ec2.create_vpc(CidrBlock='10.0.0.0/24')
        self._set_name(vpc)
        subnet = vpc.create_subnet(CidrBlock='10.0.0.0/24')
        self._set_name(subnet)
        gateway = self._ec2.create_internet_gateway()
        gateway.attach_to_vpc(VpcId=vpc.id)
        # route through this gateway
        for table in vpc.route_tables.all():
            table.create_route(GatewayId=gateway.id,
                               DestinationCidrBlock='0.0.0.0/0')
        # create a security group with appropriate rules
        name = self._generate_resource_name()
        security_group = vpc.create_security_group(GroupName=name,
                                                   Description=name)
        self._set_name(security_group)
        for rule in self._network_security_rules():
            security_group.authorize_ingress(**rule)
        # create keypair
        key_pair_name = self._generate_resource_name()
        self._delete_keypair()
        key_pair = self._ec2.create_key_pair(KeyName=key_pair_name)
        self.environment.key = key_pair.key_material
        # retrieve ids of subnet and security group
        self._retrieve_net_ids()

    @staticmethod
    def required_fields():
        fields = super(Integration, Integration).required_fields()
        fields['auth'] = {
                               "id":       {"type": "string"},
                               "key":      {"type": "password"},
                               "region":   {"type": "string"},
                          }
        fields["instance"] = {
                               "image":    {"type": "string"},
                               "flavor":   {"type": "string"}
                              }
        fields['service_fields'] = {}
        return fields

    def rm(self):
        self._delete_vpc()
        self._delete_keypair()

    @raise_context()
    def rm_host(self, host):
        instance = self._ec2.Instance(host.nodeid)
        instance.terminate()
        return instance
