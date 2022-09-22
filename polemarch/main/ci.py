from typing import Text
import logging
import traceback
from .models.tasks import BModel, Template


logger = logging.getLogger('polemarch')


class DefaultHandler:
    ci_types = {
        'template': Template
    }

    def __init__(self, repo, results):
        self.repo = repo
        self.repo_obj, self.result = results
        self.ci_vars = self.repo.proj.get_vars_prefixed('ci')

    def event_log(self, message: Text, *args, **kwargs) -> None:
        logger.info(message.format(*args, *kwargs))

    def get_ci_call_object(self) -> [BModel, None]:
        ci_keys = self.ci_vars.keys()
        if not ci_keys:
            return None
        ci_type_name = list(ci_keys)[0]
        ci_model = self.ci_types[ci_type_name]
        return ci_model.objects.get(pk=self.ci_vars[ci_type_name])

    def trigger_execution(self) -> None:
        if self.result:
            ci_object = self.get_ci_call_object()
            if ci_object:
                self.event_log('Start executing CI context.')
                try:
                    ci_object.ci_run()
                except Exception:  # nocv
                    self.event_log(traceback.format_exc())
                    raise
