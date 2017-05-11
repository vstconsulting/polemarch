# pylint: disable=expression-not-assigned,abstract-method
# TODO: remove `abstract-method` from disabled
import os
import shutil
import logging

from django.conf import settings


PROJECTS_DIR = getattr(settings, "PROJECTS_DIR")
logger = logging.getLogger("polemarch")


class _Base(object):
    def __init__(self, project, **options):
        self.options = options
        self.project = project
        self.path = self.project.path

    def _set_status(self, status):
        self.project.set_status(status)

    def clone(self):  # pragma: no cover
        raise NotImplementedError

    def get(self):  # pragma: no cover
        raise NotImplementedError

    def delete(self):
        if os.path.exists(self.path):
            if os.path.isfile(self.path):
                os.remove(self.path)
            else:
                shutil.rmtree(self.path)
            return "Repository removed!"
        return "Repository does not exists."


class Test(_Base):
    def clone(self):
        import sys
        self._set_status("SYNC")
        logger.info("Cloning repo")
        os.mkdir(self.path) if not os.path.exists(self.path) else None
        with open(self.path+"/f{}.txt".format(sys.version_info[0]), "w") as fl:
            fl.write("clone")
        self._set_status("OK")

    def get(self):
        import sys
        self._set_status("SYNC")
        logger.info("Update repo from url.")
        with open(self.path+"/f{}.txt".format(sys.version_info[0]), "w") as fl:
            fl.write("update")
        self._set_status("OK")


class Git(_Base):
    pass
