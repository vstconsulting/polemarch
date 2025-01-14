Configuration manual
====================

Introduction
------------

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch deeply by tweaking ``/etc/polemarch/settings.ini``.

This manual does not have purpose to describe all possible configuration
options in details because ``settings.ini`` has commentary for every option
which makes clear its purpose and possible values. But here is a brief overview
of the most important settings to make clear for you big picture: what you can
actually customize in Polemarch.

We advice you to read :ref:`cluster` if you want to setup cluster of
Polemarch nodes to maintain reliability or speedup things. It will give you
understanding of services, which are included into Polemarch and how to distribute them
between the nodes to reach your goal.

Project architecture
--------------------

Polemarch was created to adapt to any work environment. Almost every service can be easily replaced by another
without losing any functionality. The application architecture consists of the following elements:

- **Database** supports all types and versions that django can. The code was written to be vendor agnostic
  to support as many backends as possible. Database contains information about projects settings, schedule and templates
  of tasks, execution history, authorisation data, etc. Database performance is a key performance limitation of the entire Polemarch.

- **Cache** services is used for store session data, services locks, etc. Also, PM support all of Django can.
  Mostly, we recommend to use Redis in small and medium clusters.

- **MQ** or rpc engine is required for notifying celery worker about new task execution request.
  Redis in most cases can process up to 1000 executions/min. For more complex and high-load implementations,
  it is recommended to use a distributed RabbitMQ cluster. If technically possible,
  AWS SQS and its compatible counterparts from other cloud providers are also supported.

- **Centrifugo** (optional) is used for active user interaction. At this point,
  the service notifies the user of an update or change to the data structure that the user is viewing to complete
  a data update request. This reduces the load on the database, because without this service,
  the interface makes periodic requests on a timer.

- **Project storage** at now is directory in filesystem where PM clone or unarchive project files for further executions.
  Storage must be readable for web-server and writeable for celery worker. It can be mounted dir from shared storage.

Understanding what services the Polemarch application consists of, you can build any architecture of services
suitable for the circumstances and infrastructure.

.. _cluster:

Polemarch clustering overview
-----------------------------

Polemarch actually consists of two services: web-server and worker. Polemarch
uses worker for long-running tasks (such as ``ansible-playbook`` runs, repo
synchronizations and so on). Those services are designed as systemd services
you can control using regular distro-tools for service manipulation.
You can run more than one server with those services. In default configuration
those services uses local file system to keep data and exchange with each
other, but for multiple nodes they must be configured to use shared
client-server database, cache server and network filesystem (for multiple
workers). All those settings are described in appropriate sections of this
documentation. It is up to you to make sure that configuration identical on
every node to prevent discordant behaviour of nodes. If you have multiple
web-servers, don't forget to setup HAProxy or something similar for balancing
load between them.

Lets assume, that you want to create 2 servers with web-part of Polemarch
to maintain reliability of your admin-panel and 4 servers with workers to
prevent denial for service because of overloading. Then briefly (it is mostly
example than general howto) you must do such steps:

#. Install Polemarch from PyPI at every server with worker and web-server by
   :doc:`installation instructions </quickstart>`. We recommend to install virtual
   environment in ``/opt/polemarch`` and set as owner user ``polemarch``
   (need to be created).

#. Setup some network filesystem (NFS, Samba, GlusterFS, Ceph).
   NFS, for example. Mount it in the same directory
   of all worker-intended nodes. Write this directory in :ref:`main`.
   Example:

   .. sourcecode:: ini

      [main]
      projects_dir = /mnt/mystorage/projects
      hooks_dir = /mnt/mystorage/hooks

#. Setup some http-balancer. HAProxy, for example. Point it to web-intended
   nodes.

    .. hint:: You can setup ssl for Polemarch endpoints in this step.

