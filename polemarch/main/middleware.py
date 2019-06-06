from django.http.request import HttpRequest
from django.http.response import HttpResponse
from vstutils.middleware import BaseMiddleware


class PolemarchHeadersMiddleware(BaseMiddleware):
    def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        # pylint: disable=unused-argument
        response['Polemarch-Version'] = self.get_setting('POLEMARCH_VERSION')
        response['Polemarch-Timezone'] = self.get_setting('TIME_ZONE')
        return response
