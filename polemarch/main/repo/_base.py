# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals

import os
import re
import shutil
import logging

from six.moves.urllib.request import urlretrieve
from django.db import transaction

logger = logging.getLogger("polemarch")


class _Base(object):
    regex = r"(^[\w\d\.\-_]{1,})\.yml"

    def __init__(self, project, **options):
        self.options = options
        self.proj = project
        self.path = self.proj.path

    def _set_status(self, status):
        self.proj.set_status(status)

    def _set_tasks_list(self, playbooks_names):
        self.proj.tasks.all().delete()
        for playbook in playbooks_names:
            name = playbook.split(".yml")[0]
            self.proj.tasks.create(
                name=name, playbook=playbook, hidden=self.proj.hidden
            )

    def _update_tasks(self, files):
        reg = re.compile(self.regex)
        playbooks = filter(reg.match, files)
        self._set_tasks_list(playbooks)

    def _get_files(self, repo=None):
        # pylint: disable=unused-argument
        return os.listdir(self.path)

    def _operate(self, operation, **kwargs):
        return operation(kwargs)

    def _make_operations(self, operation):
        self._set_status("SYNC")
        try:
            with transaction.atomic():
                result = self._operate(operation)
                self._set_status("OK")
                self._update_tasks(self._get_files(result[0]))
        except Exception as err:
            logger.error("Project[{}] sync error:\n{}".format(self.proj, err))
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
