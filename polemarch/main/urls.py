# pylint: disable=invalid-name,no-member
from vstutils.urls import urlpatterns, url
from . import views

urlpatterns += [
    url(r'^app$', views.AppGUIView.as_view()),
    url(r'^app-login', views.AppLogin.as_view(), name='login'),
]