#. Create polemarch systemd service:

   #. Firstly, create a file ``/etc/systemd/system/polemarch.service``:

       .. sourcecode:: ini

           [Unit]
           Description=Polemarch Service HTTP Server
           After=network.target remote-fs.target nss-lookup.target redis.service mysql.service

           [Service]
           Type=simple
           ExecStart=/opt/polemarch/bin/polemarchctl web
           ExecReload=/bin/kill -HUP $MAINPID
           ExecStop=/bin/kill -SIGTERM $MAINPID
           WorkingDirectory=/opt/polemarch
           User=polemarch
           Group=polemarch
           KillSignal=SIGTERM
           Restart=always
           RestartSec=5

           # Uncomment this if used privileged ports
           # Capabilities=CAP_NET_BIND_SERVICE+ep
           # AmbientCapabilities=CAP_NET_BIND_SERVICE

           [Install]
           WantedBy=multi-user.target

       .. note::
            Notice, that user and group 'polemarch' should exist in your system.
            If they don't exist, create them.

   #. Reload systemctl daemon:

       .. sourcecode:: bash

           systemctl daemon-reload

   #. Add polemarch.service to autoload:

       .. sourcecode:: bash

           systemctl enable polemarch.service


   #. Start polemarch.service:

       .. sourcecode:: bash

           systemctl start polemarch.service

   #. Repeat all steps in other nodes and connect them to one DB, cache, MQ and storage.

        .. note::
            You don't need migrate database on each node. This need only once when
            you install/update first node in cluster.

        .. warning::
            Don't forget to stop all Polemarch services when update polemarch package.

That's it.

.. _main:

Main settings
-------------

Section ``[main]``.

This section is for settings related to whole Polemarch (both worker and
web). Here you can specify verbosity level of Polemarch during work, which can
be useful for troubleshoot problems (logging level etc). Also there are settings
for changing of timezone for whole app and directory where Polemarch will store
ansible projects cloned from repositories.

If you want to use LDAP protocol, you should create next settings in section ``[main]``.

.. sourcecode:: bash

    ldap-server = ldap://server-ip-or-host:port
    ldap-default-domain = domain.name
    ldap-auth_format = cn=<username>,ou=your-group-name,<domain>

ldap-default-domain is an optional argument, that is aimed to make user authorization easier
(without input of domain name).

ldap-auth_format is an optional argument, that is aimed to customize LDAP authorization request.
Default value: cn=<username>,<domain>

So in this case authorization logic will be the following:

1. System checks combination of login:password in database;

2. System checks combination of login:password in LDAP:

   * if domain was mentioned, it will be set during authorization
     (if user enter login without ``user@domain.name`` or without ``DOMAIN\user`` );

   * if authorization was successful and there is user with mentioned login in database,
     server creates session for him.


* **debug** - Enable debug mode. ``Default: false``.
* **allowed_hosts** - Comma separated list of domains, which allowed to serve. ``Default: *``.
* **ldap-server** - LDAP server connection.
* **ldap-default-domain** - Default domain for auth.
* **timezone** - Timezone of web-application. ``Default: UTC``.
* **log_level** - Logging level. ``Default: WARNING``.
* **projects_dir** - Path to the directory where projects will be stored. During project
  synchronization, this directory will be used to save project files. Moreover, whenever a plugin
  is launched within a project, the contents of this directory will be copied for isolated
  execution. This directory must be in a shared file storage accessible to both the web server
  and worker nodes.
* **hooks_dir** - Path where hook scripts stored.
* **community_projects_url** - A URL pointing to a YAML file that contains a structured set of
  links for project templates. ``Default: https://gitlab.com/vstconsulting/polemarch-community-repos/raw/master/projects.yaml``.
* **community_projects_fetching_timeout** - Maximum server response time for fetching the list
  of project templates.
* **executor_path** - Path to the ``polemarch-ansible`` binary. You can implement your own script
  that introduces the necessary adjustments for your environment, for example, launching in a
  chroot environment, using some predefined parameters, or running inside a separate virtual
  environment. It is important that it correctly implements all the existing `pm_ansible`
  commands.
