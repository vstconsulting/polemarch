from rest_framework import viewsets


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
        return super(ModelViewSet, self).get_queryset()
