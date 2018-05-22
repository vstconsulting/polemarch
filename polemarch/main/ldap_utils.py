from __future__ import unicode_literals
from collections import OrderedDict as odict
import traceback
import logging
import json
import six
import ldap


logger = logging.getLogger("polemarch")


def json_default(obj):  # nocv
    error_obj = TypeError("{} is not JSON serializable".format(type(obj)))
    try:
        if isinstance(obj, bytes):
            return obj.decode("utf-8") if six.PY3 else str(obj)
        raise error_obj
    except:
        raise error_obj


class LDAP(object):
    # pylint: disable=no-member
    fields = ['cn', 'sAMAccountName', 'accountExpires', 'name', 'memberOf']
    LdapError = ldap.LDAPError

    class NotAuth(ldap.INVALID_CREDENTIALS):
        pass

    class InvalidDomainName(ldap.INVALID_CREDENTIALS):
        pass

    def __init__(self, connection_string, username='', password='', domain=''):
        '''
        LDAP constructor

        :param connection_string: LDAP connection string ('ldap://server')
        :param username: username with domain ('user@domain.name')
                         or without but domain arg should be set.
        :param password: auth password
        :param domain: domain for easy use users
        '''
        self.connection_string = connection_string
        self.username = username
        self.password = password
        self.domain = domain
        if not self.domain:
            if r'@' not in username:
                raise self.InvalidDomainName(
                    "Domain should be setuped or username should be with @domain.name"
                )
            self.domain = self.username.split('@')[1]
        if len(self.domain.split('.')) <= 1:
            raise self.InvalidDomainName(
                "Invalid name {}. Should be [full.domain.name]".format(domain)
            )
        self.auth(self.username, self.password)

    def auth(self, username=None, password=None):
        username = username or self.username
        password = password or self.password
        self.__conn = self.__authenticate(self.connection_string, username, password)

    def __prepare_user_with_domain(self, username):
        user = str(username)
        if r'@' in user or '\\' in user:
            return user
        if len(self.domain.split('.')) > 1:
            user = "{}@{}".format(username, self.domain.lower())
        return user

    def __authenticate(self, ad, username, password):
        '''
        Active Directory auth function

        :param ad: LDAP connection string ('ldap://server')
        :param username: username with domain ('user@domain.name')
        :param password: auth password
        :return: ldap connection or None if error
        '''
        result = None
        conn = ldap.initialize(ad)
        conn.protocol_version = 3
        conn.set_option(ldap.OPT_REFERRALS, 0)
        user = self.__prepare_user_with_domain(username)
        logger.debug("Trying to auth with user '{}' to {}".format(user, ad))
        try:
            conn.simple_bind_s(user, password)
            result = conn
            self.username, self.password = username, password
            logger.debug("Successfull login as {}".format(username))
        except ldap.INVALID_CREDENTIALS:
            result = False
            logger.debug(traceback.format_exc())
            logger.debug("Invalid ldap-creds.")
        except Exception as ex:  # nocv
            logger.debug(traceback.format_exc())
            logger.debug("Unknown error: {}".format(str(ex)))

        return result

    def __get_user_data(self):
        data_list = self.username.split("@")
        if len(data_list) < 2:
            return self.username, self.domain
        return data_list

    @property
    def domain_user(self):
        return self.__get_user_data()[0].split('\\')[-1]

    @property
    def domain_name(self):
        return self.__get_user_data()[1]

    def isAuth(self):
        '''
        Indicates that object auth worked
        :return: True or False
        '''
        if isinstance(self.__conn, ldap.ldapobject.LDAPObject) or self.__conn:
            return True
        return False

    def __ldap_filter(self, *filters):
        dc_list = ["dc={}".format(i) for i in self.domain_name.split('.') if i]
        additinal_filter = "".join(["({})".format(i) for i in filters if i])
        s_filter = '(&(objectCategory=user){})'.format(additinal_filter)
        base_dn = "{}".format(",".join(dc_list))
        logger.debug(
            'Search in LDAP: {}'.format(
                json.dumps(odict(BASE_DN=base_dn, FILTER=s_filter, FIELDS=self.fields))
            )
        )
        return base_dn, ldap.SCOPE_SUBTREE, s_filter, self.fields

    def group_list(self, *args):
        if not self.isAuth():
            raise self.NotAuth("Invalid auth.")
        try:
            data = {
                k: v for k, v in self.__conn.search_s(*self.__ldap_filter(*args)) if k
            }
            return json.dumps(data, indent=4, ensure_ascii=False, default=json_default)
        except Exception:  # nocv
            logger.debug(traceback.format_exc())
            raise

    def __repr__(self):  # nocv
        return str(self)

    def __unicode__(self):  # nocv
        return str(self)

    def __str__(self):  # nocv
        msg = 'authorized' if self.isAuth() else "unauthorized"
        return '[ {} {} -> {} ]'.format(msg, self.connection_string, self.username)

    def __del__(self):
        if isinstance(getattr(self, '__conn', None), ldap.ldapobject.LDAPObject):
            self.__conn.unbind_s()  # nocv
