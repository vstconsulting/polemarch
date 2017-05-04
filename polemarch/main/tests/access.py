import json

from ..models import Project
from .inventory import _ApiGHBaseTestCase


class ApiAccessTestCase(_ApiGHBaseTestCase):
    def _ensure_rights(self, url, data, list_urls, single_url,
                       get_code, set_code, error_code, count):
        self.assertEqual(self.get_result("get", url)["count"], count)
        self.get_result("get", single_url, get_code)

        # and with his satellites
        for list_url in list_urls:
            gr_lists_url = single_url + list_url + "/"
            # passing -1 as id of element, because we just want to check that
            # it actually trying to do specified action without any access
            # violation errors
            self.get_result("post", gr_lists_url, error_code,
                            data=json.dumps([-1]))
            self.get_result("put", gr_lists_url, error_code,
                            data=json.dumps([-1]))
            self.get_result("delete", gr_lists_url, error_code,
                            data=json.dumps([-1]))

        self.get_result("put", single_url, get_code,
                        data=json.dumps(data))
        self.get_result("delete", single_url, set_code)

    def _ensure_no_rights(self, url, data, list_urls, single_url):
        self._ensure_rights(url, data, list_urls, single_url, 404, 404, 404, 0)

    def _ensure_have_rights(self, url, data, list_urls, single_url):
        self._ensure_rights(url, data, list_urls, single_url, 200, 204, 200, 1)

    def _test_access_rights(self, url, data, list_urls=[]):
        id = self.mass_create(url, [data], *data.keys())[0]
        single_url = url + "{}/".format(id)

        # owner have all rights
        self._ensure_have_rights(url, data, list_urls, single_url)

        # another user can't do anything with this object
        nonprivileged_user = self.user
        self.change_identity()
        self._ensure_no_rights(url, data, list_urls, single_url)

        # superuser can do anything
        self.change_identity(is_super_user=True)
        self._ensure_have_rights(url, data, list_urls, single_url)

        perm_url = single_url + "permissions/"

        # we can add rights for user
        self.get_result("post", perm_url, 201,
                        data=json.dumps([nonprivileged_user.id]))
        self.user = nonprivileged_user
        self._ensure_have_rights(url, data, list_urls, single_url)

        # we can remove rights for user
        self.change_identity(is_super_user=True)
        self.get_result("delete", perm_url, 201,
                        data=json.dumps([nonprivileged_user.id]))
        self.user = nonprivileged_user
        self._ensure_no_rights(url, data, list_urls, single_url)

    def test_hosts_access_rights(self):
        self._test_access_rights("/api/v1/hosts/",
                                 dict(name="127.0.1.1",
                                      type="HOST",
                                      vars={}))

    def test_groups_access_rights(self):
        self._test_access_rights("/api/v1/groups/",
                                 dict(name="one", vars={}),
                                 ["hosts"])
        self._test_access_rights("/api/v1/groups/",
                                 dict(name="one", vars={}, children=True),
                                 ["groups"])

    def test_inventories_access_rights(self):
        self._test_access_rights("/api/v1/inventories/",
                                 dict(name="Inv1", vars={}),
                                 ["hosts", "groups"])

    def test_projects_access_rights(self):
        self._test_access_rights("/api/v1/projects/",
                                 dict(name="Prj3",
                                      repository="git@ex.us:dir/rep3.git"),
                                 ["inventories", "tasks", "periodic-tasks"])

    def test_periodic_tasks_access_rights(self):
        data = [dict(name="Prj1", repository="git@ex.us:dir/rep3.git")]
        project_id = self.mass_create("/api/v1/projects/", data,
                                      "name", "repository")[0]
        Project.objects.get(id=project_id)

        url = "/api/v1/periodic-tasks/"
        data = dict(playbook="p1.yml",
                    schedule="10",
                    type="DELTA",
                    project=project_id)
        id = self.mass_create(url, [data], *data.keys())[0]
        single_url = url + "{}/".format(id)

        # owner have all rights
        self._ensure_have_rights(url, data, [], single_url)

        # another user can't do anything with this object
        nonprivileged_user = self.user
        self.change_identity()
        self._ensure_no_rights(url, data, [], single_url)

        # superuser can do anything
        self.change_identity(is_super_user=True)
        self._ensure_have_rights(url, data, [], single_url)

        perm_url = "/api/v1/projects/permissions/"

        # we can add rights for user
        self.get_result("post", perm_url, 201,
                        data=json.dumps([nonprivileged_user.id]))
        self.user = nonprivileged_user
        self._ensure_have_rights(url, data, [], single_url)

        # we can remove rights for user
        self.change_identity(is_super_user=True)
        self.get_result("delete", perm_url, 201,
                        data=json.dumps([nonprivileged_user.id]))
        self.user = nonprivileged_user
        self._ensure_no_rights(url, data, [], single_url)
