import json
from subprocess import check_output
from .base import BaseHook
from ..utils import tmp_file_context


class Backend(BaseHook):

    def _execute(self, script, when, file):
        try:
            return check_output(
                [script, when, file.name], cwd=self.conf['HOOKS_DIR']
            )
        except BaseException as err:
            return str(err)

    def setup(self, **kwargs):
        super(Backend, self).setup(**kwargs)
        self.conf['HOOKS_DIR'] = self.get_settings('HOOKS_DIR', '/tmp/')

    def send(self, message, when):
        super(Backend, self).send(message, when)
        with tmp_file_context() as file:
            file.write(json.dumps(message))
            return "\n".join([
                self._execute(r, when, file)
                for r in self.conf['recipients'] if r
            ])
