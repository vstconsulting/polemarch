# pylint: disable=invalid-name,ungrouped-imports
from __future__ import unicode_literals

import sys
import time
import traceback
from subprocess import CalledProcessError, Popen, PIPE, STDOUT
from threading import Thread

import os
import re
import tempfile
from os.path import dirname
from collections import OrderedDict
try:
    from Queue import Queue, Empty
except ImportError:  # nocv
    from queue import Queue, Empty

import six
try:
    from yaml import CLoader as Loader, load
except ImportError:  # nocv
    from yaml import Loader, load
from django.conf import settings
from django.core.cache import caches, InvalidCacheBackendError
from django.core.paginator import Paginator as BasePaginator
from django.core.validators import ValidationError
from django.template import loader
from django.utils import translation
from ansible import modules as ansible_modules, __version__ as ansible_version
from ansible.cli.adhoc import AdHocCLI
from ansible.cli.playbook import PlaybookCLI

from . import exceptions as ex
from . import __file__ as file


def import_class(path):
    '''
    Get class from string-path

    :param path: -- string containing full python-path
    :type path: str
    :return: -- return class or module in path
    :rtype: class, module, object
    '''
    m_len = path.rfind(".")
    class_name = path[m_len + 1:len(path)]
    try:
        module = __import__(path[0:m_len], globals(), locals(), [class_name])
        return getattr(module, class_name)
    except SystemExit:
        return None  # nocv


def project_path():
    '''
    Get full system path to polemarch project

    :return: -- string with full system path
    :rtype: str
    '''
    return dirname(dirname(file))  # nocv


def get_render(name, data, trans='en'):
    '''
    Render string based on template

    :param name: -- full template name
    :type name: str
    :param data: -- dict of rendered vars
    :type data: dict
    :param trans: -- translation for render. Default 'en'.
    :type trans: str
    :return: -- rendered string
    :rtype: str
    '''
    translation.activate(trans)
    config = loader.get_template(name)
    result = config.render(data).replace('\r', '')
    translation.deactivate()
    return result


class CmdExecutor(object):
    # pylint: disable=no-member
    '''
    Command executor with realtime output write
    '''
    CANCEL_PREFIX = "CANCEL_EXECUTE_"
    newlines = ['\n', '\r\n', '\r']

    def __init__(self):
        self.output = None

    def write_output(self, line):
        '''
        :param line: -- line from command output
        :type line: str
        :return: None
        :rtype: None
        '''
        self.output += line

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


class tmp_file(object):
    '''
    Temporary file with name
    generated and auto removed on close.
    '''
    def __init__(self, data="", mode="w", bufsize=0, **kwargs):
        '''
        tmp_file constructor

        :param data: -- string to write in tmp file.
        :type data: str
        :param mode: -- file open mode. Default 'w'.
        :type mode: str
        :param bufsize: -- bufer size for tempfile.NamedTemporaryFile
        :type bufsize: int
        :param kwargs:  -- other kwargs for tempfile.NamedTemporaryFile
        '''
        kw = not six.PY3 and {"bufsize": bufsize} or {}
        kwargs.update(kw)
        fd = tempfile.NamedTemporaryFile(mode, **kwargs)
        self.fd = fd
        if data:
            self.write(data)

    def write(self, wr_string):
        '''
        Write to file and flush

        :param wr_string: -- writable string
        :type wr_string: str
        :return: None
        :rtype: None
        '''
        result = self.fd.write(wr_string)
        self.fd.flush()
        return result

    def __getattr__(self, name):
        return getattr(self.fd, name)

    def __del__(self):
        self.fd.close()

    def __enter__(self):
        '''
        :return: -- file object
        :rtype: tempfile.NamedTemporaryFile
        '''
        return self

    def __exit__(self, type_e, value, tb):
        self.fd.close()
        if value is not None:
            return False


class tmp_file_context(object):
    '''
    Context object for work with tmp_file.
    Auto close on exit from context and
    remove if file stil exist.
    '''
    def __init__(self, *args, **kwargs):
        self.tmp = tmp_file(*args, **kwargs)

    def __enter__(self):
        return self.tmp

    def __exit__(self, type_e, value, tb):
        self.tmp.close()
        if os.path.exists(self.tmp.name):
            os.remove(self.tmp.name)


