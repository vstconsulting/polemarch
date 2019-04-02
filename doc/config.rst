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

   #. Firtsly, create a file ``/etc/systemd/system/polemarch.service``:

       .. sourcecode:: ini

           [Unit]
           Description=Polemarch Service HTTP Server
           After=network.target remote-fs.target nss-lookup.target redis.service

           [Service]
           Type=forking
           ExecStart=/opt/polemarch/bin/polemarchctl webserver
           ExecReload=/opt/polemarch/bin/polemarchctl webserver reload=/opt/polemarch/run/polemarch/web.pid
           ExecStop=/opt/polemarch/bin/polemarchctl webserver stop=/opt/polemarch/run/polemarch/web.pid
           PIDFile=/opt/polemarch/run/polemarch/web.pid
           User=polemarch
           Group=polemarch
           KillSignal=SIGCONT
           Restart=always

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


* **debug** - Enable debug mode. Default: false.
* **allowed_hosts** - Comma separated list of domains, which allowed to serve. Default: ``*``.
* **ldap-server** - LDAP server connection.
* **ldap-default-domain** - Default domain for auth.
* **timezone** - Timezone of web-application. Default: UTC.
* **log_level** - Logging level. Default: WARNING.
* **enable_admin_panel** - Enable or disable Django Admin panel. Defaul: false.
* **projects_dir** - Path where projects will be stored.
* **hooks_dir** - Path where hook scripts stored.
* **executor_path** - Path for polemarch-ansible wrapper binary.


.. _database:

Database settings
-----------------

Section ``[database]``.

Here you can change settings related to database system, which Polemarch will
use. Polemarch supports all databases supported by ``django``. List of
supported out of the box: SQLite (default choice), MySQL, Oracle, or
PostgreSQL. Configuration details you can look at
`Django database documentation
<https://docs.djangoproject.com/en/1.11/ref/settings/#databases>`_.
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


.. _cache:

Cache settings
--------------

Section ``[cache]``.

This section is for settings related to cache backend used by Polemarch.
Polemarch supports all cache backends that Django supports.
Currently is: filesystem, in-memory, memcached out of the box and many more by
additional plugins. You can find details about cache configuration at
`Django caches documentation
<https://docs.djangoproject.com/en/1.11/ref/settings/#caches>`_. In
clusterization scenario we advice to share cache between nodes to speedup their
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


* **connection** - Celery broker connection. Read more: http://docs.celeryproject.org/en/latest/userguide/configuration.html#conf-broker-settings Default: ``filesystem:///var/tmp``.
* **concurrency** - Count of celery worker threads. Default: 4.
* **heartbeat** - Interval between sending heartbeat packages, which says that connection still alive. Default: 10.
* **enable_worker** - Enable or disable worker with webserver. Default: true.
* **clone_retry_count** - Count of retrys on project sync operation.


.. _worker:

Worker settings
---------------

Section ``[worker]``.

Celery worker options for start. Useful settings:

* **loglevel** - Celery worker logging level. Default: from main section ``log_level``.
* **pidfile** - Celery worker pidfile. Default: ``/run/polemarch_worker.pid``
* **autoscale** - Options for autoscaling. Two comma separated numbers: max,min.
* **beat** - Enable or disable celery beat scheduler. Default: true.

Other settings can be getted from command ``celery worker --help``.


.. _web:

Web settings
------------

Section ``[web]``.

Here placed settings related to web-server. Those settings like:
session_timeout, static_files_url or pagination limit.

* **session_timeout** - Session life-cycle time. Default: 2w (two weeks).
* **rest_page_limit** - Default limit of objects in API list. Default: 1000.
* **public_openapi** - Allow to have access to OpenAPI schema from public. Default: ``false``.


.. _git:

Git settings
------------

Sections ``[git.fetch]`` and ``[git.clone]``.

Options for git commands. See options in ``git fetch --help`` or ``git clone --help``.


Production web settings
-----------------------

Section ``[uwsgi]``.

Here placed settings related to web-server used by Polemarch in production
(for deb and rpm packages by default). Most of them related to system paths
(logging, PID-file and so on).
More settings in `uWSGI docs
<http://uwsgi-docs.readthedocs.io/en/latest/Configuration.html>`_.

Configuration options
-----------------------------

This section contains additional information for configure additional elements.

#. If you need set ``https`` for your web settings, you can do it using HAProxy, Nginx or configure it in ``settings.ini``.

    .. sourcecode:: ini

        [uwsgi]
        https = 0.0.0.0:8443,foobar.crt,foobar.key
        addrport = 127.0.0.1:8080

#. We strictly do not recommend running the web server from root. Use HTTP proxy to run on privileged ports.



Installation of additional packages to Polemarch
------------------------------------------------

.. warning::
    .rpm or .dep installation methods are depracated.

If you want to install some additional package to Polemarch from .rpm or .dep,
you should run next command:

.. sourcecode:: bash

        sudo -U polemarch /opt/polemarch/bin/pip install package_name

For correct work all requirements for this package should be installed in your system.
Notice, that after package reinstallation or after package update you should
set all this requirements again.

If you want to install some additional package from github or gitlab,
you should just install this package to your system or to your virtual environment.
