from datetime import timedelta
from django.conf import settings
from django.test import Client
from django.contrib.auth.hashers import make_password
from django.utils.timezone import now

try:
    from mock import patch
except ImportError:
    from unittest.mock import patch

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
from .repo_backends import RepoBackendsTestCase
from ..models import UserGroup, History


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

    @patch('polemarch.main.hooks.http.Backend._execute')
    def test_api_users_insert_and_delete(self, execute_method):
        self.sended = False
        hook_url = 'http://ex.com'
        hook_data = dict(
            name="test", type='HTTP', recipients=hook_url, when='on_user_add'
        )
        user_data = {
            "username": "test_user", "password": "eadgbe",
            "is_active": True, "first_name": "user_f_name",
            "last_name": "user_l_name", "email": "test@domain.lan"
        }
        for w in ['on_user_add', 'on_user_upd', 'on_user_del']:
            hd = dict(**hook_data)
            hd['when'] = w
            self.post_result("/api/v1/hooks/", data=json.dumps(hd))

        def side_effect_method(url, when, message):
            self.assertEqual(url, hook_url)
            self.assertEqual(when, 'on_user_add')
            json.dumps(message)
            self.assertEqual(
                message['target']['username'], user_data['username']
            )
            self.sended = True
            return '200 OK: {"result": "ok"}'

        client = self._login()
        self.result(client.get, "/api/v1/users/")
        execute_method.reset_mock()
        execute_method.side_effect = side_effect_method
        result = self.result(client.post, "/api/v1/users/", 201, user_data)
        self.assertEquals(execute_method.call_count, 2)
        execute_method.reset_mock()
        self.assertTrue(self.sended, "Raised on sending.")
        self.assertEqual(result["username"], "test_user")
        self.assertEqual(result["first_name"], "user_f_name")
        self.assertEqual(result["last_name"], "user_l_name")
        self.assertEqual(result["email"], "test@domain.lan")
        id = str(result['id'])
        url = "/api/v1/users/{}/".format(id)
        self.assertRCode(client.get(url), 200)
        result = self.result(
            client.patch, url,
            data=json.dumps({'last_name': 'tttt'}),
            content_type="application/json"
        )
        self.assertEquals(execute_method.call_count, 1)
        execute_method.reset_mock()
        self.assertRCode(client.delete(url), 204)
        self.assertEquals(execute_method.call_count, 1)
        idself = self.user.id
        url = "/api/v1/users/{}/".format(idself)
        self.assertRCode(client.delete(url), 409)
        self._logout(client)

    def test_api_groups(self):
        url = '/api/v1/teams/'
        range_groups = 10
        for i in range(range_groups):
            UserGroup.objects.create(name="test_group_{}".format(i))
        self.list_test(url, range_groups)
        ug = UserGroup.objects.all().last()
        self.details_test(
            url + "{}/".format(ug.id),
            name=ug.name, id=ug.id
        )
        data = [
            dict(name="test_group_{}".format(i))
            for i in range(range_groups, range_groups+10)
        ]
        results_id = self.mass_create(url, data, "name")
        for team_id in results_id:
            self.get_result("delete", url + "{}/".format(team_id))
        self.list_test(url, range_groups)
        # Test users in groups
        url_ug = "{}{}/".format(url, ug.id)
        self.get_result("patch", url_ug, data=json.dumps({
            "users_list": [self.user.id]
        }))
        result = self.get_result("get", url_ug)
        self.assertCount(result["users"], 1)
        self.assertEqual(result["users"][0]["id"], self.user.id)
        self.assertEqual(result["users"][0]["username"], self.user.username)
        self.assertIn(self.user.id, result["users_list"])
        self.get_result("patch", url_ug, data=json.dumps({
            "users_list": []
        }))
        result = self.get_result("get", url_ug)
        self.assertCount(result["users"], 0)

    def test_users_localsettings(self):
        user_url = "/api/v1/users/{}/".format(self.user.id)
        result = self.get_result("get", user_url)
        self.assertEqual(result["username"], self.user.username)
        data = {"some": True}
        result = self.get_result(
            "post", "{}settings/".format(user_url), 200, data=json.dumps(data)
        )
        self.assertEqual(result, data)
        result = self.get_result("get", "{}settings/".format(user_url))
        self.assertEqual(result, data)
        result = self.get_result("delete", "{}settings/".format(user_url), 200)
        self.assertEqual(result, {})
        self.assertCount(
            self.get_result("get", "{}settings/".format(user_url)), 0
        )


