from django.conf import settings
from django.test import Client
from django.contrib.auth.hashers import make_password

from ..utils import redirect_stdany
from ._base import BaseTestCase, User, json
from .project import ApiProjectsTestCase
from .bulk import ApiBulkTestCase
from .inventory import (ApiHostsTestCase, ApiGroupsTestCase,
                        ApiInventoriesTestCase)
from .tasks import (ApiTasksTestCase,
                    ApiPeriodicTasksTestCase,
                    ApiTemplateTestCase,
                    ApiHistoryTestCase)
from .ansible import ApiAnsibleTestCase


class ApiUsersTestCase(BaseTestCase):
    def test_login(self):
        response = self.client.get('/')
        self.assertRedirects(response, self.login_url + '?next=/')
        client = self._login()
        response = self.client.get('/login/')
        self.assertRedirects(response, "/")
        self.result(client.delete, '/api/v1/token/', 400)
        self._logout(client)
        data = dict(username="sometestuser",
                    email="admin@test.lan",
                    password="testpass")
        User.objects.create_superuser(**data)
        data.pop("email", None)
        data["next"] = "/api/"
        response = self.client.post('/login/', data=data)
        self.assertRedirects(response, "/api/")
        response = self.client.post("/logout/")
        self.assertEqual(response.status_code, 302)
        response = self.client.get('/')
        self.assertRedirects(response, self.login_url + '?next=/')
        response = self.client.get('/help/')
        self.assertEqual(response.status_code, 200)

        client = Client()
        data = {'username': self.user.data['username'],
                'password': self.user.data['password']}
        result = self.result(client.post, '/api/v1/token/', data=data)
        self.assertIn("token", result)
        headers = dict(
            HTTP_AUTHORIZATION="Token {}".format(result['token']),
            content_type="application/json"
        )
        response = client.get('/api/v1/', **headers)
        self.assertEqual(response.status_code, 200)
        response = client.get('/api/v1/')
        self.assertNotEqual(response.status_code, 200)
        result = self.result(client.delete, '/api/v1/token/', 204, **headers)
        self.assertIn("detail", result)
        response = client.get('/api/v1/', **headers)
        self.assertNotEqual(response.status_code, 200)

    def test_is_active(self):
        client = self._login()
        AUTH_PASSWORD_VALIDATORS = settings.AUTH_PASSWORD_VALIDATORS
        AUTH_PASSWORD_VALIDATORS[1]["OPTIONS"]["min_length"] = 5
        with self.settings(AUTH_PASSWORD_VALIDATORS=AUTH_PASSWORD_VALIDATORS):
            userdata = {"passwords": "ab",
                        "is_active": True,
                        "first_name": "user_f_name",
                        "last_name": "user_l_name",
                        "email": "test@domain.lan"
                        }
            self.result(client.post, "/api/v1/users/", 400, userdata)
        passwd = 'eadgbe'
        userdata = dict(username="testuser4", password=make_password(passwd),
                        raw_password=True, is_active=False)
        self.result(client.post, "/api/v1/users/", 201, userdata)
        client = Client()
        data = {'username': userdata['username'],
                'password': userdata['password']}
        client.post('/login/', data=data)
        response = client.get('/')
        self.assertRedirects(response, self.login_url + '?next=/')

    def test_api_users_get(self):
        client = self._login()
        result = self.result(client.get, "/api/v1/users/")
        self.assertEqual(result['count'], 2, result)
        self._logout(client)

    def test_nonoprivileged_userwork_restriction(self):
        self.change_identity()
        selfurl = "/api/v1/users/{}/".format(self.user.id)
        self.get_result("patch", selfurl, 200)
        url = "/api/v1/users/"
        self.change_identity(is_super_user=True)
        olduser = self.user
        self.change_identity()
        # can't create users
        passwd = "some_pass"
        userdata = dict(username="testuser4", password=make_password(passwd),
                        raw_password=True, is_active=False)
        self.get_result("post", url, code=403, data=userdata)
        # can't modify other users
        self.get_result("patch", "{}{}/".format(url, olduser.id),
                        code=403, data=json.dumps(userdata))

    def test_api_users_password_settings(self):
        client = self._login()
        AUTH_PASSWORD_VALIDATORS = settings.AUTH_PASSWORD_VALIDATORS
        AUTH_PASSWORD_VALIDATORS[1]["OPTIONS"]["min_length"] = 5
        with self.settings(AUTH_PASSWORD_VALIDATORS=AUTH_PASSWORD_VALIDATORS):
            userdata = {"username": "test_user2",
                        "passwords": "ab",
                        "is_active": True,
                        "first_name": "user_f_name",
                        "last_name": "user_l_name",
                        "email": "test@domain.lan"
                        }
            self.result(client.post, "/api/v1/users/", 400, userdata)
        passwd = 'eadgbe'
        userdata = dict(username="testuser3", password=make_password(passwd),
                        raw_password=True, is_active=True)
        self.result(client.post, "/api/v1/users/", 201, userdata)
        user = User.objects.get(username=userdata['username'])
        self.assertEqual(user.password, userdata['password'])
        self.assertTrue(user.check_password(passwd))
        user.delete()
        userdata.update({"raw_password": False, "password": passwd})
        self.result(client.post, "/api/v1/users/", 201, userdata)
        user = User.objects.get(username=userdata['username'])
        self.assertTrue(user.check_password(userdata['password']))
        self._logout(client)

    def test_api_user_update(self):
        client = self._login()
        result = self.result(client.post, "/api/v1/users/", 201,
                             {"username": "test_user3",
                              "password": "eadgbe",
                              "is_active": True,
                              "first_name": "user_f_name",
                              "last_name": "user_l_name",
                              "email": "test@domain.lan"
                              })
        id = str(result['id'])
        url = "/api/v1/users/{}/".format(id)
        data = json.dumps({'last_name': 'some_new_last_name',
                           'password': "eadgbe123",
                           'email': "test@mail.com"})
        result = self.result(client.patch, url, 200, data,
                             content_type="application/json")
        self.assertEqual(result['last_name'], "some_new_last_name")
        self.assertEqual(result['email'], "test@mail.com")
        data = json.dumps({'email': 'some_new_error_mail'})
        with redirect_stdany():
            with self.settings(DEBUG=True):
                self.result(client.patch, url, 400, data,
                            content_type="application/json")
        data = json.dumps({'last_name': 'some_new_last_name'})
        self.result(client.patch, url, 200, data,
                    content_type="application/json")
        self._logout(client)
        client = self.client_class()
        response = client.login(**{'username': "test_user3",
                                   'password': "eadgbe123"})
        self.assertTrue(response)
        admin = User.objects.get(username="admin")
        self.result(client.patch, "/api/v1/users/{}/".format(admin.id), 403,
                    json.dumps(dict(last_name="some_last")),
                    content_type="application/json")
        self._logout(client)

    def test_api_users_exists(self):
        client = self._login()
        data = {"username": "test_user89",
                "password": "eadgbe",
                "is_active": True,
                "first_name": "user_f_name",
                "last_name": "user_l_name",
                "email": "test@domain.lan"
                }
        self.result(client.post, "/api/v1/users/", 201, data)
        self.result(client.post, "/api/v1/users/", 409, data)
        self._logout(client)

    def test_api_users_insert_and_delete(self):
        client = self._login()
        self.result(client.get, "/api/v1/users/")
        result = self.result(client.post, "/api/v1/users/", 201,
                             {"username": "test_user",
                              "password": "eadgbe",
                              "is_active": True,
                              "first_name": "user_f_name",
                              "last_name": "user_l_name",
                              "email": "test@domain.lan"
                              })
        self.assertEqual(result["username"], "test_user")
        self.assertEqual(result["first_name"], "user_f_name")
        self.assertEqual(result["last_name"], "user_l_name")
        self.assertEqual(result["email"], "test@domain.lan")
        id = str(result['id'])
        url = "/api/v1/users/{}/".format(id)
        self.assertRCode(client.get(url), 200)
        self.assertRCode(client.delete(url), 204)
        idself = self.user.id
        url = "/api/v1/users/{}/".format(idself)
        self.assertRCode(client.delete(url), 409)
        self._logout(client)


