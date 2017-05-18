# pylint: disable=broad-except,no-member,redefined-outer-name
import logging

from ...celery_app import app
from ..utils import task, BaseTask
from .exceptions import TaskError

logger = logging.getLogger("polemarch")


@task(app, ignore_result=True, default_retry_delay=1,
      max_retries=5, bind=True)
class RepoTask(BaseTask):
    accepted_oprations = ["clone", "sync"]

    class RepoTaskError(TaskError):
        pass

    class UnknownRepoOperation(RepoTaskError):
        _default_message = "Unknown operation {}."

    def __init__(self, app, project, operation="sync", *args, **kwargs):
        super(self.__class__, self).__init__(app, *args, **kwargs)
        self.project, self.operation = project, operation
        if self.operation not in self.accepted_oprations:
            raise self.task_class.UnknownRepoOperation(self.operation)

    def run(self):
        try:
            result = getattr(self.project, self.operation)()
            logger.info(result)
        except Exception as error:
            self.app.retry(exc=error)

@task(app, ignore_result=True, bind=True)
class ExecuteAnsibleTask(BaseTask):
    def __init__(self, app, job, inventory, *args, **kwargs):
        super(self.__class__, self).__init__(app, *args, **kwargs)
        self.inventory = inventory
        self.job = job

    def run(self):
        self.job.run_ansible_playbook(self.inventory)