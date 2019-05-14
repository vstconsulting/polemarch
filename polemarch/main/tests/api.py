from __future__ import unicode_literals
from datetime import timedelta
from django.test import Client
from django.contrib.auth.hashers import make_password
from django.utils.timezone import now

try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch

from vstutils.utils import redirect_stdany
from ._base import BaseTestCase, json
from .hosts import InventoriesTestCase, InvBaseTestCase  # noqa: F401
from .executions import ProjectTestCase, BaseExecutionsTestCase
from .openapi import OApiTestCase


class ApiBaseTestCase(InvBaseTestCase, BaseExecutionsTestCase, BaseTestCase):
    pass


class ApiUsersTestCase(ApiBaseTestCase):
    def test_login(self):
        User = self.get_model_class('django.contrib.auth.models.User')
        response = self.client.get('/')
        self.assertRedirects(response, self.login_url + '?next=/')
        client = self._login()
        response = self.client.get('/login/')
        self.assertRedirects(response, "/")
        self.result(client.delete, self.get_url('token'), 400)
        self._logout(client)
        data = dict(username="sometestuser",
                    email="admin@test.lan",
                    password="testpass")
        User.objects.create_superuser(**data)
        data.pop("email", None)
        data["next"] = "/{}/".format(self._settings('VST_API_URL'))
        response = self.client.post('/login/', data=data)
        self.assertRedirects(response, "/{}/".format(self._settings('VST_API_URL')))
        response = self.client.post("/logout/")
        self.assertEqual(response.status_code, 302)
        response = self.client.get('/')
        self.assertRedirects(response, self.login_url + '?next=/')

        client = Client()
        data = {'username': self.user.data['username'],
                'password': self.user.data['password']}
        result = self.result(client.post, self.get_url('token'), data=data)
        self.assertIn("token", result)
        headers = dict(
            HTTP_AUTHORIZATION="Token {}".format(result['token']),
            content_type="application/json"
        )
        response = client.get(self.get_url(), **headers)
        self.assertEqual(response.status_code, 200)
        response = client.get(self.get_url())
        self.assertNotEqual(response.status_code, 200)
        result = self.result(client.delete, self.get_url('token'), 204, **headers)
        self.assertIn("detail", result)
        response = client.get(self.get_url(), **headers)
        self.assertNotEqual(response.status_code, 200)

    def test_is_active(self):
        client = self._login()
        AUTH_PASSWORD_VALIDATORS = self.settings_obj.AUTH_PASSWORD_VALIDATORS
        AUTH_PASSWORD_VALIDATORS[1]["OPTIONS"]["min_length"] = 5
        with self.settings(AUTH_PASSWORD_VALIDATORS=AUTH_PASSWORD_VALIDATORS):
            userdata = {"passwords": "ab",
                        "is_active": True,
                        "first_name": "user_f_name",
                        "last_name": "user_l_name",
                        "email": "test@domain.lan"
                        }
            self.result(client.post, self.get_url('user'), 400, userdata)
        passwd = 'eadgbe'
        raw_passwd = make_password(passwd)
        userdata = dict(username="testuser4", password=raw_passwd, password2=raw_passwd,
                        raw_password=True, is_active=False)
        self.result(client.post, self.get_url('user'), 201, userdata)
        client = Client()
        data = {'username': userdata['username'],
                'password': userdata['password']}
        client.post('/login/', data=data)
        response = client.get('/')
        self.assertRedirects(response, self.login_url + '?next=/')

    def test_api_users_get(self):
        client = self._login()
        result = self.result(client.get, self.get_url('user'))
        self.assertEqual(result['count'], 2, result)
        self._logout(client)

    def test_nonoprivileged_userwork_restriction(self):
        self.change_identity()
        selfurl = self.get_url('user', self.user.id)
        self.get_result("patch", selfurl, 200)
        url = self.get_url('user')
        self.change_identity(is_super_user=True)
        olduser = self.user
        self.change_identity()
        # can't create users
        passwd = "some_pass"
        userdata = dict(username="testuser4", password=make_password(passwd),
                        raw_password=True, is_active=False)
        self.get_result("post", url, code=403, data=userdata)
        # can't modify other users
        self.get_result("patch", self.get_url('user', olduser.id),
                        code=403, data=json.dumps(userdata))

    def test_api_users_password_settings(self):
        User = self.get_model_class('django.contrib.auth.models.User')
        client = self._login()
        userdata = {"username": "test_user2",
                    "password": "ab",
                    "password2": "abc",
                    "is_active": True,
                    "first_name": "user_f_name",
                    "last_name": "user_l_name",
                    "email": "test@domain.lan"
                    }
        self.result(client.post, self.get_url('user'), 400, userdata)
        passwd = 'eadgbe'
        encr_passwd = make_password(passwd)
        userdata = dict(username="testuser3",
                        password=encr_passwd, password2=encr_passwd,
                        raw_password=True, is_active=True)
        self.result(client.post, self.get_url('user'), 201, userdata)
        user = User.objects.get(username=userdata['username'])
        self.assertEqual(user.password, userdata['password'])
        self.assertTrue(user.check_password(passwd))
        user.delete()
        userdata.update({"raw_password": False, "password": passwd, "password2": passwd})
        self.result(client.post, self.get_url('user'), 201, userdata)
        user = User.objects.get(username=userdata['username'])
        self.assertTrue(user.check_password(userdata['password']))
        # logout
        self._logout(client)
        self.client.post('/login/', data=dict(username=user.username, password=passwd))
        # Change password
        new_password = 'newpassword'
        data = {
            "password": new_password,
            "password2": new_password,
            "old_password": passwd,
        }
        change_url = self.get_url('user', user.id, 'change_password')
        # change password with correct data
        self.result(client.post, change_url, 201, data)
        # logout
        self._logout(client)
        login_data = dict(username=user.username, password=data['old_password'])
        # login with old password
        self.client.post('/login/', data=login_data)
        response = self.client.get('/')
        self.assertNotEqual(response.status_code, 200)
        # login with new password
        login_data['password'] = data['password']
        self.client.post('/login/', data=login_data)
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        # change password with incorrect data 1
        self.result(client.post, change_url, 403, data)
        # change password with incorrect data 2
        data = {
            "password": passwd,
            "password2": passwd + "a",
            "old_password": new_password,
        }
        self.result(client.post, change_url, 400, data)
        self._logout(client)

    def test_api_user_update(self):
        User = self.get_model_class('django.contrib.auth.models.User')
        client = self._login()
        result = self.result(client.post, self.get_url('user'), 201,
                             {"username": "test_user3",
                              "password": "eadgbe",
                              "password2": "eadgbe",
                              "is_active": True,
                              "first_name": "user_f_name",
                              "last_name": "user_l_name",
                              "email": "test@domain.lan"
                              })
        id = str(result['id'])
        url = self.get_url('user', id)
        data = json.dumps({'last_name': 'some_new_last_name',
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
                                   'password': "eadgbe"})
        self.assertTrue(response)
        admin = User.objects.get(username="admin")
        self.result(client.patch, self.get_url('user', admin.id), 403,
                    json.dumps(dict(last_name="some_last")),
                    content_type="application/json")
        self._logout(client)

    def test_api_users_exists(self):
        client = self._login()
        data = {"username": "test_user89",
                "password": "eadgbe",
                "password2": "eadgbe",
                "is_active": True,
                "first_name": "user_f_name",
                "last_name": "user_l_name",
                "email": "test@domain.lan"
                }
        self.result(client.post, self.get_url('user'), 201, data)
        self.result(client.post, self.get_url('user'), 409, data)
        self._logout(client)

    def test_api_users_insert_and_delete(self):
        patch_obj_pth = '{}.main.hooks.http.Backend.execute'.format(
            self.settings_obj.VST_PROJECT_LIB_NAME
        )
        with patch(patch_obj_pth) as execute_method:
            return self._test_api_users_insert_and_delete(execute_method)

    def _test_api_users_insert_and_delete(self, execute_method):
        self.sended = False
        hook_url = 'http://ex.com'
        hook_data = dict(
            name="test", type='HTTP', recipients=hook_url, when='on_user_add'
        )
        user_data = {
            "username": "test_user", "password": "eadgbe", "password2": "eadgbe",
            "is_active": True, "first_name": "user_f_name",
            "last_name": "user_l_name", "email": "test@domain.lan"
        }
        for w in ['on_user_add', 'on_user_upd', 'on_user_del']:
            hd = dict(**hook_data)
            hd['when'] = w
            self.post_result(self.get_url('hook'), data=json.dumps(hd))

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
        self.result(client.get, self.get_url('user'))
        execute_method.reset_mock()
        execute_method.side_effect = side_effect_method
        result = self.result(client.post, self.get_url('user'), 201, user_data)
        self.assertEquals(execute_method.call_count, 2)
        execute_method.reset_mock()
        self.assertTrue(self.sended, "Raised on sending.")
        self.assertEqual(result["username"], "test_user")
        self.assertEqual(result["first_name"], "user_f_name")
        self.assertEqual(result["last_name"], "user_l_name")
        self.assertEqual(result["email"], "test@domain.lan")
        url = self.get_url('user', str(result['id']))
        self.assertRCode(client.get(url), 200)
        self.result(
            client.patch, url,
            data=json.dumps({'last_name': 'tttt'}),
            content_type="application/json"
        )
        self.assertEquals(execute_method.call_count, 1)
        execute_method.reset_mock()
        self.assertRCode(client.delete(url), 204)
        self.assertEquals(execute_method.call_count, 1)
        idself = self.user.id
        url = self.get_url('user', idself)
        self.assertRCode(client.delete(url), 409)
        self._logout(client)

    def test_api_teams(self):
        url = self.get_url('team')
        range_groups = 10
        for i in range(range_groups):
            self.get_model_class('UserGroup').objects.create(
                name="test_group_{}".format(i)
            )
        self.list_test(url, range_groups)
        ug = self.get_model_class('UserGroup').objects.all().last()
        self.details_test(self.get_url('team', ug.id), name=ug.name, id=ug.id)

        # Add users to Team
        test_user_data = dict(password='123', password2='123')
        bulk_data = [
            self.get_bulk('team', dict(name='test_team'), 'add'),
            self.get_bulk('user', dict(username='test_user', **test_user_data), 'add'),
            self.get_mod_bulk(
                'team', '<0[data][id]>', dict(username='te', **test_user_data), 'user'
            ),
            self.get_mod_bulk(
                'team', '<0[data][id]>', dict(id='<1[data][id]>'), 'user'
            ),
        ]
        results = self.make_bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 201)

        result = self.get_result(
            'get', self.get_url('team', results[0]['data']['id'], 'user')
        )
        self.assertEqual(result['count'], 2)
        self.assertEqual(result['results'][0]['username'], 'te')
        self.assertEqual(result['results'][1]['username'], 'test_user')

        # Test copy
        bulk_data = [
            self.get_mod_bulk('user', results[1]['data']['id'], {}, 'copy'),
            self.get_bulk('user', {}, 'get', pk='<0[data][id]>'),
            self.get_mod_bulk(
                'team', results[0]['data']['id'], {}, 'user/<0[data][id]>', method='get'
            ),
            self.get_mod_bulk('team', results[0]['data']['id'], {"name": "new"}, 'copy'),
            self.get_mod_bulk(
                'team', results[0]['data']['id'], {}, 'user', method='get'
            ),
        ]
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['username'], 'copy-test_user')
        self.assertEqual(results[2]['data']['username'], 'copy-test_user')
        self.assertEqual(results[3]['data']['name'], 'new')
        self.assertEqual(results[4]['data']['count'], 3)

    def test_users_localsettings(self):
        result = self.get_result("get", self.get_url('user', self.user.id))
        self.assertEqual(result["username"], self.user.username)
        data = {"some": True}
        settings_url = self.get_url('user', self.user.id, 'settings')
        result = self.get_result("post", settings_url, 200, data=json.dumps(data))
        self.assertEqual(result, data)
        result = self.get_result("get", settings_url)
        self.assertEqual(result, data)
        result = self.get_result("delete", settings_url, 200)
        self.assertEqual(result, {})
        self.assertCount(self.get_result("get", settings_url), 0)


