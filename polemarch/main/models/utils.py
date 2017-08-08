from __future__ import unicode_literals

import sys
from os.path import dirname
from collections import namedtuple

from django.utils import timezone
from ...main.utils import (tmp_file, CmdExecutor,
                           KVExchanger, CalledProcessError)


AnsibleExtra = namedtuple('AnsibleExtraArgs', [
    'args',
    'files',
])


# Classes and methods for support
class Executor(CmdExecutor):
    def __init__(self, history):
        super(Executor, self).__init__()
        self.history = history
        self.counter = 0

    @property
    def output(self):
        return self.history.raw_stdout

    @output.setter
    def output(self, value):
        pass

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
        self.history.raw_history_line.create(history=self.history,
                                             line_number=self.counter,
                                             line=line)


class AnsibleCommand(object):
    command_type = None

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def __parse_extra_args(self, **extra):
        extra_args, files = list(), list()
        for key, value in extra.items():
            if key in ["extra_vars", "extra-vars"]:
                key = "extra-vars"
            elif key == "verbose":
                continue
            elif key in ["key_file", "key-file"]:
                if "BEGIN RSA PRIVATE KEY" in value:
                    kfile = tmp_file()
                    kfile.write(value)
                    files.append(kfile)
                    value = kfile.name
                else:
                    value = "{}/{}".format(self.workdir, value)
                key = "key-file"
            extra_args.append("--{}".format(key))
            extra_args += [str(value)] if value else []
        return AnsibleExtra(extra_args, files)

    def get_workdir(self):
        return "/tmp"

    @property
    def workdir(self):
        return self.get_workdir()

    def execute(self, target, inventory, history, **extra_args):
        self.project = history.project
        history.raw_inventory, key_files = inventory.get_inventory()
        history.status = "RUN"
        history.save()
        path_to_ansible = dirname(sys.executable) + "/" + self.command_type
        inventory_file = tmp_file()
        inventory_file.write(history.raw_inventory)
        status = "OK"
        try:
            extra = self.__parse_extra_args(**extra_args)
            args = [path_to_ansible, target, '-i',
                    inventory_file.name, '-v'] + extra.args
            history.raw_args = " ".join(args)
            history.raw_stdout = Executor(history).execute(args, self.workdir)
        except CalledProcessError as exception:
            history.raw_stdout = str(exception.output)
            if exception.returncode == 4:
                status = "OFFLINE"
            elif exception.returncode == -9:
                status = "INTERRUPTED"
            else:
                status = "ERROR"
        except Exception as exception:  # pragma: no cover
            history.raw_stdout = history.raw_stdout + str(exception)
            status = "ERROR"
        finally:
            inventory_file.close()
            for key_file in key_files:
                key_file.close()
            history.stop_time = timezone.now()
            history.status = status
            history.save()

    def run(self):
        return self.execute(*self.args, **self.kwargs)


class AnsiblePlaybook(AnsibleCommand):
    command_type = "ansible-playbook"

    def get_workdir(self):
        return self.project.path


class AnsibleModule(AnsibleCommand):
    command_type = "ansible"

    def __init__(self, target, *pargs, **kwargs):
        kwargs['module-name'] = target
        if not kwargs.get('args', None):
            kwargs.pop('args', None)
        super(AnsibleModule, self).__init__(*pargs, **kwargs)

    def get_workdir(self):
        return self.project.path

    def execute(self, group, *args, **extra_args):
        return super(AnsibleModule, self).execute(group, *args, **extra_args)
