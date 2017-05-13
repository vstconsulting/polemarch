# pylint: disable=expression-not-assigned,abstract-method
from __future__ import unicode_literals

import os
import re
import shutil
import logging
import git
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

    def clone(self):  # pragma: no cover
        raise NotImplementedError

    def get(self):  # pragma: no cover
        raise NotImplementedError

    def delete(self):
        if os.path.exists(self.path):
            if os.path.isfile(self.path):
                os.remove(self.path)
            else:
                shutil.rmtree(self.path)
            return "Repository removed!"
        return "Repository does not exists."


class Git(_Base):
    _fetch_statuses = [
        "NEW_TAG", "NEW_HEAD", "HEAD_UPTODATE",
        "TAG_UPDATE", "REJECTED", "FORCED_UPDATE",
        "FAST_FORWARD", "ERROR"
    ]

    def __init__(self, *args, **kwargs):
        super(Git, self).__init__(*args, **kwargs)
        self.env = dict()
        self._fetch_map = {
            1 << x: self._fetch_statuses[x] for x in range(8)
        }

    def _clone(self):
        repo = git.Repo.clone_from(self.proj.repository, self.path,
                                   env=self.env, depth=1)
        return repo, None

    def _update(self):
        repo = git.Repo(self.path)
        with repo.git.custom_environment(**self.env):
            fetch_result = repo.remotes.origin.fetch()
        return repo, fetch_result

    def _operate(self, operation, **env_vars):
        if self.proj.vars.get("repo_password", None) is not None:
            with tmp_file_context(delete=False) as tmp:
                tmp.write("echo '{}'".format(self.proj.vars["repo_password"]))
                os.chmod(tmp.name, 0o700)
                env_vars["GIT_ASKPASS"] = env_vars.get("GIT_ASKPASS", tmp.name)
                tmp.close()
                self.env = env_vars
                return operation()
        elif self.proj.vars.get("repo_key", None) is not None:
            raise NotImplementedError("Does not realized now.")
        else:
            return operation()

    def _make_operation(self, operation):
        self._set_status("SYNC")
        try:
            result = self._operate(operation)
            self._set_status("OK")
            self._update_tasks(self._get_files(result[0]))
        except git.InvalidGitRepositoryError:
            self._set_status("ERROR")
            raise
        else:
            return result

    def _get_files(self, repo):
        return dict(repo.index.entries.keys()).keys()

    def clone(self):
        repo = self._make_operation(self._clone)[0]
        return "Recived {} files.".format(len(self._get_files(repo)))

    def get(self):
        _, fres = self._make_operation(self._update)
        return {res.ref.remote_head: self._fetch_map[res.flags]
                for res in fres}
