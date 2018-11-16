# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

import os
import logging
import traceback
import uuid
import six
from docutils.core import publish_parts as rst_gen
from markdown2 import Markdown
from django.conf import settings
from django.db.models import Q
from django.core.validators import ValidationError
from vstutils.utils import ModelHandlers, raise_context
from yaml import load
try:
    from yaml import CLoader as Loader
except ImportError:  # nocv
    from yaml import Loader

from . import hosts as hosts_models
from .vars import AbstractModel, AbstractVarsQuerySet, models
from ..exceptions import PMException
from .base import ManyToManyFieldACL, BQuerySet, BModel
from .hooks import Hook
from ..utils import AnsibleModules, AnsibleConfigParser, SubCacheInterface


logger = logging.getLogger("polemarch")


class ProjectQuerySet(AbstractVarsQuerySet):
    use_for_related_fields = True
    repo_handlers = ModelHandlers("REPO_BACKENDS", "'repo_type' variable needed!")
    task_handlers = ModelHandlers("TASKS_HANDLERS", "Unknown execution type!")


class Project(AbstractModel):
    # pylint: disable=too-many-public-methods
    PROJECTS_DIR = getattr(settings, "PROJECTS_DIR")
    objects       = ProjectQuerySet.as_manager()
    repo_handlers = objects._queryset_class.repo_handlers
    task_handlers = objects._queryset_class.task_handlers
    repository    = models.CharField(max_length=2*1024)
    status        = models.CharField(max_length=32, default="NEW")
    inventories   = ManyToManyFieldACL(hosts_models.Inventory, blank=True, null=True)
    hosts         = ManyToManyFieldACL(hosts_models.Host, blank=True, null=True)
    groups        = ManyToManyFieldACL(hosts_models.Group, blank=True, null=True)

    class Meta:
        default_related_name = "projects"

    class SyncError(PMException):
        pass

    class ReadMe(object):
        __slots__ = 'path', 'ext', 'content', 'file_name'

        def __init__(self, project):
            self.path = project.path
            self.ext = None
            self.content = self.set_readme()

        def _make_ext(self, file_name):
            self.ext = os.path.splitext(file_name)[1]
            self.file_name = self.path + '/' + file_name

        def _make_rst(self, file):
            return rst_gen(file.read(), writer_name='html')['html_body']

        def _make_md(self, file):
            return Markdown(extras=['tables', 'header-ids']).convert(file.read())

        def set_readme(self):
            if not os.path.exists(self.path):
                return
            for file in os.listdir(self.path):
                if file.lower() == 'readme.md' and self.ext is None:
                    self._make_ext(file)
                if file.lower() == 'readme.rst':
                    self._make_ext(file)
                    break
            if self.ext is not None:
                with open(self.file_name) as fd:
                    return getattr(self, '_make_{}'.format(str(self.ext)[1:]), str)(fd)

    HIDDEN_VARS = [
        'repo_password',
        'repo_key',
    ]

    BOOLEAN_VARS = [
        'repo_sync_on_run'
    ]

    EXTRA_OPTIONS = {
        'initiator': 0,
        'initiator_type': 'project',
        'executor': None,
        'save_result': True,
        'template_option': None
    }

    PM_YAML_FORMATS = {
        'unknown': str,
        'string': str,
        'integer': int,
        'float': float,
        'boolean': bool,
    }

    def __unicode__(self):
        return str(self.name)  # pragma: no cover

    def get_hook_data(self, when):
        data = super(Project, self).get_hook_data(when)
        data['type'] = self.type
        data['repository'] = self.repository
        return data

    @property
    def path(self):
        project_dir = (
            self.PROJECTS_DIR
            if not self.hidden
            else getattr(settings, 'SELFCARE', self.PROJECTS_DIR)
        )
        return "{dir}/{id}".format(id=self.id, dir=project_dir)

    @property
    def repo_class(self):
        repo_type = self.vars.get("repo_type", "MANUAL")
        return self.repo_handlers(repo_type, self)

    @property
    def type(self):
        try:
            return self.variables.get(key="repo_type").value
        except self.variables.model.DoesNotExist:  # nocv
            return 'MANUAL'

    @property
    def config(self):
        return self.get_ansible_config_parser().get_data()

    def get_ansible_config_parser(self):
        if not hasattr(self, 'config_parser'):
            self.config_parser = AnsibleConfigParser(self.path)
        return self.config_parser

    def get_yaml_subcache(self, suffix=''):
        return SubCacheInterface(''.join(['project', str(self.id), suffix]))

    def __parse_yaml_view(self, data):
        valid_formats = self.PM_YAML_FORMATS
        parsed_data = dict(fields=dict(), playbooks=dict())
        # Parse fields
        for fieldname, field_data in data['fields'].items():
            parsed_data['fields'][fieldname] = dict(
                title=field_data.get('title', fieldname.upper()),
                help=field_data.get('help', ''),
            )
            field_format = field_data.get('format', 'string')
            if field_format not in valid_formats.keys():
                field_format = 'unknown'
            parsed_data['fields'][fieldname]['format'] = field_format
            default_value = valid_formats[field_format](field_data.get('default', ''))
            parsed_data['fields'][fieldname]['default'] = default_value
            enum = field_data.get('enum', None)
            if enum and isinstance(enum, (list, tuple)):
                enum = list(map(valid_formats[field_format], enum))
                parsed_data['fields'][fieldname]['enum'] = enum
        # Parse playbooks for execution
        for playbook, pb_data in data['playbooks'].items():
            parsed_data['playbooks'][playbook] = dict(
                title=pb_data.get('title', playbook.replace('.yml', '')),
                help=pb_data.get('help', ''),
            )
        return parsed_data

    def get_yaml(self):
        yaml_path = '/'.join([self.path, '.polemarch.yaml']).replace('//', '/')
        if not (os.path.exists(yaml_path) and os.path.isfile(yaml_path)):
            return
        cache = self.get_yaml_subcache()
        cache_data = cache.get() or None
        if cache_data:
            return cache_data
        try:
            cache.clear()
            with open(yaml_path, 'r') as fd:
                data = load(fd.read(), Loader=Loader)
            cache.set(data)
            return data
        except:  # nocv
            logger.debug(traceback.format_exc())
            return cache_data

    @property
    @raise_context()
    def execute_view_data(self):
        cached_view_data = self.get_yaml_subcache('view').get()
        if cached_view_data:
            return cached_view_data
        yaml_data = self.get_yaml() or {}
        view_data = yaml_data.get('view', None)
        if view_data:
            view_data = self.__parse_yaml_view(view_data)
        self.get_yaml_subcache('view').set(view_data)
        return view_data

    def check_path(self, inventory):
        if not isinstance(inventory, (six.string_types, six.text_type)):
            return
        path = "{}/{}".format(self.path, inventory)
        path = os.path.abspath(os.path.expanduser(path))
        if self.path not in path:  # nocv
            raise ValidationError(dict(inventory="Inventory should be in project dir."))

    def _prepare_kw(self, kind, mod_name, inventory, **extra):
        self.check_path(inventory)
        if not mod_name:  # nocv
            raise PMException("Empty playbook/module name.")
        history, extra = self.history.all().start(
            self, kind, mod_name, inventory, **extra
        )
        kwargs = dict(
            target=mod_name, inventory=inventory,
            history=history, project=self
        )
        kwargs.update(extra)
        return kwargs

    def hook(self, when, msg):
        Hook.objects.all().execute(when, msg)

    def sync_on_execution_handler(self, history):
        if not self.vars.get('repo_sync_on_run', False):
            return
        try:
            self.sync()
        except Exception as exc:  # nocv
            raise self.SyncError("ERROR on Sync operation: " + str(exc))

    def execute(self, kind, *args, **extra):
        kind = kind.upper()
        task_class = self.task_handlers.backend(kind)
        sync = extra.pop("sync", False)

        kwargs = self._prepare_kw(kind, *args, **extra)
        history = kwargs['history']
        if sync:
            task_class(**kwargs)
        else:
            task_class.delay(**kwargs)
        return history.id if history is not None else history

    def set_status(self, status):
        self.status = status
        self.save()

    def start_repo_task(self, operation='sync'):
        if self.status == 'NEW':
            operation = 'clone'
        self.set_status("WAIT_SYNC")
        return self.task_handlers.backend("REPO").delay(self, operation)

    def sync(self, *args, **kwargs):
        return self.repo_class.get()

    def clone(self, *args, **kwargs):
        return self.repo_class.clone()

    @property
    def revision(self):
        return self.repo_class.revision()

    @property
    def branch(self):
        return self.repo_class.get_branch_name()

    @property
    def module(self):
        return Module.objects.filter(Q(project=self) | Q(project=None))

    def __get_readme(self):
        if not hasattr(self, 'readme'):
            self.readme = self.ReadMe(self)
        return self.readme

    @property
    def readme_content(self):
        return self.__get_readme().content

    @property
    def readme_ext(self):
        return self.__get_readme().ext  # nocv


