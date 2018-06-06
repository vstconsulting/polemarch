# pylint: disable=wrong-import-position,unused-import
from vstutils.environment import cmd_execution, sys
sys.path.append('./')
import polemarch  # noqa: F401

cmd_execution()
