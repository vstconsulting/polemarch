# pylint: disable=invalid-name,ungrouped-imports
from __future__ import unicode_literals

import logging
from subprocess import CalledProcessError, Popen, PIPE, STDOUT
from threading import Thread

import sys
import os
import re
import json
from os.path import dirname
try:
    from Queue import Queue
except ImportError:  # nocv
    from queue import Queue

try:
    from yaml import CLoader as Loader, CDumper as Dumper, load, dump
except ImportError:  # nocv
    from yaml import Loader, Dumper, load, dump

from vstutils.utils import raise_context
from vstutils.utils import tmp_file_context

from . import __file__ as file


logger = logging.getLogger('polemarch')


def project_path():
    '''
    Get full system path to polemarch project

    :return: -- string with full system path
    :rtype: str
    '''
    return dirname(dirname(file))  # nocv


class PMObject(object):
    __slots__ = '__pm_ansible__', '__django_settings__'

    def pm_ansible(self, *args):
        # pylint: disable=access-member-before-definition
        if hasattr(self, '__pm_ansible__'):
            return list(self.__pm_ansible__) + list(args)
        self.__pm_ansible__ = self.get_django_settings('EXECUTOR')
        return self.pm_ansible(*args)

    def get_django_settings(self, name, default=None):
        # pylint: disable=access-member-before-definition
        if hasattr(self, '__django_settings__'):
            return getattr(self.__django_settings__, name, default)
        from django.conf import settings
        self.__django_settings__ = settings
        return self.get_django_settings(name)


class CmdExecutor(PMObject):
    # pylint: disable=no-member
    '''
    Command executor with realtime output write
    '''
    __slots__ = 'output', '_stdout', '_stderr'

    CANCEL_PREFIX = "CANCEL_EXECUTE_"
    newlines = ['\n', '\r\n', '\r']

    def __init__(self, stdout=PIPE, stderr=STDOUT):
        '''

        :type stdout: BinaryIO,int
        :type stderr: BinaryIO,int
        '''
        self.output = ''
        self._stdout = stdout
        self._stderr = stderr if stderr != STDOUT else self._stdout

    def write_output(self, line):
        '''
        :param line: -- line from command output
        :type line: str
        :return: None
        :rtype: None
        '''
        self.output += str(line)

    def _enqueue_output(self, out, queue):
        try:
            line = out.readline()
            while len(line):
                queue.put(line)
                line = out.readline()
        finally:
            out.close()

    def working_handler(self, proc):
        # pylint: disable=unused-argument
        '''
        Additional handler for executions.

        :type proc: subprocess.Popen
        '''

    def _unbuffered(self, proc, stream='stdout'):
        stream = getattr(proc, stream)
        queue = Queue()
        t = Thread(target=self._enqueue_output, args=(stream, queue))
        t.start()
        while True:
            try:
                self.working_handler(proc)
                yield queue.get(timeout=0.001).rstrip()
            except:
                if queue.empty() and stream.closed:
                    break

    def line_handler(self, proc, line):
        # pylint: disable=unused-argument
        if line is not None:
            with raise_context():
                self.write_output(line)

    def execute(self, cmd, cwd):
        '''
        Execute commands and output this

        :param cmd: -- list of cmd command and arguments
        :type cmd: list
        :param cwd: -- workdir for executions
        :type cwd: str
        :return: -- string with full output
        :rtype: str
        '''
        self.output = ""
        proc = Popen(
            cmd, stdout=self._stdout, stderr=self._stderr,
            bufsize=0, universal_newlines=True, cwd=cwd
        )
        for line in self._unbuffered(proc):
            if self.line_handler(proc, line):
                break  # nocv
        return_code = proc.poll()
        if return_code:
            logger.error(self.output)
            raise CalledProcessError(return_code, cmd, output=self.output)
        return self.output


class task(object):
    ''' Decorator for Celery task classes

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
    '''
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
        '''
        :param app: -- CeleryApp object
        :type app: celery.Celery
        :param args: -- any args for tasks
        :param kwargs: -- any kwargs for tasks
        '''
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

    def __init__(self, prefix, timeout=86400*7):
        from django.core.cache import caches, InvalidCacheBackendError
        self.prefix = prefix
        self.timeout = timeout
        try:
            self.cache = caches[self.cache_name]
        except InvalidCacheBackendError:
            self.cache = caches["default"]

    @property
    def key(self):
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
    __slots__ = 'execute_path', 'cache',
    # Json regex
    _regex = re.compile(r"([\{\[][^\w\d\.].*[\}\]]$)", re.MULTILINE)
    ref_name = 'object'
    cache_timeout = 86400*7

    def __init__(self, execute_path='/tmp/'):
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
            with open(os.devnull, 'wb') as DEVNULL:
                cmd = CmdExecutor(stderr=DEVNULL)
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

    def is_valid_value(self, command, argument, value):
        argument = argument.replace('_', '-')
        argument_data = self.raw_dict[command][argument]
        mtype = argument_data["type"]
        if mtype == 'int':
            int(value)
        elif mtype is not None and value is None:  # nocv
            raise AssertionError("This argument should have value")
        return True

    def validate_args(self, command, args):
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
    __slots__ = 'path',
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
