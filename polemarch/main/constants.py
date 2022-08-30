from functools import lru_cache
from typing import Dict, Optional
from vstutils.utils import BaseEnum


CYPHER = '[~~ENCRYPTED~~]'


class BaseVarEnum(BaseEnum):
    @classmethod
    @lru_cache()
    def get_values(cls):
        return {x.value for x in cls}

    @classmethod
    def hide_values(cls, entries: Optional[Dict]):
        if entries:
            for key in filter(cls.get_values().__contains__, entries):
                entries[key] = CYPHER


class HiddenArg(BaseVarEnum):
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


class HiddenVar(BaseVarEnum):
    ANSIBLE_SSH_PASS = 'ansible_ssh_pass'
    ANSIBLE_SSH_PRIVATE_KEY_FILE = 'ansible_ssh_private_key_file'
    ANSIBLE_BECOME_PASS = 'ansible_become_pass'
    ANSIBLE_BECOME_PASSWORD = 'ansible_become_password'
    ANSIBLE_PASSWORD = 'ansible_password'
    REPO_KEY = 'repo_key'
    REPO_PASSWORD = 'repo_password'