* **enable_django_logs** - Enable or disable Django logger to output. Useful for debugging. ``Default: false``.
* **enable_user_self_remove** - Enable or disable user self-removing. ``Default: false``.
* **auth-cache-user** - Enable or disable user instance caching. It increases session performance
  on each request but saves model instance in unsafe storage (default django cache).
  The instance is serialized to a string using the :mod:`standard python module pickle <pickle>`
  and then encrypted with :wiki:`Vigenère cipher <Vigenère cipher>`.
  Read more in the :class:`vstutils.utils.SecurePickling` documentation. ``Default: false``.

.. _database:

Database settings
-----------------

Section ``[database]``.

Here you can change settings related to database system, which Polemarch will
use. Polemarch supports all databases supported by ``django``. List of
supported out of the box: SQLite (default choice), MySQL, Oracle, or
PostgreSQL. Configuration details you can look at
:django_docs:`Django database documentation <settings/#databases>`.
If you run Polemarch at multiple nodes (clusterization), you should
use some of client-server database (SQLite not suitable) shared for all nodes.

If you use MySQL there is a list of required settings, that you should create for correct
database work.

Firstly, if you use MariaDB and you have set timezone different from "UTC" you should run
next command:

.. sourcecode:: bash

      mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql

Secondly, for correct MariaDB work you should set next options in ``settings.ini`` file:

.. sourcecode:: bash

      [database.options]
      connect_timeout = 10
      init_command = SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, NAMES 'utf8', CHARACTER SET 'utf8', SESSION collation_connection = 'utf8_unicode_ci'

Finally, you should add some options to MariaDB configuration:

.. sourcecode:: bash

      [client]
      default-character-set=utf8
      init_command = SET collation_connection = @@collation_database

      [mysqld]
      character-set-server=utf8
      collation-server=utf8_unicode_ci

.. note:: You can find more database options in :ref:`vstutils:database`.


To simplify the configuration of database connections, you can use the ``DATABASE_URL`` environment variable in conjunction with the ``django-environ`` package.
This approach allows you to define your database connection in a single environment variable,
which is especially useful for managing different environments (development, testing, production) without changing the code.

**DATABASE_URL** - An environment variable that contains the database connection URL.
This variable is parsed by ``django-environ`` to configure the database settings. The format of the URL is:

.. sourcecode:: bash

    backend://user:password@host:port/database_name


**Examples:**

- **PostgreSQL:**

    .. sourcecode:: bash

        DATABASE_URL=postgres://user:password@localhost:5432/mydatabase


- **MySQL:**

    .. sourcecode:: bash

        DATABASE_URL=mysql://user:password@localhost:3306/mydatabase


.. _cache:

Cache settings
--------------

Section ``[cache]``.

This section is for settings related to cache backend used by Polemarch.
Polemarch supports all cache backends that Django supports.
Currently is: filesystem, in-memory, memcached out of the box and many more by
additional plugins. You can find details about cache configuration at
:django_docs:`Django caches documentation <settings/#caches>`.
In clusterization scenario we advice to share cache between nodes to speedup their
work using client-server cache realizations.
We recommend to use Redis in production environments.

To simplify the configuration of cache backends, you can use the ``CACHE_URL`` environment variable in conjunction with the ``django-environ`` package.
This approach allows you to define your cache configuration in a single environment variable,
making it easy to switch between different cache backends without changing the code.

**CACHE_URL** - An environment variable that contains the cache backend connection URL.
This variable is parsed by django-environ to configure the cache settings in Django.
The format of the URL is:

.. sourcecode:: bash

    backend://username:password@host:port


**Examples:**

- Memcached using MemcacheCache backend

    .. sourcecode:: bash

        CACHE_URL=memcache://127.0.0.1:11211

