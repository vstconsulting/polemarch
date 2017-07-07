
Installation and quick start
============================

Red Hat/CentOS installation
---------------------------

1. Download rpm from official site.

2. Install it with command
   ``sudo yum localinstall polemarch-0.0.1-2612.x86_64.rpm``.

3. Run services with commands ``sudo service polemarchweb start`` and
   ``sudo service polemarchworker start`` (need both of them).

That's it. Polemarch web panel on 8080 port.

Ubuntu/Debian installation
--------------------------

1. Download deb from official site.

2. Install it with command
   ``sudo dpkg -i polemarch_0.0.1-1_amd64.deb || sudo apt-get install -f``.

3. Run services with commands ``sudo service polemarchweb start`` and
   ``sudo service polemarchworker start`` (need both of them).

That's it. Polemarch web panel on 8080 port.

Quickstart
----------

After you install Polemarch by instructions above you can use it without any
further configurations. Interface is pretty intuitive and common for any web
application. But if you have problem you always can refer to our
:doc:`GUI documentation </gui>`.

Default installation is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like said in :doc:`Configuration manual </config>`.