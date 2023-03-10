# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import contextlib
import threading
from typing import Any, Iterable, Type, Union, Optional
import time
import shutil
import logging
import tempfile
import traceback
import signal
from pathlib import Path
from collections import OrderedDict
from subprocess import Popen
from django.apps import apps
from django.utils import timezone
from django.conf import settings
from rest_framework.exceptions import ValidationError
from vstutils.utils import ObjectHandlers, translate as _

from .hosts import Inventory
from .history import History, Project
from ...main.utils import CmdExecutor
from ...plugins.history.base import BasePlugin as BaseHistoryPlugin
from ...plugins.execution.base import BasePlugin
from ..executions import PLUGIN_HANDLERS
from ..exceptions import IncompatibleError


logger = logging.getLogger("polemarch")


def ensure_inventory_is_from_project(inventory, project):  # pylint: disable=invalid-name
    if isinstance(inventory, Inventory):
        inventory_id = inventory.id
    else:
        return

    if not project.inventories.filter(id=inventory_id).exists():
        raise ValidationError('No Inventory matches the given query.')


def ensure_inventory_is_compatible(inventory, execution_plugin: str):
    if not isinstance(inventory, Inventory):
        return

    if inventory.plugin not in PLUGIN_HANDLERS.get_compatible_inventory_plugins(execution_plugin):
        raise IncompatibleError(_('Inventory plugin {} is not compatible with execution plugin {}.').format(
            inventory.plugin,
            execution_plugin,
        ))


class HistoryPluginHandler(ObjectHandlers):
    __slots__ = ()

    def __init__(self):
        super().__init__('HISTORY_PLUGIN_SETTINGS')

    def get_writers(self, history: History) -> Iterable[BaseHistoryPlugin]:
        for name in self.list():
            if name not in settings.HISTORY_OUTPUT_PLUGINS:
                continue  # nocv
            backend = self[name]
            if backend.writeable:
                yield backend(history, **self.opts(name))

    def get_reader(self, history: History) -> Optional[BaseHistoryPlugin]:
        backend = self[settings.HISTORY_READ_PLUGIN]
        if backend.readable:
            return backend(history, **self.opts(settings.HISTORY_READ_PLUGIN))


class DummyHistory:
    # pylint: disable=unused-argument
    def __init__(self, *args, **kwargs):
        self.mode = kwargs.get('mode', None)

    def __setattr__(self, key: str, value: Any) -> None:
        if key == 'raw_args':
            logger.info(value)

    def __getattr__(self, item: str) -> None:
        return None  # nocv

    @property
    def raw_stdout(self) -> str:
        return ""  # nocv

    @raw_stdout.setter
    def raw_stdout(self, value: str) -> None:
        logger.info(value)  # nocv

    def get_hook_data(self, when: str) -> None:
        return None

    def write_line(self, value: str, number: int, endl: str = ''):  # nocv
        # pylint: disable=unused-argument
        logger.info(value)

    def save(self) -> None:
        pass


class Executor(CmdExecutor):
    __slots__ = (
        'history',
        'counter',
        'notificator',
        'notificator_lock',
        'notification_last_time',
        'must_die',
        'writers',
    )

    def __init__(self, history: Union[History, DummyHistory], writers: tuple = ()):
        super().__init__()
        self.history = history
        self.counter = 0
        self.writers = writers
        if isinstance(history, DummyHistory):
            self.notificator = None
        else:
            notificator_class = apps.get_app_config('vstutils_api').module.notificator_class
            self.notificator = notificator_class([], label='history_lines')
            self.notificator_lock = threading.Lock()
            self.notification_last_time = 0

        self.must_die = False
        signal.signal(signal.SIGTERM, self.signal_handler)

    def signal_handler(self, signum, frame):
        self.must_die = True  # nocv

    @property
    def output(self) -> str:
        # Optimize for better performance.
        return ''

    @output.setter
    def output(self, value) -> None:
        pass  # nocv

    def working_handler(self, proc: Popen):
        if proc.poll() is None and self.must_die:  # nocv
            proc.terminate()
            proc.wait()
        if self.notificator and time.time() - self.notification_last_time > 1:
            with self.notificator_lock:
                if self.notificator.queue:
                    self.notification_last_time = time.time()
                    self.notificator.send()

    def write_output(self, line: str):
        self.counter += 1
        for writer in self.writers:
            writer.write_line(line, self.counter, '\n')
        if self.notificator:
            with self.notificator_lock:
                self.notificator.create_notification_from_instance(self.history)

    def execute(self, cmd: Iterable[str], cwd: str, env_vars: dict):
        self.env = env_vars
        pm_ansible_path = ' '.join(self.pm_ansible())
        self.history.raw_args = " ".join(cmd).replace(pm_ansible_path, '').lstrip()
        ret = super().execute(cmd, cwd)
        if self.notificator:
            self.notificator.disconnect_all()
            with self.notificator_lock:
                if self.notificator.queue:
                    self.notificator.send()
        return ret


