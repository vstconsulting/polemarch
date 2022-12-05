from functools import lru_cache
from typing import Dict, Optional
from vstutils.utils import BaseEnum
from .utils import AnsibleArgumentsReference


CYPHER = '[~~ENCRYPTED~~]'
ANSIBLE_REFERENCE = AnsibleArgumentsReference()


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
    ANSIBLE_HOST = BaseEnum.LOWER
    ANSIBLE_PORT = BaseEnum.LOWER
    ANSIBLE_USER = BaseEnum.LOWER
    ANSIBLE_CONNECTION = BaseEnum.LOWER
    ANSIBLE_PASSWORD = BaseEnum.LOWER

    ANSIBLE_SSH_PASS = BaseEnum.LOWER
    ANSIBLE_SSH_PRIVATE_KEY_FILE = BaseEnum.LOWER
    ANSIBLE_SSH_COMMON_ARGS = BaseEnum.LOWER
    ANSIBLE_SFTP_EXTRA_ARGS = BaseEnum.LOWER
    ANSIBLE_SCP_EXTRA_ARGS = BaseEnum.LOWER
    ANSIBLE_SSH_EXTRA_ARGS = BaseEnum.LOWER
    ANSIBLE_SSH_EXECUTABLE = BaseEnum.LOWER
    ANSIBLE_SSH_PIPELINING = BaseEnum.LOWER

    ANSIBLE_BECOME = BaseEnum.LOWER
    ANSIBLE_BECOME_METHOD = BaseEnum.LOWER
    ANSIBLE_BECOME_USER = BaseEnum.LOWER
    ANSIBLE_BECOME_PASS = BaseEnum.LOWER
    ANSIBLE_BECOME_PASSWORD = BaseEnum.LOWER
    ANSIBLE_BECOME_EXE = BaseEnum.LOWER
    ANSIBLE_BECOME_FLAGS = BaseEnum.LOWER

    ANSIBLE_SHELL_TYPE = BaseEnum.LOWER
    ANSIBLE_PYTHON_INTERPRETER = BaseEnum.LOWER
    ANSIBLE_RUBY_INTERPRETER = BaseEnum.LOWER
    ANSIBLE_PERL_INTERPRETER = BaseEnum.LOWER
    ANSIBLE_SHELL_EXECUTABLE = BaseEnum.LOWER


class ProjectVariablesEnum(BaseVariablesEnum):
    REPO_TYPE = BaseEnum.LOWER
    REPO_SYNC_ON_RUN = BaseEnum.LOWER
    REPO_SYNC_ON_RUN_TIMEOUT = BaseEnum.LOWER
    REPO_BRANCH = BaseEnum.LOWER
    REPO_PASSWORD = BaseEnum.LOWER
    REPO_KEY = BaseEnum.LOWER
    PLAYBOOK_PATH = BaseEnum.LOWER
    CI_TEMPLATE = BaseEnum.LOWER


class HiddenArgumentsEnum(BaseVariablesEnum):
    KEY_FILE = 'key-file'
    PRIVATE_KEY = 'private-key'
    VAULT_PASSWORD_FILE = 'vault-password-file'
    NEW_VAULT_PASSWORD_FILE = 'new-vault-password-file'

    @classmethod
    @lru_cache()
    def get_values(cls):
        return {x.value for x in cls} | {x.value.replace('-', '_') for x in cls}


class HiddenVariablesEnum(BaseVariablesEnum):
    ANSIBLE_SSH_PASS = InventoryVariablesEnum.ANSIBLE_SSH_PASS.value
    ANSIBLE_SSH_PRIVATE_KEY_FILE = InventoryVariablesEnum.ANSIBLE_SSH_PRIVATE_KEY_FILE.value
    ANSIBLE_BECOME_PASS = InventoryVariablesEnum.ANSIBLE_BECOME_PASS.value
    ANSIBLE_BECOME_PASSWORD = InventoryVariablesEnum.ANSIBLE_BECOME_PASSWORD.value
    ANSIBLE_PASSWORD = InventoryVariablesEnum.ANSIBLE_PASSWORD.value
    REPO_KEY = ProjectVariablesEnum.REPO_KEY.value
    REPO_PASSWORD = ProjectVariablesEnum.REPO_PASSWORD.value
