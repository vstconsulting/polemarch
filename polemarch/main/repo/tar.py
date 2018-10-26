# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals
import tarfile
from ._base import _ArchiveRepo, shutil


class Tar(_ArchiveRepo):
    def _extract(self, archive, path, options):
        # pylint: disable=broad-except
        moved = False
        try:
            shutil.move(path, path + ".bak")
            moved = True
        except IOError:
            pass
        try:
            with tarfile.open(archive) as arch:
                arch.extractall(path)
        except:
            self.delete()
            shutil.move(path + ".bak", path) if moved else None
            raise
        else:
            shutil.rmtree(path + ".bak") if moved else None
