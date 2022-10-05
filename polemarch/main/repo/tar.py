# pylint: disable=expression-not-assigned,abstract-method,import-error
from __future__ import unicode_literals
import io
from typing import Text, Tuple
import tarfile
from pathlib import Path
from ._base import _ArchiveRepo, shutil


class Tar(_ArchiveRepo):

    def __get_members(self, arch, prefix=''):
        members = arch.getmembers()
        offset = len(prefix)
        offset += 1 if prefix else 0

        def change_member(tarinfo):
            if not prefix or tarinfo.name.startswith(prefix):
                tarinfo.name = tarinfo.name[offset:]
                return tarinfo

        return filter(bool, map(change_member, members))

    def _extract(self, archive: io.BytesIO, path: Text, options) -> Tuple[Path, bool]:
        # pylint: disable=broad-except
        moved = False
        try:
            shutil.move(path, path + ".bak")
            moved = True
        except IOError:
            pass
        try:
            repo_branch = options.get('revision', self.proj.vars.get('repo_branch', ''))
            with tarfile.open(fileobj=archive) as arch:
                arch.extractall(path, members=self.__get_members(arch, repo_branch))
        except:
            if not options.get('no_update', False):
                self.delete()
            shutil.move(path + ".bak", path) if moved else None
            raise
        else:
            shutil.rmtree(path + ".bak") if moved else None
            return Path(path), True
