import logging
import sys
import traceback
import six

from django.http import Http404
from django.core import exceptions as djexcs
from django.utils.translation import ugettext_lazy as _
from rest_framework import exceptions, status, views
from rest_framework.response import Response

from ..main import exceptions as mexcs

logger = logging.getLogger("polemarch")


def polemarch_exception_handler(exc, context):
    # pylint: disable=too-many-return-statements
    logger.info(traceback.format_exc())
    default_exc = (exceptions.APIException, djexcs.PermissionDenied)
    if isinstance(exc, Http404):
        msg = _('Not found or not allowed to view.')
        data = {'detail': six.text_type(msg)}
        return Response(data, status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, djexcs.ValidationError):
        errors = dict(exc).get('__all__', dict(exc)) if isinstance(exc, dict)\
                                                     else exc
        if isinstance(errors, list):
            errors = {'other_errors': errors}  # pragma: no cover
        return Response({"detail": errors},
                        status=status.HTTP_400_BAD_REQUEST)
    elif isinstance(exc, mexcs.UnknownModelHandlerException):
        return Response({"detail": exc.msg},
                        status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
    elif not isinstance(exc, default_exc) and isinstance(exc, Exception):
        return Response({'detail': str(sys.exc_info()[1]),
                         'error_type': sys.exc_info()[0].__name__},
                        status=status.HTTP_400_BAD_REQUEST)
    return views.exception_handler(exc, context)
