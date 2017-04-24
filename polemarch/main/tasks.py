# pylint: disable=broad-except
import random
import logging
from polemarch.celery_app import app

logger = logging.getLogger("polemarch")

def task(original_class, *args, **kwargs):
    pass

class TestTask(object):
    def __init__(self, job, arg1, arg2):
        logger.info("making sum of " + str(arg1) + " and " + str(arg2))
        try:
            if random.randint(1, 10) > 5:
                raise Exception("Unfortunately we can't proceed with this "
                                "random number")
            self.arg1 = arg1
            self.arg2 = arg2
            super(TestTask, self).__init__()
        except Exception as e:
            job.retry(exc=e)

    def run(self):
        return self.arg1 + self.arg2


@app.task(ignore_result=True, default_retry_delay=10,
          max_retries=10, bind=True)
def test(self, arg1, arg2):
    return TestTask(self, arg1, arg2).run()
