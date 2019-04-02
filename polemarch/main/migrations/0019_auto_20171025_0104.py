# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
from django.conf import settings
from ..models.base import first_staff_user


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('auth', '0006_require_contenttypes_0002'),
        ('main', '0018_auto_20170929_0657'),
    ]

    operations = [
        migrations.CreateModel(
            name='ACLPermission',
            fields=[
                ('id', models.AutoField(max_length=20, serialize=False, primary_key=True)),
                ('role', models.CharField(max_length=10)),
            ],
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='groups',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='history',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='hosts',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='inventories',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='periodic_tasks',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='projects',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='tasks',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='template',
        ),
        migrations.RemoveField(
            model_name='typespermissions',
            name='user',
        ),
        migrations.AddField(
            model_name='group',
            name='owner',
            field=models.ForeignKey(related_name='polemarch_group_set', default=first_staff_user, to=settings.AUTH_USER_MODEL, on_delete=models.SET_DEFAULT),
        ),
        migrations.AddField(
            model_name='host',
            name='owner',
            field=models.ForeignKey(related_name='polemarch_host_set', default=first_staff_user, to=settings.AUTH_USER_MODEL, on_delete=models.SET_DEFAULT),
        ),
        migrations.AddField(
            model_name='inventory',
            name='owner',
            field=models.ForeignKey(related_name='polemarch_inventory_set', default=first_staff_user, to=settings.AUTH_USER_MODEL, on_delete=models.SET_DEFAULT),
        ),
        migrations.AddField(
            model_name='periodictask',
            name='owner',
            field=models.ForeignKey(related_name='polemarch_periodictask_set', default=first_staff_user, to=settings.AUTH_USER_MODEL, on_delete=models.SET_DEFAULT),
        ),
        migrations.AddField(
            model_name='project',
            name='owner',
            field=models.ForeignKey(related_name='polemarch_project_set', default=first_staff_user, to=settings.AUTH_USER_MODEL, on_delete=models.SET_DEFAULT),
        ),
        migrations.AddField(
            model_name='template',
            name='owner',
            field=models.ForeignKey(related_name='polemarch_template_set', default=first_staff_user, to=settings.AUTH_USER_MODEL, on_delete=models.SET_DEFAULT),
        ),
        migrations.AlterField(
            model_name='group',
            name='hosts',
            field=models.ManyToManyField(related_query_name='groups', to='main.Host'),
        ),
        migrations.AlterField(
            model_name='group',
            name='parents',
            field=models.ManyToManyField(related_query_name='childrens', to='main.Group', null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='history',
            name='inventory',
            field=models.ForeignKey(related_query_name='history', default=None, blank=True, to='main.Inventory', null=True, on_delete=models.SET_NULL),
        ),
        migrations.AlterField(
            model_name='history',
            name='project',
            field=models.ForeignKey(related_query_name='history', to='main.Project', null=True, on_delete=models.CASCADE),
        ),
        migrations.AlterField(
            model_name='historylines',
            name='history',
            field=models.ForeignKey(related_query_name='raw_history_line', to='main.History', on_delete=models.CASCADE),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='groups',
            field=models.ManyToManyField(to='main.Group'),
        ),
        migrations.AlterField(
            model_name='inventory',
            name='hosts',
            field=models.ManyToManyField(to='main.Host'),
        ),
        migrations.AlterField(
            model_name='periodictask',
            name='inventory',
            field=models.ForeignKey(related_query_name='periodic_tasks', to='main.Inventory', on_delete=models.SET_NULL),
        ),
        migrations.AlterField(
            model_name='periodictask',
            name='project',
            field=models.ForeignKey(related_query_name='periodic_tasks', blank=True, to='main.Project', null=True, on_delete=models.CASCADE),
        ),
        migrations.AlterField(
            model_name='project',
            name='groups',
            field=models.ManyToManyField(to='main.Group', null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='project',
            name='hosts',
            field=models.ManyToManyField(to='main.Host', null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='project',
            name='inventories',
            field=models.ManyToManyField(to='main.Inventory', null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='task',
            name='project',
            field=models.ForeignKey(related_query_name='tasks', to='main.Project', on_delete=models.CASCADE),
        ),
        migrations.DeleteModel(
            name='TypesPermissions',
        ),
        migrations.AddField(
            model_name='aclpermission',
            name='uagroup',
            field=models.ForeignKey(blank=True, to='auth.Group', null=True, on_delete=models.CASCADE),
        ),
        migrations.AddField(
            model_name='aclpermission',
            name='user',
            field=models.ForeignKey(blank=True, to=settings.AUTH_USER_MODEL, null=True, on_delete=models.CASCADE),
        ),
        migrations.AddField(
            model_name='group',
            name='permissions',
            field=models.ManyToManyField(to='main.ACLPermission', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='host',
            name='permissions',
            field=models.ManyToManyField(to='main.ACLPermission', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='inventory',
            name='permissions',
            field=models.ManyToManyField(to='main.ACLPermission', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='periodictask',
            name='permissions',
            field=models.ManyToManyField(to='main.ACLPermission', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='project',
            name='permissions',
            field=models.ManyToManyField(to='main.ACLPermission', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='template',
            name='permissions',
            field=models.ManyToManyField(to='main.ACLPermission', null=True, blank=True),
        ),
        migrations.AlterUniqueTogether(
            name='aclpermission',
            unique_together=set([('user', 'uagroup', 'role')]),
        ),
    ]
