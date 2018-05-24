import logging
import traceback
from django.http.response import Http404
from rest_framework import status
from rest_framework.response import Response
from vstutils.api.base import exception_handler

from ..main import exceptions as mexcs

logger = logging.getLogger("polemarch")


def polemarch_exception_handler(exc, context):
    # pylint: disable=too-many-return-statements
    logger.info(traceback.format_exc())

    if isinstance(exc, mexcs.DataNotReady):
        return Response({"detail": exc.msg},
                        status=status.HTTP_424_FAILED_DEPENDENCY)
    elif isinstance(exc, (mexcs.NotApplicable, Http404)):
        return Response({"detail": getattr(exc, 'msg', str(exc))},
                        status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, mexcs.UnknownTypeException):
        return Response({"detail": exc.msg},
                        status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    default_response = exception_handler(exc, context)

    return default_response
