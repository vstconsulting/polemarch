Installation
============================

Install from PyPI
-----------------


#. Install dependencies:

   Required packages on Ubuntu/Debian:

   .. sourcecode:: bash

   	   sudo apt-get install python-virtualenv python3.6 python3.6-dev gcc libffi-dev libkrb5-dev libffi6 libssl-dev libyaml-dev libsasl2-dev libldap2-dev sshpass git

   Required packages on Red Hat/CentOS:

   .. sourcecode:: bash

   	   sudo yum install epel-release
   	   sudo yum install https://$(rpm -E '%{?centos:centos}%{!?centos:rhel}%{rhel}').iuscommunity.org/ius-release.rpm
   	   sudo yum install python3.6u python3.6u-devel openssl-devel libyaml-devel python-virtualenv krb5-devel krb5-libs openldap-devel git sshpass

#. Create virtualenv and activate it:

   .. sourcecode:: bash

       virtualenv --python=python3.6 polemarch
       cd polemarch
       source bin/activate


   ``If you have more then one Python version, recomended use Python 3.6 and create virtualenv with Py3.6``

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

   #. Create database in MariaDB with this commands:

       .. sourcecode:: bash

       		sudo -H mysql <<QUERY_INPUT
			SET @@global.innodb_large_prefix = 1;
	        create user db_user;
	        create database db_name default CHARACTER set utf8   default COLLATE utf8_general_ci;
	        grant all on db_name.* to 'db_user'@'localhost' identified by 'db_password';			
			QUERY_INPUT

   #. Then, if you use MariaDB and you have set timezone different from "UTC" you should run next command:

       .. sourcecode:: bash

           mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo -H mysql mysql

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
           pidfile = /opt/polemarch/pid/polemarch.pid
           log_file = /opt/polemarch/logs/{PROG_NAME}_web.log

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


Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configuration. Interface is pretty intuitive and common for any web
application.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like it is said in :doc:`Configuration manual </config>`.
