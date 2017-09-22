# pylint: disable=invalid-name
from django.conf import settings
from django.conf.urls import url, include
from django.contrib import admin
from django.conf.urls.static import static

from . import views
from ..api.urls import urls as api_urls

admin.site.site_header = 'Polemarch - infrastructure orcestrator'
admin.site.site_title = "Polemarch"
admin.site.index_title = "Polemarch Settings Panel"
admin.site.site_url = "/"
login_url = getattr(settings, 'LOGIN_URL', '/login/')[1:]
logout_url = getattr(settings, 'LOGOUT_URL', '/logout/')[1:]
doc_url = getattr(settings, 'DOC_URL', '/docs/')[1:]

urlpatterns = [
    url(r'^$', views.GUIView.as_view()),
    url(r'^{}'.format(login_url), views.Login.as_view(), name='login'),
    url(r'^{}'.format(logout_url), views.Logout.as_view(), {'next_page': '/'}),
    url(r'^admin/', admin.site.urls),
    url(r'^$', admin.site.urls),
]

urlpatterns += api_urls
if getattr(settings, "APACHE", False):
    urlpatterns += static(settings.STATIC_URL,
                          document_root=settings.STATIC_ROOT)
urlpatterns += [url(r'^{}'.format(doc_url), include('docs.urls'))]
