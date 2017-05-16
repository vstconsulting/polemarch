from ..repo_backends import _Base, logger, os


class Test(_Base):
    # pylint: disable=unused-argument
    def make_clone(self, options):
        import sys
        self._set_status("SYNC")
        logger.info("Cloning repo")
        os.mkdir(self.path) if not os.path.exists(self.path) else None
        with open(self.path+"/f{}.yml".format(sys.version_info[0]), "w") as fl:
            fl.write("clone")
        self._set_status("OK")
        return None, None

    def make_update(self, options):
        import sys
        self._set_status("SYNC")
        logger.info("Update repo from url.")
        with open(self.path+"/f{}.yml".format(sys.version_info[0]), "w") as fl:
            fl.write("update")
        self._set_status("OK")
        return None, None
