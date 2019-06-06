from __future__ import unicode_literals
from ..tests._base import BaseTestCase
from django.core.validators import ValidationError
from ..exceptions import UnknownTypeException


class TemplateCreateTestCase(BaseTestCase):

    def test_template_key_validator(self):
        Template = self.get_model_class('Template')
        Project = self.get_model_class('Project')
        test_proj = Project()
        test_proj.save()
        with self.assertRaises(UnknownTypeException):
            Template.objects.create()
        with self.assertRaises(ValidationError):
            Template.objects.create(
                data=dict(err_key='err_val'),
                project=test_proj,
                kind='Task'
            )