- Memcached using PyLibMCCache backend

    .. sourcecode:: bash

        CACHE_URL=pymemcache://127.0.0.1:11211

- Redis cache

    .. sourcecode:: bash

        CACHE_URL=redis://127.0.0.1:6379/1

**LOCKS_CACHE_URL**, **SESSIONS_CACHE_URL**, **ETAG_CACHE_URL** - Environment variables for configuring specific cache backends for locks, session data, and ETag caching respectively.
These allow you to use different cache configurations for different purposes within your application.



.. _locks:

Locks settings
--------------

Section ``[locks]``.

Locks is system that Polemarch uses to prevent damage from parallel actions
working on something simultaneously. It is based on Django cache, so there is
another bunch of same settings as :ref:`cache`. And why there is another
section for them, you may ask. Because cache backend used for locking must
provide some guarantees, which does not required to usual cache: it MUST
be shared for all Polemarch threads and nodes. So, in-memory backend, for
example, is not suitable. In case of clusterization we strongly recommend
to use Redis or Memcached as backend for that purpose. Cache and locks backend
can be same, but don't forget about requirement we said above.


.. _session:

Session cache settings
----------------------

Section ``[session]``.

Polemarch store sessions in :ref:`database`, but for better performance,
we use a cache-based session backend. It is based on Django cache, so there is
another bunch of same settings as :ref:`cache`. By default,
settings getted from :ref:`cache`.


.. _rpc:

Rpc settings
------------

Section ``[rpc]``.

Polemarch uses Celery for long-running tasks (such as ``ansible-playbook``
runs, repo synchronizations and so on). Celery is based on message queue concept,
so between web-service and workers running under Celery bust be some kind of
message broker (RabbitMQ or something).  Those settings relate to this broker
and Celery itself. Those kinds of settings: broker backend, number of
worker-processes per node and some settings used for troubleshoot
server-broker-worker interaction problems.


* **connection** - Celery broker connection.
  Read more: :ref:`celery:conf-broker-settings`. ``Default: filesystem:///var/tmp``.
* **concurrency** - Celery count worker threads. ``Default: 4``.
* **heartbeat** - Interval between sending heartbeat packages, which says that connection still alive. ``Default: 10``.
* **enable_worker** - Enable or disable worker with webserver. ``Default: true``.
* **clone_retry_count** - Retries count on project sync operation.

.. note:: You can find more RPC options in :ref:`vstutils:rpc`.


.. _worker:

Worker settings
---------------

Section ``[worker]``.

Celery worker options for start. Useful settings:

* **loglevel** - Celery worker logging level. Default: from main section ``log_level``.
* **autoscale** - Options for autoscaling. Two comma separated numbers: max,min.
* **beat** - Enable or disable celery beat scheduler. ``Default: true``.

Other settings can be getted from command ``celery worker --help``.


.. _web:

Web settings
------------

Section ``[web]``.

Here placed settings related to web-server.

* **session_timeout** - Session life-cycle time. ``Default: 2w`` (two weeks).
* **rest_page_limit** - Default limit of objects in API list. ``Default: 1000``.
* **history_metrics_window** - Timeframe in seconds of collecting execution history statuses. ``Default: 1min``.
* **enable_gravatar** - Enable/disable gravatar service using for users. Default: ``True``.
* **gravatar_url** - URL for Gravatar service. Placeholder `[email_hash]` can be used.

* **allow_cors** - Enable Cross-Origin Resource Sharing (CORS).
  When set to ``true``, the application will accept requests from origins other than its own domain, which is necessary when the API is accessed from different domains.
  This setting corresponds to enabling ``CORSMiddleware`` in FastAPI. Default: ``false``.
* **cors_allowed_origins** - A list of origins that are allowed to make cross-origin requests.
  This corresponds to the ``allow_origins`` parameter in ``fastapi.middleware.cors.CORSMiddleware``.
  Each origin should be a string representing a domain, e.g., ``https://example.com``.
  Wildcards like ``*`` are accepted to allow all origins. Default: ``*`` if ``allow_cors`` is set or empty list set.
