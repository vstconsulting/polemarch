from django.test import TestCase

from ..models import Host
from ...api.v1.serializers import ModelRelatedField


class ModelRelatedFieldTestCase(TestCase):
    def test_modelrelatedfield(self):
        ModelRelatedField(model=Host)
