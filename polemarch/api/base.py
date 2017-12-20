from collections import namedtuple
import six
from django.db.models.query import QuerySet
from rest_framework import viewsets, views as rest_views
from rest_framework.decorators import detail_route, list_route
from rest_framework.response import Response as RestResponse
from rest_framework.reverse import reverse


_ResponseClass = namedtuple("ResponseData", [
    "data", "status"
])


class Response(_ResponseClass):

    def _asdict(self):
        data = super(Response, self)._asdict()
        data["status"] = data.get("status", 200)
        if isinstance(data["data"], (six.string_types, six.text_type)):
            data["data"] = dict(detail=self.data)
        return data

    @property
    def resp(self):
        return RestResponse(**self._asdict())

    @property
    def resp_dict(self):
        return self._asdict()


class QuerySetMixin(rest_views.APIView):
    queryset = None
    model = None

    def _base_get_queryset(self):
        assert self.queryset is not None, (
            "'%s' should either include a `queryset` attribute, "
            "or override the `get_queryset()` method."
            % self.__class__.__name__
        )

        queryset = self.queryset
        if isinstance(queryset, QuerySet):
            # Ensure queryset is re-evaluated on each request.
            queryset = queryset.all()
        return queryset

    def get_extra_queryset(self):
        return self.queryset

    def get_queryset(self):
        if self.queryset is None:
            assert self.model is not None, (
                "'%s' should either include a `queryset` or `model` attribute,"
                " or override the `get_queryset()` method."
                % self.__class__.__name__
            )
            self.queryset = self.model.objects.all()
        if self.kwargs.get("pk", None) is None:
            self.queryset = self.get_extra_queryset()
        return self._base_get_queryset()


class GenericViewSet(QuerySetMixin, viewsets.GenericViewSet):
    serializer_class_one = None
    model = None

    def get_serializer_class(self):
        if self.kwargs.get("pk", False) or self.action in ["create"] or \
                int(self.request.query_params.get("detail", u"0")):
            if self.serializer_class_one is not None:
                return self.serializer_class_one
        return super(GenericViewSet, self).get_serializer_class()

    def filter_route_queryset(self, queryset, filter_classes=None):
        if filter_classes is not None:
            if not isinstance(filter_classes, (list, tuple)):
                filter_classes = [filter_classes]
            for filter_class in list(filter_classes):
                queryset = filter_class(self.request.query_params,
                                        queryset=queryset,
                                        request=self.request).qs
        return queryset

    def get_paginated_route_response(self, queryset, serializer_class,
                                     filter_classes=None, **kwargs):
        queryset = self.filter_route_queryset(queryset, filter_classes)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = serializer_class(page, many=True, **kwargs)
            return self.get_paginated_response(serializer.data)

        serializer = serializer_class(queryset, many=True, **kwargs)
        return RestResponse(serializer.data)

    @list_route(methods=["post"])
    def filter(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(**request.data.get("filter", {}))
        queryset = queryset.exclude(**request.data.get("exclude", {}))

        return self.get_paginated_route_response(
            queryset=queryset,
            serializer_class=self.get_serializer_class(),
            context=self.get_serializer_context()
        )


class LimitedPermissionMixin(object):
    def get_extra_queryset(self):
        return self.queryset.user_filter(self.request.user)


class PermissionMixin(LimitedPermissionMixin):  # nocv
    @detail_route(methods=["put", "get"])
    def owner(self, request, pk=None):
        # pylint: disable=unused-argument
        serializer = self.get_serializer(self.get_object())
        return serializer.owner(request).resp

    @detail_route(methods=["post", "put", "delete", "get"])
    def permissions(self, request, pk=None):
        # pylint: disable=unused-argument
        serializer = self.get_serializer(self.get_object())
        return serializer.permissions(request).resp


class ReadOnlyModelViewSet(GenericViewSet,
                           viewsets.ReadOnlyModelViewSet):
    pass


class HistoryModelViewSet(GenericViewSet,
                          viewsets.ReadOnlyModelViewSet,
                          viewsets.mixins.DestroyModelMixin):
    pass


class ModelViewSetSet(GenericViewSet, viewsets.ModelViewSet):
    POST_WHITE_LIST = []


class NonModelsViewSet(GenericViewSet):
    base_name = None

    def get_queryset(self):
        return QuerySet()  # nocv


class ListNonModelViewSet(NonModelsViewSet,
                          viewsets.mixins.ListModelMixin):
    # pylint: disable=abstract-method

    @property
    def methods(self):
        this_class_dict = ListNonModelViewSet.__dict__
        obj_class_dict = self.__class__.__dict__
        new_methods = list()
        for name, attr in obj_class_dict.items():
            detail = getattr(attr, 'detail', True)
            if name not in this_class_dict and not detail:
                new_methods.append(name.replace('_', "-"))
        return new_methods

    def list(self, request, *args, **kwargs):
        routes = {
            method: reverse("{}-{}".format(self.base_name, method),
                            request=request)
            for method in self.methods
        }
        return Response(routes, 200).resp
