# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import re
import logging
import traceback
from collections import namedtuple, OrderedDict
from functools import reduce
import six
from django.utils import timezone
from vstutils.utils import tmp_file, KVExchanger
from .hosts import Inventory
from ...main.utils import (
    CmdExecutor, CalledProcessError, AnsibleArgumentsReference, PMObject
)


logger = logging.getLogger("polemarch")
PolemarchInventory = namedtuple("PolemarchInventory", "raw keys")
AnsibleExtra = namedtuple('AnsibleExtraArgs', [
    'args',
    'files',
])


# Classes and methods for support
class DummyHistory(object):
    # pylint: disable=unused-argument
    def __init__(self, *args, **kwargs):
        self.mode = kwargs.get('mode', None)

    def __setattr__(self, key, value):
        if key == 'raw_args':
            logger.info(value)

    def __getattr__(self, item):
        return None  # nocv

    @property
    def raw_stdout(self):
        return ""

    @raw_stdout.setter
    def raw_stdout(self, value):
        logger.info(value)  # nocv

    def get_hook_data(self, when):
        return None

    def write_line(self, value, number, endl=''):
        # pylint: disable=unused-argument
        logger.info(value)

    def save(self):
        pass


class Executor(CmdExecutor):
    __slots__ = 'history', 'counter', 'exchanger'

    def __init__(self, history):
        super(Executor, self).__init__()
        self.history = history
        self.counter = 0
        self.exchanger = KVExchanger(self.CANCEL_PREFIX + str(self.history.id))

    @property
    def output(self):
        return self.history.raw_stdout

    @output.setter
    def output(self, value):
        pass  # nocv

    def working_handler(self, proc):
        if proc.poll() is None and self.exchanger.get() is not None:
            self.write_output("\n[ERROR]: User interrupted execution")
            self.exchanger.delete()
            proc.kill()
            proc.wait()
        super(Executor, self).working_handler(proc)

    def write_output(self, line):
        self.counter += 1
        self.history.write_line(line, self.counter, '\n')

    def execute(self, cmd, cwd):
        pm_ansible_path = ' '.join(self.pm_ansible())
        self.history.raw_args = " ".join(cmd).replace(pm_ansible_path, '').lstrip()
        return super(Executor, self).execute(cmd, cwd)


