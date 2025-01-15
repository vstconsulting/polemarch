# Generated by Django 4.1.6 on 2023-02-15 00:27

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from ...main.models import base


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('main', '0003_v3_migrate_data_to_new_models'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='periodictask',
            name='_inventory',
        ),
        migrations.RemoveField(
            model_name='periodictask',
            name='acl',
        ),
        migrations.RemoveField(
            model_name='periodictask',
            name='owner',
        ),
        migrations.RemoveField(
            model_name='periodictask',
            name='project',
        ),
        migrations.RemoveField(
            model_name='periodictask',
            name='template',
        ),
        migrations.RemoveField(
            model_name='template',
            name='acl',
        ),
        migrations.RemoveField(
            model_name='template',
            name='owner',
        ),
        migrations.RemoveField(
            model_name='template',
            name='project',
        ),
        migrations.DeleteModel(
            name='TemplateOption',
        ),
        migrations.AlterField(
            model_name='group',
            name='acl',
            field=models.ManyToManyField(blank=True, to='main.aclpermission'),
        ),
        migrations.AlterField(
            model_name='group',
            name='hosts',
            field=base.ManyToManyFieldACL(related_query_name='groups', to='main.host'),
        ),
        migrations.AlterField(
            model_name='group',
            name='master_project',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='slave_%(class)s', to='main.project'),
        ),
        migrations.AlterField(
            model_name='group',
            name='owner',
            field=models.ForeignKey(default=base.first_staff_user, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='polemarch_%(class)s_set', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='group',
            name='parents',
            field=base.ManyToManyFieldACLReverse(blank=True, related_query_name='childrens', to='main.group'),
        ),
        migrations.AlterField(
            model_name='history',
            name='executor',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='history',
            name='inventory',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, related_query_name='history', to='main.inventory'),
        ),
        migrations.AlterField(
            model_name='history',
            name='project',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_query_name='history', to='main.project'),
        ),
        migrations.AlterField(
            model_name='historylines',
            name='history',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_query_name='raw_history_line', to='main.history'),
        ),
        migrations.AlterField(
            model_name='host',
            name='acl',
            field=models.ManyToManyField(blank=True, to='main.aclpermission'),
        ),
        migrations.AlterField(
            model_name='host',
            name='master_project',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='slave_%(class)s', to='main.project'),
        ),
        migrations.AlterField(
            model_name='host',
            name='owner',
            field=models.ForeignKey(default=base.first_staff_user, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='polemarch_%(class)s_set', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='acl',
            field=models.ManyToManyField(blank=True, to='main.aclpermission'),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='groups',
            field=base.ManyToManyFieldACL(to='main.group'),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='hosts',
            field=base.ManyToManyFieldACL(to='main.host'),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='master_project',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='slave_%(class)s', to='main.project'),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='owner',
            field=models.ForeignKey(default=base.first_staff_user, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='polemarch_%(class)s_set', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='project',
            name='acl',
            field=models.ManyToManyField(blank=True, to='main.aclpermission'),
        ),
        migrations.AlterField(
            model_name='project',
            name='groups',
            field=base.ManyToManyFieldACL(blank=True, to='main.group'),
        ),
        migrations.AlterField(
            model_name='project',
            name='hosts',
            field=base.ManyToManyFieldACL(blank=True, to='main.host'),
        ),
        migrations.AlterField(
            model_name='project',
            name='inventories',
            field=base.ManyToManyFieldACL(blank=True, to='main.inventory'),
        ),
        migrations.AlterField(
            model_name='project',
            name='owner',
            field=models.ForeignKey(default=base.first_staff_user, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='polemarch_%(class)s_set', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='usergroup',
            name='owner',
            field=models.ForeignKey(default=base.first_staff_user, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='polemarch_%(class)s_set', to=settings.AUTH_USER_MODEL),
        ),
        migrations.DeleteModel(
            name='PeriodicTask',
        ),
        migrations.DeleteModel(
            name='Template',
        ),
        migrations.RemoveField(
            model_name='executiontemplate',
            name='old_template_id',
        )
    ]