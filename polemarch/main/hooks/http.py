import logging
import traceback
import requests
from .base import BaseHook


logger = logging.getLogger("polemarch")


class Backend(BaseHook):
    def _execute(self, url, when, message):
        data = dict(type=when, payload=message)
        try:
            response = requests.post(url, data=data)
            return "{} {}: {}".format(
                response.status_code, response.reason, response.text
            )
        except BaseException as err:
            logger.error(traceback.format_exc())
            logger.error("Details:\nURL:{}\nWHEN:{}\n".format(
                url, when
            ))
            return str(err)

    def send(self, message, when):
        super(Backend, self).send(message, when)
        return "\n".join([
            self._execute(r, when, message)
            for r in self.conf['recipients'] if r
        ])
