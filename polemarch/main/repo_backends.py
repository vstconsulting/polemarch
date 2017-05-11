# pylint: disable=abstract-method
# TODO: remove `abstract-method` from disabled
import logging


logger = logging.getLogger("polemarch")


class _Base(object):
    def __init__(self, project, **options):
        self.project = project
        self.options = options

    def _set_status(self, status):
        self.project.set_status(status)

    def clone(self):  # pragma: no cover
        raise NotImplementedError

    def get(self):  # pragma: no cover
        raise NotImplementedError


class Test(_Base):
    def clone(self):
        self._set_status("SYNC")
        logger.info("Cloning repo")
        self._set_status("OK")

    def get(self):
        self._set_status("SYNC")
        logger.info("Update repo from url.")
        self._set_status("OK")


class Git(_Base):
    pass
