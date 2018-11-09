# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals
from vstutils.utils import tmp_file_context, raise_context
import git
from ._base import _Base, os


class _VCS(_Base):  # nocv
    def vsc_clone(self, *args, **kwargs):
        raise NotImplementedError()

    def vcs_update(self, *args, **kwargs):
        raise NotImplementedError()

    def get_repo(self, *args, **kwargs):
        raise NotImplementedError()


class Git(_VCS):
    __slots__ = 'env', '_fetch_map'

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

    def get_repo(self):
        return git.Repo(self.path)

    def vsc_clone(self, *args, **kwargs):
        return git.Repo.clone_from(*args, **kwargs)

    def vcs_update(self, repo, env):
        with repo.git.custom_environment(**env):
            kwargs = self.options.get("FETCH_KWARGS", dict())
            fetch_result = repo.remotes.origin.pull(**kwargs)
        return fetch_result

    def get_branch_name(self):
        # pylint: disable=broad-except
        reponame = "waiting..."
        with raise_context():
            reponame = self.get_repo().active_branch.name
        return reponame

    def make_clone(self, env):
        kw = dict(**self.options.get("CLONE_KWARGS", dict()))
        branch = self.proj.vars.get('repo_branch', None)
        if branch:
            kw['branch'] = branch
        repo = self.vsc_clone(self.proj.repository, self.path, env=env, **kw)
        self.proj.variables.update_or_create(
            key='repo_branch', defaults=dict(value=repo.active_branch.name)
        )
        return repo, None

    def _get_or_create_repo(self, env):
        try:
            repo = self.get_repo()
            branch = self.proj.vars.get('repo_branch', None)
            if branch and repo.active_branch.name != branch:
                self.delete()
                raise git.NoSuchPathError
        except git.NoSuchPathError:
            repo = self.make_clone(env)[0]
        return repo

    def make_update(self, env):
        repo = self._get_or_create_repo(env)
        return repo, self.vcs_update(repo, env)

    def get_revision(self, *args, **kwargs):
        # pylint: disable=unused-argument
        if self.proj.status == 'NEW':
            return 'NOT_SYNCED'
        repo = self.get_repo()
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
                env_vars = self._with_key(tmp, env_vars)
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