* **cors_allow_methods** - A list of HTTP methods that are allowed when making cross-origin requests.
  This corresponds to the ``allow_methods`` parameter in ``CORSMiddleware``.
  By specifying this, you control which HTTP methods are permitted for CORS requests to your application.
  Common methods include ``GET``, ``POST``, ``PUT``, ``PATCH``, ``DELETE``, and ``OPTIONS``.
  Default: ``GET`` if ``allow_cors`` is not set. Else - ``GET``.
* **cors_allow_headers** - A list of HTTP headers that are allowed when making cross-origin requests.
  This corresponds to the ``allow_headers`` parameter in ``CORSMiddleware``.
  Use this setting to specify which HTTP headers are allowed in CORS requests.
  Common headers include ``Content-Type``, ``Authorization``, etc.
  Default: ``*`` if ``allow_cors`` is set or empty list set.
* **cors_allowed_credentials** - Indicate that cookies and authorization headers should be supported for cross-origin requests.
  Default: ``true`` if allow_cors else ``false``.

* **case_sensitive_api_filter** - Enable or disable case-sensitive search for name filtering in the API.
  When set to ``true``, filters applied to fields such as ``name`` will be case-sensitive,
  meaning that the search will distinguish between uppercase and lowercase letters.
  When set to ``false``, the search will be case-insensitive.
  Adjust this setting based on whether you want users to have case-sensitive searches.
  Default: ``true``.
* **secure_proxy_ssl_header_name** - Header name which activates SSL urls in responses.
  Read :django_docs:`more <settings/#secure-proxy-ssl-header>`. Default: ``HTTP_X_FORWARDED_PROTOCOL``.
* **secure_proxy_ssl_header_value** - Header value which activates SSL urls in responses.
  Read :django_docs:`more <settings/#secure-proxy-ssl-header>`. Default: ``https``.

* **max_custom_oauth2_token_lifetime_days** - The maximum possible duration of user tokens in days.
  This limitation is not related to ``server_token_expires_in``. It specifies the maximum lifespan of user tokens specifically.
  By default, it is set to 365 days.

.. note:: You can find more Web options in :ref:`vstutils:web`.


Section ``[oauth]``.

* **server_allow_insecure**: If enabled then server will allow HTTP requests. Default: ``False``.
* **server_token_expires_in**: Token expiration time in seconds. Duration values can be used, for example ``3d2h32m``. Default: ``864000``.


.. _centrifugo:

Centrifugo client settings
--------------------------

Section ``[centrifugo]``.

To install app with centrifugo client, ``[centrifugo]`` section must be set.
Centrifugo is used by application to auto-update page data.
When user change some data, other clients get notification on ``subscriptions_update`` channel
with model label and primary key. Without the service all GUI-clients get page data
every 5 seconds (by default). Centrifugo server v3 is supported.

* **address** - Centrifugo api address. For example, ``http://localhost:8000/api``.
* **public_address** - Centrifugo server address. By default used **address** without ``/api`` prefix (http -> ws, https -> wss). Also, can be used relative path, like ``/centrifugo``.
* **api_key** - API key for clients.
* **token_hmac_secret_key** - API key for jwt-token generation.
* **timeout** - Connection timeout.
* **verify** - Connection verification.

.. note::
    These settings also add parameters to the OpenApi schema and change how the auto-update system works in the GUI.
    ``token_hmac_secret_key`` is used for jwt-token generation (based on
    session expiration time). Token will be used for Centrifugo-JS client.

.. note::
    ``api_key`` and ``token_hmac_secret_key`` come from ``config.json`` for Centrifugo.
    Read more in `Official Centrifugo documentation <https://centrifugal.dev/docs/3/getting-started/quickstart>`_


.. _git:

Git settings
------------

Sections ``[git.fetch]`` and ``[git.clone]``.

