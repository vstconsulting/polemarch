from django.test import TestCase

from ..models import Scenario, Task


class ModelsTestCase(TestCase):
    def setUp(self):
        super(ModelsTestCase, self).setUp()
        for i in range(1, 101):
            Task.objects.create(name="task-{}".format(i))

    def test_task_scenario(self):
        sc = Scenario.objects.create(name="test_task_scenario")
        tasks = [1, 3, 5, 4, 100, 55]
        # Setup tasks to Scenario
        result = sc.set_tasks(tasks)
        self.assertEqual(result["created"], len(tasks))
        self.assertEqual(sc.tasks.count(), len(tasks))
        # Check tasks that returns in needed order
        counter = 0
        for task in sc.tasks.all():
            self.assertEqual(task, Task.objects.get(id=tasks[counter]))
            counter += 1
        # Check update tasks list
        tasks.pop(4)
        result = sc.set_tasks(tasks)
        self.assertEqual(result["created"], 0, result)
        self.assertEqual(result["updated"], len(tasks), result)
        self.assertEqual(result["deleted"], 1, result)