class APITestCase(ApiUsersTestCase,
                  ApiHostsTestCase, ApiGroupsTestCase,
                  ApiInventoriesTestCase, ApiProjectsTestCase,
                  ApiTasksTestCase, ApiPeriodicTasksTestCase,
                  ApiBulkTestCase, ApiTemplateTestCase, ApiHistoryTestCase,
                  ApiAnsibleTestCase):
    def setUp(self):
        super(APITestCase, self).setUp()

    def test_api_versions_list(self):
        client = self._login()
        result = self.result(client.get, "/api/")
        self.assertEqual(len(result), 1)
        self.assertTrue(result.get('v1', False))
        self._logout(client)

    def test_api_v1_list(self):
        client = self._login()
        result = self.result(client.get, "/api/v1/")
        self.assertTrue(result.get('users', False))
        self.assertTrue(result.get('hosts', False))
        self.assertTrue(result.get('groups', False))
        self.assertTrue(result.get('inventories', False))
        self.assertTrue(result.get('projects', False))
        self.assertTrue(result.get('tasks', False))
        self.assertTrue(result.get('periodic-tasks', False))
        self.assertTrue(result.get('history', False))
        self.assertTrue(result.get('bulk', False))
        self.assertTrue(result.get('token', False))

    def test_api_router(self):
        client = self._login()
        result = self.result(client.get, "/api/?format=json")
        url = result['v1'].replace("http://testserver", "")
        response = client.get(url)
        self.assertRCode(response)
