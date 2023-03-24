# pylint: disable=invalid-name,ungrouped-imports
from __future__ import unicode_literals
from functools import partial

import logging
import os
import subprocess

import sys
import re
import json
from os.path import dirname
from django.conf import settings
from django.utils import timezone
from django.db import transaction

try:
    from yaml import CLoader as Loader, CDumper as Dumper, load, dump
except ImportError:  # nocv
    from yaml import Loader, Dumper, load, dump

from vstutils.tasks import TaskClass
from vstutils.utils import (
    tmp_file_context,
    BaseVstObject,
    Executor,
    UnhandledExecutor,
    ON_POSIX,
    translate as _
)
from vstutils.models.cent_notify import Notificator
from vstutils.utils import ObjectHandlers
from vstutils.utils import raise_context


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

        self.kwargs["name"] = self.kwargs["__name__"] = "{c.__module__}.{c.__name__}".format(c=task_cls)
        self.kwargs["base"] = TaskClass

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
        super().__init__()
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
        self.cache.delete(self.key)


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
                cmd, stderr=self.__stderr__,
                bufsize=0, universal_newlines=True,
                cwd=cwd, env=env,
                close_fds=ON_POSIX
            )
            self.output = result
            return self.output

    def __init__(self, execute_path: str = '/tmp/'):
        super().__init__()
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
        # Excluded because now we could not send any to worker process
        'ask-sudo-pass', 'ask-su-pass', 'ask-pass',
        'ask-vault-pass', 'ask-become-pass',
    ]

    def __init__(self):
        super().__init__()
        self.raw_dict = self._extract_from_cli()

    def get_args(self):
        cmd = super().get_args()
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
        super().__init__()
        self.detailed = detailed
        self.key = None
        self.module_paths = paths

    def get_args(self):  # nocv
        cmd = super().get_args()
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
        ref = super().get_ref(cache)
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
        cache = super().get_ansible_cache()
        cache.get = lambda: None
        cache.set = lambda value: None
        return cache

    def get_args(self):
        args = super().get_args()
        args += [self.path]
        return args

    def get_inventory_data(self, raw_data):
        with tmp_file_context(data=raw_data) as tmp_file:
            self.path = tmp_file.name
            return self.get_data()


class AnsibleConfigParser(PMAnsible):
    ref_name = 'config'


class PolemarchNotificator(Notificator):
    def create_notification_from_instance(self, instance):
        super().create_notification_from_instance(instance)
        # pylint: disable=protected-access
        if instance.__class__._meta.label in settings.NOTIFY_WITHOUT_QUEUE_MODELS and self.label != 'history_lines':
            self.send()


class ExecutionHandlers(ObjectHandlers):
    __slots__ = ()

    def execute(self, plugin: str, project, execute_args, **kwargs):
        if project.status != 'OK':
            raise project.SyncError(_('Project not synchronized.'))

        from ..main.models.utils import validate_inventory_arguments  # pylint: disable=import-outside-toplevel
        validate_inventory_arguments(plugin, execute_args, project)

        task_class = project.task_handlers.backend('EXECUTION')

        history = self.create_history(
            project,
            plugin,
            execute_args=execute_args,
            initiator=kwargs.pop('initiator', 0),
            initiator_type=kwargs.pop('initiator_type', 'project'),
            executor=kwargs.pop('executor', None),
            save_result=kwargs.pop('save_result', True),
            options=kwargs.pop('options', {}),
        )

        with raise_context():
            execute_args['inventory'] = execute_args['inventory'].id

        task_kwargs = {
            'plugin': plugin,
            'project_id': project.id,
            'history_id': history.id if history is not None else None,
            'execute_args': execute_args,
        }

        if settings.TESTS_RUN:  # TODO: do something better?
            task_class.do(**task_kwargs)
        else:
            transaction.on_commit(partial(task_class.do, **task_kwargs))  # nocv

        return history

    def create_history(self, project, plugin, execute_args, **kwargs):
        if not kwargs['save_result']:
            return None

        plugin_class = self.backend(plugin)

        mode = f'[{plugin} plugin]'
        if plugin_class.arg_shown_on_history_as_mode is not None:
            mode = execute_args.get(plugin_class.arg_shown_on_history_as_mode, mode)

        inventory = None
        if plugin_class.arg_shown_on_history_as_inventory is not None:
            inventory_field_name = plugin_class.arg_shown_on_history_as_inventory
            inventory = execute_args.get(inventory_field_name, None)
            if isinstance(inventory, str):
                execute_args['inventory'] = inventory
                inventory = None
            elif isinstance(inventory, int):
                inventory = project.inventories.get(id=inventory)

        return project.history.create(
            status='DELAY',
            mode=mode,
            start_time=timezone.now(),
            inventory=inventory,
            project=project,
            kind=plugin,
            raw_stdout='',
            execute_args=execute_args,
            initiator=kwargs['initiator'],
            initiator_type=kwargs['initiator_type'],
            executor=kwargs['executor'],
            hidden=project.hidden,
            options=kwargs['options'],
        )

    def get_compatible_inventory_plugins(self, name: str):
        return self.opts(name).get('COMPATIBLE_INVENTORY_PLUGINS', {})

    def get_plugin_object(self, name: str):
        return self.backend(name)(options=self.opts(name))

    def get_serializer_class(self, name: str):
        return self.get_plugin_object(name).get_serializer_class()

    def get_object(self, plugin: str, project, history, **exec_args):  # noee
        from .models.utils import PluginExecutor  # pylint: disable=import-outside-toplevel

        return PluginExecutor(plugin, self.backend(plugin), self.opts(plugin), project, history, exec_args)


class InventoryPluginHandlers(ObjectHandlers):
    __slots__ = ()

    def get_object(self, name: str):
        return self[name](options=self.opts(name))

    def get_serializer_import_class(self, name: str):
        return self.get_object(name).get_serializer_import_class()

    def get_serializer_class(self, name: str):
        return self.get_object(name).get_serializer_class()
