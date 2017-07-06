
Rest API
========

Polemarch provides REST API for all its functionality accessible via web GUI,
because our GUI also uses this API to work. Below comes information about every
entity we have in Polemarch and methods applicable to it.

All methods urls stated with ``/api/v1/`` for first api version.
With other versions number will be changed. Current documentation wrote for
version 1. All methods here placed with this prefix to simplify copy & pasting.

.. _pagination:

Pagination
----------

.. |pagination_def| replace:: :ref:`pagination` is used for this list.

For all kinds of objects in Polemarch pagination is used. So for every list of
objects of any kind result will look like:

.. http:get:: /api/v1/{something}/

   List of something.

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

   :>json number count: how many objects exists at all.
   :>json string next: link to next page with objects (``null`` if we at last).
   :>json string previous: link to previous page with objects (``null`` if we
     at first).
   :>json array results: array of objects at current page.

Access rights
-------------

Because Polemarch supports multiple users it have access rights for every kind
of objects. Access rights system is pretty simple. You either have full access
or no access to object. By default creator of object is only person who have
access to it. But you can manage of access rights for any object (of course if
you have access to it) by using this methods:

.. http:post:: /api/v1/{object_kind}/{id}/permissions/

   Add access to object for users, who listed in json array in body of request.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :reqjsonarr Ids: Ids of users to grant access for them.

   Example request:

   .. sourcecode:: http

      POST /api/v1/hosts/123/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      [12, 13]

.. http:delete:: /api/v1/{object_kind}/{id}/permissions/

   Remove access to object for users, who listed in json array in body of
   request.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :reqjsonarr Ids: Ids of users to remove access for them.

   Example request:

   .. sourcecode:: http

      DELETE /api/v1/hosts/123/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      [12, 13]

Also there is two types of users: regular and superuser. Regular users have
access only to objects, where they listed in permissions. Superusers have
access to all objects in system. See :ref:`users` for detailed information
about user management api.

.. |perm_kind_def| replace:: Kind of objects to perform operation. It can be
   any present objects type in system: ``hosts``, ``groups``,
   ``inventories``, ``projects``, ``periodic-tasks``.

.. _hosts:

Hosts
-----

.. http:get:: /api/v1/hosts/{id}/

   Get details about one host.

   :arg id: id of host.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hosts/12 HTTP/1.1
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
           "url":"http://localhost:8080/api/v1/hosts/12/?format=json"
        }

   :>json number id: id of host.
   :>json string name: |host_name_def|
   :>json string type: |host_type_def|
   :>json string url: url to this specific host.
   :>json object vars: |obj_vars_def|

.. |host_type_def| replace:: it is ``RANGE`` if name is range of IPs or hosts,
   otherwise is ``HOST``.
.. |host_name_def| replace:: either human-readable name or hostname/IP or range
   of them (it is depends at context of using this host during playbooks run).
.. |hosts_details_ref| replace:: **Response JSON Object:** response json fields
   same as in :http:get:`/api/v1/hosts/{id}/`.

.. http:get:: /api/v1/hosts/

   List of hosts. |pagination_def|

   :query id: id of host if we want to filter by it.
   :query name: name of host if we want to filter by it.
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

   Delete host.

   :arg id: id of host.

.. http:post:: /api/v1/hosts/

   Create host.

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

         },
      }

   Results:

   .. sourcecode:: js

        {
           "id":12,
           "name":"038108237241668497-0875926814493907",
           "type":"HOST",
           "vars":{

           },
           "url":"http://localhost:8080/api/v1/hosts/12/?format=json"
        }

   |hosts_details_ref|

.. http:patch:: /api/v1/hosts/{id}/

   Update host. |patch_reminder|

   :arg id: id of host.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/hosts/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/hosts/12 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"038108237241668497-0875926814493907",
         "type":"HOST",
         "vars":{

         },
      }

   Results:

   .. sourcecode:: js

        {
           "id":12,
           "name":"038108237241668497-0875926814493907",
           "type":"HOST",
           "vars":{

           },
           "url":"http://localhost:8080/api/v1/hosts/12/?format=json"
        }

   |hosts_details_ref|

.. _groups:

