from ._base import BaseTestCase


class UsersTestCase(BaseTestCase):
    def test_users_create(self):
        user_staff = self._create_user(is_super_user=False, is_staff=True)
        user_reg = self._create_user(False)

        superuser_results = self.bulk([
            {'method': 'post', 'path': 'user', 'data': {
                'email': 'msh@example.com',
                'first_name': 'Msh',
                'is_active': True,
                'is_staff': False,
                'last_name': 'Msh',
                'username': 'msh',
                'password': '1q2w3e',
                'password2': '1q2w3e'
            }}
        ])

        self.assertEqual(superuser_results[0]['status'], 201)

        with self.user_as(self, user_staff):
            results = self.bulk([
                {'method': 'post', 'path': 'user', 'data': {
                    'email': 'example@example.com',
                    'first_name': 'User',
                    'is_active': True,
                    'is_staff': False,
                    'last_name': 'User',
                    'username': 'user',
                    'password': 'user',
                    'password2': 'user'
                }}
            ])

        self.assertEqual(results[0]['status'], 201)

        with self.user_as(self, user_reg):
            results = self.bulk([
                {'method': 'post', 'path': 'user', 'data': {
                    'email': 'example1@example.com',
                    'first_name': 'User1',
                    'is_active': True,
                    'is_staff': False,
                    'last_name': 'User1',
                    'username': 'user1',
                    'password': 'user1',
                    'password2': 'user1'
                }}
            ])

        self.assertEqual(results[0]['status'], 403)
