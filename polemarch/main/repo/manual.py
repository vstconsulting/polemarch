# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals
from typing import Tuple, Text
import errno
from pathlib import Path
from django.conf import settings
from vstutils.utils import get_render, raise_context
from ._base import _Base, os


class Manual(_Base):
    project_files = ['ansible.cfg', 'bootstrap.yml']

    def generate_file(self, name: Text):
        with open(os.path.join(self.path, name), 'w', encoding='utf-8') as fd:
            with raise_context():
                fd.write(get_render('polemarch/{}'.format(name), settings.MANUAL_PROJECT_VARS))

    def make_clone(self, options) -> Tuple[Path, bool]:
        try:
            os.mkdir(self.path)
            for file in self.project_files:
                self.generate_file(file)
        except OSError as oserror:
            if oserror.errno == errno.EEXIST:
                return Path(self.path), False
            raise  # nocv
        return Path(self.path), True

    def make_update(self, options) -> Tuple[Path, bool]:
        if not os.path.exists(self.path):  # nocv
            os.mkdir(self.path)
        return Path(self.path), True