class APITestCase(ApiUsersTestCase,
                  ApiHostsTestCase, ApiGroupsTestCase,
                  ApiInventoriesTestCase, ApiProjectsTestCase,
                  ApiTasksTestCase, ApiPeriodicTasksTestCase,
                  ApiBulkTestCase, ApiTemplateTestCase, ApiHistoryTestCase,
                  ApiAnsibleTestCase, RepoBackendsTestCase):
    def setUp(self):
        super(APITestCase, self).setUp()

    def test_api_versions_list(self):
        result = self.get_result("get", "/api/")
        self.assertEqual(len(result), 1)
        self.assertTrue(result.get('v1', False))

    def test_api_v1_list(self):
        result = self.get_result('get', "/api/v1/")
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
        result = self.get_result('get', "/api/?format=json")
        url = result['v1'].replace("http://testserver", "")
        self.get_result('get', url)

    def _generate_history(self, days_ago, count, status="OK"):
        default_kwargs = dict(
            project=self.ph, mode="task.yml", raw_inventory="inventory",
            raw_stdout="text", inventory=self.history_inventory,
            initiator=self.user.id
        )
        start_time = now() - timedelta(days=days_ago, hours=1)
        stop_time = now() - timedelta(days=days_ago)
        for i in range(count):
            History.objects.create(start_time=start_time, stop_time=stop_time,
                                   status=status, **default_kwargs)

    def _prepare_statisic(self):
        History.objects.all().delete()
        self._generate_history(1, 10, 'OK')
        self._generate_history(1, 3, 'ERROR')
        self._generate_history(1, 2, 'STOP')
        self._generate_history(2, 2, 'OK')
        self._generate_history(2, 2, 'ERROR')
        self._generate_history(2, 2, 'STOP')
        self._generate_history(35, 5, 'OK')
        self._generate_history(37, 11, 'ERROR')
        self._generate_history(41, 8, 'ERROR')
        return {
            'year': [
                {'sum': 24, 'all': 45, 'status': 'ERROR'},
                {'sum': 17, 'all': 45, 'status': 'OK'},
                {'sum': 4, 'all': 45, 'status': 'STOP'}
            ],
            'month': [
                {'sum': 19, 'all': 24, 'status': 'ERROR'},
                {'sum': 5, 'all': 24, 'status': 'OK'},
                {'sum': 5, 'all': 21, 'status': 'ERROR'},
                {'sum': 12, 'all': 21, 'status': 'OK'},
                {'sum': 4, 'all': 21, 'status': 'STOP'}
            ],
            'day': [
                {'sum': 8, 'all': 8, 'status': 'ERROR'},
                {'sum': 11, 'all': 11, 'status': 'ERROR'},
                {'sum': 5, 'all': 5, 'status': 'OK'},
                {'sum': 2, 'all': 6, 'status': 'ERROR'},
                {'sum': 2, 'all': 6, 'status': 'OK'},
                {'sum': 2, 'all': 6, 'status': 'STOP'},
                {'sum': 3, 'all': 15, 'status': 'ERROR'},
                {'sum': 10, 'all': 15, 'status': 'OK'},
                {'sum': 2, 'all': 15, 'status': 'STOP'}
            ]
        }

    def _check_stats_history(self, items, data):
        count = 0
        self.assertEqual(len(items), len(data))
        for day in items:
            self.assertEqual(day['all'], data[count]['all'])
            count += 1

    def test_statistic(self):
        url = '/api/v1/stats/'
        self.maxDiff = None
        # Prepare history data
        data = self._prepare_statisic()
        # self._prepare_statisic()
        result = self.get_result('get', url+"?last=365")
        # Check objects counters
        self.assertEqual(result['projects'], self.get_count('Project'))
        self.assertEqual(result['inventories'], self.get_count('Inventory'))
        self.assertEqual(result['groups'], self.get_count('Group'))
        self.assertEqual(result['hosts'], self.get_count('Host'))
        self.assertEqual(result['teams'], self.get_count('UserGroup'))
        self.assertEqual(result['users'], self.get_count(User))
        # Check history counts
        self._check_stats_history(data['day'], result['jobs']['day'])
