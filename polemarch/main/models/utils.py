from __future__ import unicode_literals

import sys
from os.path import dirname
from collections import namedtuple

from django.utils import timezone
from ...main.utils import (tmp_file, CmdExecutor,
                           KVExchanger, CalledProcessError)


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
        return None

    def save(self):
        pass


class Executor(CmdExecutor):
    def __init__(self, history):
        super(Executor, self).__init__()
        self.history = history
        self.counter = 0

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

    class Inventory(PolemarchInventory):
        @property
        def file(self):
            self.__file = getattr(self, "__file", tmp_file(self.raw))
            return self.__file

        def close(self):
            for key_file in self.keys:
                key_file.close()
            self.__file.close()

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def __parse_extra_args(self, **extra):
        extra_args, files = list(), list()
        extra.pop("verbose", None)
        for key, value in extra.items():
            if key == "key-file":
                if "BEGIN RSA PRIVATE KEY" in value:
                    kfile = tmp_file(value)
                    files.append(kfile)
                    value = kfile.name
                else:
                    value = "{}/{}".format(self.workdir, value)
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
        self.target, self.project = target, project
        self.history = history if history else DummyHistory()
        self.inventory_object = self.Inventory(*inventory.get_inventory())
        self.history.raw_inventory = self.inventory_object.raw
        self.history.status = "RUN"
        self.history.save()
        self.executor = Executor(self.history)

    def get_args(self, target, extra_args):
        return [self.path_to_ansible, target,
                '-i', self.inventory_object.file.name, '-v'] + extra_args

    def error_handler(self, exception):
        default_code = self.status_codes["other"]
        if isinstance(exception, CalledProcessError):
            self.history.raw_stdout = str(exception.output)
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
