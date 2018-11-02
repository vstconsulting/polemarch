# pylint: disable=protected-access,no-member
from __future__ import unicode_literals

import logging
import uuid

from functools import reduce
from collections import OrderedDict
from django.db import transaction
from django.db.models import Case, When, Value
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from vstutils.utils import tmp_file
from .base import ACLModel, BQuerySet, BModel, models


logger = logging.getLogger("polemarch")


def update_boolean(items, item):
    value = items.get(item, None)
    if value is None:
        pass
    if value == 'True':
        items[item] = True
    elif value == 'False':
        items[item] = False
    return items


class VariablesQuerySet(BQuerySet):
    use_for_related_fields = True

    def sort_by_key(self):
        args, kwargs = [], dict()
        keys = self.model.variables_keys
        index = keys.index
        for key in keys:
            args.append(When(key=key, then=Value(index(key))))
        args.append(When(key__startswith="ansible_", then=Value(99)))
        kwargs['default'] = 100
        kwargs['output_field'] = models.IntegerField()
        return self.annotate(sort_idx=Case(*args, **kwargs)).order_by("sort_idx", "key")

    def cleared(self):
        return super(VariablesQuerySet, self).cleared().sort_by_key()


class Variable(BModel):
    objects = VariablesQuerySet.as_manager()
    content_type   = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id      = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    key            = models.CharField(max_length=128)
    value          = models.CharField(max_length=2*1024, null=True)

    variables_keys = [
        "ansible_host",
        'ansible_port',
        'ansible_user',
        'ansible_connection',

        'ansible_ssh_pass',
        'ansible_ssh_private_key_file',
        'ansible_ssh_common_args',
        'ansible_sftp_extra_args',
        'ansible_scp_extra_args',
        'ansible_ssh_extra_args',
        'ansible_ssh_executable',
        'ansible_ssh_pipelining',

        'ansible_become',
        'ansible_become_method',
        'ansible_become_user',
        'ansible_become_pass',
        'ansible_become_exe',
        'ansible_become_flags',

        'ansible_shell_type',
        'ansible_python_interpreter',
        'ansible_ruby_interpreter',
        'ansible_perl_interpreter',
        'ansible_shell_executable',
    ]

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

    @transaction.atomic()
    def set_vars(self, variables):
        encr = "[~~ENCRYPTED~~]"
        encrypted_vars = {k: v for k, v in variables.items() if v == encr}
        other_vars = {k: v for k, v in variables.items() if v != encr}
        self.variables.exclude(key__in=encrypted_vars.keys()).delete()
        for key, value in other_vars.items():
            self.variables.create(key=key, value=value)

    def vars_string(self, variables, separator=" "):
        return separator.join(
            map(lambda kv: "{}={}".format(kv[0], kv[1]), variables.items())
        )

    def get_vars(self):
        qs = self.variables.all().sort_by_key().values_list('key', 'value')
        return reduce(update_boolean, self.BOOLEAN_VARS, OrderedDict(qs))

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

    @vars.setter
    def vars(self, value):
        self.set_vars(value)

    @property
    def have_vars(self):
        return bool(len(self.vars))  # nocv
