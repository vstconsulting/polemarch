import logging
import traceback
import requests
from .base import BaseHook


logger = logging.getLogger("polemarch")


class Backend(BaseHook):
    def execute(self, url, when, message) -> str:  # pylint: disable=arguments-renamed
        data = dict(type=when, payload=message)
        try:
            response = requests.post(url, json=data)
            return "{} {}: {}".format(
                response.status_code, response.reason, response.text
            )
        except BaseException as err:
            logger.error(traceback.format_exc())
            logger.error("Details:\nURL:{}\nWHEN:{}\n".format(
                url, when
            ))
            return str(err)
