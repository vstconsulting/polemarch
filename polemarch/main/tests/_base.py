import json  # noqa: F401
import random
import string

import six
from django.test import TestCase
from django.conf import settings
from django.contrib.auth.models import User


class BaseTestCase(TestCase):
    std_codes = dict(get=200, post=201, patch=200, delete=204)

    def setUp(self):
        self.user = self._create_user()
        self.login_url = getattr(settings, 'LOGIN_URL', '/login/')
        self.logout_url = getattr(settings, 'LOGOUT_URL', '/logout/')

    def _create_user(self):
        username = ''.join(random.sample(string.ascii_lowercase, 8))
        email = username + '@gmail.com'
        password = username.upper()
        user = User.objects.create_superuser(username=username,
                                             password=password,
                                             email=email)
        user.data = {'username': username, 'password': password}
        return user

    def _login(self):
        client = self.client
        response = client.login(**{'username': self.user.data['username'],
                                   'password': self.user.data['password']})
        self.assertTrue(response)
        return client

    def _logout(self, client):
        self.assertEqual(client.get(self.logout_url).status_code, 302)

    def result(self, request, url, code=200, *args, **kwargs):
        response = request(url, *args, **kwargs)
        self.assertRCode(response, code)
        try:
            return json.loads(response.rendered_content.decode())
        except ValueError:
            return None

    def assertCount(self, list, count):
        self.assertEqual(len(list), count)

    def assertRCode(self, resp, code=200):
        self.assertEqual(resp.status_code, code,
                         "{} != {}\n{}".format(resp.status_code, code,
                                               resp.rendered_content.decode()))

    def get_result(self, rtype, url, code=None, *args, **kwargs):
        client = self._login()
        request = getattr(client, rtype)
        if code is None:
            code = self.std_codes.get(rtype, 200)
        if kwargs.get("data", False):
            if isinstance(kwargs["data"], six.string_types):
                kwargs["content_type"] = "application/json"
        result = self.result(request, url, code=code, *args, **kwargs)
        self._logout(client)
        return result
