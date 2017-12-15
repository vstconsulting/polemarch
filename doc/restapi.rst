
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

.. _hosts:

Hosts
-----

.. http:get:: /api/v1/hosts/{id}/

   Get details about one host.

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

      PATCH /api/v1/hosts/12/ HTTP/1.1
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

      PATCH /api/v1/groups/3/ HTTP/1.1
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

      GET /api/v1/inventories/8/ HTTP/1.1
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

      PATCH /api/v1/inventories/9/ HTTP/1.1
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

      PATCH /api/v1/projects/9/ HTTP/1.1
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

.. http:post:: /api/v1/projects/{id}/execute-playbook/

   Execute ansible playbook. Returns history id for watching execution process.

   :arg id: id of project.
   :<json number inventory: inventory to execute playbook at.
   :<json string playbook: playbook to execute.
   :<json *: any number parameters with any name and string or number type. All
     those parameters just passes as additional command line arguments to
     ``ansible-playbook`` utility during execution, so you can use this feature
     to widely customize of ansible behaviour. For any ``key:value`` in command
     line will be ``--key value``. If you want only key without a value
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

   Execute ansible module. Just like running ``ansible -m {something}`` by
   hands. You can quickly do something with ansible without boring and time
   consuming work with playbooks etc.

   :<json number inventory: inventory to execute at.
   :<json string module: name of module (like ``ping``, ``shell`` and so on).
     You can use any of modules available in ansible.
   :<json string group: to which group in your inventory it must be executed.
     Use ``all`` for all hosts in inventory.
   :<json string args: which args must be passed to module. Just raw string
     with arguments. You can specify here contains of ``args`` option. For
     example ``ls -la`` for ``shell`` module.
   :<json *: any number parameters with any name and string or number type. All
     those parameters just passes as additional command line arguments to
     ``ansible-playbook`` utility during execution, so you can use this feature
     to widely customize of ansible behaviour. For any ``key:value`` in command
     line will be ``--key value``. If you want only key without a value
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

   Get details about task.

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

   List tasks. |pagination_def|

   :query id: id of task if we want to filter by it.
   :query name: name of task if we want to filter by it.
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

.. _periodictasks:

Periodic tasks
--------------

.. http:get:: /api/v1/periodic-tasks/{id}/

   Get details about periodic task.

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
           "type":"CRONTAB",
           "schedule":"60* */2 sun,fri 1-15 *",
           "mode":"collect_data.yml",
           "kind":"PLAYBOOK",
           "project":7,
           "inventory":8,
           "vars":{

           },
           "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/10/?format=json"
        }

   :>json number id: id of periodic task.
   :>json string type: |ptask_type_details|
   :>json string schedule: |ptask_schedule_details|
   :>json string mode: playbook or module to run periodically.
   :>json string kind: either this task is playbook run (``PLAYBOOK``) or
     module run (``MODULE``).
   :>json number project: id of project which this task belongs to.
   :>json number inventory: id of inventory for which must execute_playbook playbook.
   :>json object vars: |ptask_vars_def|
   :>json string url: url to this specific periodic task.

.. |ptask_details_ref| replace:: **Response JSON Object:** response json
   fields same as in :http:get:`/api/v1/periodic-tasks/{id}/`.

.. |ptask_schedule_details| replace:: string with integer value or string in
   cron format, what depends on ``type`` value. Look at ``type`` description
   for details.

.. |ptask_type_details| replace:: type of periodic task. Either ``INTERVAL``
   for tasks that runs every N seconds or ``CRONTAB`` for tasks, which runs
   according by more complex rules. According to that ``schedule`` field will
   be interpreted as integer - number of seconds between runs. Or string in
   cron format with one small exception - Polemarch expect string without year,
   because years is not supported. You can easily find documentation for cron
   format in web. Like those, for example:
   https://linux.die.net/man/5/crontab and
   http://www.nncron.ru/help/EN/working/cron-format.htm

.. |ptask_vars_def| replace:: those vars have special meaning. All those
   parameters just passes as additional command line arguments to
   ``ansible-playbook`` utility during execution, so you can use this feature
   to widely customize of ansible behaviour. For any ``key:value`` in command
   line will be ``--key value``. If you want only key without a value
   (``--become`` option for example), just pass ``null`` as value. In all other
   aspects this field works like usual ``vars``: |obj_vars_def|

