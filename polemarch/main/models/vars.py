# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import json
import logging
import uuid

from collections import OrderedDict
from six import string_types, text_type
from django.db import transaction
from django.db.models import Case, When, Value
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from vstutils.utils import tmp_file
from .base import ACLModel, BQuerySet, BModel, models


logger = logging.getLogger("polemarch")


class VariablesQuerySet(BQuerySet):
    use_for_related_fields = True

    def sort_by_key(self):
        return self.annotate(
            name_sorter=Case(
                When(key="ansible_host", then=Value(0)),
                When(key="ansible_port", then=Value(1)),
                When(key="ansible_user", then=Value(2)),
                When(key="ansible_connection", then=Value(3)),
                When(key="ansible_ssh_pass", then=Value(4)),
                When(key="ansible_ssh_private_key_file", then=Value(5)),
                When(key__startswith="ansible_", then=Value(6)),
                default=100,
                output_field=models.IntegerField(),
            ),
        ).order_by("name_sorter", "key")

    def cleared(self):
        return super(VariablesQuerySet, self).cleared().sort_by_key()


class Variable(BModel):
    objects = VariablesQuerySet.as_manager()
    content_type   = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id      = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    key            = models.CharField(max_length=128)
    value          = models.CharField(max_length=2*1024, null=True)

    def __unicode__(self):  # pragma: no cover
        return "{}={}".format(self.key, self.value)


class AbstractVarsQuerySet(BQuerySet):
    use_for_related_fields = True

    def var_filter(self, **kwargs):
        qs = self
        for key, value in kwargs.items():
            qs = qs.filter(variables__key=key, variables__value=value)
        return qs


class AbstractModel(ACLModel):
    objects     = AbstractVarsQuerySet.as_manager()
    name        = models.CharField(max_length=512, default=uuid.uuid1)
    variables   = GenericRelation(Variable, related_query_name="variables",
                                  object_id_field="object_id")

    class Meta:
        abstract = True

    HIDDEN_VARS = [
        'ansible_ssh_pass',
        'ansible_ssh_private_key_file',
        'ansible_become_pass',
    ]

    BOOLEAN_VARS = []

    def __unicode__(self):  # pragma: no cover
        _vars = " ".join(["{}={}".format(k, v)
                          for k, v in self.vars.items()])
        return "{} {}".format(self.name, _vars)

    def get_hook_data(self, when):
        # pylint: disable=unused-argument
        return OrderedDict(id=self.id, name=self.name)

    def vars_string(self, variables, separator=" "):
        return separator.join([
            "{}={}".format(key, value) for key, value in variables.items()
        ])

    def get_vars(self):
        qs = self.variables.all().sort_by_key().values_list('key', 'value')
        vars_dict = OrderedDict(qs)
        for bool_var in self.BOOLEAN_VARS:
            value = vars_dict.get(bool_var, None)
            if value is None:
                continue
            vars_dict[bool_var] = True if value == "True" else False
        return vars_dict

    def get_generated_vars(self):
        tmp = None
        obj_vars = self.get_vars()
        if "ansible_ssh_private_key_file" in obj_vars:
            tmp = tmp_file()
            tmp.write(obj_vars["ansible_ssh_private_key_file"])
            obj_vars["ansible_ssh_private_key_file"] = tmp.name
        return obj_vars, tmp

    @property
    def vars(self):
        return self.get_vars()

    @property
    def have_vars(self):
        return bool(len(self.vars))  # nocv
