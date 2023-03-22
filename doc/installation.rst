Installation
============================

Install from PyPI
-----------------


#. Install dependencies:

   Required packages on Ubuntu 18.04:

   .. sourcecode:: bash

      sudo apt-get install python3-virtualenv python3.8 python3.8-dev gcc libffi-dev libkrb5-dev libffi6 libssl-dev libyaml-dev libsasl2-dev libldap2-dev default-libmysqlclient-dev sshpass git virtualenv

   Required packages on Ubuntu 20.04:

   .. sourcecode:: bash

      sudo apt-get install python3-virtualenv python3.8 python3.8-dev gcc libffi-dev libkrb5-dev libffi7 libssl-dev libyaml-dev libsasl2-dev libldap2-dev default-libmysqlclient-dev sshpass git

   Required packages on Ubuntu 22.04:

   .. sourcecode:: bash

      sudo apt-get install python3-virtualenv python3.10 python3.10-dev gcc libffi-dev libkrb5-dev libffi7 libssl-dev libyaml-dev libsasl2-dev libldap2-dev default-libmysqlclient-dev sshpass git

   Required packages on Debian 11 (as root user):

   .. sourcecode:: bash

      apt-get install python3-virtualenv python3.9 python3.9-dev gcc libffi-dev libkrb5-dev libffi7 libssl-dev libyaml-dev libsasl2-dev libldap2-dev default-libmysqlclient-dev sshpass git

   Required packages on Red Hat/CentOS 7 (sqlite not supported):

   .. sourcecode:: bash

      sudo yum install epel-release centos-release-scl-rh centos-release-scl
      sudo yum --enablerepo=centos-sclo-rh install rh-python38 rh-python38-python-devel gcc openssl-devel libyaml-devel krb5-devel krb5-libs openldap-devel mysql-devel git sshpass
      sudo /opt/rh/rh-python38/root/usr/bin/python -m pip install virtualenv

   Required packages on Red Hat/Alma/Rocky 8:

   .. sourcecode:: bash

      sudo dnf install epel-release
      sudo dnf install python38-devel python3-virtualenv gcc openssl-devel libyaml krb5-devel krb5-libs openldap-devel mysql-devel git sshpass

   .. note::
      If your OS is not in the list of presented OS, but you understand the differences between these OS and yours,
      then you can adapt this list of packages to your platform. We dont tie environment to system package versions as much as possible.


#. Install mysql-server:

   The following command is suitable for Debian and Ubuntu.
   If you have a different operation system, you can use `official documentation <https://dev.mysql.com/doc/>`_.

   .. sourcecode:: bash

      sudo apt-get install default-mysql-server

   .. warning::
      Do not use MySQL version less then 8.0.


#. Create database in mysql with this commands:

   .. sourcecode:: bash

      sudo -H mysql <<QUERY_INPUT
      # uncomment this string on old MariaDB/MySQL versions
      # SET @@global.innodb_large_prefix = 1;
      create user db_user identified by 'db_password';
      create database db_name default CHARACTER set utf8 default COLLATE utf8_general_ci;
      grant all on db_name.* to 'db_user';
      QUERY_INPUT

   .. note:: You should do it on database host if you connect to remote server.


#. Then, if you use mysql and you have set timezone different from "UTC" you should run next command:

   .. sourcecode:: bash

      mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo -H mysql mysql

   .. note:: You should do it on database host if you connect to remote server.


#. Create user:

   .. sourcecode:: bash

      sudo useradd --user-group --create-home --shell /bin/bash polemarch

   .. hint:: You can add this user to sudoers for easier installation process and support.


#. Create virtualenv and activate it:

   .. sourcecode:: bash

      # In some cases use sudo for first command.
      # For rhel/centos7 use:
      /opt/rh/rh-python38/root/usr/bin/python -m virtualenv /opt/polemarch
      # For Debian with Python 3.9:
      virtualenv --python=python3.9 /opt/polemarch
      # For Ubuntu 22.04 and other debian distributions with Python 3.10:
      virtualenv --python=python3.10 /opt/polemarch
      # For other distributions:
      virtualenv --python=python3.8 /opt/polemarch

      # Make required directories
      sudo mkdir -p /etc/polemarch
      sudo chown -R polemarch:polemarch /opt/polemarch /etc/polemarch
      sudo -u polemarch -i
      source /opt/polemarch/bin/activate

   .. note:: If you have more then one Python version, recommended use Python 3.8 or newer for virtualenv.


#. Install Polemarch:

   .. sourcecode:: bash

      pip install -U polemarch[mysql]


