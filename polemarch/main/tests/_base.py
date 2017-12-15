import json  # noqa: F401
import random
import string

import copy
import os

import six
from django.db import transaction
from django.test import TestCase
from django.conf import settings
from django.contrib.auth.models import User
from ...main import models


class BaseTestCase(TestCase):
    std_codes = dict(get=200, post=201, patch=200, delete=204)

    def setUp(self):
        self.user = self._create_user()
        self.login_url = getattr(settings, 'LOGIN_URL', '/login/')
        self.logout_url = getattr(settings, 'LOGOUT_URL', '/logout/')

    def _get_string_from_file(self, name):
        file_path = os.path.dirname(os.path.abspath(__file__))
        file_path += "/" + name
        with open(file_path, 'r') as inventory_file:
            return inventory_file.read()

    def get_model_class(self, model):
        if isinstance(model, (six.text_type, six.string_types)):
            model = getattr(models, model)
        return model

    def get_model_filter(self, model, **kwargs):
        return self.get_model_class(model).objects.filter(**kwargs)

    def get_count(self, model, **kwargs):
        return self.get_model_filter(model, **kwargs).count()

    def change_identity(self, is_super_user=False):
        old_user = self.user
        self.user = self._create_user(is_super_user)
        return old_user

    def random_name(self, length=8):
        return ''.join(random.sample(string.ascii_lowercase, length))

    def _create_user(self, is_super_user=True):
        username = self.random_name()
        email = username + '@gmail.com'
        password = username.upper()
        if is_super_user:
            user = User.objects.create_superuser(username=username,
                                                 password=password,
                                                 email=email)
        else:
            user = User.objects.create_user(username=username,
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

    @transaction.atomic
    def result(self, request, url, code=200, *args, **kwargs):
        response = request(url, *args, **kwargs)
        self.assertRCode(response, code)
        try:
            return json.loads(response.rendered_content.decode()) \
                if (response.status_code != 404 and
                    getattr(response, "rendered_content", False)) \
                else str(response.content.decode('utf-8'))
        except ValueError:
            return None

    def assertCount(self, list, count):
        self.assertEqual(len(list), count)

    def assertRCode(self, resp, code=200):
        '''
        Fail if response code is not equal. Message is response body.
        :param resp: - response object
        :param code: - expected code
        :return: None
        '''
        err_msg = "{} != {}\n{}".format(
            resp.status_code, code,
            resp.rendered_content.decode()
            if (resp.status_code != 404 and
                getattr(resp, "rendered_content", False))
            else resp.content
        )
        self.assertEqual(resp.status_code, code, err_msg)

    def post_result(self, url, code=None, *args, **kwargs):
        return self.get_result("post", url, code, *args, **kwargs)

    def get_result(self, rtype, url, code=None, *args, **kwargs):
        '''
        Test request with returning result of request
        :param rtype:  - request type (methods from Client cls): get, post etc
        :param url:    - requested url
        :param code:   - expected return code from request.
        :param args:   - extra-args for Client class
        :param kwargs: - extra-kwargs for Client class
        :return:       - result of request
        '''
        client = self._login()
        request = getattr(client, rtype)
        code = code or self.std_codes.get(rtype, 200)
        if kwargs.get("data", False):
            if isinstance(kwargs["data"], (six.string_types, six.text_type)):
                kwargs["content_type"] = "application/json"
        result = self.result(request, url, code=code, *args, **kwargs)
        self._logout(client)
        return result

    def mass_create(self, url, data, *fields):
        '''
        Mass creation objects in api-abstration
        :param url: - url to abstract layer
        :param data: - fields of model
        :params fields: - list of fields to check
        :return: - list of id by every resulted models
        '''
        results_id = []
        counter = 0
        for dt in data:
            result = self.get_result("post", url, 201, data=json.dumps(dt))
            self.assertTrue(isinstance(result, dict))
            for field in fields:
                s = "[~~ENCRYPTED~~]"
                if field == "vars" and s in result['vars'].values():
                    pass
                else:
                    self.assertEqual(result[field], data[counter][field])
            results_id.append(result["id"])
            counter += 1
        return results_id

    def list_test(self, url, count):
        '''
        Test for get list of models
        :param url: - url to abstract layer
        :param count: - count of objects in DB
        :return: None
        '''
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count)

    def details_test(self, url, **kwargs):
        '''
        Test for get details of model
        :param url: - url to abstract layer
        :param **kwargs: - params thats should be
                          (key - field name, value - field value)
        :return: None
        '''
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for key, value in kwargs.items():
            self.assertEqual(result[key], value)

    def _check_update(self, url, data, **fields):
        '''
        Test update instance of model
        :param url: - url to instance
        :param data: - update fields
        :param fields: - checking resulted fields as named args
        :return: None
        '''
        self.get_result("patch", url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for field, value in fields.items():
            self.assertEqual(result[field], value)


class AnsibleArgsValidationTest(BaseTestCase):
    _MISTAKES = [
        ("non-existent-ansible-arg", "blablabla"),
        ("forks", "234bnl"),
        ("sudo", "makaka"),
        ("group", "bugaga"),
    ]

    def make_test(self, url, required_args, update_func, exception=None):
        for arg, val in self._MISTAKES:
            if exception == arg:
                continue
            args = copy.deepcopy(required_args)
            update_func(args, {arg: val})
            result = self.get_result("post", url, 400, data=json.dumps(args))
            tp = "playbook" if "playbook" in result['detail'] else "module"
            self.assertIn("Incorrect argument", result["detail"][tp][0])
            self.assertIn(arg, result["detail"]['argument'][0])