class KVExchanger(object):
    '''
    Class for transmit data using key-value fast (cache-like) storage between
    Polemarch's services. Uses same cache-backend as Lock.
    '''
    TIMEOUT = 60
    PREFIX = "polemarch_exchange_"

    try:
        cache = caches["locks"]
    except InvalidCacheBackendError:
        cache = caches["default"]

    def __init__(self, key, timeout=None):
        self.key = self.PREFIX + str(key)
        self.timeout = timeout or self.TIMEOUT

    def send(self, value, ttl=None):
        return self.cache.add(self.key, value, ttl or self.timeout)

    def prolong(self):
        payload = self.cache.get(self.key)
        self.cache.set(self.key, payload, self.timeout)

    def get(self):
        value = self.cache.get(self.key)
        self.cache.delete(self.key)
        return value


class Lock(KVExchanger):
    '''
    Lock class for multi-jobs workflow.

    .. note::
        - Used django.core.cache lib and settings in `settings.py`
        - Have Lock.SCHEDULER and Lock.GLOBAL id
    '''
    TIMEOUT = 60*60*24
    GLOBAL = "global-deploy"
    SCHEDULER = "celery-beat"
    PREFIX = "polemarch_lock_"

    class AcquireLockException(ex.PMException):
        pass

    def __init__(self, id, payload=None, repeat=1, err_msg="",
                 timeout=None):
        # pylint: disable=too-many-arguments
        '''
        :param id: -- unique id for lock.
        :type id: int,str
        :param payload: -- lock additional info.
        :param repeat: -- time to wait lock.release. Default 1 sec.
        :type repeat: int
        :param err_msg: -- message for AcquireLockException error.
        :type err_msg: str
        '''
        super(Lock, self).__init__(id, timeout)
        self.id, start = None, time.time()
        while time.time() - start <= repeat:
            if self.send(payload):
                self.id = id
                return
            time.sleep(0.01)
        raise self.AcquireLockException(err_msg)

    def __enter__(self):
        return self

    def __exit__(self, type_e, value, tb):
        self.release()

    def release(self):
        self.cache.delete(self.key)

    def __del__(self):
        self.release()


class __LockAbstractDecorator(object):
    _err = "Wait until the end."
    _lock_key = None

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.kwargs["err_msg"] = self.kwargs.get("err_msg", self._err)

    def execute(self, func, *args, **kwargs):
        if self._lock_key is not None:
            with Lock(self._lock_key, **self.kwargs):
                return func(*args, **kwargs)
        return func(*args, **kwargs)

    def __call__(self, original_function):
        def wrapper(*args, **kwargs):
            return self.execute(original_function, *args, **kwargs)
        return wrapper


class model_lock_decorator(__LockAbstractDecorator):
    '''
    Decorator for functions where 'pk' kwarg exist
    for lock by id.

    .. warning::
        - On locked error raised ``Lock.AcquireLockException``
        - Method must have and called with ``pk`` named arg.

    '''
    _err = "Object locked. Wait until unlock."

    def execute(self, func, *args, **kwargs):
        self._lock_key = kwargs.get('pk', None)
        return super(model_lock_decorator, self).execute(func, *args, **kwargs)


