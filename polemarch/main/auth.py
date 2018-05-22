from __future__ import unicode_literals
from django.contrib.auth import get_user_model
from django.conf import settings
from .ldap_utils import LDAP

UserModel = get_user_model()


class LdapBackend(object):
    @property
    def domain(self):
        return settings.LDAP_DOMAIN

    @property
    def server(self):
        return settings.LDAP_SERVER

    def authenticate(self, request, username=None, password=None):
        # pylint: disable=protected-access,unused-argument
        try:
            backend = LDAP(self.server, username, password, self.domain)
            user = UserModel._default_manager.get_by_natural_key(backend.domain_user)
            return user if self.user_can_authenticate(user) else None
        except (LDAP.LdapError, UserModel.DoesNotExist):
            return

    def user_can_authenticate(self, user):
        """
        Reject users with is_active=False. Custom user models that don't have
        that attribute are allowed.
        """
        is_active = getattr(user, 'is_active', None)
        return is_active or is_active is None

    def get_user(self, user_id):
        # pylint: disable=protected-access
        try:
            user = UserModel._default_manager.get(pk=user_id)
        except UserModel.DoesNotExist:  # nocv
            return None
        return user if self.user_can_authenticate(user) else None
