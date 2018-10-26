from __future__ import unicode_literals
import os
import json
import traceback
import logging
import subprocess
from .base import BaseHook


logger = logging.getLogger("polemarch")


class Backend(BaseHook):

    def execute(self, script, when, file):
        try:
            work_dir = self.conf['HOOKS_DIR']
            script = '{}/{}'.format(work_dir, script)
            return subprocess.check_output(
                [script, when],
                cwd=work_dir, universal_newlines=True, input=file
            )
        except BaseException as err:
            logger.error(traceback.format_exc())
            logger.error("Details:\nSCRIPT:{}\nWHEN:{}\nCWD:{}\n".format(
                script, when, self.conf['HOOKS_DIR']
            ))
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

    def modify_message(self, message):
        return json.dumps(super(Backend, self).modify_message(message))
