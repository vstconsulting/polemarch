# pylint: disable=protected-access,no-member
from __future__ import unicode_literals
import logging
from functools import cached_property
from django.db.models import Q
from vstutils.models import BModel
from vstutils.utils import translate as _
from .base import models
from .base import ManyToManyFieldACL, ManyToManyFieldACLReverse
from .vars import AbstractModel, AbstractVarsQuerySet
from ...main import exceptions as ex
from ...main.utils import InventoryPluginHandlers
from ..validators import RegexValidator
from ...main.exceptions import NotApplicable


logger = logging.getLogger("polemarch")


# Helpful exceptions
class CyclicDependencyError(ex.PMException):
    _def_message = "A cyclic dependence was found. {}"

    def __init__(self, tp: str = ""):
        msg = self._def_message.format(tp)
        super().__init__(msg)


class HostQuerySet(AbstractVarsQuerySet):
    # pylint: disable=no-member
    pass


class Host(AbstractModel):
    objects = HostQuerySet.as_manager()
    type = models.CharField(max_length=5, default="HOST")

    types = ["HOST", "RANGE"]

    range_validator = RegexValidator(
        regex=r'^[a-zA-Z0-9\-\._\[\]\:]*$',
        message='Name must be Alphanumeric'
    )

    class Meta:
        default_related_name = "hosts"

    def __unicode__(self):
        return "{}".format(self.name)  # nocv


class Group(AbstractModel):
    """
    Manage inventory groups.

    retrieve:
        Return a group instance.

    list:
        Return all groups.

    create:
        Create a new group.

    destroy:
        Remove an existing group.

    partial_update:
        Update one or more fields on an existing group.

    update:
        Update a group.
    """

    CyclicDependencyError = CyclicDependencyError

    hosts = ManyToManyFieldACL(Host, related_query_name="groups")
    parents = ManyToManyFieldACLReverse('Group', blank=True, related_query_name="childrens")
    children = models.BooleanField(default=False)

    deep_parent_field = 'parents'
    deep_parent_allow_append = True

    class Meta:
        default_related_name = "groups"
        indexes = [
            models.Index(fields=["children"]),
            models.Index(fields=["children", "id"]),
        ]


class InventoryState(BModel):
    data = models.JSONField(default=dict)


class Inventory(AbstractModel):
    hosts = ManyToManyFieldACL(Host)
    groups = ManyToManyFieldACL(Group)
    plugin = models.CharField(max_length=32, default='POLEMARCH_DB', db_index=True)
    _inventory_state = models.OneToOneField(InventoryState, null=True, on_delete=models.SET_NULL)

    plugin_handlers = InventoryPluginHandlers('INVENTORY_PLUGINS', 'plugin not found')

    class Meta:
        default_related_name = "inventories"

    def __unicode__(self):
        return str(self.id)  # pragma: no cover

    @cached_property
    def plugin_object(self):
        return self.plugin_handlers.get_object(self.plugin)

    @property
    def state_managed(self):
        return self.plugin_object.state_managed

    @property
    def inventory_state(self):
        return self._get_inventory_state()

    def update_inventory_state(self, **kwargs):
        state = self._get_inventory_state()
        for attr, value in kwargs.items():
            setattr(state, attr, value)
        state.save(update_fields=tuple(kwargs.keys()))

    def _get_inventory_state(self):
        # pylint: disable=no-member
        if not self.plugin_object.state_managed:
            raise NotApplicable(_('Plugin {} does not support working with state.').format(self.plugin))
        return self._inventory_state

    @property
    def groups_list(self):
        '''
        :return:BQuerySet: Mixed queryset with all groups
        '''
        return self.groups\
            .get_children(with_current=True)\
            .distinct()\
            .prefetch_related("variables", "hosts")\
            .order_by("-children", "id")

    @property
    def hosts_list(self) -> HostQuerySet:
        '''
        :return:HostQuerySet: Mixed queryset with all hosts
        '''
        return self.hosts.all().order_by("name")

    @property
    def all_groups(self):
        return self.groups_list

    @property
    def all_hosts(self) -> HostQuerySet:
        return Host.objects.filter(
            Q(groups__in=self.groups_list) | Q(pk__in=self.hosts_list)
        ).distinct()

    @classmethod
    def import_inventory(cls, instance, data):
        return cls.plugin_handlers.backend(instance.plugin).import_inventory(instance, data)