class APITestCase(ProjectTestCase, OApiTestCase):
    def setUp(self):
        super(APITestCase, self).setUp()

    def test_api_versions_list(self):
        result = self.get_result("get", "/api/")
        self.assertEqual(len(result), 2)
        self.assertTrue(result.get(self._settings('VST_API_VERSION'), False))
        self.assertTrue(result.get('openapi', False))

    def test_api_v1_list(self):
        result = self.get_result('get', self.get_url())
        self.assertTrue(result.get('user', False))
        self.assertTrue(result.get('host', False))
        self.assertTrue(result.get('group', False))
        self.assertTrue(result.get('inventory', False))
        self.assertTrue(result.get('project', False))
        self.assertTrue(result.get('history', False))
        self.assertTrue(result.get('bulk', False))
        self.assertTrue(result.get('token', False))

    def test_api_router(self):
        result = self.get_result('get', "/api/?format=json")
        url = result[self._settings('VST_API_VERSION')].replace("http://testserver", "")
        self.get_result('get', url)

    def _generate_history(self, days_ago, count, status="OK"):
        ph = self.get_model_class('Project').objects.create(name="Stats", repository='')
        history_inventory = self.get_model_class('Inventory').objects.create()
        default_kwargs = dict(
            project=ph, mode="task.yml", raw_inventory="inventory",
            raw_stdout="text", inventory=history_inventory, initiator=self.user.id
        )
        start_time = now() - timedelta(days=days_ago, hours=1)
        stop_time = now() - timedelta(days=days_ago)
        for i in range(count):
            self.get_model_class('History').objects.create(start_time=start_time,
                                                           stop_time=stop_time,
                                                           status=status,
                                                           **default_kwargs)

    def _prepare_statisic(self):
        self.get_model_class('History').objects.all().delete()
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
        User = self.get_model_class('django.contrib.auth.models.User')
        url = self.get_url('stats')
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

    def test_bulk_unsupported(self):
        data = dict(username="some_user", password="some_password")
        bulk_data = [
            {'type': "add", 'item': "token", 'data': data}
        ]
        self.get_result("post", self.get_url('_bulk'), 404, data=json.dumps(bulk_data))
        self.get_result("put", self.get_url('_bulk'), 200, data=json.dumps(bulk_data))

        result = self.get_result("get", self.get_url('_bulk'))
        self.assertIn("host", result["allowed_types"])
        self.assertIn("group", result["allowed_types"])
        self.assertIn("inventory", result["allowed_types"])
        self.assertIn("project", result["allowed_types"])
        self.assertIn("hook", result["allowed_types"])
        self.assertIn("user", result["allowed_types"])
        self.assertIn("team", result["allowed_types"])
        self.assertIn("add", result["operations_types"])
        self.assertIn("set", result["operations_types"])
        self.assertIn("del", result["operations_types"])
        self.assertIn("mod", result["operations_types"])
