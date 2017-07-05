Configuration manual
====================

Introduction
------------

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch deeply by tweaking ``/etc/polemarch/settings.ini``.

This manual does not have purpose to describe all possible configuration
options in details because ``settings.ini`` have commentary for every option
which makes clear its purpose and possible values. But here is brief overview
of most important settings to make clear for you big picture: what you can
actually customize in Polemarch.

We advice you to read :ref:`cluster` if you want to setup cluster of
Polemarch nodes to maintain reliability or speedup things. It will give you
understanding, which services Polemarch are includes an how to distribute them
between the nodes to reach your goal.

.. _cluster:

Polemarch clustering overview
-----------------------------

Polemarch actually consist of two services: web-server and worker. Polemarch
uses worker for long-running tasks (such as ``ansible-playbook`` runs, repo
synchronizations and so on). Those services are designed as systemd services
you can control using regular distro-tools for service manipulation.
You can run more than one server with those services. In default configuration
those services uses local file system to keep data and exchange with each
other, but for multiple nodes they must be configured to use shared
client-server database, cache server and network filesystem (for multiple
workers). All those settings described in appropriate sections of this
documentation. It is up to you to make sure that configuration identical on
every node to prevent discordant behaviour of nodes. If you have multiple
web-servers, don't forget to setup HAProxy or something similar for balancing
load between them.

Lets assume, that you want to create 2 servers with web-part of Polemarch
to maintain reliability of your admin-panel and 4 servers with workers to
prevent denial for service because of overloading. Then briefly (it is mostly
example than general howto) you must do such steps:

1. Install deb or rpm of Polemarch at every server with worker and web-server.

2. Setup DB-server. MySQL for example. For all nodes edit configuration section
   ``[database]`` and provide credential for you database.

3. Setup cache-server. Redis for example. Specify his credentials in
   ``[locks]`` and ``[cache]`` sections of configuration for all nodes.

4. Setup some network filesystem. NFS for example. Mount it in same directory
   to all worker-intended nodes. Write that directory in ``[worker]`` section.

5. Setup some http-balancer. HAProxy for example. Point it to web-intended
   nodes.

6. Run and enable ``polemarchweb`` service on web-intended nodes. Disable
   ``polemarchworker`` service.

7. Run and enable ``polemarchworker`` service on every worker-intended nodes.
   Disable ``polemarchweb`` service.

That's it.

Section ``[main]``
------------------

This section to store settings related to whole Polemarch (both worker and
web). Here you can specify verbosity level of Polemarch during work, which can
be useful for troubleshoot problems (logging level etc). Also there is settings
to change timezone for whole app and directory where Polemarch will store
ansible projects cloned from repositories.

Section ``[database]``
----------------------

Here you can change settings related to database system, which will Polemarch
use. Polemarch supports all databases supported by ``django``. List of
supported out of the box: SQLite (default choice), MySQL, Oracle, or
PostgreSQL. Configuration details you can look at
https://docs.djangoproject.com/en/1.10/ref/settings/#databases. If you run at
Polemarch software at multiple nodes (clusterization), you should use some of
client-server database (SQLite not suitable) shared for all nodes.

.. _cache:

Section ``[cache]``
-------------------

This section to store settings related to cache backend used by Polemarch.
Based on Django Polemarch supports all cache backends that is supports.
Currently is: filesystem, in-memory, memcached out of the box and many more by
additional plugins.You can find details about cache configuration at
https://docs.djangoproject.com/en/1.10/ref/settings/#caches. In clusterization
scenario we advice to share cache between nodes to speedup their work using
client-server cache realizations.

Section ``[locks]``
-------------------

Locks is system that Polemarch use to prevent damage from parallel actions
working on something simultaneously. It is based on Django cache, so there is
another bunch of same settings as :ref:`cache`. And why there is another
section for them, may you ask. Because cache backend used for locking must
provide some guarantees, which does not required to usual cache: it is MUST
be shared for all Polemarch threads and nodes. So, in-memory backend, for
example, is not suitable. In case of clusterization we are strongly recommend
to use Redis or Memcached as backend for that purpose. Cache and locks backend
can be same, but don't forget about requirement we said above.

Section ``[rpc]``
-----------------

Polemarch uses Celery for long-running tasks (such as ``ansible-playbook``
runs, repo synchronizations and so on). Celery is based on message queue concept,
so between web-service and workers running under Celery bust be some kind of
message broker (RabbitMQ or something).  Those settings relates to this broker
and Celery itself. Those kinds of settings: broker backend, number of
worker-processes per node and some settings used for troubleshoot
server-broker-worker interaction problems.

Section ``[web]``
-----------------

Here placed settings related to web-server. It is settings like: allowed hosts,
static files directory or pagination limit.

Section ``[worker]``
--------------------

Section for worker-related settings. Now here just one - directory to store
files, which must be accessible by all workers. It have meaning only if you
have cluster - more than one workers. In such case you must use some kind of
network filesystem to share data between workers. Like NFS, Samba or something.