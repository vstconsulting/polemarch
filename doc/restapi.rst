Rest API
========

Polemarch provides REST API for all it's functionality accessible via web GUI,
because our GUI also uses this API to work. Below there is information about every
entity we have in Polemarch and methods applicable to it.

All urls methods are stated with ``/api/v1/`` for first API version.
With other versions number will be changed. Current documentation is writen for
version 1. In this documentation all methods are placed with this prefix to simplify copy & pasting.

.. _pagination:

Pagination
----------

.. |pagination_def| replace:: :ref:`pagination` is used for this list.

For all kinds of objects in Polemarch pagination is used. So for every list of
objects of every kind result will look like:

.. http:get:: /api/v1/{something}/

   Gets list of something.

   Results:

   .. sourcecode:: js

        {
           "count":40,
           "next":"http://localhost:8080/api/v1/hosts/?limit=5&offset=10",
           "previous":"http://localhost:8080/api/v1/hosts/?limit=5",
           "results":[
              // list of objects goes here
           ]
        }

   :>json number count: how many objects exist at all.
   :>json string next: link to next page with objects (``null`` if we at last).
   :>json string previous: link to previous page with objects (``null`` if we
     at first).
   :>json array results: array of objects at current page.

.. _hosts:

Hosts
-----

.. http:get:: /api/v1/hosts/{id}/

   Gets details about one host.

   :arg id: id of host.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hosts/12/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":12,
           "name":"038108237241668497-0875926814493907",
           "type":"HOST",
           "vars":{

           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "url":"http://localhost:8080/api/v1/hosts/12/?format=json"
        }

   :>json number id: id of host.
   :>json string name: |host_name_def|
   :>json string type: |host_type_def|
   :>json object vars: |obj_vars_def|
   :>json object owner: |host_owner_details|
   :>json string url: url to this specific host.


.. |host_type_def| replace:: it is ``RANGE`` if name is range of IPs or hosts,
   otherwise is ``HOST``.
.. |host_name_def| replace:: either human-readable name or hostname/IP or range
   of them (it is depends on context of using this host during playbooks running).
.. |host_owner_details| replace:: owner of host. Supported fields
   could be seen in :http:get:`/api/v1/users/{id}/`.
.. |hosts_details_ref| replace:: **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/hosts/{id}/`.

.. http:get:: /api/v1/hosts/

   Gets list of hosts. |pagination_def|

   :query id: id of host, if we want to filter by it.
   :query name: name of host, if we want to filter by it.
   :query type: type of host, if we want to filter by it.
   :query id__not: id of host, which we want to filter out.
   :query name__not: name of host, which we want to filter out.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hosts/?name__not=192.168.0.1 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":4,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":1,
                 "name":"127.0.0.1",
                 "type":"HOST",
                 "url":"http://testserver/api/v1/hosts/1/"
              },
              {
                 "id":2,
                 "name":"hostonlocal",
                 "type":"HOST",
                 "url":"http://testserver/api/v1/hosts/2/"
              },
              {
                 "id":3,
                 "name":"127.0.0.[3:4]",
                 "type":"RANGE",
                 "url":"http://testserver/api/v1/hosts/3/"
              },
              {
                 "id":4,
                 "name":"127.0.0.[5:6]",
                 "type":"RANGE",
                 "url":"http://testserver/api/v1/hosts/4/"
              }
           ]
        }

   |hosts_details_ref|

.. http:delete:: /api/v1/hosts/{id}/

   Deletes host.

   :arg id: id of host.

.. http:post:: /api/v1/hosts/

   Creates host.

   :<json string name: |host_name_def|
   :<json string type: |host_type_def|
   :<json object vars: |obj_vars_def|

   Example request:

   .. sourcecode:: http

      POST /api/v1/hosts/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"038108237241668497-0875926814493907",
         "type":"HOST",
         "vars":{

         }
      }

   Results:

   .. sourcecode:: js

        {
           "id":12,
           "name":"038108237241668497-0875926814493907",
           "type":"HOST",
           "vars":{

           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "url":"http://localhost:8080/api/v1/hosts/12/?format=json"
        }

   |hosts_details_ref|

.. http:patch:: /api/v1/hosts/{id}/

   Updates host. |patch_reminder|

   :arg id: id of host.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/hosts/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/hosts/12/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"038108237241668497-0875926814493907"
      }

   Results:

   .. sourcecode:: js

        {
           "id":12,
           "name":"038108237241668497-0875926814493907",
           "type":"HOST",
           "vars":{

           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "url":"http://localhost:8080/api/v1/hosts/12/?format=json"
        }

   |hosts_details_ref|

.. _groups:

Groups
------

.. http:get:: /api/v1/groups/{id}/

   Gets details about one group.

   :arg id: id of group.

   Example request:

   .. sourcecode:: http

      GET /api/v1/groups/12/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

      {
         "id":1,
         "name":"Group1",
         "hosts":[
            {
               "id":41,
               "name":"127.0.0.2",
               "type":"HOST",
               "url":"http://localhost:8080/api/v1/hosts/41/"
            },
            {
               "id":42,
               "name":"192.168.0.[1-10]",
               "type":"RANGE",
               "url":"http://localhost:8080/api/v1/hosts/42/"
            }
         ],
         "groups":[

         ],
         "vars":{

         },
         "children":false,
         "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
         },
         "url":"http://localhost:8080/api/v1/groups/1/"
      }

   :>json number id: id of group.
   :>json string name: name of group.
   :>json array hosts: |group_hosts_def|
   :>json array groups: |group_groups_def|
   :>json object vars: |obj_vars_def|
   :>json boolean children: |group_children_def|
   :>json object owner: |group_owner_details|
   :>json string url: url to this specific group.

.. |group_hosts_def| replace:: list of hosts in group, if ``children`` is
   ``false``, otherwise empty. See :ref:`hosts` for fields explanation.
.. |group_groups_def| replace:: list of subgroups in group, if ``children`` is
   ``true``, otherwise empty.
.. |group_children_def| replace:: either this group of subgroups or group of
   hosts.
.. |group_owner_details| replace:: owner of group. Supported fields
   could be seen in :http:get:`/api/v1/users/{id}/`.
.. |group_details_ref| replace:: **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/groups/{id}/`.

.. http:get:: /api/v1/groups/

   Gets list of groups. |pagination_def|

   :query id: id of group, if we want to filter by it.
   :query name: name of group, if we want to filter by it.
   :query id__not: id of group, which we want to filter out.
   :query name__not: name of group, which we want to filter out.

   Example request:

   .. sourcecode:: http

      GET /api/v1/groups/?name__not=web-servers HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

      {
         "count":2,
         "next":null,
         "previous":null,
         "results":[
            {
               "id":1,
               "name":"Group1",
               "children":false,
               "url":"http://localhost:8080/api/v1/groups/1/"
            },
            {
               "id":2,
               "name":"Group2",
               "children":true,
               "url":"http://localhost:8080/api/v1/groups/2/"
            }
         ]
      }

   |group_details_ref|

.. http:delete:: /api/v1/groups/{id}/

   Deletes group.

   :arg id: id of group.

.. http:post:: /api/v1/groups/

   Creates group.

   :<json string name: name of new group.
   :<json boolean children: |group_children_def|
   :<json object vars: |obj_vars_def|

   Example request:

   .. sourcecode:: http

      POST /api/v1/groups/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"SomeGroup",
         "children":true,
         "vars":{

         }
      }

   Results:

   .. sourcecode:: js

      {
         "id":3,
         "name":"SomeGroup",
         "hosts":[

         ],
         "groups":[

         ],
         "vars":{

         },
         "children":true,
         "owner": {
             "id": 1,
             "username": "admin",
             "is_active": true,
             "is_staff": true,
             "url": "http://localhost:8080/api/v1/users/1/"
         },
         "url":"http://localhost:8080/api/v1/groups/3/"
      }

   |group_details_ref|

.. http:patch:: /api/v1/groups/{id}/

   Updates group. |patch_reminder|

   :arg id: id of group.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/groups/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/groups/3/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"SomeGroupChanged"
      }

   Results:

   .. sourcecode:: js

      {
         "id":3,
         "name":"SomeGroupChanged",
         "hosts":[

         ],
         "groups":[

         ],
         "vars":{

         },
         "children":true,
         "owner": {
             "id": 1,
             "username": "admin",
             "is_active": true,
             "is_staff": true,
             "url": "http://localhost:8080/api/v1/users/1/"
         },
         "url":"http://localhost:8080/api/v1/groups/3/"
      }

   |group_details_ref|

.. http:post:: /api/v1/groups/{group_id}/hosts/

   Adds hosts to group. |sublists_details|

   :statuscode 409: attempt to work with hosts list of children
    group (``children=true``). This kind of groups is only for storing other groups
    within itself.

.. |codes_groups_hosts| replace:: **Status Codes:** status codes are the same as in
   :http:post:`/api/v1/groups/{group_id}/hosts/`.

.. http:put:: /api/v1/groups/{group_id}/hosts/

   Replaces sublist of hosts with new one. |sublists_details|

   |codes_groups_hosts|

.. http:delete:: /api/v1/groups/{group_id}/hosts/

   Removes those hosts from group. |sublists_details|

   |codes_groups_hosts|

.. http:post:: /api/v1/groups/{group_id}/groups/

   Adds subgroups to group. |sublists_details|

   :statuscode 409: attempt to work with group list of not children group
    (``children=false``).  This kind of groups is only for storing hosts within itself.

.. |codes_groups_groups| replace:: **Status Codes:** status codes are the same as in
   :http:post:`/api/v1/groups/{group_id}/groups/`.

.. http:put:: /api/v1/groups/{group_id}/groups/

   Replaces sublist of subgroups with new one. |sublists_details|

   |codes_groups_groups|

.. http:delete:: /api/v1/groups/{group_id}/groups/

   Removes those subgroups from group. |sublists_details|

   |codes_groups_groups|

.. _inventory:

Inventories
-----------