Groups
------

.. http:get:: /api/v1/groups/{id}/

   Get details about one group.

   :arg id: id of group.

   Example request:

   .. sourcecode:: http

      GET /api/v1/groups/12 HTTP/1.1
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
         "url":"http://localhost:8080/api/v1/groups/1/"
      }

   :>json number id: id of group.
   :>json string name: name of group.
   :>json array hosts: |group_hosts_def|
   :>json array groups: |group_groups_def|
   :>json object vars: |obj_vars_def|
   :>json boolean children: |group_children_def|
   :>json string url: url to this specific group.

.. |group_hosts_def| replace:: list of hosts in group if ``children`` is
   ``false``, otherwise empty. See :ref:`hosts` for fields explanation.
.. |group_groups_def| replace:: list of subgroups in group if ``children`` is
   ``true``, otherwise empty.
.. |group_children_def| replace:: either this group of subgroups or group of
   hosts.
.. |group_details_ref| replace:: **Response JSON Object:** response json fields
   same as in :http:get:`/api/v1/groups/{id}/`.

.. http:get:: /api/v1/groups/

   List of groups. |pagination_def|

   :query id: id of group if we want to filter by it.
   :query name: name of group if we want to filter by it.
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

   Delete group.

   :arg id: id of group.

.. http:post:: /api/v1/groups/

   Create group.

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
         "url":"http://localhost:8080/api/v1/groups/3/"
      }

   |group_details_ref|

.. http:patch:: /api/v1/groups/{id}/

   Update group. |patch_reminder|

   :arg id: id of group.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/groups/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/groups/3 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"SomeGroupChanged",
         "children":true,
         "vars":{

         }
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
         "url":"http://localhost:8080/api/v1/groups/3/"
      }

   |group_details_ref|

.. http:post:: /api/v1/groups/{group_id}/hosts/

   Add hosts to group. |sublists_details|

   :statuscode 409: attempt work with hosts list of children
    group (``children=true``). Such kind of groups only for store other groups
    in there.

.. |codes_groups_hosts| replace:: **Status Codes:** status codes same as in
   :http:post:`/api/v1/groups/{group_id}/hosts/`.

.. http:put:: /api/v1/groups/{group_id}/hosts/

   Replace sublist of hosts with new one. |sublists_details|

   |codes_groups_hosts|

.. http:delete:: /api/v1/groups/{group_id}/hosts/

   Remove those hosts from group. |sublists_details|

   |codes_groups_hosts|

.. http:post:: /api/v1/groups/{group_id}/groups/

   Add subgroups to group. |sublists_details|

   :statuscode 409: attempt work with group list of not children group
    (``children=false``).  Such kind of groups only for store hosts in there.

.. |codes_groups_groups| replace:: **Status Codes:** status codes same as in
   :http:post:`/api/v1/groups/{group_id}/groups/`.

.. http:put:: /api/v1/groups/{group_id}/groups/

   Replace sublist of subgroups with new one. |sublists_details|

   |codes_groups_groups|

.. http:delete:: /api/v1/groups/{group_id}/groups/

   Remove those subgroups from group. |sublists_details|

   |codes_groups_groups|

.. _inventory:

Inventories
-----------

.. http:get:: /api/v1/inventories/{id}/

   Get details about one inventory.

   :arg id: id of inventory.

   Example request:

   .. sourcecode:: http

      GET /api/v1/inventories/8 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":8,
           "name":"Inventory1",
           "hosts":[

           ],
           "groups":[

           ],
           "vars":{

           },
           "url":"http://localhost:8080/api/v1/inventories/8/"
        }

   :>json number id: id of inventory.
   :>json string name: name of inventory.
   :>json array hosts: |inventory_hosts_def|
   :>json array groups: |inventory_groups_def|
   :>json object vars: |obj_vars_def|
   :>json string url: url to this specific inventory.

.. |inventory_hosts_def| replace:: list of hosts in inventory. See :ref:`hosts`
   for fields explanation.
.. |inventory_groups_def| replace:: list of groups in inventory.
   See :ref:`groups` for fields explanation.
.. |inventory_details_ref| replace:: **Response JSON Object:** response json
   fields same as in :http:get:`/api/v1/inventories/{id}/`.

