# pylint: disable=invalid-name,ungrouped-imports
from __future__ import unicode_literals

import logging

import sys
import re
import os
import json
from os.path import dirname

try:
    from yaml import CLoader as Loader, CDumper as Dumper, load, dump
except ImportError:  # nocv
    from yaml import Loader, Dumper, load, dump

from vstutils.utils import (
    ON_POSIX,
    tmp_file_context,
    BaseVstObject,
    Executor,
    UnhandledExecutor,
    subprocess
)

from . import __file__ as file


logger = logging.getLogger('polemarch')


def project_path():
    """
    Get full system path to polemarch project

    :return: -- string with full system path
    :rtype: str
    """
    return dirname(dirname(file))  # nocv


class PMObject(BaseVstObject):

    def pm_ansible(self, *args):
        # pylint: disable=access-member-before-definition
        if hasattr(self, '__pm_ansible__'):
            return list(self.__pm_ansible__) + list(args)
        self.__pm_ansible__ = self.get_django_settings('EXECUTOR')
        return self.pm_ansible(*args)


class CmdExecutor(Executor, PMObject):
    # pylint: disable=no-member
    """
    Command executor with realtime output write
    """
    __slots__ = ()


class task(object):
    """ Decorator for Celery task classes

    **Examples**:

            .. code-block:: python

                @task(app)
                class SomeTask(BaseTask):
                    def run(self):
                        return "Result of task"

            .. code-block:: python

                @task(app, bind=True)
                class SomeTask2(BaseTask):
                    def run(self):
                        return "Result of task"
    """
    __slots__ = 'app', 'args', 'kwargs'

    def __init__(self, app, *args, **kwargs):
        '''
        :param app: -- CeleryApp object
        :type app: celery.Celery
        :param args: -- args for CeleryApp
        :param kwargs: -- kwargs for CeleryApp
        '''
        self.app = app
        self.args, self.kwargs = args, kwargs

    def __call__(self, task_cls):

        self.kwargs["name"] = "{c.__module__}.{c.__name__}".format(c=task_cls)

        @self.app.task(*self.args, **self.kwargs)
        def wrapper(*args, **kwargs):
            return task_cls(*args, **kwargs).start()

        wrapper.task_class = task_cls
        return wrapper


class BaseTask(PMObject):
    '''
    BaseTask class for all tasks.
    '''
    __slots__ = 'app', 'args', 'kwargs', 'task_class'

    def __init__(self, app, *args, **kwargs):
        """
        :param app: -- CeleryApp object
        :type app: celery.Celery
        :param args: -- any args for tasks
        :param kwargs: -- any kwargs for tasks
        """
        super(BaseTask, self).__init__()
        self.app = app
        self.args, self.kwargs = args, kwargs
        self.task_class = self.__class__

    def start(self):
        ''' Method that starts task executions. '''
        return self.run()

    def run(self):  # pragma: no cover
        # pylint: disable=notimplemented-raised,
        ''' Method with task logic. '''
        raise NotImplementedError


class SubCacheInterface(PMObject):
    __slots__ = 'prefix', 'timeout', 'cache'
    cache_name = "subcache"

    def __init__(self, prefix: str, timeout: int = 86400*7):
        self.prefix = prefix
        self.timeout = timeout
        self.cache = self.get_django_cache(self.cache_name)

    @property
    def key(self) -> str:
        return '{}-{}'.format(self.cache_name, self.prefix)

    def set(self, value):
        self.cache.set(self.key, dump(value, Dumper=Dumper), self.timeout)

    def get(self):
        cache = self.cache.get(self.key)
        return load(cache, Loader=Loader) if cache else None

    def clear(self):
        self.set(None)


class AnsibleCache(SubCacheInterface):
    cache_name = "ansible"


