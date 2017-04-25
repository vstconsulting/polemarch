from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.decorators import detail_route


class ModelViewSet(viewsets.ModelViewSet):
    serializer_class_one = None
    model = None

    def get_serializer_class(self):
        if self.kwargs.get("pk", False) or self.action == "create":
            if self.serializer_class_one is not None:
                return self.serializer_class_one
        return super(ModelViewSet, self).get_serializer_class()

    def get_queryset(self):
        if self.queryset is None:
            assert self.model is not None, (
                "'%s' should either include a `queryset` or `model` attribute,"
                " or override the `get_queryset()` method."
                % self.__class__.__name__
            )
            self.queryset = self.model.objects.all()
        if not self.request.user.is_staff and self.queryset.model != User:
            qs = self.queryset.filter(related_objects__user=self.request.user)
            self.queryset = qs
        return super(ModelViewSet, self).get_queryset()

    @detail_route(methods=["post", "put", "delete", "get"])
    def permissions(self, request):
        serializer = self.get_serializer(self.get_object())
        return serializer.permissions(request)