.. http:get:: /api/v1/inventories/

   List of inventories. |pagination_def|

   :query id: id of inventory if we want to filter by it.
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
           "count":1,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":8,
                 "name":"Inventory1",
                 "url":"http://localhost:8080/api/v1/inventories/8/"
              }
           ]
        }

   |inventory_details_ref|

.. http:delete:: /api/v1/inventories/{id}/

   Delete inventory.

   :arg id: id of inventory.

.. http:post:: /api/v1/inventories/

   Create inventory.

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
           "groups":[

           ],
           "vars":{

           },
           "url":"http://localhost:8080/api/v1/inventories/9/"
        }

   |inventory_details_ref|

.. http:patch:: /api/v1/inventories/{id}/

   Update inventory. |patch_reminder|

   :arg id: id of inventory.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/inventories/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/inventories/9 HTTP/1.1
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
           "groups":[

           ],
           "vars":{

           },
           "url":"http://localhost:8080/api/v1/inventories/9/"
        }

   |inventory_details_ref|

.. http:post:: /api/v1/inventories/{inventory_id}/hosts/

   Add hosts to inventory. |sublists_details|

.. http:put:: /api/v1/inventories/{inventory_id}/hosts/

   Replace sublist of hosts with new one. |sublists_details|

.. http:delete:: /api/v1/inventories/{inventory_id}/hosts/

   Remove those hosts from inventory. |sublists_details|

.. http:post:: /api/v1/inventories/{inventory_id}/groups/

   Add groups to inventory. |sublists_details|

.. http:put:: /api/v1/inventories/{inventory_id}/groups/

   Replace sublist of groups with new one. |sublists_details|

.. http:delete:: /api/v1/inventories/{inventory_id}/groups/

   Remove those groups from inventory. |sublists_details|

.. _projects:

Projects
--------

.. http:get:: /api/v1/projects/{id}/

   Get details about project.

   :arg id: id of project.

   Example request:

   .. sourcecode:: http

      GET /api/v1/projects/5 HTTP/1.1
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
              "repo_password":"forgetit",
              "repo_type":"GIT"
           },
           "url":"http://localhost:8080/api/v1/projects/7/"
        }

   :>json number id: id of project.
   :>json string name: name of project.
   :>json string repository: |project_repository_def|
   :>json string status: current state of project. Possible values are:
     ``NEW`` - newly created project, ``WAIT_SYNC`` - repository
     synchronization scheduled but not yet started to perform, ``SYNC`` -
     synchronization in progress, ``ERROR`` - synchronization failed (cvs
     failure? incorrect credentials?), ``OK`` - project is synchronized.
   :>json array hosts: |project_hosts_def|
   :>json array groups: |project_groups_def|
   :>json object vars: |obj_vars_def| |project_vars_rem|
   :>json string url: url to this specific inventory.

.. |project_repository_def| replace:: URL of repository (repo-specific URL).
   For ``TAR`` it is just HTTP-link to archive.
.. |project_hosts_def| replace:: list of hosts in project. See :ref:`hosts`
   for fields explanation.
.. |project_groups_def| replace:: list of groups in project.
   See :ref:`groups` for fields explanation.
.. |project_vars_rem| replace:: In this special case always exists
     variables ``repo_password`` to store password for repository and
     ``repo_type`` to store type of repository. Currently implemented types
     are ``GIT`` for Git repositories. And ``TAR`` for uploading tar archive
     with project files.
.. |project_details_ref| replace:: **Response JSON Object:** response json
   fields same as in :http:get:`/api/v1/projects/{id}/`.

.. http:get:: /api/v1/projects/

   List of projects. |pagination_def|

   :query id: id of project if we want to filter by it.
   :query name: name of project if we want to filter by it.
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

   Delete project.

   :arg id: id of project.

