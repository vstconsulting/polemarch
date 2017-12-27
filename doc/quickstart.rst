
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

Regular uploading backups is a guarantee of the reliability of the application.
To upload the data, use the command:

   .. sourcecode:: bash

      sudo -u polemarch /opt/polemarch/bin/polemarchctl dumpdata --natural-foreign --natural-primary -a --indent 4 -o /home/polemarch/backup.json

To load the saved data, use:

   .. sourcecode:: bash

      sudo -u polemarch /opt/polemarch/bin/polemarchctl loaddata /home/polemarch/backup.json

But more faster backup is SQL backup and projects dir. We strongly recommended this manual backup in production.


Update
------

Before updating any type of package strongly recommended to stop all services and create backup for safe.
