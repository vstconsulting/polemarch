import json  # noqa: F401

import os
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from ...main import models

hook_data = '''
echo "OK"
'''


class BaseTestCase(VSTBaseTestCase):
    server_name = 'polemarch-testserver'
    models = models
    tests_path = os.path.dirname(os.path.abspath(__file__))

    def setUp(self):
        super(BaseTestCase, self).setUp()
        self.hooks_dir = self._settings('HOOKS_DIR')
        self.hooks = []
        self.hook_model = self.get_model_class('Hook')
        self.hook_types = self.hook_model.handlers.when_types_names

    def tearDown(self):
        super(BaseTestCase, self).tearDown()
        for hook in self.hooks:
            hook_path = self.get_hook_path(hook)
            if os.path.exists(hook_path):
                try:
                    os.remove(hook_path)
                except:  # nocv
                    pass

    def create_hook(self, hook):
        with open(self.get_hook_path(hook), 'w') as hook_fd:
            hook_fd.write(hook_data)
        self.hooks.append(hook)

    def generate_hooks(self, hooks):
        for hook in hooks:
            self.create_hook(hook)

    def get_hook_path(self, hook):
        return "{}/{}".format(self.hooks_dir, hook)

    def get_test_filepath(self, name):
        file_path = os.path.dirname(os.path.abspath(__file__))
        file_path += "/" + name
        return file_path

    def _get_string_from_file(self, name):
        with open(self.get_test_filepath(name), 'r') as fd:
            return fd.read()

    def get_mod_bulk(self, item, pk, data, mtype="variables", *args, **kwargs):
        return super(BaseTestCase, self).get_mod_bulk(
            item, pk, data, mtype, *args, **kwargs
        )

    def _get_bulk_mod(self, item, index, data, mtype='variables'):
        return self.get_mod_bulk(item, "<{}[data][id]>".format(index), data, mtype)

    def mass_create_bulk(self, item, data):
        bulk_data = list()
        counter = 0
        for dt in [dict(i) for i in data]:
            variables = dt.pop('variables', None)
            bulk_data.append({'type': "add", 'item': item, 'data': dt})
            if variables:
                inner_counter = 0
                for k, v in variables.items():
                    md = dict(key=k, value=v)
                    bulk_data.append(self._get_bulk_mod(item, counter, md))
                    inner_counter += 1
                counter += inner_counter
            counter += 1
        result = self.make_bulk(bulk_data)
        for res in result:
            self.assertEqual(res['status'], 201, res)
        return result
