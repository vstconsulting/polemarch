# Generated by Django 3.2.15 on 2022-08-31 02:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0013_delete_usersettings'),
    ]

    operations = [
        migrations.AlterIndexTogether(
            name='group',
            index_together=set(),
        ),
        migrations.AddIndex(
            model_name='group',
            index=models.Index(fields=['children'], name='main_group_childre_ec8fc8_idx'),
        ),
        migrations.AddIndex(
            model_name='group',
            index=models.Index(fields=['children', 'id'], name='main_group_childre_f8a3bd_idx'),
        ),
    ]