.. http:post:: /api/v1/projects/

   Create project. Operation automatically triggers synchronization. Details
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
         "repository":"somewhere-in-emptiness",
         "vars":{
            "repo_type":"TAR",
            "repo_password":""
         }
      }

   Results:

   .. sourcecode:: js

        {
           "id":9,
           "name":"project_owl",
           "status":"WAIT_SYNC",
           "repository":"somewhere-in-emptiness",
           "hosts":[

           ],
           "groups":[

           ],
           "inventories":[

           ],
           "vars":{
              "repo_password":"",
              "repo_type":"TAR"
           },
           "url":"http://localhost:8080/api/v1/projects/9/"
        }

   |project_details_ref|

.. http:patch:: /api/v1/projects/{id}/

   Update project. Operation does not start synchronization again.
   If you want synchronize, you must do it by
   using :http:post:`/api/v1/projects/{id}/sync/` |patch_reminder|

   :arg id: id of project.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/projects/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/projects/9 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name":"project_owl",
         "repository":"somewhere-in-emptiness",
         "vars":{
            "repo_type":"TAR",
            "repo_password":""
         }
      }

   Results:

   .. sourcecode:: js

        {
           "id":9,
           "name":"project_owl",
           "status":"WAIT_SYNC",
           "repository":"somewhere-in-emptiness",
           "hosts":[

           ],
           "groups":[

           ],
           "inventories":[

           ],
           "vars":{
              "repo_password":"",
              "repo_type":"TAR"
           },
           "url":"http://localhost:8080/api/v1/projects/9/"
        }

   |project_details_ref|

.. http:post:: /api/v1/projects/{project_id}/hosts/

   Add hosts to project. |sublists_details|

.. http:put:: /api/v1/projects/{project_id}/hosts/

   Replace sublist of hosts with new one. |sublists_details|

.. http:delete:: /api/v1/projects/{project_id}/hosts/

   Remove those hosts from project. |sublists_details|

.. http:post:: /api/v1/projects/{project_id}/groups/

   Add groups to project. |sublists_details|

.. http:put:: /api/v1/projects/{project_id}/groups/

   Replace sublist of groups with new one. |sublists_details|

.. http:delete:: /api/v1/projects/{project_id}/groups/

   Remove those groups from project. |sublists_details|

.. http:post:: /api/v1/projects/{project_id}/inventories/

   Add inventories to project. |sublists_details|

.. http:put:: /api/v1/projects/{project_id}/inventories/

   Replace sublist of inventories with new one. |sublists_details|

.. http:delete:: /api/v1/projects/{project_id}/inventories/

   Remove those inventories from project. |sublists_details|

.. http:get:: /api/v1/projects/supported-repos/

   Returns list of supported repository types.

   Results:

   .. sourcecode:: js

        [
            "TAR",
            "GIT"
        ]

.. http:post:: /api/v1/projects/{id}/sync/

   Starts synchronization. During that process project files uploading from
   repository. Concrete details of process highly depends on project type.
   For ``GIT`` is ``git pull``, for ``TAR`` it just downloading archive from
   URL again and unpacking it with rewrite of old files. And so on.

   :arg id: id of project.

   Results:

   .. sourcecode:: js

        {
           "detail":"Sync with git@ex.us:dir/rep1.git."
        }

.. http:post:: /api/v1/projects/{id}/execute/

   Execute ansible playbook.

   :arg id: id of project.
   :<json number inventory: inventory to execute playbook at.
   :<json string playbook: playbook to execute.

   Example request:

   .. sourcecode:: http

      POST /api/v1/projects/1/execute/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "inventory": 13,
         "playbook": "main.yml"
      }

   Results:

   .. sourcecode:: js

        {
           "detail":"Started at inventory 13."
        }

Tasks
-----

.. http:get:: /api/v1/tasks/{id}/

   Get details about task.

   :arg id: id of task.

   Example request:

   .. sourcecode:: http

      GET /api/v1/tasks/5 HTTP/1.1
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

   List tasks. |pagination_def|

   :query id: id of project if we want to filter by it.
   :query name: name of project if we want to filter by it.
   :query id__not: id of project, which we want to filter out.
   :query name__not: name of project, which we want to filter out.
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
           "count":1,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":5,
                 "name":"Ruin my environment",
                 "url":"http://localhost:8080/api/v1/tasks/5/"
              }
           ]
        }

Periodic tasks
--------------

