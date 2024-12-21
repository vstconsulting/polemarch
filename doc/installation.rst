Installation
============================

Install from PyPI
-----------------

.. note::
   The recommended Python versions are 3.10 or 3.11.
   Some distributions may require additional steps to install Python 3.10/3.11.
   For example, on Ubuntu you can use the deadsnakes PPA:

   .. sourcecode:: bash

      sudo apt-get update
      sudo apt-get install software-properties-common
      sudo add-apt-repository ppa:deadsnakes/ppa
      sudo apt-get update
      sudo apt-get install python3.11 python3.11-dev python3.11-venv

   On Red Hat/CentOS/Alma/Rocky Linux, you can install Python 3.11 from AppStream or via an additional repo (EPEL / IUS).
   For example (RHEL 8+ / CentOS 8+ / Alma 8+ / Rocky 8+):

   .. sourcecode:: bash

      sudo dnf module reset python38
      sudo dnf module enable python39 (or python3.11 if available)
      sudo dnf install python3.11 python3.11-devel
      # or use the "IUS" repo if needed

#. Install dependencies:

   Required packages on Ubuntu 22.04+ (example for Python 3.10/3.11):

   .. sourcecode:: bash

      sudo apt-get install \
          python3-virtualenv \
          python3.10 python3.10-dev \
          gcc libffi-dev libkrb5-dev libssl-dev \
          libyaml-dev libsasl2-dev libldap2-dev \
          default-libmysqlclient-dev sshpass git

   If you're installing Python 3.11 instead of 3.10, adjust the packages accordingly:

   .. sourcecode:: bash

      # Example
      sudo apt-get install python3.11 python3.11-dev ...

   Required packages on Red Hat/Alma/Rocky 8+ (using Python 3.10/3.11 from module streams or a third-party repo):

   .. sourcecode:: bash

      sudo dnf install epel-release
      sudo dnf install python3.11 python3.11-devel python3-virtualenv \
          gcc openssl-devel libyaml krb5-devel krb5-libs \
          openldap-devel mysql-devel git sshpass

   .. note::
      If your OS is not listed, adapt the package list as needed.
      Polemarch itself does not require system-wide pinned package versions.

#. Install MySQL server (if you plan to use MySQL):

   For Debian/Ubuntu:

   .. sourcecode:: bash

      sudo apt-get install default-mysql-server

   .. warning::
      Do not use MySQL version older than 8.0.

#. Create a database in MySQL with these commands (run on the DB host):

   .. sourcecode:: bash

      sudo -H mysql <<QUERY_INPUT
      # uncomment this line on old MariaDB/MySQL versions
      # SET @@global.innodb_large_prefix = 1;
      create user db_user identified by 'db_password';
      create database db_name default CHARACTER set utf8 default COLLATE utf8_general_ci;
      grant all on db_name.* to 'db_user';
      QUERY_INPUT

   .. note::
      Adjust if connecting to a remote MySQL server.

#. (Optional) If you use MySQL with a non-UTC timezone, import time zone info:

   .. sourcecode:: bash

      mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo -H mysql mysql

#. Create a dedicated system user for Polemarch:

   .. sourcecode:: bash

      sudo useradd --user-group --create-home --shell /bin/bash polemarch

   .. hint::
      You can add this user to sudoers for easier administration.

#. Create a virtualenv and activate it:

   .. sourcecode:: bash

      # Adapt the python path to your installed version:
      # For example, if you installed Python 3.11 in /usr/bin/python3.11:
      virtualenv --python=python3.11 /opt/polemarch

      # Make required directories
      sudo mkdir -p /etc/polemarch
      sudo chown -R polemarch:polemarch /opt/polemarch /etc/polemarch
      sudo -u polemarch -i
      source /opt/polemarch/bin/activate

   .. note::
      If you have multiple Python versions, use 3.10 or newer.
      Adjust paths if you installed Python differently.

#. Install Polemarch:

   .. sourcecode:: bash

      pip install -U polemarch[mysql]

#. Edit the config file:

   #. Create directories for logs and pids:

      .. sourcecode:: bash

         mkdir /opt/polemarch/logs /opt/polemarch/pid

   #. Open `/etc/polemarch/settings.ini` (create it if it does not exist). Polemarch reads configs from `/etc/polemarch/`.

   #. MySQL settings example in `settings.ini`:

      .. code-block:: ini

         [database]
         engine = django.db.backends.mysql
         name = db_name
         user = db_user
         password = db_password

         [database.options]
         connect_timeout = 20
         init_command = SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, NAMES 'utf8', CHARACTER SET 'utf8', SESSION collation_connection = 'utf8_unicode_ci'

      .. note::
         Add ``host`` and ``port`` if the DB is remote.

      .. warning::
         If you use MariaDB, add:

         .. code-block:: ini

            [databases]
            databases_without_cte_support = default

         Because MariaDB’s recursive CTE support differs from MySQL’s.

   #. (Optional) For better performance, configure Redis for caching and locks:

      .. code-block:: ini

         [cache]
         backend = django.core.cache.backends.redis.RedisCache
         location = redis://127.0.0.1:6379/1

         [locks]
         backend = django.core.cache.backends.redis.RedisCache
         location = redis://127.0.0.1:6379/2

   #. (Optional) For Celery/RPC, Redis or RabbitMQ is recommended:

      .. code-block:: ini

         [rpc]
         connection = redis://127.0.0.1:6379/3
         heartbeat = 5
         concurrency = 8
         enable_worker = true

      .. hint::
         For large networks, RabbitMQ may be preferable.

   #. Configure uvicorn (HTTPS optional). For an HTTPS setup, provide keyfile/certfile:

      .. code-block:: ini

         [uvicorn]
         # Uncomment this for HTTPS support or use any proxy
         # ssl_keyfile = /etc/polemarch/polemarch.key
         # ssl_certfile = /etc/polemarch/polemarch.crt
         # Setup here additional settings, like workers
         # workers = 4

         [web]
         # default is
         addrport = 0.0.0.0:8080

   #. If the server is not behind HTTPS or any TLS-terminating proxy, you need to allow insecure OAuth login:

      .. code-block:: ini

         [oauth]
         server_allow_insecure = true

      .. note::
         Alternatively, place Polemarch behind a TLS-terminating proxy such as Nginx, Traefik, or HAProxy
         and remove `server_allow_insecure = true`.

