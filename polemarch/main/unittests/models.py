from ..tests._base import BaseTestCase


class ModelsTestCase(BaseTestCase):
    def test_acl_handler(self):
        ObjClass = self.get_model_class("Host")
        obj = ObjClass()
        class_handler = ObjClass.acl_handler
        object_handler = obj.acl_handler
        self.assertEqual(class_handler.instance, None)
        self.assertEqual(class_handler.model, ObjClass)
        self.assertEqual(object_handler.instance, obj)
        self.assertEqual(object_handler.model, ObjClass)
