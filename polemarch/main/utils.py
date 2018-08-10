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
    from Queue import Queue, Empty
except ImportError:  # nocv
    from queue import Queue, Empty

try:
    from yaml import CLoader as Loader, CDumper as Dumper, load, dump
except ImportError:  # nocv
    from yaml import Loader, Dumper, load, dump
from django.core.cache import caches, InvalidCacheBackendError
from django.core.validators import ValidationError

from . import __file__ as file


logger = logging.getLogger('polemarch')


def project_path():
    '''
    Get full system path to polemarch project

    :return: -- string with full system path
    :rtype: str
    '''
    return dirname(dirname(file))  # nocv


class CmdExecutor(object):
    # pylint: disable=no-member
    '''
    Command executor with realtime output write
    '''
    CANCEL_PREFIX = "CANCEL_EXECUTE_"
    newlines = ['\n', '\r\n', '\r']

    def __init__(self, stdout=PIPE, stderr=STDOUT):
        self.output = ''
        self._stdout = stdout
        self._stderr = stderr

    def write_output(self, line):
        '''
        :param line: -- line from command output
        :type line: str
        :return: None
        :rtype: None
        '''
        self.output += str(line)

    def _enqueue_output(self, out, queue):
        line = out.readline()
        while len(line):
            queue.put(line)
            line = out.readline()
        out.close()

    def _unbuffered(self, proc, stream='stdout'):
        stream = getattr(proc, stream)
        q = Queue()
        t = Thread(target=self._enqueue_output, args=(stream, q))
        t.start()
        timeout = 0
        working = True
        while working:
            try:
                line = q.get(timeout=timeout).rstrip()
                timeout = 0
            except Empty:
                line = None
                timeout = 1
                working = not stream.closed
            yield line

    def line_handler(self, proc, line):
        # pylint: disable=unused-argument
        if line is not None:
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
            universal_newlines=True, cwd=cwd
        )
        for line in self._unbuffered(proc):
            if self.line_handler(proc, line):
                break
        retcode = proc.poll()
        if retcode:
            raise CalledProcessError(retcode, cmd, output=self.output)
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


class BaseTask(object):
    '''
    BaseTask class for all tasks.
    '''
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
        ''' Method with task logic. '''
        # pylint: disable=notimplemented-raised,
        raise NotImplemented


class AnsibleCache(object):
    def __init__(self, prefix, timeout=86400*7):
        self.prefix = prefix
        self.timeout = timeout
        try:
            self.cache = caches["ansible"]
        except InvalidCacheBackendError:
            self.cache = caches["default"]

    @property
    def key(self):
        return 'ansible-{}'.format(self.prefix)

    def set(self, value):
        self.cache.set(self.key, dump(value, Dumper=Dumper), self.timeout)

    def get(self):
        return load(self.cache.get(self.key) or '', Loader=Loader)

    def clear(self):
        self.set(None)


class PMAnsible(object):
    # Json regex
    _regex = re.compile(r"([\{\[][^\w\d\.].*[\}\]]$)", re.MULTILINE)
    ref_name = 'object'

    def get_ansible_cache(self):
        return AnsibleCache(self.get_ref(cache=True))

    def _get_only_json(self, output):
        return json.loads(self._regex.findall(output)[0])

    def get_ref(self, cache=False):
        ref = self.ref_name
        if cache:
            ref += '-python{}'.format(sys.version_info[0])
        return ref

    def get_args(self):
        python_exec = sys.executable or 'python'
        return [python_exec, '-W', 'ignore', '-m', 'pm_ansible', self.get_ref()]

    def get_data(self):
        cache = self.get_ansible_cache()
        result = cache.get()
        if result is None:
            with open(os.devnull, 'wb') as DEVNULL:
                cmd = CmdExecutor(stderr=DEVNULL)
                cmd_command = self.get_args()
                cmd.execute(cmd_command, '/tmp/')
            result = self._get_only_json(cmd.output)
            cache.set(result)
        return result

    def clear_cache(self):
        self.get_ansible_cache().clear()


class AnsibleArgumentsReference(PMAnsible):
    ref_name = 'reference'
    # Type conversion for GUI fields
    _GUI_TYPES_CONVERSION = {
        "string": "text",
        "int": "integer",
        None: "boolean",
        "choice": "text",
    }
    # Types with different conversion to fields
    _GUI_TYPES_CONVERSION_DIFFERENT = {
        "private-key": "keyfile",
        "key-file": "keyfile",
    }
    # Args for using in code, but hidden for users
    _HIDDEN_ARGS = ['group']
    # Excluded args from user calls
    _EXCLUDE_ARGS = [
        # Excluded because we use this differently in code
        # 'verbose', 'inventory-file', 'inventory', 'module-name',
        'inventory-file', 'module-name', 'verbose',
        # Excluded because now we could not send any to worker proccess
        'ask-sudo-pass', 'ask-su-pass', 'ask-pass',
        'ask-vault-pass', 'ask-become-pass',
    ]

    def __init__(self):
        self.raw_dict = self._extract_from_cli()

    def _cli_to_gui_type(self, argument, type_name):  # nocv
        if argument in self._GUI_TYPES_CONVERSION_DIFFERENT:
            return self._GUI_TYPES_CONVERSION_DIFFERENT[argument]
        if argument is not None and argument.endswith("-file"):
            return "textfile"
        return self._GUI_TYPES_CONVERSION[type_name]

    def _as_gui_dict_command(self, args):  # nocv
        cmd_result = {}
        for arg, info in args.items():
            if arg in self._HIDDEN_ARGS:
                continue
            cmd_result[arg] = dict(
                type=self._cli_to_gui_type(arg, info['type']),
                shortopts=info['shortopts'], help=info['help']
            )
        return cmd_result

    def is_valid_value(self, command, argument, value):
        argument = argument.replace('_', '-')
        mtype = self.raw_dict[command][argument]["type"]
        if mtype == 'int':
            int(value)
        elif mtype is not None and value is None:  # nocv
            raise AssertionError("This argument should have value")
        return True

    def validate_args(self, command, args):
        try:
            for argument, value in args.items():
                self.is_valid_value(command, argument, value)
        except (KeyError, ValueError, AssertionError) as e:
            raise ValidationError({
                command: "Incorrect argument: {}.".format(str(e)),
                'argument': argument
            })

    def as_gui_dict(self, wanted=""):  # nocv
        result = {}
        for cmd, args in self.raw_dict.items():
            if wanted == "" or cmd == wanted:
                result[cmd] = self._as_gui_dict_command(args)
        return result

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
        self.modules = data['modules']
        result = data['keywords'].copy()
        result['module']['group'] = {"type": "string", "help": ""}
        result['periodic_playbook'] = result['playbook']
        result['periodic_module'] = result['module']
        return result


class AnsibleModules(PMAnsible):
    ref_name = 'modules'

    def __init__(self, detailed=False):
        super(AnsibleModules, self).__init__()
        self.detailed = detailed
        self.key = None

    def get_args(self):  # nocv
        cmd = super(AnsibleModules, self).get_args()
        if self.detailed:
            cmd += ['--detail']
        if self.key:
            cmd += ['--get', self.key]
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
