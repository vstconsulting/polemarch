
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
           "next":"http://localhost:8080/api/v1/hosts/?format=json&limit=5&offset=10",
           "previous":"http://localhost:8080/api/v1/hosts/?format=json&limit=5",
           "results":[
              // list of objects goes here
           ]
        }

   :>json number count: how many objects exists at all.
   :>json string next: link to next page with objects (``null`` if we at last).
   :>json string previous: link to previous page with objects (``null`` if we at first).
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

   Remove access to object for users, who listed in json array in body of request.

   :arg object_kind: |perm_kind_def|
   :arg id: Id of object.
   :reqjsonarr Ids: Ids of users to remove access for them.

   Example request:

   .. sourcecode:: http

      DELETE /api/v1/hosts/123/permissions/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      [12, 13]

Also there is two types of users: regular and superuser. Regular users have access
only to objects, where they listed in permissions. Superusers have access to all
objects in system. See :ref:`users` for detailed information about user management api.

.. |perm_kind_def| replace:: Kind of objects to perform operation. It can be any present objects type in system: ``hosts``, ``groups``, ``inventories``, ``projects``, ``periodic-tasks``.

.. _hosts:

Hosts
-----

.. http:get:: /api/v1/hosts/{id}

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

.. |host_type_def| replace:: it is ``RANGE`` if name is range of IPs or hosts, otherwise is ``HOST``.
.. |host_name_def| replace:: either human-readable name or hostname/IP or range of them (it is depends at context of using this host during playbooks run).
.. |hosts_details_ref| replace:: **Response JSON Object:** response json fields same as in :http:get:`/api/v1/hosts/{id}`.

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

.. http:delete:: /api/v1/hosts/{id}

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

.. http:patch:: /api/v1/hosts/{id}

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

Groups
------

.. http:get:: /api/v1/groups/{id}

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
   :>json string name: name of group
   :>json array hosts: |group_hosts_def|
   :>json array groups: |group_groups_def|
   :>json object vars: |obj_vars_def|
   :>json boolean children: |group_children_def|
   :>json string url: url to this specific group.

.. |group_hosts_def| replace:: list of hosts in group if ``children`` is ``false``, otherwise empty. See :ref:`hosts` for fields explanation.
.. |group_groups_def| replace:: list of subgroups in group if ``children`` is ``true``, otherwise empty.
.. |group_children_def| replace:: either this group of subgroups or group of hosts.
.. |group_details_ref| replace:: **Response JSON Object:** response json fields same as in :http:get:`/api/v1/groups/{id}`.

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

.. http:delete:: /api/v1/groups/{id}

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

.. http:patch:: /api/v1/groups/{id}

   Update group. |patch_reminder|

   :arg id: id of group.

   **Request JSON Object:**
   request json fields same as in :http:post:`/api/v1/groups/`

   Example request:

   .. sourcecode:: http

      PATCH /api/v1/groups/ HTTP/1.1
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

   Add hosts to group.

   :arg group_id: id of group
   :reqjsonarr Ids: Ids of hosts to add at this group.

   Example request:

   .. sourcecode:: http

      POST /api/v1/groups/1/hosts/ HTTP/1.1
      Host: example.com
      Accept: application/json, text/javascript

      [2, 3]

   Results:

   .. sourcecode:: js

      {
         "not_found":0,
         "operated":2,
         "total":2
      }

   :>json number not_found: count of processed with error (not exists or no access).
   :>json number operated: count of processed successfully.
   :>json number total: count of all sent ids.

   :statuscode 409: attempt work with hosts list of children group (``children=true``)

.. |sublist_result_ref| replace:: **Response JSON Object:** response json fields same as in :http:post:`/api/v1/groups/{group_id}/hosts/`.
.. |codes_groups_hosts| replace:: **Status Codes:** status codes same as in :http:post:`/api/v1/groups/{group_id}/hosts/`.

.. http:put:: /api/v1/groups/{group_id}/hosts/

   Remove all hosts and then add those to group.

   :arg group_id: id of group
   :reqjsonarr Ids: Ids of hosts to add at this group.

   |sublist_result_ref|

   |codes_groups_hosts|

.. http:delete:: /api/v1/groups/{group_id}/hosts/

   Remove those hosts from group.

   :arg group_id: id of group
   :reqjsonarr Ids: Ids of hosts to remove from group.

   |sublist_result_ref|

   |codes_groups_hosts|

.. http:post:: /api/v1/groups/{group_id}/groups/

   Add subgroups to group.

   :arg group_id: id of group
   :reqjsonarr Ids: Ids of subgroups to add at this group.

   |sublist_result_ref|

   :statuscode 409: attempt work with group list of not children group (``children=false``)

.. |codes_groups_groups| replace:: **Status Codes:** status codes same as in :http:post:`/api/v1/groups/{group_id}/groups/`.

.. http:put:: /api/v1/groups/{group_id}/groups/

   Remove all subgroups and add those to group.

   :arg group_id: id of group
   :reqjsonarr Ids: Ids of subgroups to add at this group.

   |sublist_result_ref|

   |codes_groups_groups|

.. http:delete:: /api/v1/groups/{group_id}/groups/

   Remove those subgroups from group.

   :arg group_id: id of group
   :reqjsonarr Ids: Ids of subgroups to remove from group.

   |sublist_result_ref|

   |codes_groups_groups|

.. _variables:

Variables
---------

.. |obj_vars_def| replace:: dictionary of variables associated with this object. See :ref:`variables` for details.

TODO: write it

.. _users:

Users
-----

TODO: write it

.. |patch_reminder| replace:: All parameters except id are optional, so you can specify
   only needed to update. Only name for example.