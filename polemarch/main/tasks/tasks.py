# pylint: disable=broad-except,no-member,redefined-outer-name
import logging
import traceback
from django.conf import settings
from vstutils.utils import import_class
from ..utils import task, BaseTask, TaskClass
from .exceptions import TaskError
from ..models import TemplatePeriodicTask, Project, History, Inventory
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

    def __init__(self, app, project_id, operation="sync", *args, **kwargs):
        super(RepoTask.task_class, self).__init__(app, *args, **kwargs)
        self.operation = operation
        if self.operation not in self.accepted_operations:
            raise self.task_class.UnknownRepoOperation(self.operation)
        self.project = Project.objects.get(id=project_id)

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
            TemplatePeriodicTask.objects.get(id=self.job_id).execute()
        except:
            logger.error(traceback.format_exc())
            raise


class PluginTask(TaskClass):
    ignore_result = True

    def run(self, *, plugin: str, project_id, history_id, execute_args, **kwargs):
        project = Project.objects.get(id=project_id)
        history = None

        if history_id is not None:
            history = History.objects.get(id=history_id)
            history.celery_task_id = self.request.id
            history.save(update_fields=('celery_task_id',))

        if isinstance(execute_args.get('inventory'), int):
            execute_args['inventory'] = Inventory.objects.get(id=execute_args['inventory'])

        try:
            PLUGIN_HANDLERS.get_object(plugin, project, history, **execute_args).execute()
        except:
            logger.error(traceback.format_exc())
            raise


app.register_task(PluginTask())
