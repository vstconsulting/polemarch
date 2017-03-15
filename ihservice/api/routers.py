# pylint: disable=no-member,redefined-outer-name,unused-argument
from collections import OrderedDict

from django.conf.urls import include, url

from rest_framework.response import Response
from rest_framework import routers


class _AbstractRouter(routers.DefaultRouter):

    def __init__(self, *args, **kwargs):
        self.permission_classes = kwargs.pop("perms", None)
        super(_AbstractRouter, self).__init__(*args, **kwargs)


class APIRouter(_AbstractRouter):
    root_view_name = 'api-v1'

    def get_api_root_view(self, *args, **kwargs):
        api_root_dict = OrderedDict()
        list_name = self.routes[0].name
        for prefix, _, basename in self.registry:
            api_root_dict[prefix] = list_name.format(basename=basename)

        class API(self.APIRootView):
            root_view_name = self.root_view_name
            if self.permission_classes:
                permission_classes = self.permission_classes

            def get_view_name(self): return self.root_view_name

        return API.as_view(api_root_dict=api_root_dict)

    def get_urls(self):
        urls = super(APIRouter, self).get_urls()
        return urls


class MainRouter(_AbstractRouter):
    routers = []
    custom_urls = []

    def get_api_root_view(self, *args, **kwargs):
        api_root_dict = OrderedDict()
        list_name = self.routes[0].name
        for prefix, _, basename in self.registry:
            api_root_dict[prefix] = list_name.format(basename=basename)  # nocv

        class API(self.APIRootView):
            if self.permission_classes:
                permission_classes = self.permission_classes
            routers = self.routers
            custom_urls = self.custom_urls

            def get_view_name(self): return "API"

            def get(self, request, *args, **kwargs):
                registers = super(API, self).get(request, *args, **kwargs)
                routers_list = OrderedDict()
                for prefix, _, name in self.routers + self.custom_urls:
                    fpath = request.get_full_path().split("?")
                    path = request.build_absolute_uri(fpath[0]) + prefix
                    if len(fpath) > 1:
                        path += "?{}".format(fpath[1])
                    routers_list[name] = path
                routers_list.update(registers.data)
                return Response(routers_list)

        return API.as_view(api_root_dict=api_root_dict)

    def register_router(self, prefix, router, name=None):
        if name is None:
            name = router.root_view_name
        self.routers.append((prefix, router, name))

    def register_view(self, prefix, view, name=None):
        if name is None:
            name = view().get_view_name()
        self.custom_urls.append((prefix, view, name))

    def get_urls(self):
        urls = super(MainRouter, self).get_urls()
        for prefix, router, _ in self.routers:
            urls.append(url(prefix, include(router.urls)))
        for prefix, view, _ in self.custom_urls:
            urls.append(url(prefix, view.as_view()))
        return urls
