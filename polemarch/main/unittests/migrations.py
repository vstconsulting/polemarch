from django_test_migrations.contrib.unittest_case import MigratorTestCase
from django.conf import settings
from ..models import Project, Task


class TestDirectMigration(MigratorTestCase):
    migrate_from = ('main', '0007_auto_20200615_0402')
    migrate_to = ('main', '0008_auto_20200618_0818')

    def prepare(self):
        """Prepare some data before the migration."""
        project_model = Project  # self.old_state.apps.get_model('main', 'Project')
        task_model = Task  # self.old_state.apps.get_model('main', 'Task')
        prj = project_model.objects.create(name='pb_test')

        project_dir = settings.PROJECTS_DIR

        task_model.objects.create(
            name=f"{project_dir}/{prj.id}/test",
            playbook=f"{project_dir}/{prj.id}/test.yml",
            project=prj
        )
        task_model.objects.create(
            name="test1",
            playbook="test1.yml",
            project=prj
        )

    def test_migration_main0008(self):
        """Run the test itself."""
        project_model = self.new_state.apps.get_model('main', 'Project')
        prj = project_model.objects.get(name='pb_test')
        playbook = prj.playbook.first()
        relative_pb = prj.playbook.last()

        self.assertEqual(playbook.name, 'test')
        self.assertEqual(playbook.playbook, 'test.yml')
        self.assertEqual(relative_pb.name, 'test1')
        self.assertEqual(relative_pb.playbook, 'test1.yml')
