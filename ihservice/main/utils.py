# pylint: disable=invalid-name
import sys
import tempfile
import time
import traceback
from os.path import dirname

import six
from django.conf import settings
from django.core.cache import cache
from django.core.paginator import Paginator as BasePaginator
from django.template import loader
from django.utils import translation


def project_path():
    if hasattr(sys, "frozen"):
        return dirname(dirname(sys.executable))
    return dirname(dirname(__file__))


def get_render(name, data, trans='en'):
    translation.activate(trans)
    config = loader.get_template(name)
    result = config.render(data).replace('\r', '')
    translation.deactivate()
    return result


class tmp_file(object):
    def __init__(self, mode="w", bufsize=0):
        kw = not six.PY3 and {"bufsize": bufsize} or {}
        fd = tempfile.NamedTemporaryFile(mode, **kw)
        self.fd = fd

    def write(self, wr_string):
        result = self.fd.write(wr_string)
        self.fd.flush()
        return result

    def __getattr__(self, name):
        return getattr(self.fd, name)

    def __del__(self):
        self.fd.close()


class Lock(object):

    TIMEOUT = 60*60*24
    GLOBAL = "global-deploy"

    class AcquireLockException(Exception):
        pass

    def __init__(self, id, payload=None, repeat=1, err_msg=""):
        self.id, start = None, time.time()
        while time.time() - start <= repeat:
            if cache.add(id, payload, self.TIMEOUT):
                self.id = id
                return
            time.sleep(0.01)
        raise self.AcquireLockException(err_msg)

    def __enter__(self):
        return self

    def __exit__(self, type_e, value, tb):
        self.release()

    def release(self):
        cache.delete(self.id)

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


class service_lock(__LockAbstractDecorator):
    _err = "Service locked. Wait until the end."

    def execute(self, func, *args, **kwargs):
        self._lock_key = kwargs.get('pk', None)
        return super(service_lock, self).execute(func, *args, **kwargs)


class assertRaises(object):
    def __init__(self, *args, **kwargs):
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


class _RedirectionOutput(object):
    _streams = []

    def __init__(self, new_output=six.StringIO()):
        self.output = new_output
        self._old_outputs = {}

    def __enter__(self):
        for stream in self._streams:
            self._old_outputs[stream] = getattr(sys, stream)
            setattr(sys, stream, self.output)
        return self.output

    def __exit__(self, exctype, excinst, exctb):
        for stream in self._streams:
            setattr(sys, stream, self._old_outputs.pop(stream))


class redirect_stdout(_RedirectionOutput):
    _streams = ["stdout"]


class redirect_stderr(_RedirectionOutput):
    _streams = ["stderr"]


class redirect_stdany(_RedirectionOutput):
    _streams = ["stdout", "stderr"]


class Paginator(BasePaginator):
    def __init__(self, qs, chunk_size=getattr(settings, "PAGE_LIMIT")):
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
