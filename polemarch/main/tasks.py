# pylint: disable=broad-except
import logging
from ..celery_app import app
from .utils import task, BaseTask

logger = logging.getLogger("polemarch")


@task(app, ignore_result=True, default_retry_delay=10,
      max_retries=10, bind=True)
class TestTask(BaseTask):
    def __init__(self, job, arg1, arg2):
        super(self.__class__, self).__init__(job, arg1, arg2)
        logger.info("making sum of " + str(arg1) + " and " + str(arg2))
        try:
            if arg1 == 1:
                raise Exception("Unfortunately we can't proceed with this "
                                "random number")
            self.arg1 = arg1
            self.arg2 = arg2
        except Exception as e:
            job.retry(exc=e)

    def run(self):
        return self.arg1 + self.arg2


@task(app, ignore_result=True, default_retry_delay=10,
      max_retries=10, bind=True)
class TestTask2(BaseTask):
    def __init__(self, job, arg1, arg2):
        super(self.__class__, self).__init__(job, arg1, arg2)
        logger.info("making sum of " + str(arg1) + " and " + str(arg2))
        try:
            self.arg1 = arg1
            self.arg2 = arg2
        except Exception as e:
            job.retry(exc=e)

    def run(self):
        return self.arg1 * self.arg2
