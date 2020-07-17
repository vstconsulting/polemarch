# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals
from typing import Tuple, Dict, Text, Union, Any, Iterable
import warnings
from vstutils.utils import tmp_file_context, raise_context
try:
    import git
except:  # nocv
    warnings.warn("Git is not installed or have problems.")
from ._base import _Base, os, logger, pathlib

ENV_VARS_TYPE =  Dict[Text, Union[Text, bool]]  # pylint: disable=invalid-name


class _VCS(_Base):  # nocv
    def vsc_clone(self, *args, **kwargs):
        raise NotImplementedError()

    def vcs_update(self, *args, **kwargs):
        raise NotImplementedError()

    def get_repo(self, *args, **kwargs):
        raise NotImplementedError()


class Git(_VCS):
    __slots__ = ('env', '_fetch_map',)

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
        self.target_branch = self.proj.vars.get('repo_branch', None)

    def get_repo(self) -> git.Repo:
        return git.Repo(self.path)

    def vsc_clone(self, *args, **kwargs) -> git.Repo:
        repo = git.Repo.clone_from(*args, **kwargs)
        with repo.git.custom_environment(**kwargs.get('env', {})):
            self._update_submodules(repo)
        return repo

    @raise_context()
    def _fetch_from_remote(self, repo: git.Repo, env: ENV_VARS_TYPE):
        with repo.git.custom_environment(**env):
            kwargs = self.options.get("FETCH_KWARGS", dict())
            fetch_method_name = 'fetch'
            if not repo.head.is_detached:
                fetch_method_name = 'pull'
            result = getattr(repo.remotes[0], fetch_method_name)(**kwargs)
            self._update_submodules(repo)
            return result

    def _update_submodules(self, repo: git.Repo):
        logger.debug('Update GIT submodules in project [{}]'.format(self.proj.id))
        for sm in repo.submodules:
            # Calling git directly for own submodules
            # since using relative path is not working in gitpython
            # see https://github.com/gitpython-developers/GitPython/issues/730
            with raise_context():
                logger.debug('Update module "{}" in project [{}].'.format(sm.name, self.proj.id))
                if sm.url[0:3] == '../':
                    sm_path = sm.name
                    repo.git.submodule('init', sm_path)
                    repo.git.submodule('update', sm_path)
                else:
                    sm.update(init=True)

    def vcs_update(self, repo: git.Repo, env: ENV_VARS_TYPE):
        fetch_result = self._fetch_from_remote(repo, env)
        return fetch_result

    def get_branch_name(self) -> str:
        # pylint: disable=broad-except
        reponame = "waiting..."
        with raise_context():
            repo = self.get_repo()
            with raise_context():
                reponame = repo.head.object.hexsha
            repo_branch = self.target_branch or 'ERROR'
            if repo.head.is_detached and repo_branch.replace('tags/', '') in repo.tags:
                return repo_branch
            reponame = repo.active_branch.name
        return reponame

    def make_clone(self, env: ENV_VARS_TYPE) -> Tuple[git.Repo, None]:
        kw = dict(**self.options.get("CLONE_KWARGS", dict()))
        if self.target_branch:
            kw['branch'] = self.target_branch.replace('tags/', '')
        repo = self.vsc_clone(self.proj.repository, self.path, env=env, **kw)
        with raise_context():
            self.proj.variables.update_or_create(
                key='repo_branch', defaults=dict(value=repo.active_branch.name)
            )
        return repo, None

    def _get_or_create_repo(self, env: ENV_VARS_TYPE) -> git.Repo:
        try:
            repo = self.get_repo()
            branch = self.target_branch
            with raise_context():
                repo.git.checkout(branch)
            is_not_detached = not repo.head.is_detached
            if branch and is_not_detached and repo.active_branch.name != branch:
                self.delete()
                raise git.NoSuchPathError
        except git.NoSuchPathError:
            repo = self.make_clone(env)[0]
        return repo

    def make_update(self, env: ENV_VARS_TYPE) -> Tuple[git.Repo, Any]:
        try:
            repo = self._get_or_create_repo(env)
        except git.InvalidGitRepositoryError:
            logger.info('Convert project [{}] to GIT.'.format(self.proj.id))
            repo = git.Repo.init(self.path)
            repo.create_remote('origin', self.proj.repository)
            with repo.git.custom_environment(**env):
                kwargs = self.options.get("FETCH_KWARGS", dict())
                origin = repo.remote('origin')
                logger.debug('Fetch remote brances for project [{}].'.format(self.proj.id))
                origin.fetch(**kwargs)
                if not list(origin.refs):
                    config_writer = repo.config_writer()
                    config_writer.set_value("user", "email", self.proj.owner.email).release()
                    user_name = self.proj.owner.username
                    if self.proj.owner.last_name and self.proj.owner.first_name:  # nocv
                        user_name = '{u.fist_name} {u.last_name}'.format(u=self.proj.owner)
                    config_writer.set_value("user", "name", user_name).release()
                    repo.git.add(A=True)
                    repo.git.commit(m='Create project from Polemarch.')
                    logger.debug('Push project [{}] as master.'.format(self.proj.id))
                    repo.git.push('--set-upstream', 'origin', 'master')

        results = repo, self.vcs_update(repo, env)
        with raise_context():
            repo.git.checkout(self.target_branch)
        return results

    def get_revision(self, *args, **kwargs):
        # pylint: disable=unused-argument
        if self.proj.status == 'NEW':
            return 'NOT_SYNCED'
        repo = self.get_repo()
        return repo.head.object.hexsha

    def _with_password(self, tmp, env_vars: ENV_VARS_TYPE) -> ENV_VARS_TYPE:
        env_vars.update(self.env.get("PASSWORD", dict()))
        tmp.write("echo '{}'".format(self.proj.vars["repo_password"]))
        os.chmod(tmp.name, 0o700)
        env_vars["GIT_ASKPASS"] = env_vars.get("GIT_ASKPASS", tmp.name)
        tmp.close()
        return env_vars

    def _with_key(self, tmp, env_vars: Dict) -> ENV_VARS_TYPE:
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

    def search_files(self, repo: git.Repo = None, pattern: Text = '**/*') -> Iterable[pathlib.Path]:
        recursive = pattern.startswith('**/')
        if recursive:
            pattern = pattern.replace('**/', '')

        search_parent_dir = pattern.rsplit('/')[0]
        if search_parent_dir == pattern:
            search_parent_dir = pathlib.Path('.')
        else:
            search_parent_dir = pathlib.Path(search_parent_dir)

        for path in dict(repo.index.entries.keys()).keys():
            result = pathlib.Path(path)
            if not recursive and result.parent != search_parent_dir:
                continue
            if result.match(pattern):
                yield result

        for sm in repo.submodules:
            if recursive or pattern.startswith(sm.name):
                for file in self.search_files(sm.module(), pattern.replace(sm.name + '/', '')):
                    yield pathlib.Path(sm.name)/file

    def get(self) -> Dict[str, str]:
        return {
            res.ref.remote_head: self._fetch_map[res.flags]
            for res in super(Git, self).get()[1]
        }

    def revision(self) -> Text:
        try:
            return self._operate(self.get_revision)
        except git.GitError:
            return "ERROR"
