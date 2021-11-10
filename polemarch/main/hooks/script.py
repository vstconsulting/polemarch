from __future__ import unicode_literals
from typing import Dict
import os
import json
import traceback
import logging
import subprocess
from .base import BaseHook


logger = logging.getLogger("polemarch")


class Backend(BaseHook):

    def execute(self, script, when, file) -> str:  # pylint: disable=arguments-renamed
        try:
            work_dir = self.conf['HOOKS_DIR']
            script = '{}/{}'.format(work_dir, script)
            return subprocess.check_output(
                [script, when],
                cwd=work_dir, universal_newlines=True, input=file
            )
        except BaseException as err:
            logger.error(traceback.format_exc())
            logger.error(
                f'Details:\n'
                f'SCRIPT:{script}\n'
                f'WHEN:{when}\n'
                f'CWD:{self.conf["HOOKS_DIR"]}\n'
                f'ERR:{str(err)}\n'
            )
            return str(err)

    def setup(self, **kwargs):
        super().setup(**kwargs)
        self.conf['HOOKS_DIR'] = self.get_settings('HOOKS_DIR', '/tmp/')

    def validate(self) -> Dict:
        errors = super().validate()
        for rep in self.hook_object.reps:
            if '../' in rep or rep not in os.listdir(self.conf['HOOKS_DIR']):
                errors["recipients"] = "Recipients must be in hooks dir."
        return errors

    def modify_message(self, message):
        return json.dumps(super().modify_message(message))
