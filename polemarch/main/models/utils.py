# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import sys
import logging
from os.path import dirname
from collections import namedtuple

import six
from django.utils import timezone
from ...main.utils import (tmp_file, CmdExecutor,
                           KVExchanger, CalledProcessError)


logger = logging.getLogger("polemarch")
PolemarchInventory = namedtuple("PolemarchInventory", "raw keys")
AnsibleExtra = namedtuple('AnsibleExtraArgs', [
    'args',
    'files',
])


# Classes and methods for support
class DummyHistory(object):
    def __init__(self, *args, **kwargs):
        pass

    def __setattr__(self, key, value):
        pass

    def __getattr__(self, item):
        return None  # nocv

    @property
    def raw_stdout(self):
        return ""

    @raw_stdout.setter
    def raw_stdout(self, value):
        logger.info(value)  # nocv

    def write_line(self, value, number):
        # pylint: disable=unused-argument
        logger.info(value)  # nocv

    def save(self):
        pass


class Executor(CmdExecutor):
    def __init__(self, history):
        super(Executor, self).__init__()
        self.history = history
        self.counter = 0

    @property
    def output(self):
        return self.history.raw_stdout  # nocv

    @output.setter
    def output(self, value):
        pass  # nocv

    def line_handler(self, proc, line):
        cancel = KVExchanger(self.CANCEL_PREFIX + str(self.history.id)).get()
        if cancel is not None:
            self.write_output("\n[ERROR]: User interrupted execution")
            proc.kill()
            proc.wait()
            return True
        return super(Executor, self).line_handler(proc, line)

    def write_output(self, line):
        self.counter += 1
        self.history.write_line(line, self.counter)

    def execute(self, cmd, cwd):
        self.history.raw_args = " ".join(cmd)
        return super(Executor, self).execute(cmd, cwd)


class AnsibleCommand(object):
    command_type = None

    status_codes = {
        4: "OFFLINE",
        -9: "INTERRUPTED",
        "other": "ERROR"
    }

    class Inventory(object):
        def __init__(self, inventory, cwd="/tmp"):
            self.cwd = cwd
            self.__file = None
            if isinstance(inventory, (six.string_types, six.text_type)):
                self.raw, self.keys = self.get_from_file(inventory)
            else:
                self.raw, self.keys = inventory.get_inventory()

        def get_from_file(self, inventory):
            self.__file = "{}/{}".format(self.cwd, inventory)
            with open(self.__file, 'r') as file:
                return file.read(), []

        @property
        def file(self):
            self.__file = self.__file or tmp_file(self.raw)
            return self.__file

        @property
        def file_name(self):
            # pylint: disable=no-member
            if isinstance(self.file, (six.string_types, six.text_type)):
                return self.file
            return self.file.name

        def close(self):
            # pylint: disable=no-member
            for key_file in self.keys:
                key_file.close()
            if not isinstance(self.file, (six.string_types, six.text_type)):
                self.__file.close()

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def __generate_arg_file(self, value):
        file = tmp_file(value)
        return file.name, [file]

    def __parse_key(self, key, value):
        # pylint: disable=unused-argument,
        if "BEGIN RSA PRIVATE KEY" in value:
            return self.__generate_arg_file(value)
        else:
            return "{}/{}".format(self.workdir, value), []

    def __parse_extra_args(self, **extra):
        extra_args, files = list(), list()
        extra.pop("verbose", None)
        for key, value in extra.items():
            result = [value, list()]
            if key == "key-file":
                result = self.__parse_key(key, value)
            elif key in ["vault-password-file", "new-vault-password-file"]:
                result = self.__generate_arg_file(value)
            value = result[0]
            files = files + result[1]
            extra_args.append("--{}".format(key))
            extra_args += [str(value)] if value else []
        return AnsibleExtra(extra_args, files)

    def get_workdir(self):
        return self.project.path

    @property
    def workdir(self):
        return self.get_workdir()

    @property
    def path_to_ansible(self):
        return dirname(sys.executable) + "/" + self.command_type

    def prepare(self, target, inventory, history, project):
        project.check_path(inventory)
        self.target, self.project = target, project
        self.history = history if history else DummyHistory()
        self.inventory_object = self.Inventory(inventory, cwd=self.workdir)
        self.history.raw_inventory = self.inventory_object.raw
        self.history.status = "RUN"
        self.history.save()
        self.executor = Executor(self.history)

    def get_args(self, target, extra_args):
        return [self.path_to_ansible, target,
                '-i', self.inventory_object.file_name, '-v'] + extra_args

    def error_handler(self, exception):
        default_code = self.status_codes["other"]
        if isinstance(exception, CalledProcessError):
            self.history.raw_stdout = "{}".format(exception.output)
            self.history.status = self.status_codes.get(exception.returncode,
                                                        default_code)
        else:
            self.history.raw_stdout = self.history.raw_stdout + str(exception)
            self.history.status = default_code

    def execute(self, target, inventory, history, project, **extra_args):
        self.prepare(target, inventory, history, project)
        self.history.status = "OK"
        try:
            extra = self.__parse_extra_args(**extra_args)
            args = self.get_args(self.target, extra.args)
            self.history.raw_stdout = self.executor.execute(args, self.workdir)
        except Exception as exception:
            self.error_handler(exception)
        finally:
            self.inventory_object.close()
            self.history.stop_time = timezone.now()
            self.history.save()

    def run(self):
        return self.execute(*self.args, **self.kwargs)


class AnsiblePlaybook(AnsibleCommand):
    command_type = "ansible-playbook"


class AnsibleModule(AnsibleCommand):
    command_type = "ansible"

    def __init__(self, target, *pargs, **kwargs):
        kwargs['module-name'] = target
        if not kwargs.get('args', None):
            kwargs.pop('args', None)
        super(AnsibleModule, self).__init__(*pargs, **kwargs)

    def execute(self, group, *args, **extra_args):
        return super(AnsibleModule, self).execute(group, *args, **extra_args)
