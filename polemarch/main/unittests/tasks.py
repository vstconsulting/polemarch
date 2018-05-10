# import json
#
# import re
#
# from datetime import timedelta
#
# import subprocess
#
# from django.conf import settings
# from django.utils.timezone import now
from django.core.validators import ValidationError

# try:
#     from mock import patch
# except ImportError:  # nocv
#     from unittest.mock import patch
from django.test import TestCase
from ..tasks.exceptions import TaskError
from ..tasks import RepoTask
from ..exceptions import PMException
from ..models import History
from ..tests.inventory import _ApiGHBaseTestCase
from ..tests._base import AnsibleArgsValidationTest


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


class ApiTemplateUnitTestCase(_ApiGHBaseTestCase, AnsibleArgsValidationTest):
    def setUp(self):
        super(ApiTemplateUnitTestCase, self).setUp()

        self.pr_tmplt = self.get_model_class('Project').objects.create(**dict(
            name="TmpltProject",
            repository="git@ex.us:dir/rep3.git",
            vars=dict(repo_type="TEST")
        )
                                               )
        self.tmplt_data = dict(
            name="test_tmplt",
            kind="Task",
            data=dict(
                playbook="test.yml",
                somekey="somevalue",
                project=1,
                inventory=2,
                vars=dict(
                    connection="paramiko",
                    tags="update",
                )
            )
        )

        with self.assertRaises(ValidationError):
            self.get_model_class('Template').objects.create(**self.tmplt_data)

    def test_setup(self):
        self.setUp()
        self.assertRaises(ValidationError)


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
