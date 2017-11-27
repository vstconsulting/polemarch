import os
import json
import traceback
import logging
import subprocess
from .base import BaseHook
from ..utils import tmp_file_context


logger = logging.getLogger("polemarch")


class Backend(BaseHook):

    def _execute(self, script, when, file):
        try:
            return subprocess.check_output(
                [script, when, file.name], cwd=self.conf['HOOKS_DIR']
            )
        except BaseException as err:
            logger.info(traceback.format_exc())
            return str(err)

    def setup(self, **kwargs):
        super(Backend, self).setup(**kwargs)
        self.conf['HOOKS_DIR'] = self.get_settings('HOOKS_DIR', '/tmp/')

    def validate(self):
        errors = super(Backend, self).validate()
        for rep in self.hook_object.reps:
            if '../' in rep or rep not in os.listdir(self.conf['HOOKS_DIR']):
                errors["recipients"] = "Recipients must be in hooks dir."
        return errors

    def send(self, message, when):
        super(Backend, self).send(message, when)
        with tmp_file_context() as file:
            file.write(json.dumps(message))
            return "\n".join([
                self._execute(r, when, file)
                for r in self.conf['recipients'] if r
            ])
