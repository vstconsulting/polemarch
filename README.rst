Polemarch
=========

.. image:: https://gitlab.com/vstconsulting/polemarch/badges/master/pipeline.svg
   :target: https://gitlab.com/vstconsulting/polemarch/commits/master
   :alt: Tests status

.. image:: https://gitlab.com/vstconsulting/polemarch/badges/master/coverage.svg
   :target: https://gitlab.com/vstconsulting/polemarch/pipelines
   :alt: Code coverage

.. image:: https://readthedocs.org/projects/polemarch/badge/?version=stable
   :target: http://polemarch.readthedocs.io/en/stable/?badge=stable
   :alt: Documentation Status

.. image:: https://badge.fury.io/py/polemarch.svg
    :target: https://badge.fury.io/py/polemarch

**Polemarch**  is a service for infrastructure management based on ansible.
Simple WEB gui for infrastructure management using ansible playbooks or ansible modules.

Official site:
http://about.polemarch.org

For any questions you could use issues tracker:
https://gitlab.com/vstconsulting/polemarch/issues

.. image:: https://raw.githubusercontent.com/vstconsulting/polemarch/master/doc/screencast.gif
   :alt: interface of Polemarch
   :width: 100%

Features
--------

* execution templates;
* scheduled tasks execution;
* sharing of hosts, groups, inventories between projects;
* history of tasks execution with all details;
* easy configurable clustering for reliability and scalability:
* import of Ansible projects from Git repository or tar archive;
* import of `inventory file <https://polemarch.readthedocs.io/en/latest/gui.html#import-inventory>`_;
* support of quick project deployment;
* documentation: http://polemarch.readthedocs.io/en/latest/ ;
* support of hosts groups and groups hierarchy;
* support of multi user connection;
* support of `hooks <https://polemarch.readthedocs.io/en/latest/gui.html#hooks>`_;
* user friendly interface.

Quickstart
----------

`Default installation <https://polemarch.readthedocs.io/en/latest/quickstart.html>`_
is suitable for most simple and common cases, but
Polemarch is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can
always configure Polemarch like it is said in `documentation <https://polemarch.readthedocs.io/en/latest/config.html>`_.


How to contribute
-----------------

Refer to the documentation page about `contribution <http://polemarch.readthedocs.io/en/stable/contribute.html>`_.
