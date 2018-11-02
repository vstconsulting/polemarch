Polemarch
=========

.. image:: https://readthedocs.org/projects/polemarch/badge/?version=stable
   :target: http://polemarch.readthedocs.io/en/stable/?badge=stable
   :alt: Documentation Status

.. image:: https://badge.fury.io/py/polemarch.svg
    :target: https://badge.fury.io/py/polemarch

**Polemarch** is service for orchestration infrastructure by ansible.
Simply WEB gui for orchestration infrastructure by ansible playbooks.

Official site:
https://gitlab.com/vstconsulting/polemarch

For any questions you could use issues tracker:
https://gitlab.com/vstconsulting/polemarch/issues

.. image:: https://raw.githubusercontent.com/vstconsulting/polemarch/master/doc/screencast.gif
   :alt: interface of Polemarch
   :width: 100%

Features
--------

* scheduled tasks execution;
* share hosts, groups between projects;
* history of tasks execution with all details;
* easy configurable clustering for reliability and scalability:
* import Ansible projects from Git repository or tar archive;
* documentation: http://polemarch.readthedocs.io/en/latest/ ;
* groups of hosts and groups hierarchy;
* multiuser;
* responsive design;

Red Hat/CentOS installation
---------------------------

1. Download rpm from official site:
   https://github.com/vstconsulting/polemarch/releases

2. Install it with command

   .. sourcecode:: bash

      sudo yum localinstall polemarch-X.X.X-0.x86_64.rpm.

3. Run services with commands

   .. sourcecode:: bash

      sudo service polemarchweb start
      sudo service polemarchworker start

That's it. Polemarch web panel on 8080 port. Default administrative account is
admin/admin.

If you have any problems with `.deb` package, you can install it from PyPi:
https://polemarch.readthedocs.io/en/stable/quickstart.html#install-from-pypi

Note: If you using authentication by password at some of your machines
managed by Polemarch, you also must install ``sshpass`` package because it
required for ansible to autheticate via ssh by password. It available in
EPEL for Red Hat/CentOS. Also you can use specify ``connection`` command line
argument during playbook run as ``paramiko``. When ansible uses paramiko to
make ssh connection, ``sshpass`` not necessary.

Ubuntu/Debian installation
--------------------------

1. Download deb from official site:
   https://github.com/vstconsulting/polemarch/releases

2. Install it with command

   .. sourcecode:: bash

      sudo dpkg -i polemarch_X.X.X-0_amd64.deb || sudo apt-get install -f

3. Run services with commands

   .. sourcecode:: bash

      sudo service polemarchweb start
      sudo service polemarchworker start

Note for Debian 9 users: Polemarch currently built with libssl1.0.0, so you
need to install it for your distro:

   .. sourcecode:: bash

      wget http://ftp.us.debian.org/debian/pool/main/o/openssl/libssl1.0.0_1.0.2l-1~bpo8+1_amd64.deb
      sudo dpkg -i libssl1.0.0_1.0.2l-1~bpo8+1_amd64.deb

That's it. Polemarch web panel on 8080 port. Default administrative account is
admin/admin.

If you have any problems with `.deb` package, you can install it from PyPi:
https://polemarch.readthedocs.io/en/stable/quickstart.html#install-from-pypi

Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configurations. Interface is pretty intuitive and common for any web
application.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like said in documentation at
http://polemarch.readthedocs.io/en/latest/

How to contribute
-----------------

Refer to documentation page about that:
http://polemarch.readthedocs.io/en/stable/contribute.html