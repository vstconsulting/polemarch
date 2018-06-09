# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


def fix_templates(apps, schema_editor):
    Template = apps.get_registered_model('main', 'Template')
    qs = Template.objects.filter(models.Q(options_data='')|models.Q(template_data=''))
    qs.filter(options_data='').update(options_data='{}')
    qs.filter(template_data='').update(template_data='{}')


def fix_templates_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0046_auto_20180608_0658'),
    ]

    operations = [
        migrations.RunPython(fix_templates, reverse_code=fix_templates_reverse),
    ]
