from functools import lru_cache
from typing import Dict, Optional
from rest_framework import fields as drffields
from vstutils.utils import BaseEnum as VSTBaseEnum
from vstutils.api import fields as vstfields
from .utils import AnsibleArgumentsReference


CYPHER = '[~~ENCRYPTED~~]'
ANSIBLE_REFERENCE = AnsibleArgumentsReference()
TEMPLATE_KIND_PLUGIN_MAP = {'Module': 'ANSIBLE_MODULE', 'Task': 'ANSIBLE_PLAYBOOK'}


class BaseEnum(VSTBaseEnum):
    @classmethod
    @lru_cache()
    def get_values(cls):
        return tuple(x.value for x in cls)


class CrontabTimeType(BaseEnum):
    MINUTE = BaseEnum.LOWER
    HOUR = BaseEnum.LOWER
    DAY_OF_MONTH = BaseEnum.LOWER
    MONTH_OF_YEAR = BaseEnum.LOWER
    DAY_OF_WEEK = BaseEnum.LOWER


class HistoryInitiatorType(BaseEnum):
    PROJECT = BaseEnum.LOWER
    TEMPLATE = BaseEnum.LOWER
    SCHEDULER = BaseEnum.LOWER


class PeriodicTaskScheduleType(BaseEnum):
    INTERVAL = BaseEnum.SAME
    CRONTAB = BaseEnum.SAME


class ProjectRepoAuthType(BaseEnum):
    NONE = BaseEnum.SAME
    KEY = BaseEnum.SAME
    PASSWORD = BaseEnum.SAME


class ProjectType(BaseEnum):
    MANUAL = BaseEnum.SAME
    GIT = BaseEnum.SAME
    TAR = BaseEnum.SAME


class ProjectStatus(BaseEnum):
    NEW = BaseEnum.SAME
    WAIT_SYNC = BaseEnum.SAME
    SYNC = BaseEnum.SAME
    ERROR = BaseEnum.SAME
    OK = BaseEnum.SAME


class HistoryStatus(BaseEnum):
    DELAY = BaseEnum.SAME
    RUN = BaseEnum.SAME
    OK = BaseEnum.SAME
    ERROR = BaseEnum.SAME
    OFFLINE = BaseEnum.SAME
    INTERRUPTED = BaseEnum.SAME

    @classmethod
    @lru_cache()
    def get_working_statuses(cls):
        return (cls.DELAY.value, cls.RUN.value)

    @classmethod
    @lru_cache()
    def get_stopped_statuses(cls):
        return (
            cls.INTERRUPTED.value,
            cls.ERROR.value,
            cls.OFFLINE.value,
            cls.OK.value,
        )


class HostType(BaseEnum):
    HOST = BaseEnum.SAME
    RANGE = BaseEnum.SAME


class MemberType(BaseEnum):
    USER = BaseEnum.LOWER
    TEAM = BaseEnum.LOWER


class BaseVariablesEnum(BaseEnum):
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

    @classmethod
    @lru_cache()
    def get_field_types(cls):
        return {
            cls.ANSIBLE_PASSWORD.value: vstfields.PasswordField(),
            cls.ANSIBLE_SSH_PASS.value: vstfields.PasswordField(),
            cls.ANSIBLE_BECOME_PASS.value: vstfields.PasswordField(),
            cls.ANSIBLE_BECOME_PASSWORD.value: vstfields.PasswordField(),
            cls.ANSIBLE_BECOME.value: drffields.BooleanField(),
            cls.ANSIBLE_PORT.value: drffields.IntegerField(default=22),
            cls.ANSIBLE_SSH_PRIVATE_KEY_FILE.value: vstfields.SecretFileInString(),
        }


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
