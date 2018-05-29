# pylint: disable=invalid-name,ungrouped-imports
from __future__ import unicode_literals

import logging
from subprocess import CalledProcessError, Popen, PIPE, STDOUT
from threading import Thread

import os
import re
from os.path import dirname
from collections import OrderedDict
try:
    from Queue import Queue, Empty
except ImportError:  # nocv
    from queue import Queue, Empty

try:
    from yaml import CLoader as Loader, load
except ImportError:  # nocv
    from yaml import Loader, load
from django.core.cache import caches, InvalidCacheBackendError
from django.core.validators import ValidationError
from ansible import modules as ansible_modules, __version__ as ansible_version
from ansible.cli.adhoc import AdHocCLI
from ansible.cli.playbook import PlaybookCLI
from vstutils.utils import import_class

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

    def __init__(self):
        self.output = ''

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
        retry = {"r": True}  # one try after proc end to get rest of out
        while timeout == 0 or proc.poll() is None or retry.pop("r", False):
            try:
                line = q.get(timeout=timeout).rstrip()
                timeout = 0
            except Empty:
                line = None
                timeout = 1
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
        proc = Popen(cmd, stdout=PIPE, stderr=STDOUT,
                     universal_newlines=True, cwd=cwd)
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


class AnsibleArgumentsReference(object):
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
        'verbose', 'inventory-file', 'inventory', 'module-name',
        # Excluded because now we could not send any to worker proccess
        'ask-sudo-pass', 'ask-su-pass', 'ask-pass',
        'ask-vault-pass', 'ask-become-pass',
    ]

    def __init__(self):
        self.raw_dict = self._extract_from_cli()

    @property
    def clis(self):
        '''
        Ansible cli objects

        :return: dict with cli objects
        '''
        return {
            "module": AdHocCLI(args=["", "all"]),
            "playbook": PlaybookCLI(args=["", "none.yml"])
        }

    def _cli_to_gui_type(self, argument, type_name):
        if argument in self._GUI_TYPES_CONVERSION_DIFFERENT:
            return self._GUI_TYPES_CONVERSION_DIFFERENT[argument]
        if argument is not None and argument.endswith("-file"):
            return "textfile"
        return self._GUI_TYPES_CONVERSION[type_name]

    def _as_gui_dict_command(self, args):
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
        mtype = self.raw_dict[command][argument]["type"]
        if mtype == 'int':
            int(value)
        elif mtype is None and value not in [None, ""]:
            raise AssertionError("This argument shouldn't have value")
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

    def as_gui_dict(self, wanted=""):
        result = {}
        for cmd, args in self.raw_dict.items():
            if wanted == "" or cmd == wanted:
                result[cmd] = self._as_gui_dict_command(args)
        return result

    def __parse_option(self, option):
        # pylint: disable=protected-access,
        cli_result = dict()
        for name in option._long_opts:
            name = name[2:]
            if name in self._EXCLUDE_ARGS:
                continue
            shortopts = [opt[1:] for opt in option._short_opts]
            cli_result[name] = dict(
                type=option.type, help=option.help, shortopts=shortopts
            )
        return cli_result

    def __parse_cli(self, cli):
        # pylint: disable=protected-access,
        cli.parse()
        cli_result = {}
        for option in cli.parser._get_all_options():
            cli_result.update(self.__parse_option(option))
        return cli_result

    def _extract_from_cli(self):
        '''
        Format dict with args for API

        :return: args for ansible cli
        :rtype: dict
        '''
        # pylint: disable=protected-access,
        result = {
            name: self.__parse_cli(cli) for name, cli in self.clis.items()
        }
        result['module']['group'] = {"type": "string", "help": ""}
        result['periodic_playbook'] = result['playbook']
        result['periodic_module'] = result['module']
        return result


class Modules(object):
    mod = ansible_modules

    def __init__(self):
        self.clean()

    @property
    def mod_path(self):
        return self.mod.__path__[0] + "/"

    def _get_mod_list(self):
        # TODO: add cache between queries
        return self._modules_list

    def clean(self):
        self._modules_list = list()
        self._key_filter = None

    def _get_mods(self, files):
        return [
            f[:-3] for f in files
            if f[-3:] == ".py" and f[:-3] != "__init__" and "_" not in f[:2]
        ]

    def _get_info(self, key):  # nocv
        return key

    def _setup_key(self, key, files, search=None):
        _modules_list = list()
        _mods = self._get_mods(files)
        if _mods:
            for _mod in _mods:
                _mod_key = "{}.{}".format(key, _mod)
                if search is None or search.search(_mod_key):
                    info = self._get_info(_mod_key)
                    if info is not None:
                        _modules_list.append(info)
        return _modules_list

    def _filter(self, query):
        if self._key_filter == query:
            return self._get_mod_list()
        self.clean()
        self._key_filter = query
        search = re.compile(query, re.IGNORECASE) if query else None
        for path, sub_dirs, files in os.walk(self.mod_path):
            if "__pycache__" in sub_dirs:
                sub_dirs.remove("__pycache__")  # nocv
            key = path.replace(self.mod_path, "").replace("/", ".")
            self._modules_list += self._setup_key(key, files, search)
        return self._get_mod_list()

    def all(self):
        return self.get()

    def get(self, key=""):
        return self._filter(key)


class AnsibleModules(Modules):
    mod = ansible_modules

    default_fields = [
        'module',
        'short_description',
    ]

    try:
        cache = caches["ansible"]
    except InvalidCacheBackendError:
        cache = caches["default"]

    def __init__(self, detailed=False, fields=None):
        super(AnsibleModules, self).__init__()
        self.detailed = detailed
        fields = fields.split(',') if fields else self.default_fields
        self.fields = [field.strip() for field in fields if field.strip()]

    def _get_mod_info(self, key, sub):
        try:
            path = "{}.{}.{}".format(self.mod.__name__, key, sub)
            return import_class(path)
        except BaseException as exception_object:
            return exception_object

    def __get_detail_info_from_cache(self, key, data):
        cache_key = "cache_ansible_{}_{}".format(ansible_version, key)
        doc_data = self.cache.get(cache_key, None)
        if doc_data is None:  # nocv
            doc_data = load(data, Loader=Loader)
            self.cache.set(cache_key, doc_data, 86400*7)
        return doc_data

    def _get_info(self, key):
        data = self._get_mod_info(key, "DOCUMENTATION")
        if isinstance(data, BaseException) or data is None:
            return None
        if not self.detailed:
            return key
        result = OrderedDict(path=key)
        doc_data = self.__get_detail_info_from_cache(key, data)
        result["data"] = OrderedDict()
        for field in self.fields:
            result["data"][field] = doc_data.get(field, None)
        return result
