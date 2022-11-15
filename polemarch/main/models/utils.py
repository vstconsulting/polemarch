# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import threading
from typing import Text, Any, Iterable, Tuple, List, Dict, Union
import os
import re
import time
import signal
import shutil
import logging
import tempfile
import traceback
from pathlib import Path
from collections import namedtuple, OrderedDict
from subprocess import Popen
from functools import reduce
from django.apps import apps
from django.utils import timezone
from vstutils.utils import tmp_file, KVExchanger, raise_context
from vstutils.tools import get_file_value

from .hosts import Inventory
from .tasks import History, Project
from ...main.utils import CmdExecutor, PMObject
from ..constants import HiddenArgumentsEnum, HiddenVariablesEnum, CYPHER, ANSIBLE_REFERENCE


logger = logging.getLogger("polemarch")
InventoryDataType = Tuple[Text, List]
PolemarchInventory = namedtuple("PolemarchInventory", "raw keys")
AnsibleExtra = namedtuple('AnsibleExtraArgs', [
    'args',
    'files',
])


# Classes and methods for support
class DummyHistory:
    # pylint: disable=unused-argument
    def __init__(self, *args, **kwargs):
        self.mode = kwargs.get('mode', None)

    def __setattr__(self, key: Text, value: Any) -> None:
        if key == 'raw_args':
            logger.info(value)

    def __getattr__(self, item: Text) -> None:
        return None  # nocv

    @property
    def raw_stdout(self) -> Text:
        return ""  # nocv

    @raw_stdout.setter
    def raw_stdout(self, value: Text) -> None:
        logger.info(value)  # nocv

    def get_hook_data(self, when: Text) -> None:
        return None

    def write_line(self, value: Text, number: int, endl: Text = ''):  # nocv
        # pylint: disable=unused-argument
        logger.info(value)

    def save(self) -> None:
        pass


class Executor(CmdExecutor):
    __slots__ = 'history', 'counter', 'exchanger', 'notificator',  'notificator_lock', 'notification_last_time'

    def __init__(self, history: History):
        super().__init__()
        self.history = history
        self.counter = 0
        self.exchanger = KVExchanger(self.CANCEL_PREFIX + str(self.history.id))
        env_vars = {}
        if self.history.project is not None:
            env_vars = self.history.project.env_vars
        self.env = env_vars
        if isinstance(history, DummyHistory):
            self.notificator = None
        else:
            notificator_class = apps.get_app_config('vstutils_api').module.notificator_class
            self.notificator = notificator_class([], label='history_lines')
            self.notificator_lock = threading.Lock()
            self.notification_last_time = 0

    @property
    def output(self) -> Text:
        # Optimize for better performance.
        return ''

    @output.setter
    def output(self, value) -> None:
        pass  # nocv

    def working_handler(self, proc: Popen):
        if proc.poll() is None and self.exchanger.get() is not None:  # nocv
            self.write_output("\n[ERROR]: User interrupted execution")
            self.exchanger.delete()
            for _ in range(5):
                try:
                    os.kill(-proc.pid, signal.SIGTERM)
                except Exception:  # nocv
                    break
                proc.send_signal(signal.SIGINT)
                time.sleep(5)
            proc.terminate()
            proc.kill()
            proc.wait()
        super().working_handler(proc)
        if self.notificator and time.time() - self.notification_last_time > 1:
            with self.notificator_lock:
                if self.notificator.queue:
                    self.notification_last_time = time.time()
                    self.notificator.send()

    def write_output(self, line: Text):
        self.counter += 1
        self.history.write_line(line, self.counter, '\n')
        if self.notificator:
            with self.notificator_lock:
                self.notificator.create_notification_from_instance(self.history)

    def execute(self, cmd: Iterable[Text], cwd: Text):
        pm_ansible_path = ' '.join(self.pm_ansible())
        new_cmd = []
        for one_cmd in cmd:
            if isinstance(one_cmd, str):
                with raise_context():
                    one_cmd = one_cmd.decode('utf-8')
            new_cmd.append(one_cmd)
        self.history.raw_args = " ".join(new_cmd).replace(pm_ansible_path, '').lstrip()
        ret = super().execute(new_cmd, cwd)
        if self.notificator:
            self.notificator.disconnect_all()
            with self.notificator_lock:
                if self.notificator.queue:
                    self.notificator.send()
        return ret