.. http:get:: /api/v1/inventories/{id}/

   Gets details about one inventory.

   :arg id: id of inventory.

   Example request:

   .. sourcecode:: http

      GET /api/v1/inventories/8/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":8,
           "name":"Inventory1",
           "hosts":[
              {
                  "id": 7,
                  "name": "test-host-0",
                  "type": "HOST",
                  "url": "http://localhost:8080/api/v1/hosts/7/"
              }
           ],
           "all_hosts": [
              {
                  "id": 7,
                  "name": "test-host-0",
                  "type": "HOST",
                  "url": "http://localhost:8080/api/v1/hosts/7/"
              },
              {
                  "id": 8,
                  "name": "test-host-from-test-group-1",
                  "type": "HOST",
                  "url": "http://localhost:8080/api/v1/hosts/8/"
              },
              {
                  "id": 9,
                  "name": "test-host-from-test-group-2",
                  "type": "HOST",
                  "url": "http://localhost:8080/api/v1/hosts/9/"
              }
           ],
           "groups":[
              {
                  "id": 6,
                  "name": "test-group",
                  "children": false,
                  "url": "http://localhost:8080/api/v1/groups/6/"
              }
           ],
           "vars":{

           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "url":"http://localhost:8080/api/v1/inventories/8/"
        }

   :>json number id: id of inventory.
   :>json string name: name of inventory.
   :>json array hosts: |inventory_hosts_def|
   :>json array all_hosts: |inventory_all_hosts_def|
   :>json array groups: |inventory_groups_def|
   :>json object vars: |obj_vars_def|
   :>json object owner: |inventory_owner_details|
   :>json string url: url to this specific inventory.

.. |inventory_hosts_def| replace:: list of hosts in inventory. See :ref:`hosts`
   for fields explanation.
.. |inventory_all_hosts_def| replace:: list of all hosts in inventory(includes also hosts from this
   inventory's groups) . See :ref:`hosts` for fields explanation.
.. |inventory_groups_def| replace:: list of groups in inventory.
   See :ref:`groups` for fields explanation.
.. |inventory_owner_details| replace:: owner of inventory. Supported fields
   could be seen in :http:get:`/api/v1/users/{id}/`.
.. |inventory_details_ref| replace:: **Response JSON Object:** response json
   fields are the same as in :http:get:`/api/v1/inventories/{id}/`.

.. http:get:: /api/v1/inventories/

   Gets list of inventories. |pagination_def|

   :query id: id of inventory, if we want to filter by it.
   :query name: name of inventory if we want to filter by it.
   :query id__not: id of inventory, which we want to filter out.
   :query name__not: name of inventory, which we want to filter out.

   Example request:

   .. sourcecode:: http

      GET /api/v1/inventories/?name__not=production HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":8,
                 "name":"Inventory1",
                 "url":"http://localhost:8080/api/v1/inventories/8/"
              },
              {
                 "id":9,
                 "name":"Inventory2",
                 "url":"http://localhost:8080/api/v1/inventories/9/"
              }
           ]
        }

   |inventory_details_ref|

.. http:delete:: /api/v1/inventories/{id}/

   Deletes inventory.

   :arg id: id of inventory.

.. http:post:: /api/v1/inventories/

   Creates inventory.

   :<json string name: name of new inventory.
   :<json object vars: |obj_vars_def|

   Example request:

   .. sourcecode:: http

      POST /api/v1/inventories/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"Test servers",
         "vars":{

         }
      }

   Results:

   .. sourcecode:: js

        {
           "id":9,
           "name":"Test servers",
           "hosts":[

           ],
           "all_hosts":[

           ]
           "groups":[

           ],
           "vars":{

           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "url":"http://localhost:8080/api/v1/inventories/9/"
        }

   |inventory_details_ref|

.. http:patch:: /api/v1/inventories/{id}/

   Updates inventory. |patch_reminder|

   :arg id: id of inventory.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/inventories/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/inventories/9/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"New test servers"
      }

   Results:

   .. sourcecode:: js

        {
           "id":9,
           "name":"New test servers",
           "hosts":[

           ],
           "all_hosts":[

           ]
           "groups":[

           ],
           "vars":{

           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "url":"http://localhost:8080/api/v1/inventories/9/"
        }

   |inventory_details_ref|

.. http:post:: /api/v1/inventories/{inventory_id}/hosts/

   Adds hosts to inventory. |sublists_details|

.. http:put:: /api/v1/inventories/{inventory_id}/hosts/

   Replaces sublist of hosts with new one. |sublists_details|

.. http:delete:: /api/v1/inventories/{inventory_id}/hosts/

   Removes those hosts from inventory. |sublists_details|

.. http:post:: /api/v1/inventories/{inventory_id}/groups/

   Adds groups to inventory. |sublists_details|

.. http:put:: /api/v1/inventories/{inventory_id}/groups/

   Replaces sublist of groups with new one. |sublists_details|

.. http:delete:: /api/v1/inventories/{inventory_id}/groups/

   Removes those groups from inventory. |sublists_details|

.. _projects:

Projects
--------

.. http:get:: /api/v1/projects/{id}/

   Gets details about project.

   :arg id: id of project.

   Example request:

   .. sourcecode:: http

      GET /api/v1/projects/5/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":7,
           "name":"project_pooh",
           "status":"WAIT_SYNC",
           "repository":"git@ex.us:dir/rep1.git",
           "hosts":[

           ],
           "groups":[

           ],
           "inventories":[

           ],
           "vars":{
              "repo_branch": "other",
              "repo_password":"forgetit",
              "repo_type":"GIT"
           },
           "owner": {
              "id": 1,
              "username": "admin",
              "is_active": true,
              "is_staff": true,
              "url": "http://localhost:8080/api/v1/users/1/"
           },
           "revision": "5471aeb916ee7f8754d55f159e532592b995b0ec",
           "branch": "master",
           "url":"http://localhost:8080/api/v1/projects/7/"
        }

   :>json number id: id of project.
   :>json string name: name of project.
   :>json string repository: |project_repository_def|
   :>json string status: current status of project. Possible values are:
     ``NEW`` - newly created project, ``WAIT_SYNC`` - repository
     synchronization has been scheduled, but has not started to perform yet, ``SYNC`` -
     synchronization is in progress, ``ERROR`` - synchronization failed (cvs
     failure? incorrect credentials?), ``OK`` - project is synchronized.
   :>json array hosts: |project_hosts_def|
   :>json array groups: |project_groups_def|
   :>json object vars: |obj_vars_def| |project_vars_rem|
   :>json object owner: |project_owner_details|
   :>json string revision: ``GIT`` revision
   :>json string branch: current branch of project, to which project has been synced last time.
   :>json string url: url to this specific inventory.

.. |project_repository_def| replace:: URL of repository (repo-specific URL).
   For ``TAR`` it is just HTTP-link to archive.
.. |project_hosts_def| replace:: list of hosts in project. See :ref:`hosts`
   for fields explanation.
.. |project_groups_def| replace:: list of groups in project.
   See :ref:`groups` for fields explanation.
.. |project_vars_rem| replace:: In this special case variable ``repo_type`` always exists
     to store type of repository. Currently implemented types
     are ``GIT`` - for Git repositories, ``TAR`` - for uploading tar archive
     with project files and ``MANUAL`` - for creating empty project or for uploading
     project files from server 'manually'.
     For ``GIT`` projects such variables, as ``repo_password`` and ``repo_branch``, are also available.
     ``repo_password`` is needed to store password for repository(if it exists)
     and ``repo_branch`` means a branch of git project with which next
     synchronization will be done.
.. |project_owner_details| replace:: owner of project. Supported fields
   could be seen in :http:get:`/api/v1/users/{id}/`.
.. |project_details_ref| replace:: **Response JSON Object:** response json
   fields are the same as in :http:get:`/api/v1/projects/{id}/`.

.. http:get:: /api/v1/projects/

   Gets list of projects. |pagination_def|

   :query id: id of project, if we want to filter by it.
   :query name: name of project, if we want to filter by it.
   :query id__not: id of project, which we want to filter out.
   :query name__not: name of project, which we want to filter out.
   :query status: ``status`` of projects to show in list
   :query status__not: ``status`` of projects to not show in list

   Example request:

   .. sourcecode:: http

      GET /api/v1/projects/?status__not=SYNC HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":7,
                 "name":"project_pooh",
                 "status":"WAIT_SYNC",
                 "type":"GIT",
                 "url":"http://localhost:8080/api/v1/projects/7/"
              },
              {
                 "id":8,
                 "name":"project_tigger",
                 "status":"WAIT_SYNC",
                 "type":"GIT",
                 "url":"http://localhost:8080/api/v1/projects/8/"
              }
           ]
        }

   :>json string type: special shortcut to var ``repo_type``. Details about
     that var and other json fields of response you can see
     at :http:get:`/api/v1/projects/{id}/`

.. http:delete:: /api/v1/projects/{id}/

   Deletes project.

   :arg id: id of project.

.. http:post:: /api/v1/projects/

   Creates project. Operation automatically triggers synchronization. Details
   about what it is you can see in
   description :http:post:`/api/v1/projects/{id}/sync/`

   :<json string name: name of new project.
   :<json object vars: |obj_vars_def| |project_vars_rem|
   :<json string repository: |project_repository_def|

   Example request:

   .. sourcecode:: http

      POST /api/v1/projects/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"project_owl",
         "repository":"http://example.com/project.tar",
         "vars":{
            "repo_type":"TAR"
         }
      }

   Results:

   .. sourcecode:: js

        {
           "id":9,
           "name":"project_owl",
           "status":"WAIT_SYNC",
           "repository":"http://example.com/project.tar",
           "hosts":[

           ],
           "groups":[

           ],
           "inventories":[

           ],
           "vars":{
              "repo_type":"TAR"
           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "revision": "NO VCS",
           "branch": "NO VCS",
           "url":"http://localhost:8080/api/v1/projects/9/"
        }

   |project_details_ref|

.. http:patch:: /api/v1/projects/{id}/

   Updates project. Operation does not start synchronization again.
   If you want to synchronize, you should do it by
   using :http:post:`/api/v1/projects/{id}/sync/` |patch_reminder|

   :arg id: id of project.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/projects/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/projects/9/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"project_tar"
      }

   Results:

   .. sourcecode:: js

        {
           "id":9,
           "name":"project_tar",
           "status":"WAIT_SYNC",
           "repository":"http://example.com/project.tar",
           "hosts":[

           ],
           "groups":[

           ],
           "inventories":[

           ],
           "vars":{
              "repo_type":"TAR"
           },
           "owner": {
               "id": 1,
               "username": "admin",
               "is_active": true,
               "is_staff": true,
               "url": "http://localhost:8080/api/v1/users/1/"
           },
           "revision": "NO VCS",
           "branch": "NO VCS",
           "url":"http://localhost:8080/api/v1/projects/9/"
        }

   |project_details_ref|

