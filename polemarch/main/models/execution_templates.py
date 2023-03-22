from uuid import uuid4
from django.db.models import (
    JSONField,
    CharField,
    UUIDField,
    TextField,
    BooleanField,
    BigAutoField,
    AutoField,
    CASCADE,
)
from django.contrib.auth import get_user_model
from celery.schedules import crontab
from vstutils.models.model import BaseModel
from vstutils.models.fields import FkModelField
from .projects import Project
from ..constants import CrontabTimeType, PeriodicTaskScheduleType, HistoryInitiatorType
from ..executions import PLUGIN_HANDLERS


User = get_user_model()


class ExecutionTemplate(BaseModel):
    id = BigAutoField(primary_key=True, db_index=True)
    name = CharField(max_length=255, db_index=True)
    project = FkModelField(Project, on_delete=CASCADE, related_name='execution_templates')
    plugin = CharField(max_length=128, db_index=True)
    notes = TextField(default='')

    class Meta:
        default_related_name = 'execution_templates'

    def execute(self, executor: User, option, arguments: dict = None):
        return PLUGIN_HANDLERS.execute(
            self.plugin,
            project=self.project,
            execute_args=arguments or option.arguments,
            executor=executor,
            initiator=self.id,
            initiator_type=HistoryInitiatorType.TEMPLATE,
            options={
                'template_option': str(option.id),
            }
        )


class ExecutionTemplateOption(BaseModel):
    id = UUIDField(primary_key=True, db_index=True, default=uuid4)
    name = CharField(max_length=255, db_index=True)
    template = FkModelField(ExecutionTemplate, on_delete=CASCADE, related_name='options')
    notes = TextField(default='')
    arguments = JSONField(default=dict)

    class Meta:
        default_related_name = 'execution_template_options'

    @property
    def plugin(self):
        return self.template.plugin  # pylint: disable=no-member

    @property
    def project(self):
        return self.template.project  # pylint: disable=no-member

    def execute(self, executor: User, arguments: dict = None):
        # pylint: disable=no-member
        return self.template.execute(executor, self, arguments)

    def ci_run(self):
        # pylint: disable=no-member
        self.execute(self.template.project.owner)


class TemplatePeriodicTask(BaseModel):
    id = AutoField(primary_key=True, db_index=True)
    name = CharField(max_length=255, db_index=True)
    template_option = FkModelField(
        ExecutionTemplateOption,
        on_delete=CASCADE,
        related_name='periodic_tasks',
    )
    notes = TextField(default='')
    type = CharField(max_length=10)
    schedule = CharField(max_length=512)
    enabled = BooleanField(default=False)
    save_result = BooleanField(default=False)

    class Meta:
        default_related_name = 'execution_template_option_schedules'

    def execute(self):
        # pylint: disable=no-member
        return PLUGIN_HANDLERS.execute(
            self.template_option.plugin,
            project=self.template_option.project,
            execute_args=self.template_option.arguments,
            initiator=self.id,
            initiator_type='scheduler',
            save_result=self.save_result,
            options={
                'template': self.template_option.template.id,
                'template_option': str(self.template_option.id),
            }
        )

    @property
    def crontab_kwargs(self):
        kwargs, index, fields = {}, 0, self.schedule.split(' ')  # pylint: disable=no-member
        for field_name in CrontabTimeType.get_values():
            if index < len(fields) and len(fields[index]) > 0:
                kwargs[field_name] = fields[index]
            else:
                kwargs[field_name] = '*'
            index += 1
        return kwargs

    def get_schedule(self):
        if self.type == PeriodicTaskScheduleType.CRONTAB:
            return crontab(**self.crontab_kwargs)
        return float(self.schedule)
