from vstutils.environment import cmd_execution, sys, os

args = list(sys.argv)
args[0] = os.getenv("VST_CTL_SCRIPT", sys.argv[0])

cmd_execution(*args)
