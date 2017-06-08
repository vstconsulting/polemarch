# pylint: disable=invalid-name
from __future__ import unicode_literals

import sys
import tempfile
import time
import traceback
import os
from os.path import dirname

import six
from django.conf import settings
from django.core.cache import caches, InvalidCacheBackendError
from django.core.paginator import Paginator as BasePaginator
from django.template import loader
from django.utils import translation

from . import exceptions as ex


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
    module = __import__(path[0:m_len], globals(), locals(), [class_name])
    return getattr(module, class_name)


def project_path():
    '''
    Get full system path to polemarch project

    :return: -- string with full system path
    :rtype: str
    '''
    if hasattr(sys, "frozen"):
        return dirname(dirname(sys.executable))
    return dirname(dirname(__file__))


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


class tmp_file(object):
    '''
    Temporary file with name
    generated and auto removed on close.
    '''
    def __init__(self, mode="w", bufsize=0, **kwargs):
        '''
        tmp_file constructor

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


class Lock(object):
    '''
    Lock class for multi-jobs workflow.

    .. note::
        - Used django.core.cache lib and settings in `settings.py`
        - Have Lock.SCHEDULER and Lock.GLOBAL id
    '''
    TIMEOUT = 60*60*24
    GLOBAL = "global-deploy"
    SCHEDULER = "celery-beat"

    class AcquireLockException(ex.PMException):
        pass

    try:
        cache = caches["locks"]
    except InvalidCacheBackendError:
        cache = caches["default"]

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
        self.timeout = timeout if timeout else self.TIMEOUT
        self.id, start = None, time.time()
        while time.time() - start <= repeat:
            if self.cache.add(id, payload, self.timeout):
                self.id = id
                return
            time.sleep(0.01)
        raise self.AcquireLockException(err_msg)

    def prolong(self):
        payload = self.cache.get(self.id)
        self.cache.set(self.id, payload, self.timeout)

    def __enter__(self):
        return self

    def __exit__(self, type_e, value, tb):
        self.release()

    def release(self):
        self.cache.delete(self.id)

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
            raise ex.UnknownModelHandlerException(msg)

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
        self._verbose = kwargs.pop("verbose", False)
        self._excepts = tuple(args)

    def __enter__(self):
        return self  # pragma: no cover

    def __exit__(self, exc_type, exc_val, exc_tb):
        return exc_type is not None and not issubclass(exc_type, self._excepts)


# noinspection PyUnreachableCode
class raise_context(assertRaises):

    def execute(self, func, *args, **kwargs):
        with self.__class__(self._excepts, verbose=self._verbose):
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
        if streams:
            self._streams = streams
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