.. http:post:: /api/v1/projects/{project_id}/hosts/

   Adds hosts to project. |sublists_details|

.. http:put:: /api/v1/projects/{project_id}/hosts/

   Replaces sublist of hosts with new one. |sublists_details|

.. http:delete:: /api/v1/projects/{project_id}/hosts/

   Removes those hosts from project. |sublists_details|

.. http:post:: /api/v1/projects/{project_id}/groups/

   Adds groups to project. |sublists_details|

.. http:put:: /api/v1/projects/{project_id}/groups/

   Replaces sublist of groups with new one. |sublists_details|

.. http:delete:: /api/v1/projects/{project_id}/groups/

   Removes those groups from project. |sublists_details|

.. http:post:: /api/v1/projects/{project_id}/inventories/

   Adds inventories to project. |sublists_details|

.. http:put:: /api/v1/projects/{project_id}/inventories/

   Replaces sublist of inventories with new one. |sublists_details|

.. http:delete:: /api/v1/projects/{project_id}/inventories/

   Removes those inventories from project. |sublists_details|

.. http:get:: /api/v1/projects/supported-repos/

   Returns list of supported repository types.

   Results:

   .. sourcecode:: js

        [
            "GIT",
            "MANUAL",
            "TAR"
        ]

.. http:post:: /api/v1/projects/{id}/sync/

   Starts synchronization. During this process project files are uploading from
   repository. Concrete details of process highly depends on project type.
   For ``GIT`` is ``git pull``, for ``TAR`` it just downloading archive from
   URL again and unpacking it with rewriting of old files.

   :arg id: id of project.

   Results:

   .. sourcecode:: js

        {
           "detail":"Sync with git@ex.us:dir/rep1.git."
        }

.. http:post:: /api/v1/projects/{id}/execute-playbook/

   Executes ansible playbook. Returns history id for watching execution process.

   :arg id: id of project.
   :<json number inventory: inventory to execute playbook at.
   :<json string playbook: playbook to execute.
   :<json *: any number parameters with any name and string or number type. All
     those parameters just pass as additional command line arguments to
     ``ansible-playbook`` utility during execution, so you can use this feature
     for wide customization of ansible behaviour. For any ``key:value`` in command
     line there will be ``--key value``. If you want to post only key without a value
     (``--become`` option for example), just pass ``null`` as value.

   Example request:

   .. sourcecode:: http

      POST /api/v1/projects/1/execute-playbook/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "inventory": 13,
         "playbook": "main.yml"
         "become": null,
         "su-user": "rootburger"
      }

   Results:

   .. sourcecode:: js

        {
           "detail":"Started at inventory 13.",
           "history_id": 87
        }

.. http:post:: /api/v1/projects/{id}/execute-module/

   Executes ansible module. It is just like running ``ansible -m {something}`` by
   hands. Instead of boring and time consuming dealing with playbooks
   you can do something quickly using ansible.

   :<json number inventory: inventory to execute at.
   :<json string module: name of module (like ``ping``, ``shell`` and so on).
     You can use any of modules available in ansible.
   :<json string group: to which group in your inventory it must be executed.
     Use ``all`` for all hosts in inventory.
   :<json string args: which args must be passed to module. It is just string raw
     with arguments. You can specify here contains of ``args`` option. For
     example ``ls -la`` for ``shell`` module.
   :<json *: any number parameters with any name and string or number type. All
     those parameters just pass as additional command line arguments to
     ``ansible-playbook`` utility during execution, so you can use this feature
     to wide customization of ansible behaviour. For any ``key:value`` in command
     line there will be ``--key value``. If you want to post only key without a value
     (``--become`` option for example), just pass ``null`` as value.

   Example request:

   .. sourcecode:: http

      POST /api/v1/projects/1/execute-module/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        {
           "inventory":3,
           "module":"shell",
           "group":"all",
           "args":"ls -la"
        }

   Results:

   .. sourcecode:: js

        {
           "detail":"Started at inventory 3.",
           "history_id": 87
        }

.. _tasks:

Tasks
-----

.. http:get:: /api/v1/tasks/{id}/

   Gets details about task.

   :arg id: id of task.

   Example request:

   .. sourcecode:: http

      GET /api/v1/tasks/5/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":5,
           "name":"Ruin my environment",
           "playbook":"ruin_my_env.yml",
           "project":13
           "url":"http://localhost:8080/api/v1/tasks/5/"
        }

   :>json number id: id of task.
   :>json string name: name of task.
   :>json string playbook: playbook file to run within this task.
   :>json number project: id of project, to which this task belongs.
   :>json string url: url to this specific task.

.. http:get:: /api/v1/tasks/

   Gets list of tasks. |pagination_def|

   :query id: id of task, if we want to filter by it.
   :query name: name of task, if we want to filter by it.
   :query id__not: id of task, which we want to filter out.
   :query name__not: name of task, which we want to filter out.
   :query playbook: filter by name of playbook.
   :query project: filter by id of project.

   Example request:

   .. sourcecode:: http

      GET /api/v1/tasks/?project=13 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":5,
                 "name":"Ruin my environment",
                 "playbook":"ruin_my_env.yml",
                 "project":13
                 "url":"http://localhost:8080/api/v1/tasks/5/"
              },
              {
                 "id":6,
                 "name":"Build my environment",
                 "playbook":"build_my_env.yml",
                 "project":13
                 "url":"http://localhost:8080/api/v1/tasks/6/"
              }
           ]
        }

.. _periodictasks:

Periodic tasks
--------------

.. http:get:: /api/v1/periodic-tasks/{id}/

   Gets details about periodic task.

   :arg id: id of periodic task.

   Example request:

   .. sourcecode:: http

      GET /api/v1/periodic-tasks/10/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":10,
           "name":"periodic-test",
           "type":"CRONTAB",
           "schedule":"60* */2 sun,fri 1-15 *",
           "mode":"collect_data.yml",
           "kind":"PLAYBOOK",
           "project":7,
           "inventory":8,
           "save_result": true,
           "enabled": true,
           "vars":{

           },
           "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/10/?format=json"
        }

   :>json number id: id of periodic task.
   :>json string type: |ptask_type_details|
   :>json string schedule: |ptask_schedule_details|
   :>json string mode: playbook or module to run periodically.
   :>json string kind: either this task is playbook running (``PLAYBOOK``) or
     module running (``MODULE``).
   :>json number project: id of project, which this task belongs to.
   :>json number inventory: id of inventory for which must execute_playbook playbook.
   :>json boolean save_result: if ``save_result`` is true, the result will be saved.
   :>json boolean enabled: if ``enabled`` is true, the periodic task will be enabled.
   :>json object vars: |ptask_vars_def|
   :>json string url: url to this specific periodic task.

.. |ptask_details_ref| replace:: **Response JSON Object:** response json
   fields are the same as in :http:get:`/api/v1/periodic-tasks/{id}/`.

.. |ptask_schedule_details| replace:: string with integer value or string in
   cron format, what depends on ``type`` value. Look at ``type`` description
   for details.

.. |ptask_type_details| replace:: type of periodic task. Either ``INTERVAL``
   for tasks that run every N seconds or ``CRONTAB`` for tasks, which run
   according to more complex rules. According to that ``schedule`` field will
   be interpreted as integer - number of seconds between runs. Or string in
   cron format with one small exception - Polemarch expects string without year,
   because year format is not supported. You can easily find documentation for cron
   format in web. Like those, for example:
   https://linux.die.net/man/5/crontab and
   http://www.nncron.ru/help/EN/working/cron-format.htm

.. |ptask_vars_def| replace:: those vars have special meaning. All those
   parameters just pass as additional command line arguments to
   ``ansible-playbook`` utility during execution, so you can use this feature
   for wide customization of ansible behaviour. For any ``key:value`` in command
   line there will be ``--key value``. If you want to post only key without a value
   (``--become`` option for example), just pass ``null`` as value. In all other
   cases this field works like usual ``vars``: |obj_vars_def|

.. http:get:: /api/v1/periodic-tasks/

   Gets list of periodic tasks. |pagination_def|

   :query id: id of template, if we want to filter by it.
   :query id__not: id of template, which we want to filter out.
   :query mode: filter by playbook or module name.
   :query kind: filter by kind of task.
   :query type: filter by ``type``.
   :query project: filter by project id.

   Example request:

   .. sourcecode:: http

      GET /api/v1/periodic-tasks/?project=7 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":10,
                 "name":"periodic-test",
                 "type":"INTERVAL",
                 "schedule":"60",
                 "mode":"collect_data.yml",
                 "kind":"PLAYBOOK",
                 "project": 12,
                 "inventory":8,
                 "save_result": true,
                 "enabled": true,
                 "vars":{

                 },
                 "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/10/?format=json"
              },
              {
                 "id":11,
                 "name":"periodic-test2",
                 "type":"CRONTAB",
                 "schedule":"* */2 sun,fri 1-15 *",
                 "mode":"do_greatest_evil.yml",
                 "kind":"PLAYBOOK",
                 "project": 12,
                 "inventory":8,
                 "save_result": true,
                 "enabled": true,
                 "vars":{

                 },
                 "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/11/?format=json"
              }
           ]
        }

   |ptask_details_ref|

.. http:delete:: /api/v1/periodic-tasks/{id}/

   Deletes periodic task.

   :arg id: id of periodic task.

