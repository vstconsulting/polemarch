import logging
from django.conf import settings


logger = logging.getLogger("polemarch")


class BaseMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response
        super(BaseMiddleware, self).__init__()

    def __call__(self, request):
        return self.get_response(request)


class PolemarchHeadersMiddleware(BaseMiddleware):
    def __call__(self, request):
        response = super(PolemarchHeadersMiddleware, self).__call__(request)
        response['Polemarch-Version'] = getattr(settings, 'POLEMARCH_VERSION')
        response['Polemarch-Timezone'] = getattr(settings, 'TIME_ZONE')
        return response
