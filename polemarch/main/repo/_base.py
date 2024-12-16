# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals

import io
import logging
import os
import pathlib
import shutil
import traceback
from itertools import chain
from typing import Any, Callable, Dict, Iterable, List, Text, Tuple, TypeVar, Union

import requests
from django.conf import settings
from django.db import transaction
from django.utils.module_loading import import_string
from vstutils.utils import raise_context

from ...main.constants import TEMPLATE_KIND_PLUGIN_MAP
from ...main.exceptions import MaxContentLengthExceeded, SyncOnRunTimeout
from ..models.projects import Project
from ..utils import AnsibleModules

logger = logging.getLogger("polemarch")
FILENAME = TypeVar('FILENAME', Text, str)


class _Base:
    __slots__ = 'options', 'proj', 'path'

    regex = r"(^[\w\d\.\-_]{1,})\.yml"
    handler_class = import_string(settings.PROJECT_CI_HANDLER_CLASS)
    attempts = 2

    def __init__(self, project: Project, **options):
        self.options = options
        self.proj = project
        self.path = self.proj.path

    def _set_status(self, status) -> None:
        self.proj.set_status(status)

    @raise_context()
    def _load_yaml(self) -> Dict[Text, Any]:
        '''
        Loading `.polemarch.yaml` data.

        :return: Data from `.polemarch.yaml` file.
        :type ret: dict
        '''
        self.proj.get_yaml_subcache().clear()
        return self.proj.get_yaml()

    def _path_exists(self, path: Text) -> bool:
        return os.path.exists(path)

    def _dir_exists(self, path_dir: Text) -> bool:
        return self._path_exists(path_dir) and os.path.isdir(path_dir)

    def message(self, message: Any, level: Text = 'debug') -> None:
        getattr(logger, level.lower(), logger.debug)(
            'Syncing project [%s] - %s', self.proj.id, message
        )

    def pm_handle_sync_on_run(self, feature: Text, data: bool) -> None:
        """
        Set sync_on_run if it is setted in `.polemarch.yaml`.

        :param feature: feature name
        :param data: all data from file
        """
        value = str(data[feature])
        _, created = self.proj.variables.update_or_create(
            key='repo_sync_on_run',
            defaults={'value': value},
        )
        self.message(
            f"{'Set' if created else 'Update'} repo_sync_on_run to {value}"
        )

    def _format_template_data(self, template_data):
        if 'plugin' in template_data:
            template = template_data
            options = template.pop('options', {})
            return template, options

        # handle deprecated format for old templates
        self.message('Template is written in deprecated format.', level='warning')

        template = {
            'plugin': TEMPLATE_KIND_PLUGIN_MAP.get(template_data['kind'], template_data['kind']),
            'notes': template_data['notes'],
        }
        data = template_data['data']
        default_option = {
            'default': {
                'arguments': {
                    **data.pop('vars', {}),
                    **data,
                }
            }
        }
        other_options = {
            name: {'arguments': data}
            for name, data in template_data['options'].items()
        }
        return template, {**default_option, **other_options}

    @raise_context()
    def __create_template(self, template_name: Text, template_data: Dict):
        '''
        Creates one template with options from `.polemarch.yaml`.

        :param template_name: Template name
        :param template_data: Template data
        :return: created Template object
        '''
        self.message(f'Loading template[{template_name}] into the project.')
        formatted_template, formatted_options = self._format_template_data(template_data)

        template, created = self.proj.execution_templates.update_or_create(
            name=template_name,
            defaults=formatted_template,
        )
        self.message(f'Template[{template.name}] {"created" if created else "updated"} in the project.')

        options = template.options.bulk_create([
            template.options.model(name=name, template=template, **data)
            for name, data in formatted_options.items()
        ])
        self.message(f'{len(options)} option(s) created in template.')

    def pm_handle_templates(self, feature: Text, data: Dict) -> None:
        '''
        Get and create (if is not existed) templates from `.polemarch.yaml`.

        :param feature: feature name
        :param data: all data from file
        '''
        rewrite = data.get('templates_rewrite', False)
        data = data[feature]
        qs_existed = self.proj.execution_templates.filter(name__in=data.keys())
        existed = qs_existed.values_list('name', flat=True)
        for template_name, template_data in data.items():
            if not rewrite and template_name in existed:
                self.message(f'Template[{template_name}] already in project.')
                continue
            self.__create_template(template_name, template_data)

    def pm_handle_view(self, feature: Text, data: Dict) -> None:
        '''
        Clear view data from cache

        :param feature: feature name
        :param data: all data from file
        '''
        # pylint: disable=unused-argument
        self.proj.get_yaml_subcache().clear()
        self.proj.get_yaml_subcache('view').clear()
        self.message(self.proj.execute_view_data, 'debug')

    def pm_handle_unknown(self, feature: Text, data: Any) -> None:  # nocv
        '''
        Logging unknowing data from `.polemarch.yaml`.
        '''
        self.message(f'{feature} - this feature is not realised yet.', 'info')
        logger.debug(str(data))

    def _handle_yaml(self, data: Union[Dict, None]) -> None:
        """
        Loads and returns data from `.polemarch.yaml` file
        """
        for feature in data.keys():
            if feature in ['templates_rewrite']:
                continue
            self.message(f'Set settings from ".polemarch.yaml" - {feature}.')
            feature_name = f'pm_handle_{feature}'
            getattr(self, feature_name, self.pm_handle_unknown)(feature, data)

    def _set_tasks_list(self, playbooks_names: Iterable[pathlib.Path]) -> None:
        """
        Updates playbooks in project.
        """
        # pylint: disable=invalid-name
        project = self.proj
        project.ansible_playbooks.all().delete()
        PlaybookModel = self.proj.ansible_playbooks.model
        hidden = project.hidden
        split = str.split
        playbook_objects = (
            PlaybookModel(
                name=split(str(p), ".yml")[0], playbook=p,
                hidden=hidden, project=project
            ) for p in playbooks_names
        )
        PlaybookModel.objects.bulk_create(playbook_objects)

    def __get_project_modules(self, module_path: Iterable[Text]) -> List[Union[Text, Dict]]:
        valid_paths = tuple(filter(self._dir_exists, module_path))
        if not valid_paths:
            return []
        modules = AnsibleModules(detailed=False, paths=valid_paths)
        modules.clear_cache()
        modules_list = modules.all()
        modules_list.sort()
        return modules_list

    @raise_context()
    def _set_project_modules(self) -> None:
        '''
        Update project modules
        '''
        # pylint: disable=invalid-name
        project = self.proj
        project.get_ansible_config_parser().clear_cache()
        project.ansible_modules.all().delete()
        ModuleClass = self.proj.ansible_modules.model
        paths = project.config.get('DEFAULT_MODULE_PATH', [])
        paths = filter(lambda mp: project.path in mp, paths)
        modules = self.__get_project_modules(paths)
        ModuleClass.objects.bulk_create([
            ModuleClass(path=path, project=project) for path in modules
        ])

    def _update_tasks(self, files: Iterable[pathlib.Path]) -> None:
        '''
        Find and update playbooks in project.
        :param files: list of filenames.
        '''
        self._set_tasks_list(files)

    def search_files(self, repo: Any = None, pattern: Text = '**/*') -> Iterable[pathlib.Path]:
        # pylint: disable=unused-argument
        path = pathlib.Path(self.path)
        return (x.relative_to(self.path) for x in path.glob(pattern))

    def _operate(self, operation: Callable, **kwargs) -> Any:
        return operation(kwargs)

    def _get_playbook_path(self, repo: Any = None) -> Iterable[pathlib.Path]:
        path_list_additional = []
        additional_pb_pattern = None

        with raise_context():
            additional_pb_pattern = self.proj.variables.get(key='playbook_path').value

        if additional_pb_pattern and (pathlib.Path(self.path) / additional_pb_pattern).exists():
            path_list_additional = self.search_files(repo, additional_pb_pattern  + '/*.yml')

        return chain(self.search_files(repo, '*.yml'), path_list_additional)

    def _make_operations(self, operation: Callable) -> Any:
        '''
        Handle VCS operations and sync data from project.

        :param operation: function that should be handled.
        :return: tuple with repo-object and fetch-results
        '''
        self._set_status("SYNC")
        try:
            with transaction.atomic():
                result = self._operate(operation)
                self.proj.status = "OK"
                self._update_tasks(self._get_playbook_path(result[0]))
                self._set_project_modules()
                self._handle_yaml(self._load_yaml() or {})
                self.proj.save()
        except Exception as err:
            logger.debug(traceback.format_exc())
            self.message(f'Sync error: {err}', 'error')
            self._set_status("ERROR")
            raise

        with raise_context(verbose=True):
            self.handler_class(self, result).trigger_execution()
        return result

    def make_clone(self, options):  # pragma: no cover
        '''
        Make operations for clone repo
        :param options: any options, like env variables or any thing
        :return: tuple object with 2 args: repo obj and fetch results
        '''
        raise NotImplementedError

    def make_update(self, options):  # pragma: no cover
        '''
        Make operation for fetch repo tree
        :param options: any options, like env variables or any thing
        :return: tuple object with 2 args: repo obj and fetch results
        '''
        raise NotImplementedError

    def get_revision(self, *args, repo=None, **kwargs) -> Text:
        # pylint: disable=unused-argument
        return "NO VCS"

    def get_branch_name(self) -> Text:
        return "NO VCS"

    def delete(self) -> Text:
        '''
        Handler, which removes project data directory.

        :return: user message
        '''
        if os.path.exists(self.path):
            if os.path.isfile(self.path):
                os.remove(self.path)  # nocv
            else:
                shutil.rmtree(self.path)
            return "Repository removed!"
        return "Repository does not exists."  # nocv

    def clone(self) -> Text:
        # pylint: disable=broad-exception-raised
        for __ in range(self.attempts):
            try:
                repo = self._make_operations(self.make_clone)[0]
                return f"Received {len(list(self.search_files(repo)))} files."
            except:
                self.delete()
        raise Exception(f"Clone didn't perform by {self.attempts} attempts.")

    def get(self) -> Any:
        # pylint: disable=broad-exception-raised
        for __ in range(self.attempts):
            try:
                return self._make_operations(self.make_update)
            except:
                self.delete()
        raise Exception(f"Upd didn't perform by {self.attempts} attempts.")

    def check(self):
        pass  # nocv

    def revision(self) -> Text:
        return self._operate(self.get_revision)

    def make_run_copy(self, destination: Text, revision: Text) -> str:
        shutil.copytree(self.proj.path, destination)
        return self.get_revision()


