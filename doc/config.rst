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
           Type=forking
           ExecStart=/opt/polemarch/bin/polemarchctl webserver
           ExecReload=/opt/polemarch/bin/polemarchctl webserver reload=/opt/polemarch/pid/web.pid
           ExecStop=/opt/polemarch/bin/polemarchctl webserver stop=/opt/polemarch/pid/web.pid
           PIDFile=/opt/polemarch/pid/web.pid
           User=polemarch
           Group=polemarch
           KillSignal=SIGCONT
           Restart=always

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

ldap-auth_format is an optional argument, that is aimed to customize LDAP authorization.
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
* **projects_dir** - Path where projects will be stored.
* **hooks_dir** - Path where hook scripts stored.
* **executor_path** - Path for polemarch-ansible wrapper binary.
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
* **pidfile** - Celery worker pidfile. ``Default: /run/polemarch_worker.pid``
* **autoscale** - Options for autoscaling. Two comma separated numbers: max,min.
* **beat** - Enable or disable celery beat scheduler. ``Default: true``.

Other settings can be getted from command ``celery worker --help``.


.. _web:

Web settings
------------

Section ``[web]``.

Here placed settings related to web-server. Those settings like:
session_timeout, static_files_url or pagination limit.

* **session_timeout** - Session life-cycle time. ``Default: 2w`` (two weeks).
* **rest_page_limit** - Default limit of objects in API list. ``Default: 1000``.
* **public_openapi** - Allow to have access to OpenAPI schema from public. ``Default: false``.
* **history_metrics_window** - Timeframe in seconds of collecting execution history statuses. ``Default: 1min``.

.. note:: You can find more Web options in :ref:`vstutils:web`.


.. _centrifugo:

Centrifugo client settings
--------------------------

Section ``[centrifugo]``.

To install app with centrifugo client, ``[centrifugo]`` section must be set.
Centrifugo is used by application to auto-update page data.
When user change some data, other clients get notification on ``subscriptions_update`` channel
with model label and primary key. Without the service all GUI-clients get page data
every 5 seconds (by default). Centrifugo server v3 is supported.

* **address** - Centrifugo server address.
* **api_key** - API key for clients.
* **token_hmac_secret_key** - API key for jwt-token generation.
* **timeout** - Connection timeout.
* **verify** - Connection verification.

.. note::
    These settings also add parameters to the OpenApi schema and change how the auto-update system works in the GUI.
    ``token_hmac_secret_key`` is used for jwt-token generation (based on
    session expiration time). Token will be used for Centrifugo-JS client.


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

Section ``[uwsgi]``.

Here placed settings related to web-server used by Polemarch in production
(for deb and rpm packages by default). Most of them related to system paths
(logging, PID-file and so on).

.. note:: More settings in :doc:`uwsgi:Configuration` (deprecated) and `uvicorn docs <https://www.uvicorn.org/settings/#production>`_.

.. warning:: In production, it is recommended to use Centrifugo in order to reduce the load on the backend from automatic page updates.


Configuration options
-----------------------------

This section contains additional information for configure additional elements.

#. If you need to set ``https`` for your web settings, you can do it using HAProxy, Nginx or configure it in
``settings.ini``.

    .. sourcecode:: ini

        # [uvicorn]
        # ssl_keyfile = /etc/polemarch/polemarch.key
        # ssl_certfile = /etc/polemarch/polemarch.crt

#. We strictly do not recommend running the web server from root. Use HTTP proxy to run on privileged ports.

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