class AnsibleCommand(PMObject):
    ref_types = {
        'ansible-playbook': 'playbook',
        'ansible': 'module',
    }
    command_type = None

    status_codes = {
        4: "OFFLINE",
        -9: "INTERRUPTED",
        -15: "INTERRUPTED",
        "other": "ERROR"
    }

    class ExecutorClass(Executor):
        '''
        Default executor class.
        '''

    class Inventory(object):
        def __init__(self, inventory: Union[Inventory, int, Text], cwd: Text = "/tmp", tmpdir: Text = '/tmp'):
            self.cwd = cwd
            self.tmpdir = tmpdir
            self._file = None
            self.is_file = True
            if isinstance(inventory, str):
                self.raw, self.keys = self.get_from_file(inventory)
            else:
                self.raw, self.keys = self.get_from_int(inventory)

        def get_from_int(self, inventory: Union[Inventory, int]) -> InventoryDataType:
            if isinstance(inventory, int):
                inventory = Inventory.objects.get(pk=inventory)  # nocv
            return inventory.get_inventory()

        def get_from_file(self, inventory: Text) -> InventoryDataType:
            _file = "{}/{}".format(self.cwd, inventory)
            try:
                new_filename = os.path.join(self.tmpdir, 'inventory')
                shutil.copyfile(_file, new_filename)
                if not os.path.exists(new_filename):
                    raise IOError  # nocv
                self._file = new_filename
                return get_file_value(new_filename, ''), []
            except IOError:
                self._file = inventory
                self.is_file = False
                return inventory.replace(',', '\n'), []

        @property
        def file(self) -> Union[tmp_file, Text]:
            self._file = self._file or tmp_file(self.raw, dir=self.tmpdir)
            return self._file

        @property
        def file_name(self) -> Text:
            # pylint: disable=no-member
            if isinstance(self.file, str):
                return self.file
            return self.file.name

        def close(self) -> None:
            # pylint: disable=no-member
            map(lambda key_file: key_file.close(), self.keys) if self.keys else None
            if not isinstance(self.file, str):
                self._file.close()

    def __init__(self, *args, **kwargs):
        self.args = args
        if 'verbose' in kwargs:
            kwargs['verbose'] = int(float(kwargs.get('verbose', 0)))
        self.kwargs = kwargs
        self.__will_raise_exception = False
        self.ref_type = self.ref_types[self.command_type]
        self.ansible_ref = ANSIBLE_REFERENCE.raw_dict[self.ref_type]
        self.verbose = kwargs.get('verbose', 0)
        self.cwd = tempfile.mkdtemp()
        self._verbose_output('Execution tmpdir created - [{}].'.format(self.cwd), 0)
        self.env = {}

    def _verbose_output(self, value: Text, level: int = 3) -> None:
        if self.verbose >= level:
            if hasattr(self, 'executor'):
                self.executor.write_output(value)
            logger.debug(value)

    def _get_tmp_name(self) -> Text:
        return os.path.join(self.cwd, 'project_sources')

    def _send_hook(self, when: Text, **kwargs) -> None:
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

    def __generate_arg_file(self, value: Text) -> Tuple[Text, List[tmp_file]]:
        file = tmp_file(value, dir=self.cwd)
        return file.name, [file]

    def __parse_key(self, key: Text, value: Text) -> Tuple[Text, List]:
        # pylint: disable=unused-argument,
        if re.match(r"[-]+BEGIN .+ KEY[-]+", value):
            # Add new line if not exists and generate tmpfile for private key value
            value = value + '\n' if value[-1] != '\n' else value
            return self.__generate_arg_file(value)
        # Return path in project if it's path
        path = (Path(self.workdir)/Path(value).expanduser()).resolve()
        return str(path), []

    def __convert_arg(self, ansible_extra: AnsibleExtra, item: Tuple[Text, Any]) -> Tuple[List, List]:
        extra_args, files = ansible_extra
        key, value = item
        key = key.replace('_', '-')
        if key == 'verbose':
            extra_args += ['-' + ('v' * value)] if value else []
            return extra_args, files
        result = [value, []]
        if key in HiddenArgumentsEnum.get_text_values():
            result = self.__parse_key(key, value)
        elif key in HiddenArgumentsEnum.get_file_values():
            result = self.__generate_arg_file(value)  # nocv
        value = result[0]
        files += result[1]

        key_type = self.ansible_ref[key].get('type', None)
        if (key_type is None and value) or key_type:
            extra_args.append("--{}".format(key))
        extra_args += [str(value)] if key_type else []
        return extra_args, files

    def __parse_extra_args(self, **extra) -> AnsibleExtra:
        handler_func = self.__convert_arg
        return AnsibleExtra(*reduce(
            handler_func, extra.items(), ([], [])
        ))

    @property
    def workdir(self) -> Text:
        return self.get_workdir()

    @property
    def path_to_ansible(self) -> List[Text]:
        return self.pm_ansible(self.command_type)

    def get_inventory_arg(self, target: Text, extra_args: List[Text]) -> List[Text]:
        # pylint: disable=unused-argument
        args = [target]
        if self.inventory_object is not None:
            args += ['-i', self.inventory_object.file_name]
        return args

    def get_args(self, target: Text, extra_args: List[Text]) -> List[Text]:
        return (
            self.path_to_ansible +
            self.get_inventory_arg(target, extra_args) +
            extra_args
        )

    def get_workdir(self) -> Text:
        return self._get_tmp_name()

    def get_kwargs(self, target, extra_args) -> Dict[Text, Any]:
        # pylint: disable=unused-argument
        return dict(cwd=self._get_tmp_name())

    def hide_passwords(self, raw: Text) -> Text:
        regex = r'|'.join((
            r"(?<=" + hide + r":\s).{1,}?(?=[\n\t\s])"
            for hide in HiddenVariablesEnum.get_values()
        ))
        raw = re.sub(regex, CYPHER, raw, 0, re.MULTILINE)
        return raw

    def get_execution_revision(self, project: Project):
        if not project.repo_sync_on_run:
            return project.branch
        return project.vars.get('repo_branch', '')

    def prepare(self, target: Text, inventory: Any, history: History, project: Project) -> None:
        self.target, self.project = target, project
        self.history = history if history else DummyHistory()
        self.history.status = "RUN"
        if inventory:
            self.inventory_object = self.Inventory(inventory, cwd=self.project.path, tmpdir=self.cwd)
            self.history.raw_inventory = self.hide_passwords(
                self.inventory_object.raw
            )
        else:  # nocv
            self.inventory_object = None

        revision = self.get_execution_revision(project)
        self.history.revision = revision or 'NO VCS'
        self.history.save()
        self.executor = self.ExecutorClass(self.history)

        work_dir = self._get_tmp_name()
        project.repo_class.make_run_copy(work_dir, revision)
        self._verbose_output(f'Copied project on execution to {work_dir}.', 2)

        project_cfg = self.executor.env.get('ANSIBLE_CONFIG')
        if project_cfg is not None:
            self.executor.env['ANSIBLE_CONFIG'] = str(Path(self.project.path) / project_cfg)
            return

        project_cfg = Path(self.project.path) / 'ansible.cfg'
        if project_cfg.is_file():
            self.executor.env['ANSIBLE_CONFIG'] = str(project_cfg)
            return

        project_cfg = os.getenv('ANSIBLE_CONFIG')
        if project_cfg is not None:
            self.executor.env['ANSIBLE_CONFIG'] = project_cfg

    def error_handler(self, exception: BaseException) -> None:
        # pylint: disable=no-else-return
        default_code = self.status_codes["other"]
        error_text = str(exception)
        self.history.status = default_code

        if isinstance(exception, self.ExecutorClass.CalledProcessError):  # nocv
            error_text = "{}".format(exception.output)
            self.history.status = self.status_codes.get(
                exception.returncode, default_code
            )
        elif isinstance(exception, self.project.SyncError):
            self.__will_raise_exception = True

        last_line_object = self.history.raw_history_line.last()
        last_line = 0
        if last_line_object:
            last_line = last_line_object.line_number  # nocv
        for line in error_text.split('\n'):
            last_line += 1
            self.history.write_line(line, last_line)

    def execute(self, target: Text, inventory: Any, history: History, project: Project, **extra_args) -> None:
        try:
            self.prepare(target, inventory, history, project)
            self.history.status = "OK"
            extra = self.__parse_extra_args(**extra_args)
            args = self.get_args(self.target, extra.args)
            kwargs = self.get_kwargs(self.target, extra.args)
            self._send_hook('on_execution', args=args, kwargs=kwargs)
            self.executor.execute(args, **kwargs)
        except Exception as exception:
            logger.error(traceback.format_exc())
            self.error_handler(exception)
            if self.__will_raise_exception:
                raise
        finally:
            inventory_object = getattr(self, "inventory_object", None)
            if inventory_object is not None:
                inventory_object.close()
            self.history.stop_time = timezone.now()
            self.history.save()
            self._send_hook('after_execution')
            self.__del__()

    def run(self):
        try:
            return self.execute(*self.args, **self.kwargs)
        except Exception:  # nocv
            logger.error(traceback.format_exc())
            raise

    def __del__(self):
        if hasattr(self, 'cwd') and os.path.exists(self.cwd):
            self._verbose_output('Tmpdir "{}" was cleared.'.format(self.cwd))
            shutil.rmtree(self.cwd, ignore_errors=True)


class AnsiblePlaybook(AnsibleCommand):
    command_type = "ansible-playbook"


class AnsibleModule(AnsibleCommand):
    command_type = "ansible"

    def __init__(self, target: Text, *pargs, **kwargs):
        kwargs['module-name'] = target
        if not kwargs.get('args', None):
            kwargs.pop('args', None)
        super().__init__(*pargs, **kwargs)
        self.ansible_ref['module-name'] = {'type': 'string'}

    def execute(self, group: Text = 'all', *args, **extra_args):
        return super().execute(group, *args, **extra_args)
