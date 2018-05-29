#  pylint: disable=bad-super-call,unused-argument
from vstutils.gui.views import GUIView, Login


class AppGUIView(GUIView):
    template_name = "gui/app-gui.html"


class AppLogin(Login):
    template_name = 'auth/app-login.html'