.. http:get:: /api/v1/periodic-tasks/{id}/

   Get details about periodic task.

   :arg id: id of periodic task.

   Example request:

   .. sourcecode:: http

      GET /api/v1/periodic-tasks/10 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":10,
           "type":"CRONTAB",
           "schedule":"60* */2 sun,fri 1-15 *",
           "playbook":"collect_data.yml",
           "project":7,
           "inventory":8,
           "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/10/?format=json"
        }

   :>json number id: id of periodic task.
   :>json string type: |ptask_type_details|
   :>json string schedule: |ptask_schedule_details|
   :>json string playbook: playbook to run periodically.
   :>json number project: id of project which this task belongs to.
   :>json number inventory: id of inventory for which must execute playbook.
   :>json string url: url to this specific periodic task.

.. |ptask_details_ref| replace:: **Response JSON Object:** response json
   fields same as in :http:get:`/api/v1/periodic-tasks/{id}/`.

.. |ptask_schedule_details| replace:: string with integer value or string in
   cron format, what depends on ``type`` value. Look at ``type`` description
   for details.

.. |ptask_type_details| replace:: type of periodic task. Either ``DELTA`` for
   tasks that runs every N seconds or ``CRONTAB`` for tasks, which runs
   according by more complex rules. According to that ``schedule`` field will
   be interpreted as integer - number of seconds between runs. Or string in
   cron format with one small exception - Polemarch expect string without year,
   because years is not supported. You can easily find documentation for cron
   format in web. Like those, for example:
   https://linux.die.net/man/5/crontab and
   http://www.nncron.ru/help/EN/working/cron-format.htm

.. http:get:: /api/v1/periodic-tasks/

   List of periodic tasks. |pagination_def|

   :query id: id of project if we want to filter by it.
   :query id__not: id of project, which we want to filter out.
   :query playbook: filter by playbook.
   :query type: filter by ``type``.
   :query project: filter by project id.

   Example request:

   .. sourcecode:: http

      GET /api/v1/projects/?project=7 HTTP/1.1
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
                 "type":"DELTA",
                 "schedule":"60",
                 "playbook":"collect_data.yml",
                 "inventory":8,
                 "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/10/?format=json"
              },
              {
                 "id":11,
                 "type":"CRONTAB",
                 "schedule":"* */2 sun,fri 1-15 *",
                 "playbook":"do_greatest_evil.yml",
                 "inventory":8,
                 "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/11/?format=json"
              }
           ]
        }

   |ptask_details_ref|

.. http:delete:: /api/v1/periodic-tasks/{id}/

   Delete periodic task.

   :arg id: id of periodic task.

.. http:post:: /api/v1/periodic-tasks/

   Create periodic task

   :<json string type: |ptask_type_details|
   :<json string schedule: |ptask_schedule_details|
   :<json string playbook: playbook to run periodically.
   :<json number project: id of project, which task belongs to.
   :<json number inventory: id of inventory to run playbook on.

   Example request:

   .. sourcecode:: http

      POST /api/v1/periodic-tasks/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "type": "DELTA",
          "schedule": "25",
          "playbook": "touch_the_clouds.yml",
          "project": 7,
          "inventory": 8
      }

   Results:

   .. sourcecode:: js

    {
        "id": 14,
        "type": "DELTA",
        "schedule": "25",
        "playbook": "touch_the_clouds.yml",
        "project": 7,
        "inventory": 8,
        "url": "http://127.0.0.1:8080/api/v1/periodic-tasks/14/?format=api"
    }

   |ptask_details_ref|

.. http:patch:: /api/v1/periodic-tasks/{id}/

   Update periodic task. |patch_reminder|

   :arg id: id of periodic task.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/periodic-tasks/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/periodic-tasks/14 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "type": "DELTA",
          "schedule": "25",
          "playbook": "touch_the_clouds.yml",
          "project": 7,
          "inventory": 8
      }

   Results:

   .. sourcecode:: js

    {
        "id": 14,
        "type": "DELTA",
        "schedule": "25",
        "playbook": "touch_the_clouds.yml",
        "project": 7,
        "inventory": 8,
        "url": "http://127.0.0.1:8080/api/v1/periodic-tasks/14/?format=api"
    }

   |ptask_details_ref|