.. http:post:: /api/v1/periodic-tasks/

   Creates periodic task


   Example request:

   .. sourcecode:: http

      POST /api/v1/periodic-tasks/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "name":"new-periodic-test",
          "type": "INTERVAL",
          "schedule": "25",
          "mode": "touch_the_clouds.yml",
          "kind": "PLAYBOOK",
          "project": 7,
          "inventory": 8
          "vars":{

           },
      }

   Results:

   .. sourcecode:: js

    {
        "id": 14,
        "name":"new-periodic-test",
        "type": "INTERVAL",
        "schedule": "25",
        "mode": "touch_the_clouds.yml",
        "kind": "PLAYBOOK",
        "project": 7,
        "inventory": 8,
        "save_result": true,
        "enabled": true,
        "vars":{

         },
        "url": "http://127.0.0.1:8080/api/v1/periodic-tasks/14/?format=api"
    }

   |ptask_details_ref|

.. http:patch:: /api/v1/periodic-tasks/{id}/

   Updates periodic task. |patch_reminder|

   :arg id: id of periodic task.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/periodic-tasks/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/periodic-tasks/14/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "type": "INTERVAL",
          "schedule": "25",
          "mode": "touch_the_clouds.yml",
          "project": 7,
          "inventory": 8
      }

   Results:

   .. sourcecode:: js

    {
        "id": 14,
        "name":"new-periodic-test",
        "type": "INTERVAL",
        "schedule": "25",
        "mode": "touch_the_clouds.yml",
        "kind": "PLAYBOOK",
        "project": 7,
        "inventory": 8,
        "save_result": true,
        "enabled": true,
        "url": "http://127.0.0.1:8080/api/v1/periodic-tasks/14/?format=api"
    }

   |ptask_details_ref|

.. http:post:: /api/v1/periodic-tasks/{id}/execute/

   Executes periodic task.

   :arg id: id of periodic task.

   Example request:

   .. sourcecode:: http

      POST /api/v1/periodic-tasks/14/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "name":"new-periodic-test",
          "type": "INTERVAL",
          "schedule": "25",
          "mode": "touch_the_clouds.yml",
          "kind": "PLAYBOOK",
          "project": 7,
          "inventory": 8,
          "save_result": true,
          "enabled": true,
          "vars": {}

      }

   Results:

   .. sourcecode:: js

    {
        "history_id": 158,
        "detail": "Started at inventory 8."
    }

   **Request JSON Object:**
   request json fields are the same as in :http:get:`/api/v1/periodic-tasks/{id}/` .

.. _templates:

Templates
---------

.. http:get:: /api/v1/templates/{id}/

   Gets template with details.

   :arg id: id of template.

   Example request:

   .. sourcecode:: http

      GET /api/v1/templates/1/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "id": 1,
            "name": "test_tmplt",
            "kind": "Task",
            "owner": {
                "id": 1,
                "username": "admin",
                "is_active": true,
                "is_staff": true,
                "url": "http://localhost:8080/api/v1/users/1/"
            },
            "data": {
                "project": 1,
                "inventory": 10,
                "playbook": "test.yml",
                "vars": {
                    "connection": "paramiko"
                }
            },
             "options": {
                 "only-local": {
                     "playbook": "other.yml",
                 },
                 "only-server": {
                     "vars": {
                         "forks": "10",
                         "limit": "Test-server"
                     }
                 }
             },
             "options_list": [
                 "only-local",
                 "only-server"
             ]
        }

   :>json number id: id of template.
   :>json string name: name of template.
   :>json string kind: |template_kind_details|
   :>json object owner: |template_owner_details|
   :>json string data: |template_data_details|
   :>json object options: tepmlate options, which can update some template's settings before new execution.
   :>json array options_list: list of options' names for this template.

.. |template_details_ref| replace:: **Response JSON Object:** response json
   fields are the same as in :http:get:`/api/v1/templates/{id}/`.

.. |template_kind_details| replace:: kind of template. Supported kinds
   could be seen in :http:get:`/api/v1/templates/supported-kinds/`.

.. |template_owner_details| replace:: owner of template. Supported fields
   could be seen in :http:get:`/api/v1/users/{id}/`.

.. |template_data_details| replace:: JSON structure of template. Supported
   fields could see in :http:get:`/api/v1/templates/supported-kinds/`.


.. http:get:: /api/v1/templates/

   Gets list of templates. |pagination_def|

   :query id: id of project, if we want to filter by it.
   :query id__not: id of project, which we want to filter out.
   :query name: filter by name.
   :query name__not: filter by name, which we want to filter out.
   :query kind: filter by ``kind``.
   :query project: filter by ``project``.
   :query inventory: filter by ``inventory``.

   Example request:

   .. sourcecode:: http

      GET /api/v1/templates/?kind=Task HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "count": 2,
            "next": null,
            "previous": null,
            "results": [
                {
                    "id": 1,
                    "name": "test_tmplt",
                    "kind": "Task",
                    "options_list": [
                         "only-local",
                         "only-server"
                    ]
                },
                {
                    "id": 2,
                    "name": "test_tmplm",
                    "kind": "Module",
                    "options_list": [

                    ]
                }
            ]
        }

   |template_details_ref|

.. http:delete:: /api/v1/templates/{id}/

   Deletes periodic task.

   :arg id: id of periodic task.

.. http:post:: /api/v1/templates/

   Creates template

   :<json string kind: |template_kind_details|
   :<json string data: |template_data_details|
   :<json string name: template name.
   :<json string options: template options, which can update some template's settings before new execution.

   Example request:

   .. sourcecode:: http

      POST /api/v1/templates/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name": "test",
         "kind": "Task",
         "data": {
            "project": 1,
            "inventory": 10,
            "playbook": "test.yml",
            "vars": {
                  "connection": "paramiko"
            }
         },
         "options": {
            "playbook": "other.yml"
        }
      }

   Results:

   .. sourcecode:: js

    {
        "id": 3,
        "name": "test",
        "kind": "Task",
        "data": {
            "project": 1,
            "inventory": 10,
            "playbook": "test.yml",
            "vars": {
                "connection": "paramiko"
            }
        },
        "options": {
            "playbook": "other.yml"
        }
    }

   |template_details_ref|

.. http:patch:: /api/v1/templates/{id}/

   Updates template. If you want to update data, you should send full template data.
   |patch_reminder|

   :arg id: id of template.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/templates/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/templates/2/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "name": "test_new_name"
      }

   Results:

   .. sourcecode:: js

    {
        "id": 3,
        "name": "test_new_name",
        "kind": "Task",
        "data": {
            "project": 1,
            "inventory": 10,
            "playbook": "test.yml",
            "vars": {
                "connection": "paramiko"
            }
        },
        "options": {
            "playbook": "other.yml"
        }
    }

   |template_details_ref|

.. http:post:: /api/v1/templates/{id}/execute/

   Executes template.

   :arg id: id of template.

   Example request:

   .. sourcecode:: http

      POST /api/v1/templates/3/execute/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "name": "test_new_name",
          "kind": "Task",
          "data": {
              "project": 1,
              "inventory": 10,
              "playbook": "test.yml",
              "vars": {
                  "connection": "paramiko"
              }
          },
          "options": {
              "option": "playbook"
          }
      }

   Results:

   .. sourcecode:: js

    {
        "history_id": 205,
        "detail": "Started at inventory 10."
    }

   |template_details_ref|

.. http:get:: /api/v1/templates/supported-kinds/

   Gets list of supported kinds. |pagination_def|

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/supported-kinds/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
             "Group": [
                 "name",
                 "vars",
                 "children"
             ],
             "Host": [
                 "name",
                 "vars"
             ],
             "Task": [
                 "playbook",
                 "vars",
                 "inventory",
                 "project"
             ],
             "PeriodicTask": [
                 "type",
                 "name",
                 "schedule",
                 "inventory",
                 "kind",
                 "mode",
                 "project",
                 "vars"
             ],
             "Module": [
                 "inventory",
                 "module",
                 "group",
                 "args",
                 "vars",
                 "project"
             ]
        }

.. _history:

History records
---------------

