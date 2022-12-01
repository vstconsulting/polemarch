# pylint: disable=protected-access,no-member,unused-argument
from __future__ import unicode_literals

from typing import Any, Dict, List, Tuple, Iterable, TypeVar, Text
import os
import logging
import traceback
import uuid
import requests
from docutils.core import publish_parts as rst_gen
from markdown2 import Markdown
from django.conf import settings
from django.db.models import Q
from django.core.cache import caches
from vstutils.utils import ModelHandlers, raise_context_decorator_with_default, classproperty
# pylint: disable=no-name-in-module
from vstutils import custom_model
from yaml import load

try:
    from yaml import CLoader as Loader
except ImportError:  # nocv
    from yaml import Loader

from . import hosts as hosts_models
from ..validators import path_validator
from .vars import AbstractModel, AbstractVarsQuerySet, models
from ..exceptions import PMException
from .base import ManyToManyFieldACL, BQuerySet, BModel
from .hooks import Hook
from ..utils import AnsibleModules, AnsibleConfigParser, SubCacheInterface


logger = logging.getLogger("polemarch")
HISTORY_ID = TypeVar('HISTORY_ID', int, None)  # pylint: disable=C0103


def list_to_choices(items_list: Iterable) -> List[Tuple[str, str]]:
    def handler(item: str) -> Tuple[str, str]:
        return item, item

    return list(map(handler, items_list))


class ReadMe:
    __slots__ = ('path', 'ext', 'content', 'file_name')

    def __init__(self, project):
        self.path = project.path
        self.ext = None
        self.content = self.set_readme()

    def _make_ext(self, file_name) -> None:
        self.ext = os.path.splitext(file_name)[1]
        self.file_name = self.path + '/' + file_name

    def _read(self, file) -> str:
        return file.read()

    def _make_rst(self, file):
        return rst_gen(self._read(file), writer_name='html')['html_body']

    def _make_md(self, file):
        return Markdown(extras=['tables', 'header-ids']).convert(self._read(file))

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
            with open(self.file_name, encoding='utf-8') as fd:
                return getattr(self, '_make_{}'.format(str(self.ext)[1:]), str)(fd)


class ProjectQuerySet(AbstractVarsQuerySet):
    use_for_related_fields = True
    repo_handlers = ModelHandlers("REPO_BACKENDS", "'repo_type' variable needed!")
    task_handlers = ModelHandlers("TASKS_HANDLERS", "Unknown execution type!")


