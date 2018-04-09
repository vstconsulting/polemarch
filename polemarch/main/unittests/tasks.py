import json

import re

from datetime import timedelta

import subprocess

from django.conf import settings
from django.utils.timezone import now
from django.core.validators import ValidationError

try:
    from mock import patch
except ImportError:
    from unittest.mock import patch
from django.test import TestCase
from ..tasks.exceptions import TaskError
from ..tasks import RepoTask
from ..exceptions import PMException
from ..models import Project
from ..models import Task, PeriodicTask, History, Inventory, Template

class TasksTestCase(TestCase):
    testHistory = History()

    def test_initiator_object(self):
        self.testHistory.initiator_type = "Something else"
        self.assertEquals(self.testHistory.initiator_object, None)

    def test_execute_args_setter(self):
        with self.assertRaises(ValidationError):
            self.testHistory.execute_args = "something"

    # def test_editable_by(self):
    #     self.testHistory.inventory = dict(inventory='somestr')
    #     print(self.testHistory.editable_by("root"))
    #     self.assertEqual(self.testHistory.editable_by("root"), True)
    #
    # def test_inventory_editable_by(self):
    #     self.testHistory.inventory = dict(inventory='somestr')
    #     print(self.testHistory.editable_by("root"))
    #     self.assertEqual(self.testHistory._inventory_editable("root"), True)
    #
    # def test_inventory_editable_by(self):
    #     self.testHistory.inventory = dict(inventory='somestr')
    #     print(self.testHistory.editable_by("root"))
    #     self.assertEqual(self.testHistory._inventory_viewable("root"), True)

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