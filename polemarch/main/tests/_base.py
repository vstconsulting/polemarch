import json  # noqa: F401

import os
import stat
from pathlib import Path
from vstutils.tests import BaseTestCase as VSTBaseTestCase
from ...main import models

hook_data = '''#!/bin/bash

echo "OK";
echo $(cat -);
# exit 1;
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
        hook_path = Path(self.get_hook_path(hook))
        with hook_path.open('w') as hook_fd:
            hook_fd.write(hook_data)
        hook_path.chmod(hook_path.stat().st_mode | stat.S_IEXEC)
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

    def mass_create_bulk(self, item, data):
        bulk_data = list()
        counter = 0
        for dt in [dict(i) for i in data]:
            variables = dt.pop('variables', None)
            bulk_data.append(dict(method='post', path=item, data=dt))
            if variables:
                inner_counter = 0
                for k, v in variables.items():
                    md = dict(key=k, value=v)
                    bulk_data.append(dict(method='post', path=[item, f'<<{counter}[data][id]>>', 'variables'], data=md))
                    inner_counter += 1
                counter += inner_counter
            counter += 1
        result = self.bulk_transactional(bulk_data)
        for res in result:
            self.assertEqual(res['status'], 201, res)
        return result
