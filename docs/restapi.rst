
Rest API
========

Polemarch provides REST API for all its functionality accessible via web GUI,
because our GUI also uses this API to work. Below comes information about every
entity we have in Polemarch and methods applicable to it.

All methods urls stated with ``/api/v1/`` for first api version.
With other versions number will be changed. Current documentation wrote for
version 1. All methods here placed with this prefix to simplify copy & pasting.

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
   :reqjsonarr Ids: Ids of users to grant access for them.

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

Pagination
----------

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

Hosts
-----

.. http:get:: /api/v1/hosts/

   List of hosts.

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

   :>json number id: id of host.
   :>json string name: |host_name_def|
   :>json string type: |host_type_def|
   :>json string url: url to this specific host.

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
   :>json object vars: |host_vars_def|

.. http:delete:: /api/v1/hosts/{id}

   Delete host.

   :arg id: id of host.

.. http:post:: /api/v1/hosts/

   Create host.

   :<json string name: |host_name_def|
   :<json string type: |host_type_def|
   :<json object vars: |host_vars_def|

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

   :>json number id: id of host.
   :>json string name: |host_name_def|
   :>json string type: |host_type_def|
   :>json string url: url to this specific host.
   :>json object vars: |host_vars_def|

.. http:patch:: /api/v1/hosts/{id}

   Update host. All parameters except id are optional, so you can specify
   only needed to update. Only name for example.

   :arg id: id of host.
   :<json string name: |host_name_def|
   :<json string type: |host_type_def|
   :<json object vars: |host_vars_def|

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

   :>json number id: id of host.
   :>json string name: |host_name_def|
   :>json string type: |host_type_def|
   :>json string url: url to this specific host.
   :>json object vars: |host_vars_def|

.. |host_type_def| replace:: it is ``RANGE`` if name is range of IPs or hosts, otherwise is ``HOST``.
.. |host_name_def| replace:: either human-readable name or hostname/IP or range of them (it is depends at context of using this host during playbooks run).
.. |host_vars_def| replace:: dictionary of variables associated with this host. See :ref:`variables` for details.

.. _variables:

Variables
---------

TODO: write it

.. _users:

Users
-----

TODO: write it