#. Edit config file:

   #. Create directory for `log` and `pid` files:

      .. sourcecode:: bash

         mkdir /opt/polemarch/logs /opt/polemarch/pid

   #. Open `/etc/polemarch/settings.ini`, if it does not exist, create it. Polemarch uses config from this directory.

   #. The default database is SQLite3, but MySQL is recommended. Settings needed for correct work MySQL database:

      .. code-block:: ini

         [database]
         engine = django.db.backends.mysql
         name = db_name
         user = db_user
         password = db_password

         [database.options]
         connect_timeout = 20
         init_command = SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, NAMES 'utf8', CHARACTER SET 'utf8', SESSION collation_connection = 'utf8_unicode_ci'

      .. note:: Set ``host`` and ``port`` settings if you connect to remote server.

      .. warning::
         If you are using MariaDB, make sure that your ``settings.ini`` config contains next line:

         .. code-block:: ini

            [databases]
            databases_without_cte_support = default

         The problem is that the implementation of recursive queries in the MariaDB
         does not allow using it in a standard form.
         MySQL (since 8.0) works as expected.


   #. The default cache system is file based cache, but RedisCache is recommended. Settings needed for correct RedisCache work:

      .. code-block:: ini

         [cache]
         backend = django.core.cache.backends.redis.RedisCache
         location = redis://127.0.0.1:6379/1

         [locks]
         backend = django.core.cache.backends.redis.RedisCache
         location = redis://127.0.0.1:6379/2

      .. note:: Set host ip and port instead of 127.0.0.1:6379 if you connect to remote server.

   #. The default celery broker is file Celery broker, but Redis is recommended. Settings needed for correct Redis work:

      .. code-block:: ini

         [rpc]
         connection = redis://127.0.0.1:6379/3
         heartbeat = 5
         concurrency = 8
         enable_worker = true

      .. note:: Set host ip and port instead of 127.0.0.1:6379 if you connect to remote server.

      .. hint:: Use RabbitMQ in case there can be a big network delay between the Polemarch nodes.


   #. For running Polemarch with worker, you need to create follow sections:

      .. code-block:: ini

         [uwsgi]
         pidfile = /opt/polemarch/pid/polemarch.pid
         log_file = /opt/polemarch/logs/polemarch_web.log

         # Uncomment it for HTTPS:
         # [uvicorn]
         # ssl_keyfile = /etc/polemarch/polemarch.key
         # ssl_certfile = /etc/polemarch/polemarch.crt

         [worker]
         # output will be /opt/polemarch/logs/polemarch_worker.log
         logfile = /opt/polemarch/logs/{PROG_NAME}_worker.log
         # output will be /opt/polemarch/pid/polemarch_worker.pid
         pidfile = /opt/polemarch/pid/{PROG_NAME}_worker.pid
         loglevel = INFO

      Also if you need to set your own path for logfile or pidfile,
      different from the path from example, you can do it, but make sure,
      that user, which starts Polemarch has write-permissions for these directory and file.
      If you run it as root, we recommend to add in ``[uwsig]`` params ``uid`` and ``gid``
      (`read more <https://uwsgi-docs.readthedocs.io/en/latest/Namespaces.html#the-old-way-the-namespace-option>`_).

      .. tip:: More configuration settings you can find in :doc:`Configuration manual </config>`.


#. Make migrations:

   .. sourcecode:: bash

      polemarchctl migrate

.. note::
    The first time run this command, the first superuser ``admin`` will be created in the database with the same password.
    We recommend changing the user's password immediately after the first login.

#. Start Polemarch:

   .. sourcecode:: bash

      polemarchctl webserver

Polemarch starts with web interface on port 8080.

If you need to restart Polemarch use following command:

    .. sourcecode:: bash

       polemarchctl webserver reload=/opt/polemarch/pid/polemarch.pid

If you use another directory for storing Polemarch pid file, use path to this file.


If you need to stop Polemarch use following command:

    .. sourcecode:: bash

       polemarchctl webserver stop=/opt/polemarch/pid/polemarch.pid

If you use another directory for storing Polemarch pid file, use path to this file.


Install from docker
-------------------

Run image
~~~~~~~~~

For run Polemarch docker image use command:

    .. sourcecode:: bash

       docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks -p 8080:8080 vstconsulting/polemarch

Using this command download official docker image and run it with default settings. Dont use default SQLite installation with filecache in production.

Ensure, that `/opt/polemarch/projects` and `/opt/polemarch/hooks` has uid/gid `1000`/`1000` as owner.
Polemarch will be run with web interface on port `8080`