class TaskFilterQuerySet(BQuerySet):
    use_for_related_fields = True


class Task(BModel):
    objects     = TaskFilterQuerySet.as_manager()
    project     = models.ForeignKey(Project, on_delete=models.CASCADE,
                                    related_query_name="playbook")
    name        = models.CharField(max_length=256, default=uuid.uuid1)
    playbook    = models.CharField(max_length=256)

    class Meta:
        default_related_name = "playbook"

    def __unicode__(self):
        return str(self.name)  # nocv


class ModulesQuerySet(BQuerySet):
    use_for_related_fields = True


class Module(BModel):
    objects = ModulesQuerySet.as_manager()
    path        = models.CharField(max_length=1024)
    _data       = models.CharField(max_length=4096, default='{}')
    project     = models.ForeignKey(Project,
                                    on_delete=models.CASCADE,
                                    related_query_name="modules",
                                    null=True, blank=True, default=None)

    class Meta:
        default_related_name = "modules"

    def __unicode__(self):
        return str(self.name)  # nocv

    @property
    def name(self):
        return self.path.split('.')[-1]

    def _load_data(self, data):
        return load(data, Loader=Loader) if data and data != '{}' else {}

    def _get_module_data_from_cli(self):
        path = None
        if self.project:
            path = self.project.config.get('DEFAULT_MODULE_PATH', [])
            path = list(filter(lambda p: self.project.path in p, path))
        modules = AnsibleModules(detailed=True, paths=path)
        module_list = modules.get(self.path)
        module = module_list[0] if module_list else None
        if module:
            doc_data = module['doc_data']
            data = self._load_data(doc_data)
            self._data = doc_data
            self.save()
            return data

    @property
    def data(self):
        data = self._load_data(self._data) if self._data != '{}' else {}
        if not data:
            data = self._get_module_data_from_cli()
        return data
