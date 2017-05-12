# pylint: disable=expression-not-assigned,abstract-method
# TODO: remove `abstract-method` from disabled
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


class Test(_Base):
    def clone(self):
        import sys
        self._set_status("SYNC")
        logger.info("Cloning repo")
        os.mkdir(self.path) if not os.path.exists(self.path) else None
        with open(self.path+"/f{}.txt".format(sys.version_info[0]), "w") as fl:
            fl.write("clone")
        self._set_status("OK")

    def get(self):
        import sys
        self._set_status("SYNC")
        logger.info("Update repo from url.")
        with open(self.path+"/f{}.txt".format(sys.version_info[0]), "w") as fl:
            fl.write("update")
        self._set_status("OK")


class Git(_Base):
    def __init__(self, *args, **kwargs):
        super(Git, self).__init__(*args, **kwargs)
        self.env = dict()

    def _clone(self):
        result = git.Repo.clone_from(self.proj.repository, self.path,
                                     env=self.env, depth=1)
        return dict(result.index.entries.keys()).keys()

    def _update(self):
        repo = git.Repo(self.path)
        with repo.git.custom_environment(**self.env):
            repo.remotes.origin.fetch()
        return dict(repo.index.entries.keys()).keys()

    def __operate(self, operation, **env_vars):
        self.env = env_vars
        return operation()

    def _operate(self, operation, **env_vars):
        if self.proj.vars.get("repo_password", None) is not None:
            with tmp_file_context(delete=False) as tmp:
                tmp.write("echo '{}'".format(self.proj.vars["repo_password"]))
                os.chmod(tmp.name, 0o700)
                env_vars["GIT_ASKPASS"] = env_vars.get("GIT_ASKPASS", tmp.name)
                tmp.close()
                return self.__operate(operation, **env_vars)
        elif self.proj.vars.get("repo_key", None) is not None:
            raise NotImplementedError("Does not realized now.")
        else:
            return operation()

    def clone(self):
        self._set_status("SYNC")
        files = self._operate(self._clone)
        self._set_status("OK")
        self._update_tasks(files)
        return "Recived {} files.".format(len(files))

    def get(self):
        self._set_status("SYNC")
        files = self._operate(self._update)
        self._set_status("OK")
        self._update_tasks(files)
        return "Repo contains {} files.".format(len(files))