Settings
~~~~~~~~

Main section
~~~~~~~~~~~~

* **POLEMARCH_DEBUG** - status of debug mode. Default value: `false`.

* **POLEMARCH_LOG_LEVEL** - log level. Default value: `WARNING`.

* **TIMEZONE** - timezone. Default value: `UTC`.

Database section
~~~~~~~~~~~~~~~~

You can set Database environment variables in two ways:

1. Using ``django-environ``: :ref:`environ:environ-env-db-url`.

   For example for mysql, **DATABASE_URL** = ``'mysql://user:password@host:port/dbname'``.
   Read more about ``django-environ`` in the :doc:`official django-environ documentation <environ:types>`.

2. Or you can specify every variable, but this way is deprecated and we won't support it in the next release.

   If you not set **POLEMARCH_DB_HOST**, default database would be SQLite3, path to database file: `/db.sqlite3`.
   If you set **POLEMARCH_DB_HOST**, Polemarch would be use MYSQL with next variables:

   * **POLEMARCH_DB_TYPE** - name of database type. Support: `mysql` and `postgres` database. Needed only with **POLEMARCH_DB_HOST** option.

   * **POLEMARCH_DB_NAME** - name of database.

   * **POLEMARCH_DB_USER** - user connected to database.

   * **POLEMARCH_DB_PASSWORD** - password for connection to database.

   * **POLEMARCH_DB_HOST** - host for connection to database.

   * **POLEMARCH_DB_PORT** - port for connection to database.

Database. Options section
~~~~~~~~~~~~~~~~~~~~~~~~~

.. note:: If you use :ref:`environ:environ-env-db-url`, you can't use **DB_INIT_CMD**.

* **DB_INIT_CMD** - command to start your database

Cache
~~~~~

For cache environment variables you can also use ``django-environ`` - :ref:`environ:environ-env-cache-url`.

For example for redis, **CACHE_URL** = ``redis://host:port/dbname``.

Or you can specify variable **CACHE_LOCATION**, but this way is deprecated and we won't support it in the next release.

* **CACHE_LOCATION** - path to cache, if you use `/tmp/polemarch_django_cache` path, then cache engine would be `FileBasedCache`,
  else `MemcacheCache`. Default value: ``/tmp/polemarch_django_cache``.


RPC section
~~~~~~~~~~~

* **RPC_ENGINE** - connection to rpc service. If not set, not used.

* **RPC_HEARTBEAT** - Timeout for RPC. Default value: `5`.

* **RPC_CONCURRENCY** - Number of concurrently tasks. Default value: `4`.

Web section
~~~~~~~~~~~

* **POLEMARCH_WEB_REST_PAGE_LIMIT** - Limit elements in answer, when send REST request. Default value: `1000`.

UWSGI section
~~~~~~~~~~~~~

* **POLEMARCH_UWSGI_PROCESSES** - number of uwsgi processes. Default value: `4`.

Other settings
~~~~~~~~~~~~~~

If you set `WORKER` to `ENABLE` state, uwsgi run worker as daemon.

If you set `SECRET_KEY`, value of `SECRET_KEY` variable would be written to `secret`

Examples
---------------------

Run latest version of Polemarch in docker and connect to MySQL on server, using ``django-environ``:

    .. sourcecode:: bash

       docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env DATABASE_URL=mysql://polemarch:polemarch@polemarch_db:3306/polemarch -p 8080:8080 vstconsulting/polemarch

Run Polemarch with Memcache and RabbitMQ and SQLite3. Polemarch log-level=INFO, secret-key=mysecretkey

    .. sourcecode:: bash

       docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env RPC_ENGINE=amqp://polemarch:polemarch@rabbitmq-server:5672/polemarch --env CACHE_URL=memcache://memcached-server:11211/ --env POLEMARCH_LOG_LEVEL=INFO --env SECRET_KEY=mysecretkey -p 8080:8080 vstconsulting/polemarch


Also you can use `.env` file with all variable you want use on run docker:

    .. sourcecode:: bash

       docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env-file /path/to/file -p 8080:8080 vstconsulting/polemarch


Run from the sources with docker-compose (PoleMarch+MySQL+Redis):

    .. sourcecode:: bash

       export DOCKER_BUILDKIT=1
       export COMPOSE_DOCKER_CLI_BUILD=1
       docker-compose up -d --build


Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configuration. Interface is pretty intuitive and common for any web
application. Read more in :ref:`GUI workflow`.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like it is said in :ref:`Configuration manual`.
