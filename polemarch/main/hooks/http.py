import logging
import traceback

import requests
import orjson

from .base import BaseHook


logger = logging.getLogger("polemarch")


class Backend(BaseHook):
    __slots__ = ()
    request_timeout = 60

    def execute(self, url, when, message) -> str:  # pylint: disable=arguments-renamed
        data = {'type': when, 'payload': message}
        try:
            response = requests.post(
                url,
                data=orjson.dumps(data),  # pylint: disable=no-member,
                headers={'Content-Type': 'application/json'},
                timeout=self.request_timeout,
            )
            return f"{response.status_code} {response.reason}: {response.text}"
        except BaseException as err:
            logger.error(traceback.format_exc())
            logger.error("Details:\nURL:%s\nWHEN:%s\n", url, when)
            return str(err)
