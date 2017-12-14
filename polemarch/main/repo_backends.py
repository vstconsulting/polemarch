# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals

import os
import re
import shutil
import logging
import tarfile

import git
from six.moves.urllib.request import urlretrieve
from django.db import transaction
from .utils import tmp_file_context

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
            self.proj.tasks.create(name=name, playbook=playbook)

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

    def delete(self):
        if os.path.exists(self.path):
            if os.path.isfile(self.path):
                os.remove(self.path)  # nocv
            else:
                shutil.rmtree(self.path)
            return "Repository removed!"
        return "Repository does not exists."  # nocv

    def clone(self):
        repo = self._make_operations(self.make_clone)[0]
        return "Received {} files.".format(len(self._get_files(repo)))

    def get(self):
        return self._make_operations(self.make_update)

    def check(self):
        pass  # nocv

    def revision(self):
        return self._operate(self.get_revision)


class Git(_Base):
    _fetch_statuses = [
        "NEW_TAG", "NEW_HEAD", "HEAD_UPTODATE",
        "TAG_UPDATE", "REJECTED", "FORCED_UPDATE",
        "FAST_FORWARD", "ERROR"
    ]
    _ssh_options = {
        "StrictHostKeyChecking": "no",
        "TCPKeepAlive": "yes",
        "IdentitiesOnly": "yes",
        "UserKnownHostsFile": "/dev/null",
        "PubkeyAuthentication": "yes"
    }

    def __init__(self, *args, **kwargs):
        super(Git, self).__init__(*args, **kwargs)
        self.env = self.options.get("GIT_ENV", dict())
        self._fetch_map = {
            1 << x: self._fetch_statuses[x] for x in range(8)
        }

    def make_clone(self, env):
        repo = git.Repo.clone_from(self.proj.repository, self.path, env=env,
                                   **self.options.get("CLONE_KWARGS", dict()))
        return repo, None

    def _get_or_create_repo(self, env):
        try:
            repo = git.Repo(self.path)
        except git.NoSuchPathError:
            repo = self.make_clone(env)[0]
        return repo

    def make_update(self, env):
        repo = self._get_or_create_repo(env)
        with repo.git.custom_environment(**env):
            kwargs = self.options.get("FETCH_KWARGS", dict())
            fetch_result = repo.remotes.origin.pull(**kwargs)
        return repo, fetch_result

    def get_revision(self, *args, **kwargs):
        # pylint: disable=unused-argument
        repo = git.Repo(self.path)
        return repo.head.object.hexsha

    def _with_password(self, tmp, env_vars):
        env_vars.update(self.env.get("PASSWORD", dict()))
        tmp.write("echo '{}'".format(self.proj.vars["repo_password"]))
        os.chmod(tmp.name, 0o700)
        env_vars["GIT_ASKPASS"] = env_vars.get("GIT_ASKPASS", tmp.name)
        tmp.close()
        return env_vars

    def _with_key(self, tmp, env_vars):
        env_vars.update(self.env.get("KEY", dict()))
        tmp.write(self.proj.vars["repo_key"])
        tmp.close()
        ssh = "ssh -vT -i {} -F /dev/null".format(tmp.name)
        for key, value in self._ssh_options.items():
            ssh += " -o {}={}".format(key, value)
        env_vars["GIT_SSH_COMMAND"] = env_vars.get("GIT_SSH_COMMAND", ssh)
        return env_vars

    def _operate(self, operation, **env_vars):
        env_vars.update(self.env.get("GLOBAL", dict()))
        with tmp_file_context(delete=False) as tmp:
            if self.proj.vars.get("repo_password", None) is not None:
                env_vars = self._with_password(tmp, env_vars)
            elif self.proj.vars.get("repo_key", None) is not None:
                env_vars = self._with_password(tmp, env_vars)
            return super(Git, self)._operate(operation, **env_vars)

    def _get_files(self, repo=None):
        return dict(repo.index.entries.keys()).keys()

    def get(self):
        return {res.ref.remote_head: self._fetch_map[res.flags]
                for res in super(Git, self).get()[1]}

    def revision(self):
        try:
            return self._operate(self.get_revision)
        except git.GitError:
            return "ERROR"


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


class Tar(_ArchiveRepo):
    def _extract(self, archive, path, options):
        # pylint: disable=broad-except
        shutil.move(path, path + ".bak")
        try:
            with tarfile.open(archive) as arch:
                arch.extractall(path)
        except:
            self.delete()
            shutil.move(path + ".bak", path)
        else:
            shutil.rmtree(path + ".bak")


class Manual(_Base):
    def make_clone(self, options):
        try:
            os.mkdir(self.path)
        except OSError as oserror:
            if oserror.errno == os.errno.EEXIST:
                self.delete()
                return self.make_clone(options)
            raise  # nocv
        return None, None

    def make_update(self, options):
        return None, None
