import logging
from django_test_migrations.contrib.unittest_case import MigratorTestCase
from django.conf import settings


logger = logging.getLogger('polemarch')


class TestDirectMigration(MigratorTestCase):
    migrate_from = ('main', '0007_auto_20200615_0402')
    migrate_to = ('main', '0008_auto_20200618_0818')

    def prepare(self):
        """Prepare some data before the migration."""
        Projects = self.old_state.apps.get_model('main', 'Project')
        prj = Projects.objects.create(name='pb_test')

        proj_dir =  settings.PROJECTS_DIR
        prj.playbook.create(name=f"{proj_dir}/{prj.id}/test", playbook=f"{proj_dir}/{prj.id}/test.yml")
        prj.playbook.create(name="test1", playbook="test1.yml")

    def test_migration_main0008(self):
        """Run the test itself."""
        Project = self.new_state.apps.get_model('main', 'Project')
        prj = Project.objects.get(name='pb_test')
        playbook = prj.playbook.first()
        relative_pb = prj.playbook.last()

        self.assertEqual(playbook.name, 'test')
        self.assertEqual(playbook.playbook, 'test.yml')
        self.assertEqual(relative_pb.name, 'test1')
        self.assertEqual(relative_pb.playbook, 'test1.yml')