Options for git commands. See options in ``git fetch --help`` or ``git clone --help``.


.. _archive:

Archive settings
----------------

Section ``[archive]``.

Here you can specify settings used by archive (e.g. TAR) projects.

* **max_content_length** - Maximum download file size. Format: ``30<unit>``, where unit is *b*, *kb*, *mb*, *gb*, *tb*.


.. _history:

History output plugins
----------------------

Section ``[history]``

This section of the configuration provides to configure the output history plugin settings.

* **output_plugins** - a comma-separated list of plugin names that are used to record history lines. Plugins must have the ``writeable`` attribute. Default: ``database``
* **read_plugin** - the name of the plugin used to display the history lines in the api. Default is ``database``.

Other parameters are set in the plugin options section: ``history.plugin.PLUGIN_NAME.options``.

.. warning::
    Be careful. The reader plugin must be able to read the data.
    Therefore, the storage from which the reading plugin takes data must be filled with one of the writer plugins.

Production web settings
-----------------------

.. note:: More settings in `uvicorn docs <https://www.uvicorn.org/settings/#production>`_.

.. warning:: In production, it is recommended to use Centrifugo in order to reduce the load on the backend from automatic page updates.

This section contains additional information for configure additional elements.

#. If you need to set ``https`` for your web settings, you can do it using HAProxy, Nginx or configure it in
``settings.ini``.

    .. sourcecode:: ini

        # [uvicorn]
        # ssl_keyfile = /etc/polemarch/polemarch.key
        # ssl_certfile = /etc/polemarch/polemarch.crt

#. We strictly do not recommend running the web server from root. Use HTTP proxy to run on privileged ports.

#. We recommend to install ``uvloop`` to your environment and setup ``loop = uvloop`` in ``[uvicorn]`` section for performance reasons.

In the context of vstutils, the adoption of ``uvloop`` is paramount for optimizing the performance of the application, especially because utilizing ``uvicorn`` as the ASGI server.
``uvloop`` is an ultra-fast, drop-in replacement for the default event loop provided by Python.
It is built on top of ``libuv``, a high-performance event loop library, and is specifically designed to optimize the execution speed of asynchronous code.

By leveraging ``uvloop``, developers can achieve substantial performance improvements in terms of reduced latency and increased throughput.
This is especially critical in scenarios where applications handle a large number of concurrent connections.
The improved efficiency of event loop handling directly translates to faster response times and better overall responsiveness of the application.

.. note:: If you need more options you can find it in :doc:`vstutils:config` in the official vstutils documentation.


.. _inventory_plugins_config:

Inventory plugins config
------------------------

To connect an inventory plugin to Polemarch, there should be a section

.. sourcecode:: ini

    [inventory.plugin.<plugin_name>]
    backend = import.path.to.plugin.Class

Where

* **<plugin_name>** - name that will be available in API to work with
* **backend** - is a python import path to plugin class

Also you may add options which will be available in plugin:

.. sourcecode:: ini

    [inventory.plugin.<plugin_name>.options]
    some_option = some_option

To read more about plugins, please see :doc:`plugins`.


.. _execution_plugins_config:

Execution plugins config
------------------------

To connect an execution plugin to Polemarch, there should be a section

.. sourcecode:: ini

    [execution.plugin.<plugin_name>]
    backend = import.path.to.plugin.Class
    compatible_inventory_plugins = <inventory_plugin1>,<inventory_plugin1>

Where

* **<plugin_name>** - name that will be available in API to work with
* **backend** - is a python import path to plugin class
* **compatible_inventory_plugins** - inventory plugins which are compatible with this execution plugin. If omitted,
                                   it's supposed that execution plugin cannot work with any inventory.

Also you may add options which will be available in plugin:

.. sourcecode:: ini

    [execution.plugin.<plugin_name>.options]
    some_option = some_option

To read more about plugins, please see :doc:`plugins`.
