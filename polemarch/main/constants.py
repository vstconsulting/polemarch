from functools import lru_cache
from typing import Dict, Optional
from vstutils.utils import BaseEnum
from .utils import AnsibleArgumentsReference


CYPHER = '[~~ENCRYPTED~~]'
ANSIBLE_REFERENCE = AnsibleArgumentsReference()


class ExecutionTypesEnum(BaseEnum):
    # pylint: disable=invalid-name
    Task = 'Task'
    Module = 'Module'


class BaseVariablesEnum(BaseEnum):
    @classmethod
    @lru_cache()
    def get_values(cls):
        return {x.value for x in cls}

    @classmethod
    @lru_cache()
    def get_values_list(cls):
        return [x.value for x in cls]

    @classmethod
    def hide_values(cls, entries: Optional[Dict]):
        if entries:
            for key in filter(cls.get_values().__contains__, entries):
                entries[key] = CYPHER


class InventoryVariablesEnum(BaseVariablesEnum):
    ANSIBLE_HOST = 'ansible_host'
    ANSIBLE_PORT = 'ansible_port'
    ANSIBLE_USER = 'ansible_user'
    ANSIBLE_CONNECTION = 'ansible_connection'
    ANSIBLE_PASSWORD = 'ansible_password'

    ANSIBLE_SSH_PASS = 'ansible_ssh_pass'
    ANSIBLE_SSH_PRIVATE_KEY_FILE = 'ansible_ssh_private_key_file'
    ANSIBLE_SSH_COMMON_ARGS = 'ansible_ssh_common_args'
    ANSIBLE_SFTP_EXTRA_ARGS = 'ansible_sftp_extra_args'
    ANSIBLE_SCP_EXTRA_ARGS = 'ansible_scp_extra_args'
    ANSIBLE_SSH_EXTRA_ARGS = 'ansible_ssh_extra_args'
    ANSIBLE_SSH_EXECUTABLE = 'ansible_ssh_executable'
    ANSIBLE_SSH_PIPELINING = 'ansible_ssh_pipelining'

    ANSIBLE_BECOME = 'ansible_become'
    ANSIBLE_BECOME_METHOD = 'ansible_become_method'
    ANSIBLE_BECOME_USER = 'ansible_become_user'
    ANSIBLE_BECOME_PASS = 'ansible_become_pass'
    ANSIBLE_BECOME_PASSWORD = 'ansible_become_password'
    ANSIBLE_BECOME_EXE = 'ansible_become_exe'
    ANSIBLE_BECOME_FLAGS = 'ansible_become_flags'

    ANSIBLE_SHELL_TYPE = 'ansible_shell_type'
    ANSIBLE_PYTHON_INTERPRETER = 'ansible_python_interpreter'
    ANSIBLE_RUBY_INTERPRETER = 'ansible_ruby_interpreter'
    ANSIBLE_PERL_INTERPRETER = 'ansible_perl_interpreter'
    ANSIBLE_SHELL_EXECUTABLE = 'ansible_shell_executable'


class ProjectVariablesEnum(BaseVariablesEnum):
    REPO_TYPE = 'repo_type'
    REPO_SYNC_ON_RUN = 'repo_sync_on_run'
    REPO_SYNC_ON_RUN_TIMEOUT = 'repo_sync_on_run_timeout'
    REPO_BRANCH = 'repo_branch'
    REPO_PASSWORD = 'repo_password'
    REPO_KEY = 'repo_key'
    PLAYBOOK_PATH = 'playbook_path'
    CI_TEMPLATE = 'ci_template'


class HiddenArgumentsEnum(BaseVariablesEnum):
    KEY_FILE = 'key-file'
    PRIVATE_KEY = 'private-key'
    VAULT_PASSWORD_FILE = 'vault-password-file'
    NEW_VAULT_PASSWORD_FILE = 'new-vault-password-file'

    @classmethod
    @lru_cache()
    def get_values(cls):
        return {x.value for x in cls} | {x.value.replace('-', '_') for x in cls}

    @classmethod
    @lru_cache()
    def get_text_values(cls):
        args = {cls.KEY_FILE.value, cls.PRIVATE_KEY.value}
        return args | {x.replace('-', '_') for x in args}

    @classmethod
    @lru_cache()
    def get_file_values(cls):
        args = {cls.VAULT_PASSWORD_FILE.value, cls.NEW_VAULT_PASSWORD_FILE.value}
        return args | {x.replace('-', '_') for x in args}


class HiddenVariablesEnum(BaseVariablesEnum):
    ANSIBLE_SSH_PASS = InventoryVariablesEnum.ANSIBLE_SSH_PASS.value
    ANSIBLE_SSH_PRIVATE_KEY_FILE = InventoryVariablesEnum.ANSIBLE_SSH_PRIVATE_KEY_FILE.value
    ANSIBLE_BECOME_PASS = InventoryVariablesEnum.ANSIBLE_BECOME_PASS.value
    ANSIBLE_BECOME_PASSWORD = InventoryVariablesEnum.ANSIBLE_BECOME_PASSWORD.value
    ANSIBLE_PASSWORD = InventoryVariablesEnum.ANSIBLE_PASSWORD.value
    REPO_KEY = ProjectVariablesEnum.REPO_KEY.value
    REPO_PASSWORD = ProjectVariablesEnum.REPO_PASSWORD.value