class ProjectProxy:
    __slots__ = ('__project__',)

    allowed_attrs = (
        'config',
        'revision',
        'branch',
        'project_branch',
        'vars',
        'env_vars',
        'type',
        'repo_sync_on_run',
        'repo_sync_timeout',
    )

    def __init__(self, project: Project):
        self.__project__ = project

    def __getattr__(self, name: str):
        if name in self.allowed_attrs:
            return getattr(self.__project__, name)
        raise AttributeError(f'allowed attributes are {self.allowed_attrs}')


class PluginExecutor:
    __slots__ = (
        'project',
        'history',
        'raw_exec_args',
        'verbose_level',
        'execution_dir',
        'plugin',
        'plugin_name',
        'executor',
        'writers',
    )

    executor_class = Executor
    history_plugins = HistoryPluginHandler()

    def __init__(
        self,
        plugin_name: str,
        plugin_class: Type[BasePlugin],
        plugin_options: dict,
        project: Project,
        history: Optional[History],
        exec_args,
    ):
        # pylint: disable=too-many-arguments
        self.project = project
        self.history = history or DummyHistory()
        self.raw_exec_args = exec_args
        self.execution_dir = None
        self.plugin_name = plugin_name
        self.plugin = plugin_class(output_handler=self.verbose_output, options=plugin_options)
        self.verbose_level = self.plugin.get_verbose_level(exec_args)

    def execute(self) -> None:
        try:
            self.writers = tuple(self.history_plugins.get_writers(self.history))
            revision = self.get_execution_revision()
            self.execution_dir = self.create_execution_dir()
            self.history.revision = self.project.repo_class.make_run_copy(str(self.execution_dir), revision)
            self.executor = self.executor_class(self.history, writers=self.writers)
            cmd, env_vars, self.history.raw_inventory = self.plugin.get_execution_data(
                self.execution_dir,
                self.raw_exec_args,
                project_data=ProjectProxy(self.project),
            )
            self.history.status = 'RUN'
            self.history.save()
            self.send_hook('on_execution', execution_dir=str(self.execution_dir))
            self.verbose_output(f'Executing command {cmd}')
            self.executor.execute(cmd, str(self.execution_dir), env_vars)
            self.history.status = 'OK'
            self.plugin.post_execute_hook(cmd)

        except Exception as exception:
            logger.error(traceback.format_exc())
            self.handle_error(exception)

        finally:
            self.history.stop_time = timezone.now()
            self.history.save()
            for writer in self.writers:
                with contextlib.suppress(Exception):
                    writer.finalize_output()
            self.send_hook('after_execution')
            self.__del__()

    def handle_error(self, exception: BaseException) -> None:
        default_status = 'ERROR'
        error_text = str(exception)
        self.history.status = default_status

        if isinstance(exception, self.executor_class.CalledProcessError):  # nocv
            error_text = f'{exception.output}'
            self.history.status = self.plugin.error_codes.get(exception.returncode, default_status)
        elif isinstance(exception, self.project.SyncError):
            raise exception

        last_line = self.history_plugins.get_reader(self.history).get_max_line()
        for line in error_text.split('\n'):
            last_line += 1
            for writer in self.writers:
                writer.write_line(line, last_line)

    def create_execution_dir(self) -> Path:
        exec_dir = Path(tempfile.mkdtemp()) / 'execution_dir'
        self.verbose_output(f'Execution temp dir created: {exec_dir}')
        return exec_dir

    def send_hook(self, when: str, **kwargs):
        msg = OrderedDict()
        msg['execution_type'] = self.history.kind
        msg['when'] = when
        inventory = self.history.inventory
        if isinstance(inventory, Inventory):
            inventory = inventory.get_hook_data(when)
        msg['target'] = OrderedDict()
        msg['target']['name'] = self.history.mode
        msg['target']['inventory'] = inventory
        msg['target']['project'] = self.project.get_hook_data(when)
        msg['history'] = self.history.get_hook_data(when)
        msg['extra'] = kwargs
        self.project.hook(when, msg)

    def get_execution_revision(self) -> str:
        if not self.project.repo_sync_on_run:
            return self.project.branch
        return self.project.vars.get('repo_branch', '')

    def verbose_output(self, message: str, level: int = 3) -> None:
        if self.verbose_level >= level:
            executor = getattr(self, 'executor', None)
            if executor is not None:
                executor.write_output(message)
            logger.debug(message)

    def __del__(self):
        exec_dir = getattr(self, 'execution_dir', None)
        if exec_dir is not None and exec_dir.is_dir():
            self.verbose_output(f'Temp dir {exec_dir} was cleared.')
            shutil.rmtree(exec_dir, ignore_errors=True)
