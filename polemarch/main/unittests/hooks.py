import os
import json
try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch
from django.test import TestCase
from django.conf import settings
from django.core.validators import ValidationError
from requests import Response
from vstutils.utils import raise_context
from ..models import Hook


class HooksTestCase(TestCase):
    def setUp(self):
        super(HooksTestCase, self).setUp()
        self.scripts = ['test.sh', 'send.sh']
        self.scripts = ['{}/{}'.format(settings.HOOKS_DIR, s) for s in self.scripts]
        for script in self.scripts:
            with open(script, 'w') as file:
                file.write("test")

    def tearDown(self):
        super(HooksTestCase, self).tearDown()
        for script in self.scripts:
            with raise_context():
                os.remove(script)

    def check_output_run(self, check_data, *args, **kwargs):
        # pylint: disable=unused-argument
        rep = str(kwargs['cwd'] or '')
        rep += '/' if kwargs['cwd'] else ''
        rep += self.recipients[self.count]
        self.assertEqual(check_data[0], rep)
        self.assertEqual(check_data[1], 'on_execution')
        message = json.loads(kwargs['input'])
        self.assertEqual(message.get('test', None), 'test')
        self.assertTrue(kwargs['universal_newlines'])
        self.count += 1
        return "Ok"

    def check_output_error(self, *args, **kwargs):
        # pylint: disable=unused-argument
        raise Exception("Err")

    def test_script(self):
        self.recipients = ['test.sh', 'send.sh']
        with self.assertRaises(ValidationError):
            Hook.objects.create(
                type='SCRIPT', recipients="some.sh", when="error_on"
            )
        hook = Hook.objects.create(
            type='SCRIPT', recipients=" | ".join(self.recipients)
        )
        with patch('subprocess.check_output') as cmd:
            self.count = 0
            cmd.side_effect = self.check_output_run
            self.assertEqual(hook.run(message=dict(test="test")), "Ok\nOk")
            self.assertEqual(cmd.call_count, 2)
            hook.run('on_error', message=dict(test="test"))
            self.assertEqual(cmd.call_count, 2)
            cmd.side_effect = self.check_output_error
            self.assertEqual(hook.run(message=dict(test="test")), "Err\nErr")
            self.assertEqual(cmd.call_count, 4)

    def check_output_run_http(self, method, url, data, **kwargs):
        # pylint: disable=protected-access, unused-argument
        self.assertEqual(method, "post")
        self.check_output_run(
            [url, data['type']],
            cwd='', input=json.dumps(data['payload']),
            universal_newlines=True
        )
        the_response = Response()
        the_response.reason = "ok"
        the_response.status_code = 200
        the_response._content = b'{ "result" : "ok" }'
        return the_response

    def test_http(self):
        self.recipients = ['http://test.lan', 'https://example.com']
        hook = Hook.objects.create(
            type='HTTP', recipients=" | ".join(self.recipients)
        )
        with patch('requests.api.request') as cmd:
            self.count = 0
            cmd.side_effect = self.check_output_run_http
            result = hook.run(message=dict(test="test"))
            for res in result.split("\n"):
                self.assertEqual(res, '200 ok: { "result" : "ok" }')
            self.assertEqual(cmd.call_count, 2)
            hook.run('on_error', message=dict(test="test"))
            self.assertEqual(cmd.call_count, 2)
            cmd.side_effect = self.check_output_error
            self.assertEqual(hook.run(message=dict(test="test")), "Err\nErr")
            self.assertEqual(cmd.call_count, 4)