class Project(AbstractModel):
    # pylint: disable=too-many-public-methods
    objects = ProjectQuerySet.as_manager()
    repo_handlers = objects._queryset_class.repo_handlers
    task_handlers = objects._queryset_class.task_handlers

    repository = models.CharField(max_length=2 * 1024)
    status = models.CharField(max_length=32, default="NEW")
    inventories = ManyToManyFieldACL(hosts_models.Inventory, blank=True)
    hosts = ManyToManyFieldACL(hosts_models.Host, blank=True)
    groups = ManyToManyFieldACL(hosts_models.Group, blank=True)

    class Meta:
        default_related_name = "projects"

    class SyncError(PMException):
        """
        Exception class for sync operations.
        """

    class ReadMe(ReadMe):
        """
        Object for getting readme with different extention.
        """

    BOOLEAN_VARS = [
        'repo_sync_on_run'
    ]

    PM_YAML_FORMATS = {
        'unknown': str,
        'string': str,
        'integer': int,
        'float': float,
        'boolean': bool,
    }

    BUSY_STATUSES = [
        'WAIT_SYNC',
        'SYNC',
    ]

    STATUSES = [
        'NEW',
        'ERROR',
        'OK',
    ] + BUSY_STATUSES

    @classproperty
    def PROJECTS_DIR(cls) -> Text:
        # pylint: disable=invalid-name
        return getattr(settings, 'PROJECTS_DIR')

    def __unicode__(self):
        return str(self.name)  # pragma: no cover

    def get_hook_data(self, when: Text) -> Dict:
        data = super().get_hook_data(when)
        data['type'] = self.type
        data['repository'] = self.repository
        return data

    @property
    def path(self) -> Text:
        project_dir = (
            self.PROJECTS_DIR
            if not self.hidden
            else getattr(settings, 'SELFCARE', self.PROJECTS_DIR)
        )
        return "{dir}/{id}".format(id=self.id, dir=project_dir)

    @property
    def repo_class(self):
        return self.repo_handlers(self.type, self)

    @property
    def env_vars(self) -> Dict[Text, Any]:
        return self.get_vars_prefixed('env')

    @property
    def type(self) -> Text:
        return self.vars.get('repo_type', 'MANUAL')

    @property
    def repo_sync_timeout(self):
        return int(self.vars.get('repo_sync_on_run_timeout', settings.PROJECT_REPOSYNC_WAIT_SECONDS))

    @property
    def repo_sync_on_run(self) -> bool:
        return self.vars.get('repo_sync_on_run', False)

    @property
    def config(self) -> Dict[Text, Any]:
        return self.get_ansible_config_parser().get_data()

    def get_ansible_config_parser(self) -> AnsibleConfigParser:
        if not hasattr(self, 'config_parser'):
            self.config_parser = AnsibleConfigParser(self.path)
        return self.config_parser

    def get_yaml_subcache(self, suffix: Text = '') -> SubCacheInterface:
        return SubCacheInterface(''.join(['project', str(self.id), suffix]))

    def __parse_yaml_view(self, data: Dict[Text, Any]) -> Dict[Text, Dict]:
        valid_formats = self.PM_YAML_FORMATS
        parsed_data = {'fields': {}, 'playbooks': {}}
        # Parse fields
        for fieldname, field_data in data['fields'].items():
            parsed_data['fields'][fieldname] = dict(
                title=field_data.get('title', fieldname.upper()),
                help=field_data.get('help', ''),
            )
            field_format = field_data.get('format', 'string')
            if field_format not in valid_formats.keys():
                field_format = 'unknown'
            if field_format != 'unknown':
                parsed_data['fields'][fieldname]['type'] = field_format
            parsed_data['fields'][fieldname]['format'] = field_format
            default_value = valid_formats[field_format](field_data.get('default', ''))
            parsed_data['fields'][fieldname]['default'] = default_value
            enum = field_data.get('enum', None)
            if enum and isinstance(enum, (list, tuple)):
                enum = list(map(valid_formats[field_format], enum))
                parsed_data['fields'][fieldname]['enum'] = enum
                del parsed_data['fields'][fieldname]['format']
        # Parse playbooks for execution
        for playbook, pb_data in data['playbooks'].items():
            parsed_data['playbooks'][playbook] = dict(
                title=pb_data.get('title', playbook.replace('.yml', '')),
                help=pb_data.get('help', ''),
            )
        return parsed_data

    @property
    def yaml_path(self) -> Text:
        return '/'.join([self.path, '.polemarch.yaml']).replace('//', '/')

    @property
    def yaml_path_exists(self) -> bool:
        return os.path.exists(self.yaml_path) and os.path.isfile(self.yaml_path)

    def get_yaml(self) -> Dict[Text, Any]:
        yaml_path = self.yaml_path
        if not self.yaml_path_exists:
            return {}
        cache = self.get_yaml_subcache()
        cache_data = cache.get() or None
        if cache_data:
            return cache_data
        try:
            cache.clear()
            with open(yaml_path, 'r', encoding='utf-8') as fd:
                data = load(fd.read(), Loader=Loader)
            cache.set(data)
            return data
        except:  # nocv
            logger.debug(traceback.format_exc())
            return cache_data

    @property
    @raise_context_decorator_with_default()
    def execute_view_data(self) -> Dict[str, Dict[str, Dict]]:
        cached_view_data = self.get_yaml_subcache('view').get()
        if cached_view_data and self.yaml_path_exists:
            return cached_view_data
        yaml_data = self.get_yaml() or {}
        view_data = yaml_data.get('view', None)
        if view_data:
            view_data = self.__parse_yaml_view(view_data)
        self.get_yaml_subcache('view').set(view_data)
        return view_data

    def check_path(self, inventory) -> None:
        if not isinstance(inventory, str):  # nocv
            return
        path_validator(inventory)

    def hook(self, when, msg) -> None:
        Hook.objects.all().execute(when, msg)

    def execute(self, plugin: str, execute_args, **kwargs) -> HISTORY_ID:
        from ..executions import PLUGIN_HANDLERS  # pylint: disable=import-outside-toplevel

        return PLUGIN_HANDLERS.execute(
            plugin,
            self,
            execute_args=execute_args,
            initiator=self.id,
            initiator_type='project',
            **kwargs
        )

    def set_status(self, status) -> None:
        self.status = status
        self.save()

    def start_repo_task(self, operation='sync'):
        if self.status == 'NEW':
            operation = 'clone'
        self.set_status("WAIT_SYNC")
        return self.task_handlers.backend("REPO").delay(self, operation)

    def sync(self, *args, **kwargs) -> Any:
        return self.repo_class.get()

    def clone(self, *args, **kwargs) -> Any:
        return self.repo_class.clone()

    @property
    @raise_context_decorator_with_default(default='NotReady')
    def revision(self) -> str:
        return self.repo_class.revision()

    @property
    @raise_context_decorator_with_default()
    def branch(self) -> str:
        return self.repo_class.get_branch_name()

    @property
    @raise_context_decorator_with_default()
    def project_branch(self) -> str:
        required_branch = getattr(self.variables.filter(key='repo_branch').first(), 'value', None)
        current_branch = self.branch
        if required_branch is None or required_branch == current_branch:
            return current_branch
        return f'{current_branch} => {required_branch}'

    @property
    def module(self) -> BQuerySet:
        return Module.objects.filter(Q(project=self) | Q(project=None))

    @raise_context_decorator_with_default()
    def __get_readme(self) -> ReadMe:
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
    objects = TaskFilterQuerySet.as_manager()
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_query_name="playbook")
    name = models.CharField(max_length=251, default=uuid.uuid1)
    playbook = models.CharField(max_length=256)

    class Meta:
        default_related_name = "playbook"

    def __unicode__(self):
        return str(self.name)  # nocv