History records
---------------

.. http:get:: /api/v1/history/{id}/

   Get details about one history record.

   :arg id: id of history record.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/1 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "id":1,
           "project":2,
           "playbook":"task.yml",
           "status":"OK",
           "start_time":"2017-07-02T12:48:11.922761Z",
           "stop_time":"2017-07-02T13:48:11.922777Z",
           "raw_inventory":"inventory",
           "raw_stdout":"text"
        }

   :>json number id: id of history record.
   :>json number project: id of project, which record belongs to.
   :>json string playbook: name of executed playbook.
   :>json string status: either ``OK``, ``STOP`` or ``ERROR``, which indicates
     different results of execution (good, interrupted by user, failure
     correspondingly).
   :>json string start_time: time, when playbook execution was started.
   :>json string stop_time: time, when playbook execution was ended (normally
     or not)
   :>json string raw_inventory: Ansible inventory, which used for execution. It
     is generates from on of Polemarch's :ref:`inventory`
   :>json string raw_stdout: what Ansible wrote to stdout and stderr during
     execution.
   :>json string url: url to this specific history record.

.. |history_details_ref| replace:: **Response JSON Object:** response json fields
   same as in :http:get:`/api/v1/history/{id}/`.

.. http:get:: /api/v1/history/

   List of history records. |pagination_def|

   :query id: id of inventory if we want to filter by it.
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
   :query playbook: filter by ``playbook``.
   :query project: filter by ``project``.
   :query status: filter by ``status``.
   :query start_time: get records only with ``start_time`` equal to specified.
   :query stop_time: get records only with ``stop_time`` equal to specified.

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/?start_time__gte=2017-06-01T01:48:11.923896Z HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
           "count":3,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id":1,
                 "project":2,
                 "playbook":"task.yml",
                 "status":"OK",
                 "start_time":"2017-07-02T12:48:11.922761Z",
                 "stop_time":"2017-07-02T13:48:11.922777Z"
              },
              {
                 "id":2,
                 "project":2,
                 "playbook":"task.yml",
                 "status":"STOP",
                 "start_time":"2017-07-02T02:48:11.923896Z",
                 "stop_time":"2017-07-02T03:48:11.923908Z"
              },
              {
                 "id":3,
                 "project":2,
                 "playbook":"task.yml",
                 "status":"ERROR",
                 "start_time":"2017-07-01T16:48:11.924959Z",
                 "stop_time":"2017-07-01T17:48:11.924973Z"
              }
           ]
        }

   |history_details_ref|

.. http:delete:: /api/v1/history/{id}/

   Delete history record.

   :arg id: id of record.

.. _variables:

Variables
---------

.. |obj_vars_def| replace:: dictionary of variables associated with this
   object. See :ref:`variables` for details.

Hosts, groups, inventories, projects in Polemarch may have variables
associated with them. Usually (with one exception - variables for additional
repository data in :ref:`projects`) those variables passes to Ansible to
somehow customize his behaviour or playbook logic. In all this kinds of
objects variables works in same way, so here additional chapter which describes
their behaviour abstracting from details related to every concrete type of
object.

In JSON responses related to those objects variables are placed in field
``vars``. This field is just key-value dictionary of existent variables for
object. It can be saved in ``POST`` and ``PATCH`` request completely
overwriting previous dictionary.

It can be represented in such more formal way:

.. http:get:: /api/v1/{object_kind}/{object_id}

   Get details about one object.

   :arg id: id of this object.

   Example request:

   .. sourcecode:: http

      GET /api/v1/hosts/12 HTTP/1.1
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

   Update object.

   :arg id: id of object.

   :<json object vars: dictionary of variables to save in object. It is
     completely rewrites old dictionary.

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/hosts/12 HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         // there is may be other object-related stuff
         "vars":{
                "string_variable1": "some_string",
                "integer_variable2": 12,
                "float_variable3": 0.3
         }
      }

   Results:

   .. sourcecode:: js

        {
           // object-special data goes here
           "vars":{
                "string_variable1": "some_string",
                "integer_variable2": 12,
                "float_variable3": 0.3
           },
        }