.. http:get:: /api/v1/history/{id}/

   Gets details about one history record.

   :arg id: id of history record.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/1/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":1,
           "project":2,
           "mode":"task.yml",
           "status":"OK",
           "kind": "PLAYBOOK",
           "start_time":"2017-07-02T12:48:11.922761Z",
           "stop_time":"2017-07-02T13:48:11.922777Z",
           "inventory": 4,
           "raw_inventory":"inventory",
           "raw_args": "ansible-playbook main.yml -i /tmp/tmpvMIwMg -v",
           "raw_stdout":"http://localhost:8080/api/v1/history/1/raw/",
           "initiator": 1,
           "initiator_type": "users",
           "execute_args": {
               "diff": "",
               "become": ""
           },
           "revision": "NO VCS",
           "url": "http://localhost:8080/api/v1/history/1/"
        }

   :>json number id: id of history record.
   :>json number project: id of project, which record belongs to.
   :>json string mode: name of executed playbook or module.
   :>json string kind: kind of task: ``PLAYBOOK`` or ``MODULE``.
   :>json string status: either ``DELAY``, ``OK``, ``INTERRUPTED``, ``RUN``,
     ``OFFLINE`` or ``ERROR``, which indicates different results of execution
     (scheduled for run, successful run, interrupted by user, currently running,
     can't connect to node, failure).
   :>json string start_time: time, when playbook execution was started.
   :>json string stop_time: time, when playbook execution was ended (normally
     or not)
   :>json number inventory: id of inventory.
   :>json string raw_inventory: ansible inventory, which was used for execution. It
     was generated from Polemarch's :ref:`inventory`
   :>json string raw_args: ansible command line during execution.
   :>json string raw_stdout: what Ansible has written to stdout and stderr during
     execution. The size is limited to 10M characters. Full output
     in :http:get:`/api/v1/history/{id}/raw/`.
   :>json number initiator: initiator id.
   :>json string initiator_type: initiator type like in api url.
   :>json object execute_args: arguments, which were used during execution.
   :>json string revision: project revision.
   :>json string url: url to this specific history record.

.. |history_details_ref| replace:: **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/history/{id}/`.

.. http:post:: /api/v1/history/{id}/cancel/

   Cancels currently executed task.

   :arg id: id of history record.

   Example request:

   .. sourcecode:: http

      POST /api/v1/history/1/cancel/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "detail": "Task canceled: 1"
        }

.. http:get:: /api/v1/history/{id}/raw/

   Gets full output of executed task.

   :arg id: id of history record.

   :query color: Default is ``no``. If it is ``yes``, you will get output with ANSI
    Esc color codes printed by Ansible in addition to text itself.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/1/raw/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: text

        PLAY [all] *********************************************************************

        TASK [Gathering Facts] *********************************************************

        ok: [chat.vstconsulting.net]

        ok: [pipc.vst.lan]

        ok: [git.vst.lan]

        ok: [git-ci-2]

        ok: [git-ci-1]

        ok: [redmine.vst.lan]

        ok: [test2.vst.lan]

        ok: [test.vst.lan]
        ......

.. http:get:: /api/v1/history/{id}/lines/

   Gets list of history record lines. |pagination_def|

   :query after: filter lines to return lines after this number.
   :query before: filter lines to return lines before this number.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/1/lines/?after=2 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "count": 2,
            "next": null,
            "previous": null,
            "results": [
                {
                    "line_number": 4,
                    "line": ""
                },
                {
                    "line_number": 3,
                    "line": "ERROR! the playbook: /home/centos/test/polemarch/projects/1/test.yml could not be found"
                }
            ]
        }

.. http:delete:: /api/v1/history/{id}/clear/

   Deletes full output of executed task.

   :arg id: id of history record.

   Example request:

   .. sourcecode:: http

      DELETE /api/v1/history/1/clear/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "detail": "Output trancated.\n"
        }

   :>json string detail: new output for history record's stdout.

.. http:get:: /api/v1/history/

   Gets list of history records. |pagination_def|

   :query id: id of inventory, if we want to filter by it.
   :query id__not: id of inventory, which we want to filter out.
   :query start_time__gt: filter records whose ``start_time`` greater than
    specified.
   :query stop_time__gt: filter records whose ``stop_time`` greater than
    specified.
   :query start_time__lt: filter records whose ``start_time`` less than
    specified.
   :query stop_time__lt: filter records whose ``stop_time`` less than
    specified.
   :query start_time__gte: filter records whose ``start_time`` greater or equal
    to specified.
   :query stop_time__gte: filter records whose ``stop_time`` greater or equal
    to specified.
   :query start_time__lte: filter records whose ``start_time`` less or equal
    to specified.
   :query stop_time__lte: filter records whose ``stop_time`` less or equal
    to specified.
   :query mode: filter by ``mode``.
   :query kind: filter by ``kind``.
   :query project: filter by ``project``.
   :query status: filter by ``status``.
   :query start_time: get records only with ``start_time`` equal to specified.
   :query stop_time: get records only with ``stop_time`` equal to specified.
   :query initiator: filter by ``initiator``.
   :query initiator_type: filter by ``initiator_type``.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/?start_time__gte=2017-06-01T01:48:11.923896Z HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id": 121,
                 "project": 3,
                 "mode": "main.yml",
                 "kind": "PLAYBOOK",
                 "inventory": 6,
                 "status": "OK",
                 "start_time": "2017-07-24T06:39:52.052504Z",
                 "stop_time": "2017-07-24T06:41:06.521813Z",
                 "initiator": 1,
                 "initiator_type": "users",
                 "url": "http://localhost:8000/api/v1/history/121/"
              },
              {
                 "id": 118,
                 "project": 4,
                 "mode": "ping",
                 "kind": "MODULE",
                 "inventory": 7,
                 "status": "OK",
                 "start_time": "2017-07-24T06:27:40.481588Z",
                 "stop_time": "2017-07-24T06:27:42.499873Z",
                 "initiator": 1,
                 "initiator_type": "users",
                 "url": "http://localhost:8000/api/v1/history/118/"
              }
           ]
        }

   |history_details_ref|

.. http:delete:: /api/v1/history/{id}/

   Deletes history record.

   :arg id: id of record.

.. http:get:: /api/v1/history/{id}/facts/

   Gets facts gathered during execution of ``setup`` module.

   :arg id: id of history record.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/1/facts/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "172.16.1.29":{
              "status":"SUCCESS",
              "ansible_facts":{
                 "ansible_memfree_mb":526
              },
              "changed":false
           },
           "172.16.1.31":{
              "status":"SUCCESS",
              "ansible_facts":{
                 "ansible_memfree_mb":736
              },
              "changed":false
           },
           "172.16.1.30":{
              "status":"UNREACHABLE!",
              "changed":false,
              "msg":"Failed to connect to the host via ssh: ssh: connect to host 172.16.1.30 port 22: No route to host\r\n",
              "unreachable":true
           },
           "172.16.1.32":{
              "status":"FAILED!",
              "changed":false,
              "failed":true,
              "module_stderr":"Shared connection to 172.16.1.32 closed.\r\n",
              "module_stdout":"/bin/sh: /usr/bin/python: No such file or directory\r\n",
              "msg":"MODULE FAILURE"
           }
        }

   :statuscode 200: no error
   :statuscode 404: there is no facts. Either incorrect history id or kind not
    ``MODULE`` and/or module is not ``setup``. Facts can be gathered only
    by running ``setup`` module. See
    :http:post:`/api/v1/projects/{id}/execute-module/` for details about
    modules run.
   :statuscode 424: facts are still not ready, because module is currently running
    or only scheduled for run.

Ansible
-------

.. http:get:: /api/v1/ansible/

   Gets list of available methods in that category. All methods under
   `/ansible/` designed to provide information about ansible installation which
   Polemarch is currently using.

   Example request:

   .. sourcecode:: http

      GET /api/v1/ansible/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "cli-reference": "http://localhost:8000/api/v1/ansible/cli_reference/",
            "modules": "http://localhost:8000/api/v1/ansible/modules/"
        }

.. http:get:: /api/v1/ansible/cli_reference/

   Gets list of available ansible command line tools arguments with their type
   and hint.

   :query filter: filter by tool, for which you want get help (for exapmle, `periodic_playbook`
    or `periodic_module`).

   Example request:

   .. sourcecode:: http

      GET /api/v1/ansible/cli_reference/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "periodic_playbook": {
                "flush-cache": {
                    "shortopts": [],
                    "type": "boolean",
                    "help": "clear the fact cache"
                },
                "extra-vars": {
                    "type": "text",
                    "help": "set additional variables as key=value or YAML/JSON"
                },
                // there is much more arguments to type it here
                // ...
            },
            "playbook": {
                "flush-cache": {
                    "shortopts": [],
                    "type": "boolean",
                    "help": "clear the fact cache"
                },
                "extra-vars": {
                    "type": "text",
                    "help": "set additional variables as key=value or YAML/JSON"
                },
                // there is much more arguments to type it here
                // ...
            },
            "module": {
                "extra-vars": {
                    "type": "text",
                    "help": "set additional variables as key=value or YAML/JSON"
                },
                "help": {
                    "shortopts": [
                        "h"
                    ],
                    "type": "boolean",
                    "help": "show this help message and exit"
                },
                // there is much more arguments to type it here
                // ...
            },
            "periodic_module": {
                "extra-vars": {
                    "type": "text",
                    "help": "set additional variables as key=value or YAML/JSON"
                },
                "help": {
                    "shortopts": [
                        "h"
                    ],
                    "type": "boolean",
                    "help": "show this help message and exit"
                },
                // there is much more arguments to type it here
                // ...
            }
        }

.. http:get:: /api/v1/ansible/modules/

   Gets list of installed ansible modules.

   :query filter: filter to search by module name. It is Python regular
    expression.

   Example request:

   .. sourcecode:: http

      GET /api/v1/ansible/modules/?filter=\.git HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        [
           "source_control.github_hooks",
           "source_control.git_config",
           "source_control.github_issue",
           "source_control.git",
           "source_control.github_deploy_key",
           "source_control.gitlab_project",
           "source_control.github_release",
           "source_control.gitlab_group",
           "source_control.github_key",
           "source_control.gitlab_user"
        ]


.. _stats:

Statistic list
--------------

Sometimes application needs to provide user with some statistic information
like amount of different objects or frequency of executing some tasks and so on.
For such kind of work we use our API's statistic list, which can provide user with information
about amount of templates, users, teams, hosts, groups, inventories, projects in system in current moment
and to tell him how many tasks of each status have been executed during last days, months and years.

.. http:get:: /api/v1/stats/

   Gets statistic list.

   :query last: filter to search statistic information for certain amount of past days (by default the last is 14, this filter is measured in days).


   Example request:

   .. sourcecode:: http

      GET /api/v1/stats/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

      {
          "templates": 7,
          "users": 1,
          "teams": 0,
          "hosts": 10,
          "groups": 5,
          "inventories": 4,
          "projects": 3,
          "jobs": {
              "month": [
                  {
                      "status": "ERROR",
                      "sum": 6,
                      "all": 47,
                      "month": "2018-03-01T00:00:00Z"
                  },
                  {
                      "status": "OFFLINE",
                      "sum": 5,
                      "all": 47,
                      "month": "2018-03-01T00:00:00Z"
                  },
                  {
                      "status": "OK",
                      "sum": 36,
                      "all": 47,
                      "month": "2018-03-01T00:00:00Z"
                  }
              ],
              "day": [
                  {
                      "status": "ERROR",
                      "sum": 3,
                      "day": "2018-03-05T00:00:00Z",
                      "all": 10
                  },
                  {
                      "status": "OK",
                      "sum": 7,
                      "day": "2018-03-05T00:00:00Z",
                      "all": 10
                  },
                  {
                      "status": "ERROR",
                      "sum": 2,
                      "day": "2018-03-06T00:00:00Z",
                      "all": 30
                  },
                  {
                      "status": "OFFLINE",
                      "sum": 5,
                      "day": "2018-03-06T00:00:00Z",
                      "all": 30
                  },
                  {
                      "status": "OK",
                      "sum": 23,
                      "day": "2018-03-06T00:00:00Z",
                      "all": 30
                  },
                  {
                      "status": "ERROR",
                      "sum": 1,
                      "day": "2018-03-07T00:00:00Z",
                      "all": 7
                  },
                  {
                      "status": "OK",
                      "sum": 6,
                      "day": "2018-03-07T00:00:00Z",
                      "all": 7
                  }
              ],
              "year": [
                  {
                      "status": "ERROR",
                      "sum": 6,
                      "all": 47,
                      "year": "2018-01-01T00:00:00Z"
                  },
                  {
                      "status": "OFFLINE",
                      "sum": 5,
                      "all": 47,
                      "year": "2018-01-01T00:00:00Z"
                  },
                  {
                      "status": "OK",
                      "sum": 36,
                      "all": 47,
                      "year": "2018-01-01T00:00:00Z"
                  }
              ]
          }
      }

   :>json number templates: amount of templates in system in current moment.
   :>json number users: amount of users in system in current moment.
   :>json number teams: amount of teams in system in current moment. (Polemarch+ only)
   :>json number hosts: amount of hosts in system in current moment.
   :>json number groups: amount of groups in system in current moment.
   :>json number inventories: amount of inventories in system in current moment.
   :>json number projects: amount of projects in system in current moment.
   :>json object jobs: amount of executed tasks during last days, months, years.


.. _variables:

Variables
---------

.. |obj_vars_def| replace:: dictionary of variables associated with this
   object. See :ref:`variables` for details.

Hosts, groups, inventories and projects in Polemarch may have variables
associated with them. Usually (with one exception - variables for additional
repository data in :ref:`projects`) those variables pass to Ansible to
customize his behaviour or playbook logic in certain way. In all these kinds of
objects variables work in the same way, so there is an additional chapter, which describes
their behaviour, abstracting from details related to every concrete type of
object.

In JSON responses related to those objects variables are placed in field
``vars``. This field is just key-value dictionary of existent variables for
object. It can be saved by ``POST`` request and can be completely owerwritted by ``PATCH`` request.

It can be represented in such more formal way:

.. http:get:: /api/v1/{object_kind}/{object_id}

   Gets details about one object.

   :arg id: id of this object.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hosts/12/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           // object-special data goes here
           "vars":{
                "string_variable1": "some_string",
                "integer_variable2": 12,
                "float_variable3": 0.3
           }
        }

   :>json object vars: dictionary of variables for this object.

.. http:patch:: /api/v1/{object_kind}/{object_id}

   Updates object.

   :arg id: id of object.

   :<json object vars: new dictionary of variables for object. It
     completely rewrites old dictionary.

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/hosts/12/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         // there is may be other object-related stuff
         "vars":{
                "string_variable1": "some_string2",
                "integer_variable2": 15,
                "float_variable3": 0.5
         }
      }

   Results:

   .. sourcecode:: js

        {
           // object-special data goes here
           "vars":{
                "string_variable1": "some_string2",
                "integer_variable2": 15,
                "float_variable3": 0.5
           },
        }

Also for all previously enumerated kinds of objects (which support variables)
there is variable filtering, which is available in get requests:

.. http:get:: /api/v1/{object_kind}/

   Gets list of objects. |pagination_def|

   :query variables: filter objects by variables and their values. Variables
    specified as list using ``,`` as separator for every list item and ``:``
    as separator for key and value. Like ``var1:value,var2:value,var3:12``.

   Example request:

   .. sourcecode:: http

      GET /api/v1/groups/?variables=ansible_port:222,ansible_user:one HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

       {
           "count": 1,
           "next": null,
           "previous": null,
           "results": [
               {
                   "id": 12,
                   "name": "git",
                   "children": true,
                   "url": "http://localhost:8080/api/v1/groups/12/"
               }
           ]
       }

.. _sublists:

Sublists
--------

.. |sublists_details| replace:: See :ref:`sublists` for details.

Many of object types in Polemarch can contain collections of other objects.
For example *Group* can contain sublist of *Hosts* included in this group.
Because all of those sublists are based on the same logic, we have documented here
general principles of this logic in order not to duplicate this
information for every single method.

**There is the list of those methods**:

Groups:

* :http:post:`/api/v1/groups/{group_id}/hosts/`
* :http:put:`/api/v1/groups/{group_id}/hosts/`
* :http:delete:`/api/v1/groups/{group_id}/hosts/`
* :http:post:`/api/v1/groups/{group_id}/groups/`
* :http:put:`/api/v1/groups/{group_id}/groups/`
* :http:delete:`/api/v1/groups/{group_id}/groups/`

Inventories:

* :http:post:`/api/v1/inventories/{inventory_id}/hosts/`
* :http:put:`/api/v1/inventories/{inventory_id}/hosts/`
* :http:delete:`/api/v1/inventories/{inventory_id}/hosts/`
* :http:post:`/api/v1/inventories/{inventory_id}/groups/`
* :http:put:`/api/v1/inventories/{inventory_id}/groups/`
* :http:delete:`/api/v1/inventories/{inventory_id}/groups/`

Projects:

* :http:post:`/api/v1/projects/{project_id}/hosts/`
* :http:put:`/api/v1/projects/{project_id}/hosts/`
* :http:delete:`/api/v1/projects/{project_id}/hosts/`
* :http:post:`/api/v1/projects/{project_id}/groups/`
* :http:put:`/api/v1/projects/{project_id}/groups/`
* :http:delete:`/api/v1/projects/{project_id}/groups/`
* :http:post:`/api/v1/projects/{project_id}/inventories/`
* :http:put:`/api/v1/projects/{project_id}/inventories/`
* :http:delete:`/api/v1/projects/{project_id}/inventories/`

As you can see there is a plenty of urls and for every url ``POST``, ``PUT`` and
``DELETE`` methods are presented. Every method takes list of IDs from json request
body, but perform different operations with those IDs. ``PUT`` method completely
rewrites sublist with new list. ``POST`` method just appends new IDs to already
existent. ``DELETE`` method removes specified IDs from existent list.

All of those methods returns such json as result:

.. sourcecode:: js

  {
     "not_found":0,
     "operated":2,
     "total":2,
     "failed_list": []
  }

Here ``not_found`` is a counter for items, which can't be processed for some
reason. ``operated`` is a counter for items processed successfully. ``total`` is a number of
elements which were in initial request. If some items are not operated successfully, they will be added to
``failed_list``. Otherwise ``failed_list`` will be empty.

List of IDs means objects' IDs which must be stored in this sublist. For example,
for ``groups/{group_id}/hosts/`` it must be ids of existent hosts. If host with
id from this list is not exist, method will still return ``200 OK``, but result's stats will
reflect the fact, that one of the ids can't be processed successfully.

To clarify information above there is detailed explanation
(with request and response examples) of those methods' logic:

.. http:any:: /api/v1/{object_kind}/{object_id}/{sublist_kind}/

   Operates with sublist of objects for some concrete object.

   * ``POST`` - appends new objects to already existent sublist.
   * ``DELETE`` - removes those objects from existent sublist.
   * ``PUT`` - rewrites sublist with this one.

   :arg object_kind: kind of object, whose sublist we modify.
   :arg object_id: id of concrete object, whose sublist we modify.
   :arg sublist_kind: kind of objects, stored in sublist.
   :reqjsonarr IDs: IDs of objects, which we must add/remove/replace in/from sublist.

   Example request:

   .. sourcecode:: http

      POST /api/v1/groups/1/hosts/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      [2, 3]

   .. sourcecode:: js

      {
         "not_found":0,
         "operated":2,
         "total":2
      }

   :>json number not_found: number of items processed with error (not exists or no
     access).
   :>json number operated: number of items processed successfully.
   :>json number total: number of all sent ids.

.. _hooks:

Hooks
-----

Polemarch has his own system of hooks.

.. http:get:: /api/v1/hooks/

   Gets hooks list.

   :arg id: filter by id of hook.
   :arg id__not: filter by id of hook (except this id).
   :arg name: filter by name of hook.
   :arg type: filter by type of hook.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hooks/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

       {
           {
               "id": 1,
               "name": "test hook on user add",
               "type": "HTTP",
               "when": "on_user_add",
               "recipients": "http://localhost:8000/hook_trigger"
           },
           {
               "id": 2,
               "name": "all hooks",
               "type": "HTTP",
               "when": null,
               "recipients": "http://localhost:8000/hook_trigger_another"
           },
           {
               "id": 3,
               "name": "Script hooks",
               "type": "SCRIPT",
               "when": null,
               "recipients": "test.sh"
           }
       }

   :>json number id: id of hook.
   :>json string name: name of hook.
   :>json string type: type of hook. For more details look :http:get:`/api/v1/hooks/types/`.
   :>json string when: type of event on which hook will be executed. If ``when`` is ``null``, this hook will be
       executed for every type of event. For more details look :http:get:`/api/v1/hooks/types/`.
   :>json string recipients: recipients of hook.

.. http:get:: /api/v1/hooks/{id}/

   Gets details about one hook.

   :arg id: id of hook.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hooks/1/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

       {
           "id": 1,
           "name": "test hook on user add",
           "type": "HTTP",
           "when": "on_user_add",
           "recipients": "http://localhost:8000/hook_trigger"
       }

   **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/hooks/`.

.. http:post:: /api/v1/hooks/

   Creates new hook.

   Example request:

   .. sourcecode:: http

      POST /api/v1/hooks/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "name": "new hook",
          "type": "HTTP",
          "when": "on_execution",
          "recipients": "http://localhost:8000/new_hook_trigger"
      }

   Results:

   .. sourcecode:: js

       {
          "id": 4,
          "name": "new hook",
          "type": "SCRIPT",
          "when": "on_execution",
          "recipients": "new-test.sh"
       }

   **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/hooks/`.

   If ``type`` is ``SCRIPT`` and there is no ``'new-test.sh'`` in hooks dir,
   ``POST`` request will return 400 Bad Request.


.. http:get:: /api/v1/hooks/types/

  Returns list of supported hook's types and events.

  Example request:

  .. sourcecode:: http

     GET /api/v1/hooks/types/ HTTP/1.1
     Host: example.com
     Accept: application/json, text/javascript

  Results:

  .. sourcecode:: js

      {
          "when": {
              "after_execution": "After end task",
              "on_user_add": "When new user register",
              "on_user_del": "When user was removed",
              "on_execution": "Before start task",
              "on_object_add": "When new Polemarch object was added",
              "on_object_upd": "When Polemarch object was updated",
              "on_object_del": "When Polemarch object was removed",
              "on_user_upd": "When user update data"
          },
          "types": [
              "HTTP",
              "SCRIPT"
          ]
      }

  :>json string when: type of event on which hook will be executed.
  :>json string types: type of hook. If ``type`` is ``HTTP``, hook will send JSON by ``POST`` request
   to url, which is in ``recipients`` field of hook.
   If ``type`` is ``SCRIPT``, hook will send a temporery file with JSON to script, name of which is in
   ``recipients`` field of hook.


.. _token:

Token
-----

.. http:post:: /api/v1/token/

   Creates new token.

   Example request:

   .. sourcecode:: http

      POST /api/v1/token/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "username": "test-user",
         "password": "password"
      }

   Results:

   .. sourcecode:: js

      {
         "token": "f9e983ef5f67725b60f5a4a1aa0f32912ebe05fb"
      }

.. http:delete:: /api/v1/token/

   Deletes token.

   Example request:

   .. sourcecode:: http

      DELETE /api/v1/token/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "token": "f9e983ef5f67725b60f5a4a1aa0f32912ebe05fb"
      }

   Results:

   .. sourcecode:: js

      {

      }

.. _users:

Users
-----

.. http:get:: /api/v1/users/{id}/

   Gets details about one user.

   :arg id: id of user.

   Example request:

   .. sourcecode:: http

      GET /api/v1/users/3/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":3,
           "username":"petya",
           "password":"pbkdf2_sha256$36000$usSWH0uGIPZl$+Xzz3KpJrq8ZP3truExYOe3CjsaIWgOxuN6jIvJ5ZO8=",
           "is_active":true,
           "is_staff":false,
           "first_name":"Petya",
           "last_name":"Smith",
           "email":"petyasupermail@example.com",
           "url":"http://127.0.0.1:8080/api/v1/users/3/"
        }

   :>json number id: id of user.
   :>json string username: login.
   :>json string password: hash of password.
   :>json boolean is_active: if it is ``true``, account is enabled.
   :>json boolean is_staff: if it is ``true``, this user is superuser. Superuser has access to all
     objects/records despite of access rights.
   :>json string first_name: name.
   :>json string last_name: last name.
   :>json string email: email.
   :>json string url: url to this specific user.

.. |users_details_ref| replace:: **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/users/{id}/`.