.. http:get:: /api/v1/periodic-tasks/

   List of periodic tasks. |pagination_def|

   :query id: id of template if we want to filter by it.
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
                 "type":"INTERVAL",
                 "schedule":"60",
                 "mode":"collect_data.yml",
                 "kind":"PLAYBOOK",
                 "inventory":8,
                 "vars":{

                 },
                 "url":"http://127.0.0.1:8080/api/v1/periodic-tasks/10/?format=json"
              },
              {
                 "id":11,
                 "type":"CRONTAB",
                 "schedule":"* */2 sun,fri 1-15 *",
                 "mode":"do_greatest_evil.yml",
                 "kind":"PLAYBOOK",
                 "inventory":8,
                 "vars":{

                 },
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
   :<json string mode: playbook or module to run periodically. Depends on value
     of ``kind`` field.
   :<json string kind: Optional argument. Either this task is playbook run
     (``PLAYBOOK``) or module run (``MODULE``). If omitted, will be default -
     ``PLAYBOOK``. Module tasks also requires two variables for execution:
     ``args`` for module-specific args (can be omitted or empty string) and
     ``group`` to specify for which group in inventory module must run. If you
     forget to specify group, your task will fail.
   :<json number project: id of project, which task belongs to.
   :<json number inventory: id of inventory to run playbook on.
   :<json object vars: |ptask_vars_def|

   Example request:

   .. sourcecode:: http

      POST /api/v1/periodic-tasks/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
          "type": "INTERVAL",
          "schedule": "25",
          "mode": "touch_the_clouds.yml",
          "project": 7,
          "inventory": 8
          "vars":{

           },
      }

   Results:

   .. sourcecode:: js

    {
        "id": 14,
        "type": "INTERVAL",
        "schedule": "25",
        "mode": "touch_the_clouds.yml",
        "kind": "PLAYBOOK",
        "project": 7,
        "inventory": 8,
        "vars":{

         },
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
        "type": "INTERVAL",
        "schedule": "25",
        "mode": "touch_the_clouds.yml",
        "kind": "PLAYBOOK",
        "project": 7,
        "inventory": 8,
        "url": "http://127.0.0.1:8080/api/v1/periodic-tasks/14/?format=api"
    }

   |ptask_details_ref|

.. _templates:

Templates
---------

.. http:get:: /api/v1/templates/{id}/

   Get template with details.

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
            "data": {
                "playbook": "test.yml",
                "vars": {
                    "connection": "paramiko"
                }
            }
        }

   :>json number id: id of template.
   :>json string name: name of template.
   :>json string kind: |template_kind_details|
   :>json string data: |template_data_details|

.. |template_details_ref| replace:: **Response JSON Object:** response json
   fields same as in :http:get:`/api/v1/templates/{id}/`.

.. |template_kind_details| replace:: Kind of template. Supported kinds
   could see in :http:get:`/api/v1/templates/supported-kinds/`.

.. |template_data_details| replace:: JSON structure of template. Supported
   fields could see in :http:get:`/api/v1/templates/supported-kinds/`.


.. http:get:: /api/v1/templates/

   Get list of templates. |pagination_def|

   :query id: id of project if we want to filter by it.
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
            "count": 1,
            "next": null,
            "previous": null,
            "results": [
                {
                    "id": 1,
                    "name": "test_tmplt",
                    "kind": "Task"
                }
            ]
        }

   |template_details_ref|

.. http:delete:: /api/v1/templates/{id}/

   Delete periodic task.

   :arg id: id of periodic task.

.. http:post:: /api/v1/templates/

   Create template

   :<json string kind: |template_kind_details|
   :<json string data: |template_data_details|
   :<json string name: template name.

   Example request:

   .. sourcecode:: http

      POST /api/v1/templates/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      {
         "name": "test",
         "kind": "Task",
         "data": {
            "playbook": "test.yml",
            "vars": {
                  "connection": "paramiko"
            }
         }
      }

   Results:

   .. sourcecode:: js

    {
        "id": 2,
        "name": "test",
        "kind": "Task",
        "data": {
            "playbook": "test.yml",
            "vars": {
                "connection": "paramiko"
            }
        }
    }

   |template_details_ref|

