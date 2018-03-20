
Installation and quick start
============================

Red Hat/CentOS installation
---------------------------

1. Download rpm from latest `release <https://github.com/vstconsulting/polemarch/releases>`_.

2. Install it with command

   .. sourcecode:: bash

      sudo yum localinstall polemarch-X.X.X-X.x86_64.rpm.

3. Run services with commands

   .. sourcecode:: bash

      sudo service polemarchweb start
      sudo service polemarchworker start

That's it. Polemarch web panel on 8080 port. Default administrative account is
admin/admin.

Note: If you using authentication by password at some of your machines
managed by Polemarch, you also must install ``sshpass`` package because it
required for ansible to autheticate via ssh by password. It available in
EPEL for Red Hat/CentOS. Also you can use specify ``connection`` command line
argument during playbook run as ``paramiko``. When ansible uses paramiko to
make ssh connection, ``sshpass`` not necessary.

Ubuntu/Debian installation
--------------------------

1. Download deb from latest `release <https://github.com/vstconsulting/polemarch/releases>`_.

2. Install it with command

   .. sourcecode:: bash

      sudo dpkg -i polemarch_X.X.X-X_amd64.deb || sudo apt-get install -f

3. Run services with commands

   .. sourcecode:: bash

      sudo service polemarchweb start
      sudo service polemarchworker start

That's it. Polemarch web panel on 8080 port. Default administrative account is
admin/admin.

Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configurations. Interface is pretty intuitive and common for any web
application.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like said in :doc:`Configuration manual </config>`.


Backup
------

Regular uploading of backups is a guarantee of the reliability of the application.
There are several ways of making a backup. The first one is not very reliable, but if you want, you can use it.
To upload the data, use the command:

   .. sourcecode:: bash

      sudo -u polemarch /opt/polemarch/bin/polemarchctl dumpdata --natural-foreign --natural-primary -a --indent 4 -o /home/polemarch/backup.json

To load the saved data, use:

   .. sourcecode:: bash

      sudo -u polemarch /opt/polemarch/bin/polemarchctl loaddata /home/polemarch/backup.json

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

    .. sourcecode:: postgresql

       pg_dump dbname > dump.sql

Uploading of backup in PostgreSQL:

    .. sourcecode:: postgresql

       createdb dbname
       psql dbname < dump.sql

Update
------

Before updating any type of package strongly recommended to stop all services and create backup for safe.


Migrate
-------

Migrations are Django’s way of propagating changes you make to your models (adding a field, deleting a model, etc.)
into your database schema. They’re designed to be mostly automatic, but you’ll need to know when to make migrations,
when to run them, and the common problems you might run into.

To run a ``migrate`` command you should run follow code:

.. sourcecode:: python

   sudo -u polemarch /opt/polemarch/bin/polemarchctl migrate

Create superuser
----------------

A superuser is the user, who has all permissions.

To create a superuser account use the follow command:

.. sourcecode:: python

   sudo -u polemarch /opt/polemarch/bin/polemarchctl createsuperuser

This command will promt for all required user's options.

Change password
---------------

To change password use the follow command:

.. sourcecode:: python

   sudo -u polemarch /opt/polemarch/bin/polemarchctl changepassword [<username>]

It prompts you to enter a new password twice for the given user.
If the entries are identical, this immediately becomes the new password.
If you do not supply a user, the command will attempt to change the password whose username matches
the current user.