class _ArchiveRepo(_Base):
    def make_clone(self, options) -> Tuple[Any, Any]:
        destination = options.pop('destination', self.path)
        if os.path.exists(destination):
            shutil.rmtree(destination)
        os.mkdir(destination)
        archive = self._download(self.proj.repository, options)
        return self._extract(archive, destination, options)

    def make_update(self, options) -> Tuple[Any, Any]:
        archive = self._download(self.proj.repository, options)
        return self._extract(archive, self.path, options)

    def _download(self, url: Text, options) -> io.BytesIO:
        # NOTE: request's timeout is timeout for connection
        # establishment and NOT for the whole download process
        timeout = options.get('timeout')
        try:
            self.message(f'downloading from {url}')
            response = requests.get(url, stream=True, timeout=timeout)
            response.raise_for_status()

            content_length = int(response.headers.get('content-length', 0))
            max_content_length = self.options.get('max_content_length')
            if max_content_length and content_length > max_content_length:
                raise MaxContentLengthExceeded

            return io.BytesIO(response.content)
        except requests.exceptions.Timeout as error:
            raise SyncOnRunTimeout from error

    def _extract(self, archive, path, options):
        raise NotImplementedError  # nocv

    def make_run_copy(self, destination: Text, revision: Text) -> str:
        if self.proj.repo_sync_on_run:
            self.make_clone({
                'destination': destination,
                'revision': revision,
                'no_update': True,
                'timeout': self.proj.repo_sync_timeout,
            })
            return self.get_revision()
        return super().make_run_copy(destination, revision)
