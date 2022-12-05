# pylint: disable=broad-except,no-member,redefined-outer-name
import logging
import traceback
from django.conf import settings
from vstutils.utils import import_class
from ..utils import task, BaseTask
from .exceptions import TaskError
from ..models import PeriodicTask
from ..executions import PLUGIN_HANDLERS

logger = logging.getLogger("polemarch")
clone_retry = getattr(settings, 'CLONE_RETRY', 5)
app = import_class(f'{settings.VST_PROJECT}.wapp.app')


@task(app, ignore_result=True, default_retry_delay=1, max_retries=clone_retry, bind=True)
class RepoTask(BaseTask):
    __slots__ = 'project', 'operation'
    accepted_operations = ["clone", "sync"]

    class RepoTaskError(TaskError):
        pass

    class UnknownRepoOperation(RepoTaskError):
        _default_message = "Unknown operation {}."

    def __init__(self, app, project, operation="sync", *args, **kwargs):
        super(RepoTask.task_class, self).__init__(app, *args, **kwargs)
        self.project, self.operation = project, operation
        if self.operation not in self.accepted_operations:
            raise self.task_class.UnknownRepoOperation(self.operation)

    def run(self):
        try:
            result = getattr(self.project, self.operation)()
            logger.debug(result)
        except Exception as error:
            self.app.retry(exc=error)


@task(app, ignore_result=True, bind=True)
class ScheduledTask(BaseTask):
    __slots__ = ('job_id',)

    def __init__(self, app, job_id, *args, **kwargs):
        super(ScheduledTask.task_class, self).__init__(app, *args, **kwargs)
        self.job_id = job_id

    def run(self):
        try:
            PeriodicTask.objects.get(id=self.job_id).execute()
        except PeriodicTask.DoesNotExist:
            return
        except Exception:  # nocv
            logger.error(traceback.format_exc())
            raise


@task(app, ignore_result=True, bind=True)
class PluginTask(BaseTask):
    def __init__(self, *args, plugin: str, project, history, execute_args, **kwargs):
        super().__init__(*args, **kwargs)
        self.plugin = plugin
        self.project = project
        self.history = history
        self.execute_args = execute_args

    def run(self):
        try:
            PLUGIN_HANDLERS.get_object(
                self.plugin,
                self.project,
                self.history,
                **self.execute_args,
            ).execute()
        except:
            logger.error(traceback.format_exc())
            raise
