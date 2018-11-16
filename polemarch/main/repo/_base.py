# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals

import os
import re
import shutil
import logging
import traceback

from six.moves.urllib.request import urlretrieve
from django.db import transaction
from vstutils.utils import raise_context
from ..utils import AnsibleModules

logger = logging.getLogger("polemarch")


class _Base(object):
    __slots__ = 'options', 'proj', 'path'

    regex = r"(^[\w\d\.\-_]{1,})\.yml"

    def __init__(self, project, **options):
        self.options = options
        self.proj = project
        self.path = self.proj.path

    def _set_status(self, status):
        self.proj.set_status(status)

    @raise_context()
    def _load_yaml(self):
        '''
        Loading `.polemarch.yaml` data.

        :return: Data from `.polemarch.yaml` file.
        :type ret: dict
        '''
        self.proj.get_yaml_subcache().clear()
        return self.proj.get_yaml()

    def _path_exists(self, path):
        return os.path.exists(path)

    def _dir_exists(self, path_dir):
        return self._path_exists(path_dir) and os.path.isdir(path_dir)

    def message(self, message, level='debug'):
        getattr(logger, level.lower(), logger.debug)(
            'Syncing project [{}] - {}'.format(self.proj.id, message)
        )

    def pm_handle_sync_on_run(self, feature, data):
        '''
        Set sync_on_run if it is setted in `.polemarch.yaml`.

        :param feature: feature name
        :param data: all data from file
        '''
        value = str(data[feature])
        _, created = self.proj.variables.update_or_create(
            key='repo_sync_on_run', defaults=dict(value=value)
        )
        self.message(
            '{} repo_sync_on_run to {}'.format('Set' if created else 'Update', value)
        )

    @raise_context()
    def __create_template(self, template_name, template_data):
        '''
        Creates one template from `.polemarch.yaml`.

        :param template_name: Template name
        :param template_data: Template data
        :return: created Template object
        '''
        self.message('Loading template[{}] into the project.'.format(template_name))
        return self.proj.template.create(name=template_name, **template_data)

    def pm_handle_templates(self, feature, data):
        '''
        Get and create (if is not existed) templates from `.polemarch.yaml`.

        :param feature: feature name
        :param data: all data from file
        '''
        rewrite = data.get('templates_rewrite', False)
        data = data[feature]
        qs_existed = self.proj.template.filter(name__in=data.keys())
        existed = qs_existed.values_list('name', flat=True)
        for template_name, template_data in data.items():
            if not rewrite and template_name in existed:
                self.message('Template[{}] already in project.'.format(template_name))
                continue
            self.__create_template(template_name, template_data)

    def pm_handle_view(self, feature, data):
        '''
        Clear view data from cache

        :param feature: feature name
        :param data: all data from file
        '''
        # pylint: disable=unused-argument
        self.proj.get_yaml_subcache('view').clear()
        self.message(self.proj.execute_view_data, 'debug')

    def pm_handle_unknown(self, feature, data):  # nocv
        '''
        Logging unknowing data from `.polemarch.yaml`.
        '''
        self.message('{} - this feature is not realised yet.'.format(feature), 'info')
        logger.debug(str(data))

    def _handle_yaml(self, data):
        """
        Loads and returns data from `.polemarch.yaml` file

        :rtype: dict
        """
        for feature in data.keys():
            if feature in ['templates_rewrite', ]:
                continue
            self.message('Set settings from ".polemarch.yaml" - {}.'.format(feature))
            feature_name = 'pm_handle_{}'.format(feature)
            getattr(self, feature_name, self.pm_handle_unknown)(feature, data)

    def _set_tasks_list(self, playbooks_names):
        """
        Updates playbooks in project.

        :rtype: None
        """
        # pylint: disable=invalid-name
        project = self.proj
        project.playbook.all().delete()
        PlaybookModel = self.proj.playbook.model
        hidden = project.hidden
        split = str.split
        playbook_objects = (
            PlaybookModel(
                name=split(str(p), ".yml")[0], playbook=p,
                hidden=hidden, project=project
            ) for p in playbooks_names
        )
        PlaybookModel.objects.bulk_create(playbook_objects) if playbook_objects else None

    def __get_project_modules(self, module_path):
        valid_paths = tuple(filter(self._dir_exists, module_path))
        if not valid_paths:
            return []
        modules = AnsibleModules(detailed=False, paths=valid_paths)
        modules.clear_cache()
        modules_list = modules.all()
        modules_list.sort()
        return modules_list

    @raise_context()
    def _set_project_modules(self):
        '''
        Update project modules
        '''
        # pylint: disable=invalid-name
        project = self.proj
        project.get_ansible_config_parser().clear_cache()
        project.modules.all().delete()
        ModuleClass = self.proj.modules.model
        paths = project.config.get('DEFAULT_MODULE_PATH', [])
        paths = filter(lambda mp: project.path in mp, paths)
        modules = self.__get_project_modules(paths)
        ModuleClass.objects.bulk_create([
            ModuleClass(path=path, project=project) for path in modules
        ])

    def _update_tasks(self, files):
        '''
        Find and update playbooks in project.
        :param files: list of filenames.
        :type files: list, tuple
        :rtype: None
        '''
        reg = re.compile(self.regex)
        playbooks = filter(reg.match, files)
        self._set_tasks_list(playbooks)

    def _get_files(self, repo=None):
        '''
        Get all files, where playbooks should be.
        :param repo: Repo object
        :type repo: object, None
        :return: list of files in dir
        :rtype: list
        '''
        # pylint: disable=unused-argument
        return os.listdir(self.path)

    def _operate(self, operation, **kwargs):
        return operation(kwargs)

    def _make_operations(self, operation):
        '''
        Handle VCS operations and sync data from project.

        :param operation: function that should be hdandled.
        :return: tuple with repo-object and fetch-results
        '''
        self._set_status("SYNC")
        try:
            with transaction.atomic():
                result = self._operate(operation)
                self._set_status("OK")
                self._update_tasks(self._get_files(result[0]))
                self._set_project_modules()
                self._handle_yaml(self._load_yaml() or dict())
        except Exception as err:
            logger.debug(traceback.format_exc())
            self.message('Sync error: {}'.format(err), 'error')
            self._set_status("ERROR")
            raise
        else:
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

    def get_revision(self, *args, **kwargs):
        # pylint: disable=unused-argument
        return "NO VCS"

    def get_branch_name(self):
        return "NO VCS"

    def delete(self):
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

    def clone(self):
        # pylint: disable=broad-except
        attempt = 2
        for __ in range(attempt):
            try:
                repo = self._make_operations(self.make_clone)[0]
                return "Received {} files.".format(len(self._get_files(repo)))
            except:
                self.delete()
        raise Exception("Clone didn't perform by {} attempts.".format(attempt))

    def get(self):
        # pylint: disable=broad-except
        attempt = 2
        for __ in range(attempt):
            try:
                return self._make_operations(self.make_update)
            except:
                self.delete()
        raise Exception("Upd didn't perform by {} attempts.".format(attempt))

    def check(self):
        pass  # nocv

    def revision(self):
        return self._operate(self.get_revision)


class _ArchiveRepo(_Base):
    def make_clone(self, options):
        if os.path.exists(self.path):
            shutil.rmtree(self.path)
        os.mkdir(self.path)
        archive = self._download(self.proj.repository, options)
        self._extract(archive, self.path, options)
        return None, None

    def make_update(self, options):
        archive = self._download(self.proj.repository, options)
        self._extract(archive, self.path, options)
        return None, None

    def _download(self, url, options):
        # pylint: disable=unused-argument
        return urlretrieve(url)[0]  # nocv

    def _extract(self, archive, path, options):
        raise NotImplementedError  # nocv