.. http:get:: /api/v1/users/

   Gets list of users. |pagination_def|

   :query id: id of host, if we want to filter by it.
   :query id__not: id of host, which we want to filter out.
   :query username: filter by login.
   :query is_active: filter enabled users.
   :query first_name: filter by name.
   :query last_name: filter by last name.
   :query email: filter by email.

   Example request:

   .. sourcecode:: http

      GET /api/v1/users/?is_active=true HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":1,
                 "username":"admin",
                 "is_active":true,
                 "is_staff": true,
                 "url":"http://127.0.0.1:8080/api/v1/users/1/"
              },
              {
                 "id":3,
                 "username":"petya",
                 "is_active":true,
                 "is_staff": true,
                 "url":"http://127.0.0.1:8080/api/v1/users/3/"
              }
           ]
        }

   |users_details_ref|

.. http:delete:: /api/v1/users/{id}/

   Deletes user.

   :arg id: id of user.

.. http:post:: /api/v1/users/

   Creates user.

   :<json string username: login.
   :<json string password: password.
   :<json boolean is_active: if it is ``true``, account is enabled.
   :<json boolean is_staff: if it is ``true``, this user is superuser. Superuser have access to all
     objects/records despite of access rights.
   :<json string first_name: name.
   :<json string last_name: last name.
   :<json string email: email.

   Example request:

   .. sourcecode:: http

      POST /api/v1/users/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "email":"petyasupermail@example.com",
         "first_name":"Petya",
         "last_name":"Smith",
         "username":"petya",
         "is_active":"true",
         "is_staff":"false",
         "password":"rex"
      }

   Results:

   .. sourcecode:: js

        {
           "id":3,
           "username":"petya",
           "password":"pbkdf2_sha256$36000$usSWH0uGIPZl$+Xzz3KpJrq8ZP3truExYOe3CjsaIWgOxuN6jIvJ5ZO8=",
           "is_active":true,
           "is_staff":false,
           "first_name":"Petya",
           "last_name":"Smith",
           "email":"petyasupermail@example.com",
           "url":"http://127.0.0.1:8080/api/v1/users/3/"
        }

   |users_details_ref|