#. Make migrations:

   .. sourcecode:: bash

      polemarchctl migrate

   .. note::
      On the first run, the default superuser ``admin`` is created with the same password.
      Change it immediately after first login.

Configure systemd for Polemarch
----------------------------------

Since ``polemarchctl webserver`` no longer daemonizes by default, it will keep the console busy.
We recommend using ``systemd`` for management (start/stop/restart) of the service.

1. Create a systemd unit file, for example: `/etc/systemd/system/polemarch.service`:

   .. code-block:: ini

      [Unit]
      Description=Polemarch Service
      After=network.target

      [Service]
      Type=simple
      User=polemarch
      Group=polemarch
      WorkingDirectory=/opt/polemarch
      ExecStart=/opt/polemarch/bin/polemarchctl webserver
      # If you want to store logs in a file, you can redirect:
      # ExecStart=/opt/polemarch/bin/polemarchctl webserver >> /opt/polemarch/logs/polemarch_web.log 2>&1

      Restart=on-failure

      [Install]
      WantedBy=multi-user.target

2. Enable and start the service:

   .. sourcecode:: bash

      sudo systemctl daemon-reload
      sudo systemctl enable polemarch
      sudo systemctl start polemarch

3. Now Polemarch runs in the background. Manage it via standard systemd commands:

   .. sourcecode:: bash

      sudo systemctl stop polemarch
      sudo systemctl restart polemarch
      sudo systemctl status polemarch

.. note::
   Remove or ignore any references to the old `uwsgi` sections or the old `polemarchctl webserver reload=/opt/polemarch/pid/polemarch.pid` approach.
   All process management (start/stop/restart) is now delegated to systemd.


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

* **DEBUG** - status of debug mode. Default value: `false`.

* **DJANGO_LOG_LEVEL** - log level. Default value: `WARNING`.

* **TIMEZONE** - timezone. Default value: `UTC`.

Database section
~~~~~~~~~~~~~~~~

Setup database connection via ``django-environ``: :ref:`environ:environ-env-db-url`.

For example for mysql, **DATABASE_URL** = ``'mysql://user:password@host:port/dbname'``.
Read more about ``django-environ`` in the :doc:`official django-environ documentation <environ:types>`.

Cache
~~~~~

For cache environment variables you can also use ``django-environ`` - :ref:`environ:environ-env-cache-url`.
For example for redis, **CACHE_URL** = ``redis://host:port/dbname``.

RPC section
~~~~~~~~~~~

* **POLEMARCH_RPC_ENGINE** - connection to rpc service. If not set used as tmp-dir.

* **POLEMARCH_RPC_RESULT_BACKEND** - connection to rpc results service. Default as engine.

* **POLEMARCH_RPC_HEARTBEAT** - Timeout for RPC. Default value: `5`.

* **POLEMARCH_RPC_CONCURRENCY** - Number of concurrently tasks. Default value: `4`.

Web section
~~~~~~~~~~~

* **POLEMARCH_WEB_REST_PAGE_LIMIT** - Limit elements in answer, when send REST request. Default value: `1000`.

Other settings
~~~~~~~~~~~~~~

If you set `SECRET_KEY`, value of `SECRET_KEY` variable would be written to `secret`

Examples
---------------------

Run latest version of Polemarch in docker and connect to MySQL on server, using ``django-environ``:

    .. sourcecode:: bash

       docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env DATABASE_URL=mysql://polemarch:polemarch@polemarch_db:3306/polemarch -p 8080:8080 vstconsulting/polemarch

Run Polemarch with Memcache and RabbitMQ and SQLite3. Polemarch log-level=INFO, secret-key=mysecretkey

    .. sourcecode:: bash

       docker run -d --name polemarch --restart always -v /opt/polemarch/projects:/projects -v /opt/polemarch/hooks:/hooks --env POLEMARCH_RPC_ENGINE=amqp://polemarch:polemarch@rabbitmq-server:5672/polemarch --env CACHE_URL=memcache://memcached-server:11211/ --env POLEMARCH_LOG_LEVEL=INFO --env SECRET_KEY=mysecretkey -p 8080:8080 vstconsulting/polemarch


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
