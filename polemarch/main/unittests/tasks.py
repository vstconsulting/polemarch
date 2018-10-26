from django.core.validators import ValidationError
from django.test import TestCase
from ..tasks.exceptions import TaskError
from ..tasks import RepoTask
from ..exceptions import PMException
from ..models import History


class TasksTestCase(TestCase):
    testHistory = History()

    def test_initiator_object(self):
        self.testHistory.initiator_type = "Something else"
        self.assertEquals(self.testHistory.initiator_object, None)
        self.testHistory.initiator_type = "project"
        self.testHistory.initiator = 1
        self.assertEqual(self.testHistory.initiator_object, self.testHistory)

    def test_execute_args_setter(self):
        with self.assertRaises(ValidationError):
            self.testHistory.execute_args = "something"


class TestTaskError(TestCase):

    def test_init_task_error(self):
        msg = "Test error message"
        first_task_error = TaskError(msg)
        second_task_error = PMException(msg)
        self.assertEqual(first_task_error.msg, second_task_error.msg)


class TestRepoTask(TestCase):

    def test_init_repo_task(self):
        app = None
        project = "TestProject"
        with self.assertRaises(RepoTask.task_class.UnknownRepoOperation):
            RepoTask(app, project, "error")
