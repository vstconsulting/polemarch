#  pylint: disable=bad-super-call,unused-argument
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.contrib.auth import views as auth
from django.http import HttpResponseRedirect


class BaseView(TemplateView):
    login_required = False

    @classmethod
    def as_view(cls, *args, **kwargs):
        view = super(TemplateView, cls).as_view(*args, **kwargs)
        return cls.login_required and login_required(view) or view


class GUIView(BaseView):
    login_required = True
    template_name = "gui/gui.html"


class Login(BaseView):
    template_name = 'auth/login.html'

    def login(self, request):
        return auth.login(request,
                          template_name=self.template_name)

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated():
            return HttpResponseRedirect(request.GET.get('next', '/'))
        return self.login(request)

    def post(self, request, *args, **kwargs):
        return self.login(request)


class Logout(BaseView):

    def get(self, request, *args, **kwargs):
        return auth.logout(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.get(request, *args, **kwargs)
