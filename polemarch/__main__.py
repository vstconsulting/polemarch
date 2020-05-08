# pylint: disable=wrong-import-position,unused-import
from vstutils.environment import cmd_execution, sys
sys.path.append('./')
try:
    from polemarch import default_settings  # noqa: F401
except ImportError:
    from . import default_settings  # noqa: F401

cmd_execution()
