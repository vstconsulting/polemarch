# pylint: disable=invalid-name
from django.conf import settings
from django.conf.urls import url
from django.contrib import admin
from django.conf.urls.static import static

from . import views

admin.site.site_header = 'Infrastructure Heat Service'
admin.site.site_title = "IHService"
admin.site.index_title = "IHService Settings Panel"
admin.site.site_url = "/"
login_url = getattr(settings, 'LOGIN_URL', '/login/')[1:]
logout_url = getattr(settings, 'LOGOUT_URL', '/logout/')[1:]

urlpatterns = [
    url(r'^$', views.GUIView.as_view()),
    url(r'^help/$', views.HelpView.as_view()),
    url(r'^{}'.format(login_url), views.Login.as_view(), name='login'),
    url(r'^{}'.format(logout_url), views.Logout.as_view(), {'next_page': '/'}),
    url(r'^admin/', admin.site.urls),
    url(r'^$', admin.site.urls),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