Also for all previously enumerated kinds of objects (which support variables)
there is filtering by variables possible in get requests like this:

.. http:get:: /api/v1/{object_kind}/

   Get list of objects. |pagination_def|

   :query variables: filter objects by variables and their values. Variables
    specified as list using ``,`` as separator for every list item and ``:``
    as separator for key and value. Like ``var1:value,var2:value,var3:12``.

   Example request:

   .. sourcecode:: http

      GET /api/v1/groups/?variables=ansible_port:222,ansible_user:one HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

.. _sublists:

Sublists
---------

.. |sublists_details| replace:: See :ref:`sublists` for details.

Many of objects types in Polemarch can contain collections of other objects.
For example *Group* can contain sublist of *Hosts* included in this group.
Because all of those sublists base on the same logic, we documenting here
general principles of this logic. Its made in order to not duplicate this
information for every method of such kind.

**Here the list of those methods**:

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

As you can see there is plenty of urls and for every url ``post``, ``put`` and
``delete`` methods are present. They all takes list of IDs in json request
body, but do different things with those IDs. ``put`` methods completely
rewrite sublist with new list. ``post`` method just append new IDs to already
existent. ``delete`` method removes specified IDs from existent list.

All of those methods returns such json as result:

.. sourcecode:: js

  {
     "not_found":0,
     "operated":2,
     "total":2
  }

There ``not_found`` counter for items, which can't be processed for some
reason. ``operated`` for processed successfully. And ``total`` is number of
elements that was in initial request.

IDs always for object kind, which must be stored in this sublist. For example,
for ``groups/{group_id}/hosts/`` it must be ids of existent hosts. If host with
id from list not exist method still return ``200 OK``, but result stats will
reflect that fact, that one of the ids can't be processed successfully.

To clarify information above here is example detailed structured explanation
(with request and response examples) for those methods:

.. http:any:: /api/v1/{object_kind}/{object_id}/{sublist_kind}/

   Operate with sublist of objects for some concrete object.

   * ``post`` - append new objects to already existent sublist.
   * ``delete`` - removes those objects from existent sublist.
   * ``put`` - rewrite sublist with this one.

   :arg object_kind: kind of object, whose sublist we modify.
   :arg object_id: id of concrete object, whose sublist we modify.
   :arg sublist_kind: kind of objects, stored in sublist
   :reqjsonarr Ids: Ids of objects, which we must add/remove/replace in
    sublist.

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

   :>json number not_found: count of processed with error (not exists or no
     access).
   :>json number operated: count of processed successfully.
   :>json number total: count of all sent ids.

.. _users:

Users
-----

.. http:get:: /api/v1/users/{id}/

   Get details about one user.

   :arg id: id of user.

   Example request:

   .. sourcecode:: http

      GET /api/v1/users/3 HTTP/1.1
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
   :>json boolean is_active: is account enabled.
   :>json boolean is_staff: is it superuser. Superuser have access to all
     objects/records despite of access rights.
   :>json string first_name: name.
   :>json string last_name: last name.
   :>json string email: email.
   :>json string url: url to this specific user.

.. |users_details_ref| replace:: **Response JSON Object:** response json fields
   same as in :http:get:`/api/v1/users/{id}/`.

.. http:get:: /api/v1/users/

   List of users. |pagination_def|

   :query id: id of host if we want to filter by it.
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
                 "url":"http://127.0.0.1:8080/api/v1/users/1/"
              },
              {
                 "id":3,
                 "username":"petya",
                 "is_active":true,
                 "url":"http://127.0.0.1:8080/api/v1/users/3/"
              }
           ]
        }

   |users_details_ref|

.. http:delete:: /api/v1/users/{id}/

   Delete user.

   :arg id: id of user.

.. http:post:: /api/v1/users/

   Create user.

   :<json string username: login.
   :<json string password: password.
   :<json boolean is_active: is account enabled.
   :<json boolean is_staff: is it superuser. Superuser have access to all
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

   Update user. |patch_reminder|

   :arg id: id of host.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/users/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/users/3/ HTTP/1.1
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

.. |patch_reminder| replace:: All parameters except id are optional, so you can
   specify only needed to update. Only name for example.