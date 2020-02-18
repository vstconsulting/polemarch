Installation
============================

Install from PyPI
-----------------


#. Install dependencies:

   Required packages on Ubuntu/Debian:

   .. sourcecode:: bash

        sudo apt-get install python3-virtualenv python3.6 python3.6-dev gcc libffi-dev libkrb5-dev libffi6 libssl-dev libyaml-dev libsasl2-dev libldap2-dev default-libmysqlclient-dev sshpass git

   Required packages on Red Hat/CentOS:

   .. sourcecode:: bash

        sudo yum install epel-release
        sudo yum install https://$(rpm -E '%{?centos:centos}%{!?centos:rhel}%{rhel}').iuscommunity.org/ius-release.rpm
        sudo yum install python36u python36u-devel python36-virtualenv openssl-devel libyaml-devel krb5-devel krb5-libs openldap-devel mysql-devel git sshpass

#. Create user:
    .. sourcecode:: bash

        sudo useradd --user-group --create-home --shell /bin/bash polemarch

    .. hint:: You can add this user to sudoers for easer instalation proccess and support.

#. Create virtualenv and activate it:

    .. sourcecode:: bash

        virtualenv --python=python3.6 /opt/polemarch
        sudo chown -R polemarch:polemarch /opt/polemarch
        sudo -u polemarch -i
        source /opt/polemarch/bin/activate

    .. note:: If you have more then one Python version, recomended use Python 3.6 and create virtualenv with Py3.6

    .. warning:: We support Python 2.7 until Polemarch 2.0 release.


#. Install Polemarch:

   .. sourcecode:: bash

        pip install -U polemarch[mysql]

#. Edit config file:

   #. Open `/etc/polemarch/settings.ini`, if it does not exist, create it. Polemarch uses config from this directory.

   #. The default database is SQLite3, but MariaDB is recommended. Settings needed for correct work MariaDB database:

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

   #. Create database in MariaDB with this commands:

       .. sourcecode:: bash

            sudo -H mysql <<QUERY_INPUT
            SET @@global.innodb_large_prefix = 1;
            create user db_user;
            create database db_name default CHARACTER set utf8   default COLLATE utf8_general_ci;
            grant all on db_name.* to 'db_user'@'localhost' identified by 'db_password';
            QUERY_INPUT

       .. note:: You should do it on database host if you connect to remote server.

   #. Then, if you use MariaDB and you have set timezone different from "UTC" you should run next command:

       .. sourcecode:: bash

           mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo -H mysql mysql

       .. note:: You should do it on database host if you connect to remote server.

   #. The default cache system is file based cache, but RedisCache is recommended. Settings needed for correct RedisCache work:

      .. code-block:: ini

           [cache]
           backend = django_redis.cache.RedisCache
           location = redis://127.0.0.1:6379/1

           [locks]
           backend = django_redis.cache.RedisCache
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


   #. Create directory for `log` and `pid` files:
      
      .. sourcecode:: bash

            mkdir /opt/polemarch/logs /opt/polemarch/pid

   #. For running Polemarch with worker, you need to create follow sections:

      .. code-block:: ini

           [uwsgi]
           processes = 4
           threads = 4
           harakiri = 120
           vacuum = True
           http-keepalive = true
           http-auto-chunked = true
           thread-stacksize = 512
           pidfile = /opt/polemarch/pid/polemarch.pid
           log_file = /opt/polemarch/logs/{PROG_NAME}_web.log
           # Uncomment it for HTTPS and install `uwsgi` pypi package to env:
           # addrport = 127.0.0.1:8080
           # https = 0.0.0.0:443,/etc/polemarch/polemarch.crt,/etc/polemarch/polemarch.key

           [worker]
           # output will be /opt/polemarch/logs/polemarch_worker.log
           logfile = /opt/polemarch/logs/{PROG_NAME}_worker.log
           # output will be /opt/polemarch/pid/polemarch_worker.pid
           pidfile = /opt/polemarch/pid/{PROG_NAME}_worker.pid
           loglevel = INFO

      Also if you need to set your own path for logfile or pidfile,
      different from the path from example, you can do it, but make sure,
      that user, which starts Polemarch has write-permissions for these directory and file.
      If you run it as root, we recommend to add in ```[uwsig]``` params ```uid``` and ```gid```
      (`read more <https://uwsgi-docs.readthedocs.io/en/latest/Namespaces.html#the-old-way-the-namespace-option>`_).

      .. tip:: More configuration settings you can find in :doc:`Configuration manual </config>`.


#. Make migrations:

   .. sourcecode:: bash

        polemarchctl migrate

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

        docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks vstconsulting/polemarch

Using this command download official docker image and run it with default settings. Dont use default SQLite installation with filecache in production.

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

If you not set **POLEMARCH_DB_HOST**, default database would be SQLite3, path to database file: `/db.sqlite3`. If you set **POLEMARCH_DB_HOST**, Polemarch would be use MYSQL with next variabls:

* **POLEMARCH_DB_TYPE** - name of database type. Support: `mysql` and `postgres` database. Needed only with **POLEMARCH_DB_HOST** option.

* **POLEMARCH_DB_NAME** - name of database.

* **POLEMARCH_DB_USER** - user connected to database.

* **POLEMARCH_DB_PASSWORD** - password for connection to database.

* **POLEMARCH_DB_HOST** - host for connection to database.

* **POLEMARCH_DB_PORT** - port for connection to database.

Database.Options section
~~~~~~~~~~~~~~~~~~~~~~~~

* **DB_INIT_CMD** - command to start your database

Cache
~~~~~

* **CACHE_LOCATION** - path to cache, if you use `/tmp/polemarch_django_cache` path, then cache engine would be `FileBasedCache`, else `MemcacheCache`. Default value: ``/tmp/polemarch_django_cache`


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

If you set `SECRET_KEY`,value of `SECRET_KEY` variable would be written to `secret`

Examples
---------------------

Run latest version of Polemarch in docker and connect to MySQL on server:

    .. sourcecode:: bash

        docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env POLEMARCH_DB_TYPE=mysql --env POLEMARCH_DB_NAME=polemarch --env POLEMARCH_DB_USER=polemarch --env POLEMARCH_DB_PASSWORD=polemarch --env POLEMARCH_DB_PORT=3306 --env POLEMARCH_DB_HOST=polemarch_db vstconsulting/polemarch

Run Polemarch with Memcache and RabbitMQ and SQLite3. Polemarch log-level=INFO, secret-key=mysecretkey

    .. sourcecode:: bash

        docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env RPC_ENGINE=amqp://polemarch:polemarch@rabbitmq-server:5672/polemarch --env CACHE_LOCATION=memcached-server:11211 --env POLEMARCH_LOG_LEVEL=INFO --env SECRET_KEY=mysecretkey vstconsulting/polemarch


Also you can use `.env` file with all variable you want use on run docker:

    .. sourcecode:: bash

        docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env-file /path/to/file vstconsulting/polemarch


Run from the sources with docker-compose (PoleMarch+MySQL+Redis):

    .. sourcecode:: bash

        docker-compose up -d --build



Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configuration. Interface is pretty intuitive and common for any web
application. Read more in :doc:`GUI workflow documentation</gui>`.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like it is said in :doc:`Configuration manual </config>`.