.. http:patch:: /api/v1/users/{id}/

   Updates user. |patch_reminder|

   :arg id: id of user.

   **Request JSON Object:**
   request json fields are the same as in :http:post:`/api/v1/users/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/users/3/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "username":"petrusha"
      }

   Results:

   .. sourcecode:: js

        {
           "id":3,
           "username":"petrusha",
           "password":"pbkdf2_sha256$36000$usSWH0uGIPZl$+Xzz3KpJrq8ZP3truExYOe3CjsaIWgOxuN6jIvJ5ZO8=",
           "is_active":true,
           "is_staff":false,
           "first_name":"Petya",
           "last_name":"Smith",
           "email":"petyasupermail@example.com",
           "url":"http://127.0.0.1:8080/api/v1/users/3/"
        }

   |users_details_ref|

.. |patch_reminder| replace:: All parameters except id are optional, so you can
   specify only needed to update. Only name, for example.

.. http:post:: /api/v1/users/{id}/settings/

   Creates user's view settings of Dashboard's widgets.

   :arg id: id of user.



   Example request:

   .. sourcecode:: http

      POST /api/v1/users/{id}/settings/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        {
         "pmwTasksTemplatesWidget": {
           "active": true,
           "sortNum": 8,
           "collapse": true
         },
         "pmwUsersCounter": {
           "active": true,
           "sortNum": 5,
           "collapse": false
         },
         "pmwProjectsCounter": {
           "active": true,
           "sortNum": 4,
           "collapse": false
         },
         "pmwHostsCounter": {
           "active": true,
           "sortNum": 0,
           "collapse": false
         },
         "pmwInventoriesCounter": {
           "active": true,
           "sortNum": 2,
           "collapse": false
         },
         "pmwGroupsCounter": {
           "active": true,
           "sortNum": 1,
           "collapse": false
         },
         "pmwChartWidget": {
           "active": true,
           "sortNum": 6,
           "collapse": false
         },
         "pmwModulesTemplatesWidget": {
           "active": true,
           "sortNum": 9,
           "collapse": true
         },
         "pmwTemplatesCounter": {
           "active": true,
           "sortNum": 3,
           "collapse": false
         },
         "pmwAnsibleModuleWidget": {
           "active": true,
           "sortNum": 7,
           "collapse": true
         }
      }

   Results:

   .. sourcecode:: js

        {
         "pmwTasksTemplatesWidget": {
           "active": true,
           "sortNum": 8,
           "collapse": true
         },
         "pmwUsersCounter": {
           "active": true,
           "sortNum": 5,
           "collapse": false
         },
         "pmwProjectsCounter": {
           "active": true,
           "sortNum": 4,
           "collapse": false
         },
         "pmwHostsCounter": {
           "active": true,
           "sortNum": 0,
           "collapse": false
         },
         "pmwInventoriesCounter": {
           "active": true,
           "sortNum": 2,
           "collapse": false
         },
         "pmwGroupsCounter": {
           "active": true,
           "sortNum": 1,
           "collapse": false
         },
         "pmwChartWidget": {
           "active": true,
           "sortNum": 6,
           "collapse": false
         },
         "pmwModulesTemplatesWidget": {
           "active": true,
           "sortNum": 9,
           "collapse": true
         },
         "pmwTemplatesCounter": {
           "active": true,
           "sortNum": 3,
           "collapse": false
         },
         "pmwAnsibleModuleWidget": {
           "active": true,
           "sortNum": 7,
           "collapse": true
         }
      }

   :>json string pmw{widget_Name}: widget name.
   :>json boolean active: |users_settings_active|
   :>json number sortNum: |users_settings_sortNum|
   :>json boolean collapse: |users_settings_collapse|

.. |users_settings_active| replace:: one of widget's settings, if ``active`` is ``true``, this widget will be visible on Dashboard.

.. |users_settings_sortNum| replace:: one of widget's settings, it means order number of widget on Dashboard.

.. |users_settings_collapse| replace:: one of widget's settings, if ``collapse`` is ``true``, this widget will be collapsed on Dashboard.


.. http:get:: /api/v1/users/{id}/settings/

   Gets user's view settings of Dashboard's widgets.

   :arg id: id of user.



   Example request:

   .. sourcecode:: http

      GET /api/v1/users/{id}/settings/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {

      }

   Results:

   .. sourcecode:: js

        {
         "pmwTasksTemplatesWidget": {
           "active": true,
           "sortNum": 8,
           "collapse": true
         },
         "pmwUsersCounter": {
           "active": true,
           "sortNum": 5,
           "collapse": false
         },
         "pmwProjectsCounter": {
           "active": true,
           "sortNum": 4,
           "collapse": false
         },
         "pmwHostsCounter": {
           "active": true,
           "sortNum": 0,
           "collapse": false
         },
         "pmwInventoriesCounter": {
           "active": true,
           "sortNum": 2,
           "collapse": false
         },
         "pmwGroupsCounter": {
           "active": true,
           "sortNum": 1,
           "collapse": false
         },
         "pmwChartWidget": {
           "active": true,
           "sortNum": 6,
           "collapse": false
         },
         "pmwModulesTemplatesWidget": {
           "active": true,
           "sortNum": 9,
           "collapse": true
         },
         "pmwTemplatesCounter": {
           "active": true,
           "sortNum": 3,
           "collapse": false
         },
         "pmwAnsibleModuleWidget": {
           "active": true,
           "sortNum": 7,
           "collapse": true
         }
      }

   :>json string pmw{widget_Name}: widget name.
   :>json boolean active: |users_settings_active|
   :>json number sortNum: |users_settings_sortNum|
   :>json boolean collapse: |users_settings_collapse|


.. http:delete:: /api/v1/users/{id}/settings/

   Deletes user's view settings of Dashboard's widgets.

   :arg id: id of user.



.. _teams:

Teams (Polemarch+ only)
-----------------------

Team is a group of users to which you can collectively assign rights to objects
in ACL system.

.. http:get:: /api/v1/teams/{id}/

   Gets details about one team.

   :arg id: id of team.

   Example request:

   .. sourcecode:: http

      GET /api/v1/teams/1/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

    {
        "id": 1,
        "name": "myteam",
        "users": [
            {
                "id": 1,
                "username": "admin",
                "is_active": true,
                "is_staff": true,
                "url": "http://localhost:8000/api/v1/users/1/"
            },
            {
                "id": 2,
                "username": "test-user",
                "is_active": true,
                "is_staff": false,
                "url": "http://localhost:8081/api/v1/users/2/"
            }
        ],
        "users_list": [
            1,
            2
        ],
        "owner": {
            "id": 1,
            "username": "admin",
            "is_active": true,
            "is_staff": true,
            "url": "http://localhost:8000/api/v1/users/1/"
        },
        "url": "http://localhost:8000/api/v1/teams/1/"
    }

   :>json number id: id of team.
   :>json string name: name of team.
   :>json array users: array of users in team. See :ref:`users` for fields
    explanation.
   :>json array users_list: ids of users in team.
   :>json object owner: owner of team. See :ref:`users` for fields explanation.
   :>json string url: url to this specific team.

.. |team_details_ref| replace:: **Response JSON Object:** response json fields are the
   same as in :http:get:`/api/v1/teams/{id}/`.

.. http:get:: /api/v1/teams/

   Gets list of teams. |pagination_def|

   :query id: id of team if we want to filter by it.
   :query name: name of team if we want to filter by it.
   :query id__not: id of team, which we want to filter out.
   :query name__not: name of team, which we want to filter out.

   Example request:

   .. sourcecode:: http

      GET /api/v1/teams/?name__not=outsiders HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

    {
        "count": 1,
        "next": null,
        "previous": null,
        "results": [
            {
                "id": 1,
                "name": "myteam",
                "url": "http://localhost:8000/api/v1/teams/1/"
            }
        ]
    }

   |team_details_ref|

.. http:delete:: /api/v1/teams/{id}/

   Deletes team.

   :arg id: id of team.

.. http:post:: /api/v1/teams/

   Creates team.

   :<json string name: name of new team.

   Example request:

   .. sourcecode:: http

      POST /api/v1/teams/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"another_team"
      }

   Results:

   .. sourcecode:: js

    {
        "id": 2,
        "name": "another_team",
        "users": [],
        "users_list": [],
        "owner": {
            "id": 1,
            "username": "admin",
            "is_active": true,
            "is_staff": true,
            "url": "http://localhost:8000/api/v1/users/1/"
        },
        "url": "http://localhost:8000/api/v1/teams/2/"
    }

   |team_details_ref|

.. http:patch:: /api/v1/groups/{id}/

   Updates team. |patch_reminder|

   :arg id: id of team.
   :<json string name: name of new team.
   :<json array users_list: list of users to put in team.

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/teams/2/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"another_team",
         "users_list": [1, 3]
      }

   Results:

   .. sourcecode:: js

    {
        "id": 2,
        "name": "another_team",
        "users": [
            {
                "id": 1,
                "username": "admin",
                "is_active": true,
                "is_staff": true,
                "url": "http://localhost:8000/api/v1/users/1/"
            },
            {
                "id": 3,
                "username": "max",
                "is_active": true,
                "is_staff": true,
                "url": "http://localhost:8000/api/v1/users/3/"
            }
        ],
        "users_list": [
            1,
            3
        ],
        "owner": {
            "id": 1,
            "username": "admin",
            "is_active": true,
            "is_staff": true,
            "url": "http://localhost:8000/api/v1/users/1/"
        },
        "url": "http://localhost:8000/api/v1/teams/2/"
    }

   |team_details_ref|

ACL system (Polemarch+ only)
----------------------------

Because Polemarch supports multiple users it has access rights for every kind
of objects. Most kinds of objects (if to be precise: :ref:`hosts`,
:ref:`groups`, :ref:`inventory`, :ref:`projects`, :ref:`templates`, :ref:`teams`
) have owner and set of permissions associated to every
instance of such kind. However other objects (if to be precise: :ref:`history`,
:ref:`periodictasks`, :ref:`tasks`) have dependant role from objects
listed above, so they have not their own permissions, but permissions of
parent objects are applicable to them. For example, to see PeriodicTasks of
project you must have access to project itself.

Currently we support such permission levels:

* EXECUTOR - can see object in objects list, view details and execute (in
  case of object is executable like Template, Inventory or something).
* EDITOR - is the same as above + right to edit.
* MASTER - is the same as above + can work with permissions list for this object
  (add/delete other users and teams).
* OWNER - is the same as above + ability to change owner.

**Warning**: if you grant somebody EXECUTOR permission to object, he  will also
automatically get EXECUTOR rights to all other objects, which are required to use
this one. Example: if you give User1 EDITOR right to Inventory1, he will also get
EXECUTOR to all hosts and groups, which are currently listed in Inventory1.

Also there are two types of users: regular and superuser. Regular users have
access only to objects, where they are listed in permissions. Superusers have
access to all objects in system. See :ref:`users` for detailed information
about user management API.

Polemarch+ has such methods to control ownership and permissions information:

.. |permission_json_fields| replace:: **Permission JSON Object:** json fields are the
    same as in :http:post:`/api/v1/{object_kind}/{id}/permissions/`.

.. http:get:: /api/v1/{object_kind}/{id}/permissions/

   Gets permissions to object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.

   Example request:

   .. sourcecode:: http

      POST /api/v1/teams/1/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        [
           {
              "member":2,
              "role":"EXECUTOR",
              "member_type":"user"
           }
        ]

   :>json array permissions: list of permissions. |permission_json_fields|

.. http:post:: /api/v1/{object_kind}/{id}/permissions/

   Adds those permissions to object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :<jsonarr number member: id of user or team for which role should applies.
   :<jsonarr string role: either ``EXECUTOR``, ``EDITOR`` or ``MASTER``.
   :<jsonarr string member_type: either ``user`` or ``team`` (how to interpret
    id)

   Example request:

   .. sourcecode:: http

      POST /api/v1/teams/1/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        [
           {
              "member":1,
              "role":"EDITOR",
              "member_type":"user"
           },
           {
              "member":2,
              "role":"MASTER",
              "member_type":"user"
           }
        ]

   Results:

   .. sourcecode:: js

        [
           {
              "member":1,
              "role":"EDITOR",
              "member_type":"user"
           },
           {
              "member":2,
              "role":"MASTER",
              "member_type":"user"
           }
        ]

   :>json array permissions: list of actual object permissions after operation.
    Every permission is the same object as in request, so you can look request
    fields explanation for details.

.. http:put:: /api/v1/{object_kind}/{id}/permissions/

   Replaces permissions to object with provided.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :<json array permissions: new permissions list. |permission_json_fields|

   .. sourcecode:: http

      PUT /api/v1/teams/1/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        [
           {
              "member":1,
              "role":"EDITOR",
              "member_type":"user"
           },
           {
              "member":2,
              "role":"MASTER",
              "member_type":"user"
           }
        ]

   Results:

   .. sourcecode:: js

        [
           {
              "member":1,
              "role":"EDITOR",
              "member_type":"user"
           },
           {
              "member":2,
              "role":"MASTER",
              "member_type":"user"
           }
        ]

   :>json array permissions: list of actual object permissions after operation.
    |permission_json_fields|

.. http:delete:: /api/v1/{object_kind}/{id}/permissions/

   Removes access to object for users, which are listed in json array in request's body.

   :arg object_kind: |perm_kind_def|
   :arg id: id of object.
   :<json array permissions: which permissions should be removed. You can use `PUT` with
    empty list if you want to remove all permissions. |permission_json_fields|

   Example request:

   .. sourcecode:: http

      DELETE /api/v1/teams/1/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        [
           {
              "member":1,
              "role":"EDITOR",
              "member_type":"user"
           },
           {
              "member":2,
              "role":"MASTER",
              "member_type":"user"
           }
        ]

   Results:

   .. sourcecode:: js

        []

   :>json array permissions: list of actual object permissions after operation.
    |permission_json_fields|

.. http:put:: /api/v1/{object_kind}/{id}/owner/

   Changes owner of object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :jsonparam number id: id of user.

   Example request:

   .. sourcecode:: http

      PUT /api/v1/teams/1/owner/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        2

   Results:

   .. sourcecode:: js

        Owner changed

.. http:get:: /api/v1/{object_kind}/{id}/owner/

   Gets owner of object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.

   Example request:

   .. sourcecode:: http

      GET /api/v1/teams/1/permissions/owner/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript


   Results:

   .. sourcecode:: js

        2

   :>json number id: id of owner.

.. |perm_kind_def| replace:: kind of objects to perform operation. It can be one of
   any presented object type in system: ``hosts``, ``groups``,
   ``inventories``, ``projects``, ``templates``, ``teams``.

License (Polemarch+ only)
-------------------------

.. http:get:: /api/v1/license/

   Gets details about your license.

   Example request:

   .. sourcecode:: http

      GET /api/v1/license/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "expiry": null,
            "users": 5,
            "organization": "VST Consulting",
            "contacts": "sergey.k@vstconsulting.net",
            "hosts": null,
            "actual_hosts": 3,
            "actual_users": 2
        }

   :>json string expiry: date, when license will be (or was) expired. If `null`
     license is endless.
   :>json number users: number of users are available with this license. If `null`
     - unlimited.
   :>json string organization: to whom this license is provided.
   :>json string contacts: license owner's contact information .
   :>json number hosts: number of hosts which are available with this license. If `null`
     - unlimited.
   :>json number actual_hosts: how many hosts are (RANGE calculates appropriately)
     currently in system.
   :>json number actual_users: how many users are currently in system.