class AnsibleCommand(PMObject):
    ref_types = {
        'ansible-playbook': 'playbook',
        'ansible': 'module',
    }
    command_type = None

    status_codes = {
        4: "OFFLINE",
        -9: "INTERRUPTED",
        "other": "ERROR"
    }

    class ExecutorClass(Executor):
        '''
        Default executor class.
        '''

    class Inventory(object):
        def __init__(self, inventory, cwd="/tmp"):
            self.cwd = cwd
            self._file = None
            self.hidden_vars = Inventory.HIDDEN_VARS
            self.is_file = True
            if isinstance(inventory, (six.string_types, six.text_type)):
                self.raw, self.keys = self.get_from_file(inventory)
            else:
                self.raw, self.keys = self.get_from_int(inventory)

        def get_from_int(self, inventory):
            if isinstance(inventory, int):
                inventory = Inventory.objects.get(pk=inventory)  # nocv
            return inventory.get_inventory()

        def get_from_file(self, inventory):
            self._file = "{}/{}".format(self.cwd, inventory)
            try:
                with open(self._file, 'r') as file:
                    return file.read(), []
            except IOError:
                self._file = inventory
                self.is_file = False
                return inventory.replace(',', '\n'), []

        @property
        def file(self):
            self._file = self._file or tmp_file(self.raw)
            return self._file

        @property
        def file_name(self):
            # pylint: disable=no-member
            if isinstance(self.file, (six.string_types, six.text_type)):
                return self.file
            return self.file.name

        def close(self):
            # pylint: disable=no-member
            map(lambda key_file: key_file.close(), self.keys) if self.keys else None
            if not isinstance(self.file, (six.string_types, six.text_type)):
                self._file.close()

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        self.__will_raise_exception = False
        self.ref_type = self.ref_types[self.command_type]
        self.ansible_ref = AnsibleArgumentsReference().raw_dict[self.ref_type]

    def __generate_arg_file(self, value):
        file = tmp_file(value)
        return file.name, [file]

    def __parse_key(self, key, value):
        # pylint: disable=unused-argument,
        if "BEGIN RSA PRIVATE KEY" in value:
            return self.__generate_arg_file(value)
        else:
            return "{}/{}".format(self.workdir, value), []

    def __convert_arg(self, ansible_extra, item):
        extra_args, files = ansible_extra
        key, value = item
        key = key.replace('_', '-')
        if key == 'verbose':
            extra_args += ['-' + ('v' * value)] if value else []
            return extra_args, files
        result = [value, list()]
        if key in ["key-file", "private-key"]:
            result = self.__parse_key(key, value)
        elif key in ["vault-password-file", "new-vault-password-file"]:
            result = self.__generate_arg_file(value)  # nocv
        value = result[0]
        files += result[1]

        key_type = self.ansible_ref[key].get('type', None)
        if (key_type is None and value) or key_type:
            extra_args.append("--{}".format(key))
        extra_args += [str(value)] if key_type else []
        return extra_args, files

    def __parse_extra_args(self, **extra):
        handler_func = self.__convert_arg
        return AnsibleExtra(*reduce(
            handler_func, extra.items(), ([], [])
        ))

    def get_workdir(self):
        return self.project.path

    @property
    def workdir(self):
        return self.get_workdir()

    @property
    def path_to_ansible(self):
        return self.pm_ansible(self.command_type)

    def hide_passwords(self, raw):
        regex = r'|'.join((
            r"(?<=" + hide + r"=).{1,}?(?=[\n\t\s])"
            for hide in self.inventory_object.hidden_vars
        ))
        subst = "[~~ENCRYPTED~~]"
        raw = re.sub(regex, subst, raw, 0, re.MULTILINE)
        return raw

    def prepare(self, target, inventory, history, project):
        project.check_path(inventory) if inventory else None
        self.target, self.project = target, project
        self.history = history if history else DummyHistory()
        self.history.status = "RUN"
        self.project.sync_on_execution_handler(self.history)
        if inventory:
            self.inventory_object = self.Inventory(inventory, cwd=self.workdir)
            self.history.raw_inventory = self.hide_passwords(
                self.inventory_object.raw
            )
        else:  # nocv
            self.inventory_object = None
        self.history.revision = project.revision
        self.history.save()
        self.executor = self.ExecutorClass(self.history)

    def _send_hook(self, when):
        msg = OrderedDict(execution_type=self.history.kind, when=when)
        inventory = self.history.inventory
        if isinstance(inventory, Inventory):
            inventory = inventory.get_hook_data(when)
        msg['target'] = OrderedDict(
            name=self.history.mode, inventory=inventory,
            project=self.project.get_hook_data(when)
        )
        msg['history'] = self.history.get_hook_data(when)
        self.project.hook(when, msg)

    def get_inventory_arg(self, target, extra_args):
        # pylint: disable=unused-argument
        args = [target]
        if self.inventory_object is not None:
            args += ['-i', self.inventory_object.file_name]
        return args

    def get_args(self, target, extra_args):
        return (
            self.path_to_ansible +
            self.get_inventory_arg(target, extra_args) +
            extra_args
        )

    def error_handler(self, exception):
        default_code = self.status_codes["other"]
        if isinstance(exception, CalledProcessError):  # nocv
            self.history.raw_stdout = "{}".format(exception.output)
            self.history.status = self.status_codes.get(
                exception.returncode, default_code
            )
            return
        elif isinstance(exception, self.project.SyncError):
            self.__will_raise_exception = True
        self.history.raw_stdout = self.history.raw_stdout + str(exception)
        self.history.status = default_code

    def execute(self, target, inventory, history, project, **extra_args):
        try:
            self.prepare(target, inventory, history, project)
            self._send_hook('on_execution')
            self.history.status = "OK"
            extra = self.__parse_extra_args(**extra_args)
            args = self.get_args(self.target, extra.args)
            self.executor.execute(args, self.workdir)
        except Exception as exception:
            logger.error(traceback.format_exc())
            self.error_handler(exception)
            if self.__will_raise_exception:
                raise
        finally:
            inventory_object = getattr(self, "inventory_object", None)
            inventory_object and inventory_object.close()
            self.history.stop_time = timezone.now()
            self.history.save()
            self._send_hook('after_execution')

    def run(self):
        try:
            return self.execute(*self.args, **self.kwargs)
        except Exception:  # nocv
            logger.error(traceback.format_exc())
            raise


class AnsiblePlaybook(AnsibleCommand):
    command_type = "ansible-playbook"


class AnsibleModule(AnsibleCommand):
    command_type = "ansible"

    def __init__(self, target, *pargs, **kwargs):
        kwargs['module-name'] = target
        if not kwargs.get('args', None):
            kwargs.pop('args', None)
        super(AnsibleModule, self).__init__(*pargs, **kwargs)
        self.ansible_ref['module-name'] = {'type': 'string'}

    def execute(self, group, *args, **extra_args):
        return super(AnsibleModule, self).execute(group, *args, **extra_args)