class PMAnsible(PMObject):
    __slots__ = ('execute_path', 'cache',)
    # Json regex
    _regex = re.compile(r"([\{\[\"]{1}.*[\}\]\"]{1})", re.MULTILINE | re.DOTALL)
    ref_name = 'object'
    cache_timeout = 86400*7

    class ExecutorClass(UnhandledExecutor):
        def execute(self, cmd: list, cwd: str):
            self.output = ""
            env = os.environ.copy()
            env.update(self.env)
            result = subprocess.check_output(
                cmd, stderr=self._stderr,
                bufsize=0, universal_newlines=True,
                cwd=cwd, env=env,
                close_fds=ON_POSIX
            )
            self.output = result
            return self.output

    def __init__(self, execute_path: str = '/tmp/'):
        self.execute_path = execute_path

    def get_ansible_cache(self):
        if not hasattr(self, 'cache'):
            self.cache = AnsibleCache(self.get_ref(cache=True), self.cache_timeout)
        return self.cache

    def _get_only_json(self, output):
        return json.loads(self._regex.findall(output)[0])

    def get_ref(self, cache=False):
        ref = self.ref_name
        if cache:
            ref += '-python{}'.format(sys.version_info[0])
        return ref

    def get_args(self):
        return self.pm_ansible(self.get_ref())

    def get_data(self):
        cache = self.get_ansible_cache()
        result = cache.get()
        if result is None:
            cmd = self.ExecutorClass(stderr=UnhandledExecutor.DEVNULL)
            cmd_command = self.get_args()
            cmd.execute(cmd_command, self.execute_path)
            result = self._get_only_json(cmd.output)
            cache.set(result)
        return result

    def clear_cache(self):
        self.get_ansible_cache().clear()


class AnsibleArgumentsReference(PMAnsible):
    __slots__ = 'raw_dict', 'version'

    ref_name = 'reference'
    # Excluded args from user calls
    _EXCLUDE_ARGS = [
        # Excluded because we use this differently in code
        # 'verbose', 'inventory-file', 'inventory', 'module-name',
        'inventory-file', 'module-name',
        # Excluded because now we could not send any to worker proccess
        'ask-sudo-pass', 'ask-su-pass', 'ask-pass',
        'ask-vault-pass', 'ask-become-pass',
    ]

    def __init__(self):
        super(AnsibleArgumentsReference, self).__init__()
        self.raw_dict = self._extract_from_cli()

    def is_valid_value(self, command: str, argument: str, value):
        argument = argument.replace('_', '-')
        argument_data = self.raw_dict[command][argument]
        mtype = argument_data["type"]
        if mtype == 'int':
            int(value)
        elif mtype is not None and value is None:  # nocv
            raise AssertionError("This argument should have value")
        return True

    def validate_args(self, command: str, args):
        argument = None
        try:
            for argument, value in args.items():
                self.is_valid_value(command, argument, value)
        except (KeyError, ValueError, AssertionError) as e:
            from django.core.validators import ValidationError
            raise ValidationError({
                command: "Incorrect argument: {}.".format(str(e)),
                'argument': argument
            })

    def get_args(self):
        cmd = super(AnsibleArgumentsReference, self).get_args()
        for cmd_name in self._EXCLUDE_ARGS:
            cmd += ['--exclude', cmd_name]
        return cmd

    def _extract_from_cli(self):
        '''
        Format dict with args for API

        :return: args for ansible cli
        :rtype: dict
        '''
        # pylint: disable=protected-access,
        data = self.get_data()
        self.version = data['version']
        result = data['keywords'].copy()
        result['module']['group'] = {"type": "string", "help": ""}
        result['periodic_playbook'] = result['playbook']
        result['periodic_module'] = result['module']
        return result


class AnsibleModules(PMAnsible):
    __slots__ = 'detailed', 'key', 'module_paths'
    ref_name = 'modules'

    def __init__(self, detailed=False, paths=None):
        super(AnsibleModules, self).__init__()
        self.detailed = detailed
        self.key = None
        self.module_paths = paths

    def get_args(self):  # nocv
        cmd = super(AnsibleModules, self).get_args()
        cmd += ['--cachedir', 'NoCache']
        if self.detailed:
            cmd += ['--detail']
        if self.key:
            cmd += ['--get', self.key]
        if isinstance(self.module_paths, (tuple, list)):
            for path in self.module_paths:
                cmd += ['--path', path]
        return cmd

    def get_ref(self, cache=False):
        ref = super(AnsibleModules, self).get_ref(cache)
        if cache and self.key:
            ref += '-{}'.format(self.key)
        if cache and self.detailed:
            ref += '-detailed'
        return ref

    def all(self):
        self.key = None
        return self.get()

    def get(self, key=""):
        self.key = key
        return self.get_data()


class AnsibleInventoryParser(PMAnsible):
    __slots__ = ('path',)
    ref_name = 'inventory_parser'

    def get_ansible_cache(self):
        cache = super(AnsibleInventoryParser, self).get_ansible_cache()
        cache.get = lambda: None
        cache.set = lambda value: None
        return cache

    def get_args(self):
        args = super(AnsibleInventoryParser, self).get_args()
        args += [self.path]
        return args

    def get_inventory_data(self, raw_data):
        with tmp_file_context(data=raw_data) as tmp_file:
            self.path = tmp_file.name
            return self.get_data()


class AnsibleConfigParser(PMAnsible):
    ref_name = 'config'
