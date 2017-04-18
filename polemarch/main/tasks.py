import random

import logging

from polemarch.celery_app import app

logger = logging.getLogger("polemarch")


class TestTask(object):
    def __init__(self, job, a, b):
        logger.info("making sum of " + str(a) + " and " + str(b))
        try:
            if random.randint(1, 10) > 5:
                raise Exception("Unfortunately we can't proceed with this "
                                "random number")
            self.a = a
            self.b = b
            super(TestTask, self).__init__()
        except Exception as e:
            job.retry(exc=e)

    def run(self):
        return self.a + self.b


@app.task(ignore_result=True, default_retry_delay=10,
      max_retries=10, bind=True)
def test(self, a, b):
    return TestTask(self, a, b).run()