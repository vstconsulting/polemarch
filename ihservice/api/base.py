from rest_framework import viewsets


class ModelViewSet(viewsets.ModelViewSet):
    model = None

    def get_queryset(self):
        if self.queryset is None:
            assert self.model is not None, (
                "'%s' should either include a `queryset` or `model` attribute,"
                " or override the `get_queryset()` method."
                % self.__class__.__name__
            )
            self.queryset = self.model.objects.all()
        return super(ModelViewSet, self).get_queryset()
