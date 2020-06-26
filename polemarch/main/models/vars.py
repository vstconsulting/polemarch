# pylint: disable=protected-access,no-member
from __future__ import unicode_literals
from typing import Any, NoReturn, Tuple, Dict, List, Text, Union
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


def update_boolean(items: Dict[str, Any], item: Any):
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

    def sort_by_key(self) -> BQuerySet:
        args, kwargs = [], dict()
        keys = self.model.variables_keys
        index = keys.index
        for key in keys:
            args.append(When(key=key, then=Value(index(key))))
        args.append(When(key__startswith="ansible_", then=Value(99)))
        kwargs['default'] = 100
        kwargs['output_field'] = models.IntegerField()
        return self.annotate(sort_idx=Case(*args, **kwargs)).order_by("sort_idx", "key")

    def cleared(self) -> BQuerySet:
        return super(VariablesQuerySet, self).cleared().sort_by_key()


class Variable(BModel):
    objects = VariablesQuerySet.as_manager()
    content_type   = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id      = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    key            = models.CharField(max_length=512)
    value          = models.TextField(null=True)

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

    def var_filter(self, **kwargs) -> BQuerySet:
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
        'ansible_become_password',
        'ansible_password'
    ]

    BOOLEAN_VARS = []

    def __unicode__(self):  # pragma: no cover
        _vars = " ".join(["{}={}".format(k, v)
                          for k, v in self.vars.items()])
        return "{} {}".format(self.name, _vars)

    def get_hook_data(self, when: str) -> OrderedDict:
        # pylint: disable=unused-argument
        hook_data = OrderedDict()
        hook_data['id'] = self.id
        hook_data['name'] = self.name
        return hook_data

    @transaction.atomic()
    def set_vars(self, variables) -> NoReturn:
        encr = "[~~ENCRYPTED~~]"
        encrypted_vars = {k: v for k, v in variables.items() if v == encr}
        other_vars = {k: v for k, v in variables.items() if v != encr}
        self.variables.cleared().exclude(key__in=list(encrypted_vars.keys()) + list(other_vars.keys())).delete()
        for key, value in other_vars.items():
            self.variables.create(key=key, value=value)

    def get_vars(self) -> Union[OrderedDict, Dict]:
        qs = self.variables.cleared().sort_by_key().values_list('key', 'value')
        return reduce(update_boolean, self.BOOLEAN_VARS, OrderedDict(qs))

    def get_vars_prefixed(self, prefix: Text):
        vars_by_prefix_dict = dict()
        search_prefix = prefix + '_'
        search_prefix_len = len(search_prefix)
        for var_obj in self.variables.filter(key__startswith=prefix):
            vars_by_prefix_dict[var_obj.key[search_prefix_len:]] = var_obj.value
        return vars_by_prefix_dict

    def get_generated_vars(self, tmp_dir='/tmp') -> Tuple[Dict, List]:
        files = []
        obj_vars = self.get_vars()
        if "ansible_ssh_private_key_file" in obj_vars:
            tmp = tmp_file(dir=tmp_dir)
            tmp.write(obj_vars["ansible_ssh_private_key_file"])
            obj_vars["ansible_ssh_private_key_file"] = tmp.name
            files.append(tmp)
        return dict(obj_vars), files

    @property
    def vars(self):
        return self.get_vars()

    @vars.setter
    def vars(self, value):
        self.set_vars(value)

    @property
    def have_vars(self) -> bool:
        return bool(len(self.vars))  # nocv
