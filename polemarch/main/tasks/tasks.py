# pylint: disable=broad-except,no-member,redefined-outer-name
import logging
import traceback

from ...wapp import app
from ..utils import task, BaseTask
from .exceptions import TaskError
from ..models.utils import AnsibleModule, AnsiblePlaybook

logger = logging.getLogger("polemarch")


@task(app, ignore_result=True, default_retry_delay=1,
      max_retries=5, bind=True)
class RepoTask(BaseTask):
    accepted_operations = ["clone", "sync"]

    class RepoTaskError(TaskError):
        pass

    class UnknownRepoOperation(RepoTaskError):
        _default_message = "Unknown operation {}."

    def __init__(self, app, project, operation="sync", *args, **kwargs):
        super(self.__class__, self).__init__(app, *args, **kwargs)
        self.project, self.operation = project, operation
        if self.operation not in self.accepted_operations:
            raise self.task_class.UnknownRepoOperation(self.operation)

    def run(self):
        try:
            result = getattr(self.project, self.operation)()
            logger.info(result)
        except Exception as error:
            self.app.retry(exc=error)


@task(app, ignore_result=True, bind=True)
class ScheduledTask(BaseTask):
    def __init__(self, app, job_id, *args, **kwargs):
        super(self.__class__, self).__init__(app, *args, **kwargs)
        self.job_id = job_id

    def run(self):
        from ..models import PeriodicTask
        try:
            PeriodicTask.objects.get(id=self.job_id).execute()
        except PeriodicTask.DoesNotExist:
            return
        except Exception:  # nocv
            logger.error(traceback.format_exc())
            raise


class _ExecuteAnsible(BaseTask):
    ansible_class = None

    def run(self):
        # pylint: disable=not-callable
        ansible_object = self.ansible_class(*self.args, **self.kwargs)
        ansible_object.run()


@task(app, ignore_result=True, bind=True)
class ExecuteAnsiblePlaybook(_ExecuteAnsible):
    ansible_class = AnsiblePlaybook


@task(app, ignore_result=True, bind=True)
class ExecuteAnsibleModule(_ExecuteAnsible):
    ansible_class = AnsibleModule
