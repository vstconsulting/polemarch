Installation
============================

Install from PyPI
-----------------


#. Install dependencies:

   Required packages on Ubuntu/Debian:

   * pip (```python-pip```)

   * virtualenv (```python-virtualenv```)

   * python-dev (```python-dev```)

   * GCC (```gcc```)

   * FFI library (```libffi-dev```)

   * Headers and development libraries for MIT Kerberos (```libkrb5-dev```)

   * ffi (```libffi6```)

   * ssl (```libssl-dev```)

   * YAML (```libyaml-dev```)

   * SASL (```libsasl2-dev```)

   * LDAP (```libldap2-dev```)

   * SSHPass(```sshpass```) to get working ssh password auth during playbook execution

   * GIT (```git```) to get working git import


   Required packages on Red Hat/CentOS :

   * python (```python```)

   * OpenSSL (```openssl-devel```)

   * YAML (```libyaml-devel```)

   * virtualenv (```python-virtualenv```)

   * Kerberos (```krb5-devel```)

   * Libs for Kerberos (```krb5-libs```)

   * Open LDAP (```openldap-devel```)

   * GIT (```git```) to get working git import


#. Create virtualenv and activate it**:

   .. sourcecode:: bash

       virtualenv polemarch
       cd polemarch
       source bin/activate

#. Install Polemarch:

   .. sourcecode:: bash

        pip install -U polemarch

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

   #. Create database in MariaDB use this commands:

       .. code-block:: mysql

           SET @@global.innodb_large_prefix = 1;
           create user db_user;
           create database db_name default CHARACTER set utf8   default COLLATE utf8_general_ci;
           grant all on db_name.* to 'db_user'@'localhost' identified by 'db_password';

   #. Then, if you use MariaDB and you have set timezone different from "UTC" you should run next command:

       .. sourcecode:: bash

           mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql

   #. The default cache system is file based cache, but RedisCache is recommended. Settings needed for correct RedisCache work:

      .. code-block:: ini

           [cache]
           backend = django_redis.cache.RedisCache
           location = redis://127.0.0.1:6379/1

           [locks]
           backend = django_redis.cache.RedisCache
           location = redis://127.0.0.1:6379/2

   #. The default celery broker is file Celery broker, but Redis is recommended. Settings needed for correct Redis work:

      .. code-block:: ini

           [rpc]
           connection = redis://127.0.0.1:6379/3
           heartbeat = 5
           concurrency = 8
           enable_worker = true

   #. For running Polemarch with worker, you need to create follow sections:

      .. code-block:: ini

           [uwsgi]
           processes = 4
           threads = 4
           harakiri = 120
           vacuum = True
           pidfile = /run/polemarch.pid
           log_file = /var/log/{PROG_NAME}_web.log

           [worker]
           # output will be /run/polemarch_worker.log
           logfile = /var/log/{PROG_NAME}_worker.log
           # output will be /run/polemarch_worker.pid
           pidfile = /run/{PROG_NAME}_worker.pid
           loglevel = INFO

      Also if you need to set your own path for logfile or pidfile,
      different from the path from example, you can do it, but make sure,
      that user, which starts Polemarch has write-permissions for these directory and file.
      If you run it as root, we recommend to add in ```[uwsig]``` params ```uid``` and ```gid```
      (`read more <https://uwsgi-docs.readthedocs.io/en/latest/Namespaces.html#the-old-way-the-namespace-option>`_).


#. Make migrations:

   .. sourcecode:: bash

        polemarchctl migrate

#. Start Polemarch:

   .. sourcecode:: bash

       polemarchctl webserver

Polemarch starts with web interface on port 8080.

If you need to restart Polemarch use following command:

    .. sourcecode:: bash

           polemarchctl webserver reload=/var/run/polemarch/web.pid

If you use another directory for storing Polemarch pid file, use path to this file.


If you need to stop Polemarch use following command:

    .. sourcecode:: bash

           polemarchctl webserver stop=/run/polemarch.pid

If you use another directory for storing Polemarch pid file, use path to this file.


Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configuration. Interface is pretty intuitive and common for any web
application.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like it is said in :doc:`Configuration manual </config>`.


Backup
------

Regular uploading of backups is a guarantee of the reliability of the application.
There are several ways of making a backup. The first one is not very reliable, but if you want, you can use it.
To upload the data, use the command:

   .. sourcecode:: bash

      polemarchctl dumpdata --natural-foreign --natural-primary -a --indent 4 -o /home/polemarch/backup.json

To load the saved data, use:

   .. sourcecode:: bash

      polemarchctl loaddata /home/polemarch/backup.json

The second way is to use SQL backup or to copy you database manually.
We strongly recommend to use this way of making a backup, because
it is faster and more reliale, than first one.


There are examples of SQL backup for MySQL and PostgreSQL below.

Making backup in MySQL:

    .. sourcecode:: mysql

       shell> mysqldump dbname > dump.sql

Here dbname is the name of your database, dump.sql is the file, where all SQL backup statements
will be saved.

Uploading of backup in MySQL:

    .. sourcecode:: mysql

       shell> mysqladmin create dbname
       shell> mysql dbname < dump.sql

Making backup in PostgreSQL:

    .. sourcecode:: bash

       pg_dump dbname > dump.sql

Uploading of backup in PostgreSQL:

    .. sourcecode:: bash

       createdb dbname
       psql dbname < dump.sql

Update
------

Before updating of package of any type it is strongly recommended to stop all services and create backup for safety.

Update to 0.2.x
---------------

1. Firstly, we strongly recommend you to create a database backup and to stop all Polemarch services for safety.

2. Secondly, if you are updating from 0.1.x to 0.2.x, you need to update you current 0.1.x version to 0.1.13 version.

3. Then update 0.1.13 version to 0.2.x. If you don't know how to do it, look :doc:`"Install from PyPI" </quickstart>`.


Migrate
-------

Migrations are Django’s way of propagating changes you make to your models (adding a field, deleting a model, etc.)
into your database schema. They’re designed to be mostly automatic, but you need to know when to make migrations,
when to run them, and the common problems you might run into.

To run a ``migrate`` command you should run follow code:

.. sourcecode:: python

   polemarchctl migrate

Create superuser
----------------

A superuser is the user, who has all permissions.

To create a superuser account use the follow command:

.. sourcecode:: python

   polemarchctl createsuperuser

This command prompts for all required user's options.

Change password
---------------

To change password use the follow command:

.. sourcecode:: python

   polemarchctl changepassword [<username>]

It prompts you to enter a new password twice for the given user.
If the entries are identical, this immediately becomes the new password.
If you do not supply a user, the command will attempt to change the password of user whose username matches
the current user.