.. http:patch:: /api/v1/templates/{id}/

   Update template. If update data, should send full template data.
   |patch_reminder|

   :arg id: id of template.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/templates/`

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
        "id": 2,
        "name": "test_new_name",
        "kind": "Task",
        "data": {
            "playbook": "test.yml",
            "vars": {
                "connection": "paramiko"
            }
        }
    }

   |template_details_ref|

.. http:get:: /api/v1/templates/supported-kinds/

   List of supported kinds.|pagination_def|

   Example request:

   .. sourcecode:: http

      GET /api/v1/history/supported-kinds/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "Task": [
                "playbook",
                "vars",
                "inventory",
                "project"
            ],
            "Host": [
                "name",
                "vars"
            ],
            "PeriodicTask": [
                "playbook",
                "vars",
                "inventory",
                "project",
                "type",
                "name",
                "schedule"
            ],
            "Group": [
                "name",
                "vars",
                "children"
            ]
        }

.. _history:

History records
---------------

.. http:get:: /api/v1/history/{id}/

   Get details about one history record.

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
           "raw_inventory":"inventory",
           "raw_args": "ansible-playbook main.yml -i /tmp/tmpvMIwMg -v",
           "raw_stdout":"text",
           "initiator": 1,
           "initiator_type": "users"
        }

   :>json number id: id of history record.
   :>json number project: id of project, which record belongs to.
   :>json string mode: name of executed playbook or module.
   :>json string kind: either was run of ``ansible-playbook`` (``PLAYBOOK``) or
     ``ansible`` (``MODULE``).
   :>json string status: either ``DELAY``, ``OK``, ``INTERRUPTED``, ``RUN``,
     ``OFFLINE`` or ``ERROR``, which indicates different results of execution
     (scheduled for run, good, interrupted by user, currently running,
     can't connect to node, failure).
   :>json string start_time: time, when playbook execution was started.
   :>json string stop_time: time, when playbook execution was ended (normally
     or not)
   :>json string raw_inventory: Ansible inventory, which used for execution. It
     is generates from on of Polemarch's :ref:`inventory`
   :>json string raw_args: ansible command line during execution.
   :>json string raw_stdout: what Ansible wrote to stdout and stderr during
     execution. The size is limited to 10M characters. Full output
     in :http:get:`/api/v1/history/{id}/raw/`.
   :>json number initiator: initiator id.
   :>json string initiator_type: initiator type like in api url.
   :>json string url: url to this specific history record.

.. |history_details_ref| replace:: **Response JSON Object:** response json fields
   same as in :http:get:`/api/v1/history/{id}/`.

.. http:post:: /api/v1/history/{id}/cancel/

   Cancel currently executed task.

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

   Get full output of executed task.

   :arg id: id of history record.

   :query color: Default is ``no``. If ``yes`` you will get output with ANSI
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

   List of history record lines. |pagination_def|

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
   :query mode: filter by ``mode``.
   :query kind: filter by ``kind``.
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
           "count":2,
           "next":null,
           "previous":null,
           "results":[
              {
                 "id": 121,
                 "project": 3,
                 "mode": "main.yml",
                 "kind": "PLAYBOOK",
                 "status": "OK",
                 "start_time": "2017-07-24T06:39:52.052504Z",
                 "stop_time": "2017-07-24T06:41:06.521813Z",
                 "url": "http://localhost:8000/api/v1/history/121/"
              },
              {
                 "id": 118,
                 "project": null,
                 "mode": "ping",
                 "kind": "MODULE",
                 "status": "OK",
                 "start_time": "2017-07-24T06:27:40.481588Z",
                 "stop_time": "2017-07-24T06:27:42.499873Z",
                 "url": "http://localhost:8000/api/v1/history/118/"
              }
           ]
        }

   |history_details_ref|

.. http:delete:: /api/v1/history/{id}/

   Delete history record.

   :arg id: id of record.

.. http:get:: /api/v1/history/{id}/facts/

   Get facts gathered during execution of ``setup`` module.

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
   :statuscode 424: facts still not ready because module is currently running
    or only scheduled for run.

Ansible
-------

.. http:get:: /api/v1/ansible/

   Get list of available methods in that category. All methods under
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

   Get list of available ansible command line tools arguments with their type
   and hint.

   :query filter: filter by tool, for which you want get help (either `ansible`
    or `ansible-playbook`).

   Example request:

   .. sourcecode:: http

      GET /api/v1/ansible/cli_reference/?filter=ansible HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

   Results:

   .. sourcecode:: js

        {
            "ansible": {
                "extra-vars": {
                    "type": "text",
                    "help": "set additional variables as key=value or YAML/JSON"
                },
                "help": {
                    "type": "boolean",
                    "help": "show this help message and exit"
                },
                // there is much more arguments to type it here
                // ...
            }
        }

.. http:get:: /api/v1/ansible/modules/

   Get list of installed ansible modules.

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
            "extras.source_control.git_config",
            "extras.source_control.github_release",
            "extras.source_control.github_hooks",
            "extras.source_control.gitlab_user",
            "extras.source_control.github_key",
            "extras.source_control.gitlab_group",
            "extras.source_control.gitlab_project",
            "core.source_control.git"
        ]

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

   Update object.

   :arg id: id of object.

   :<json object vars: dictionary of variables to save in object. It is
     completely rewrites old dictionary.

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/hosts/12/ HTTP/1.1
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
--------

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
     "total":2,
     "failed_list": []
  }

There ``not_found`` counter for items, which can't be processed for some
reason. ``operated`` for processed successfully. And ``total`` is number of
elements that was in initial request. If some items not operated successfully,
`failed_list` will be list of them. Otherwise just empty list.

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

Teams (Polemarch+ only)
-----------------------

Teams is groups of users to which you can collectively assign rights to objects
in ACL system.

.. http:get:: /api/v1/teams/{id}/

   Get details about one team.

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
            }
        ],
        "users_list": [
            1
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

.. |team_details_ref| replace:: **Response JSON Object:** response json fields
   same as in :http:get:`/api/v1/teams/{id}/`.

.. http:get:: /api/v1/teams/

   List of teams. |pagination_def|

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

   Delete team.

   :arg id: id of team.

.. http:post:: /api/v1/teams/

   Create team.

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

   Update team. |patch_reminder|

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
         "users_list": [1, 2]
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
                "id": 2,
                "username": "max",
                "is_active": true,
                "is_staff": true,
                "url": "http://localhost:8000/api/v1/users/2/"
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
        "url": "http://localhost:8000/api/v1/teams/2/"
    }

   |team_details_ref|

ACL system (Polemarch+ only)
----------------------------

Because Polemarch supports multiple users it have access rights for every kind
of objects. Most kinds of objects (if to be precise: :ref:`hosts`,
:ref:`groups`, :ref:`inventory`, :ref:`projects`, :ref:`templates`
) have owner and set of permissions associated to every
instance of such kind. However other objects (if to be precise: :ref:`history`,
:ref:`periodictasks`, :ref:`tasks`) have dependant role from objects
listed above, so they does not have their own permissions, but permissions of
parent objects is applicable to them. For example to see PeriodicTasks of
project you must have access to project itself.

Currently we support such permission levels:

* EXECUTOR - can see object in objects list, view details and execute (in
  case of object is executable like Template, Inventory or something).
* EDITOR - same as above + right to edit.
* MASTER - same as above + can work with permissions list for this object
  (add/delete other users and teams).
* OWNER - same as above + ability to change owner.

**Warning**: if you granting somebody EXECUTOR permission to object, he also
automatically get EXECUTOR rights to all other objects, which required to use
this one. Example: if you give User1 EDITOR right to Inventory1, he also got
EXECUTOR to all hosts and groups, which currently listed in Inventory1.

Also there is two types of users: regular and superuser. Regular users have
access only to objects, where they listed in permissions. Superusers have
access to all objects in system. See :ref:`users` for detailed information
about user management api.

Polemarch+ have such methods to control ownership and permissions information:

.. |permission_json_fields| replace:: **Permission JSON Object:** json fields
    same as in :http:post:`/api/v1/{object_kind}/{id}/permissions/`.

.. http:get:: /api/v1/{object_kind}/{id}/permissions/

   Get permissions to object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.

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

   :>json array permissions: list of permissions. |permission_json_fields|

.. http:post:: /api/v1/{object_kind}/{id}/permissions/

   Add those permissions to object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :<jsonarr number member: id of user or team for which role should applies.
   :<jsonarr string role: either ``EXECUTOR``, ``EDITOR`` or ``MASTER``.
   :<jsonarr string member_type: either ``user`` or ``team`` (how to interpret
    id)

   Example request:

   .. sourcecode:: http

      POST /api/v1/hosts/123/permissions/ HTTP/1.1
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
    Every permission is same object as in request, so you can look request
    fields explanation for details.

.. http:put:: /api/v1/{object_kind}/{id}/permissions/

   Replace permissions to object with provided.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :<json array permissions: new permissions list. |permission_json_fields|

   .. sourcecode:: http

      PUT /api/v1/hosts/123/permissions/ HTTP/1.1
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

   Remove access to object for users, who listed in json array in body of
   request.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :<json array permissions: which permissions remove. You can use `PUT` with
    empty list if you want to remove all permissions. |permission_json_fields|

   Example request:

   .. sourcecode:: http

      DELETE /api/v1/hosts/123/permissions/ HTTP/1.1
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

   .. sourcecode:: js

        []

   :>json array permissions: list of actual object permissions after operation.
    |permission_json_fields|

.. http:put:: /api/v1/{object_kind}/{id}/owner/

   Change owner of object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :jsonparam number id: id of user.

   .. sourcecode:: http

      PUT /api/v1/hosts/123/owner/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

        2

   Results:

   .. sourcecode:: js

        Owner changed

.. http:get:: /api/v1/{object_kind}/{id}/owner/

   Get owner of object.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.

   Results:

   .. sourcecode:: js

        2

   :>json number id: id of owner.

.. |perm_kind_def| replace:: Kind of objects to perform operation. It can be
   any present objects type in system: ``hosts``, ``groups``,
   ``inventories``, ``projects``, ``templates``.

License (Polemarch+ only)
-------------------------

.. http:get:: /api/v1/license/

   Get details about your license.

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
   :>json number users: number of users available with this license. If `null`
     - unlimited.
   :>json string organization: to whom this license is provided.
   :>json string contacts: contatc information of license owner.
   :>json number hosts: number of hosts available with this license. If `null`
     - unlimited.
   :>json number actual_hosts: how many hosts (RANGE calculates appropriately)
     currently in system.
   :>json number actual_users: how many users currently in system.