class ModulesQuerySet(BQuerySet):
    use_for_related_fields = True


class Module(BModel):
    objects = ModulesQuerySet.as_manager()
    path = models.CharField(max_length=1024)
    _data = models.CharField(max_length=4096, default='{}')
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_query_name="modules",
        null=True, blank=True, default=None,
    )

    class Meta:
        default_related_name = "modules"

    def __unicode__(self):
        return str(self.name)  # nocv

    @property
    def name(self) -> str:
        return self.path.split('.')[-1]

    def _load_data(self, data) -> Dict:
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


class ProjectTemplate(custom_model.FileModel):
    _template_types = (t for t in Project.repo_handlers.keys() if t != 'MANUAL')
    _auth_types = ['NONE', 'KEY', 'PASSWORD']

    id = models.PositiveIntegerField(primary_key=True)
    name = custom_model.CharField(max_length=1024)
    description = custom_model.TextField()
    repository = custom_model.CharField(max_length=2 * 1024)
    type = custom_model.CharField(max_length=256, choices=list_to_choices(_template_types), default='GIT')
    repo_auth = custom_model.CharField(max_length=256, choices=list_to_choices(_auth_types), default='NONE')
    auth_data = custom_model.TextField(blank=True, null=True, default=None)

    class Meta:
        managed = False

    @classmethod
    def load_file_data(cls) -> List[Dict[str, Any]]:
        cache = caches["default"]
        cache_key = 'community_projects_data'
        data = cache.get(cache_key) or []
        if not data:
            response = requests.get(getattr(settings, 'COMMUNITY_REPOS_URL', ''))
            if response.status_code == 200:
                data = response.text
                data = cache.get_or_set(cache_key, data)
        return data

    def __unicode__(self):  # nocv
        return str('{} [{}]'.format(self.name, self.repository))