class ModelHandlers(object):
    '''
    Handlers for some models like 'INTEGRATIONS' or 'REPO_BACKENDS'.
    All handlers backends get by first argument model object.

    **Attributes**:

    :param objects: -- dict of objects like: ``{<name>: <backend_class>}``
    :type objects: dict
    :param keys: -- names of supported backends
    :type keys: list
    :param values: -- supported backends classes
    :type values: list

    '''
    def __init__(self, tp, err_message=None):
        '''
        :param tp: -- type name for backends.Like name in dict.
        :type tp: str
        '''
        self.type = tp
        self.err_message = err_message
        self._list = getattr(settings, self.type, {})

    @property
    def objects(self):
        return {name: self[name] for name in self.list()}

    def __len__(self):  # pragma: no cover
        return len(self.objects)

    def __iter__(self):
        return iter(self.items())

    def __getitem__(self, name):
        return self.backend(name)

    def __call__(self, name, obj):
        return self.get_object(name, obj)

    def __dict__(self):  # pragma: no cover
        return self.items()

    def keys(self):
        return dict(self.objects).keys()

    def values(self):  # pragma: no cover
        return dict(self).values()

    def items(self):
        return self.objects.items()

    def list(self):
        return self._list

    def backend(self, name):
        '''
        Get backend class

        :param name: -- name of backend type
        :type name: str
        :return: class of backend
        :rtype: class,module,object
        '''
        try:
            backend = self.list()[name].get('BACKEND', None)
            if backend is None:
                raise ex.PMException("Backend is 'None'.")  # pragma: no cover
            return import_class(backend)
        except KeyError or ImportError:
            msg = "{} ({})".format(name, self.err_message) if self.err_message\
                                                           else name
            raise ex.UnknownTypeException(msg)

    def opts(self, name):
        return self.list().get(name, {}).get('OPTIONS', {})

    def get_object(self, name, obj):
        '''
        :param name: -- string name of backend
        :param name: str
        :param obj: -- model object
        :type obj: django.db.models.Model
        :return: backend object
        :rtype: object
        '''
        return self[name](obj, **self.opts(name))


class assertRaises(object):
    '''
    Context for exclude rises
    '''
    def __init__(self, *args, **kwargs):
        '''
        :param args: -- list of exception classes
        :type args: list,Exception
        :param verbose: -- logging
        :type verbose: bool
        '''
        self._kwargs = dict(**kwargs)
        self._verbose = kwargs.pop("verbose", False)
        self._exclude = kwargs.pop("exclude", False)
        self._excepts = tuple(args)

    def __enter__(self):
        return self  # pragma: no cover

    def __exit__(self, exc_type, exc_val, exc_tb):
        return exc_type is not None and (
            (not self._exclude and not issubclass(exc_type, self._excepts)) or
            (self._exclude and issubclass(exc_type, self._excepts))
        )


# noinspection PyUnreachableCode
class raise_context(assertRaises):

    def execute(self, func, *args, **kwargs):
        with self.__class__(self._excepts, **self._kwargs):
            return func(*args, **kwargs)
        return sys.exc_info()

    def __enter__(self):
        return self.execute

    def __call__(self, original_function):
        def wrapper(*args, **kwargs):
            return self.execute(original_function, *args, **kwargs)

        return wrapper


class exception_with_traceback(raise_context):
    def __init__(self, *args, **kwargs):
        super(exception_with_traceback, self).__init__(**kwargs)

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val is not None:
            exc_val.traceback = traceback.format_exc()
            six.reraise(exc_type, exc_val, exc_tb)


class redirect_stdany(object):
    '''
    Context for redirect any output to own stream.

    .. note::
        - On context return stream object.
        - On exit return old streams
    '''
    _streams = ["stdout", "stderr"]

    def __init__(self, new_stream=six.StringIO(), streams=None):
        '''
        :param new_stream: -- stream where redirects all
        :type new_stream: object
        :param streams: -- names of streams like ``['stdout', 'stderr']``
        :type streams: list
        '''
        self._streams = streams or self._streams
        self.stream = new_stream
        self._old_streams = {}

    def __enter__(self):
        for stream in self._streams:
            self._old_streams[stream] = getattr(sys, stream)
            setattr(sys, stream, self.stream)
        return self.stream

    def __exit__(self, exctype, excinst, exctb):
        for stream in self._streams:
            setattr(sys, stream, self._old_streams.pop(stream))


class Paginator(BasePaginator):
    '''
    Class for fragmenting the query for small queries.
    '''
    def __init__(self, qs, chunk_size=getattr(settings, "PAGE_LIMIT")):
        '''
        :param qs: -- queryset for fragmenting
        :type qs: django.db.models.QuerySet
        :param chunk_size: -- size of the fragments.
        :type chunk_size: int
        '''
        super(Paginator, self).__init__(qs, chunk_size)

    def __iter__(self):
        for page in range(1, self.num_pages + 1):
            yield self.page(page)

    def items(self):
        for page in self:
            for obj in page.object_list:
                obj.paginator = self
                obj.page = page
                yield obj


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
        'verbose', 'inventory-file', 'module-name',
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
