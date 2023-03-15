How to participate
==================

If you found some bug in the codebase or documentation, or you want some
improvement in 'Polemarch' project, you can easily inform us about it.
Here is how to proceed:

#. Create (or find if it already exists) an
   `issue <https://gitlab.com/vstconsulting/polemarch/issues>`_
   for problem you want to solve. Maybe somebody is already working on it or maybe
   during discussion becomes clear that it is not a problem at all.

#. To investigate problem, you probably must be able to run cloned project.
   To do so install required dependencies. See
   ":ref:`Install from PyPI`" for more detailed
   explanation, which dependencies and why they are needed. System packages
   (example for Ubuntu 20.04):

   .. sourcecode:: bash

      sudo apt-get install python3-virtualenv python3.8 python3.8-dev gcc libffi-dev libkrb5-dev libffi7 libssl-dev libyaml-dev libsasl2-dev libldap2-dev default-libmysqlclient-dev sshpass git tox

   .. note:: Your patch must work at Python 3.8 because older Python may not work correctly with Polemarch.

#. Make fork of our repository and clone it to your local development
   machine.

   .. sourcecode:: bash

      git clone https://gitlab.com/vstconsulting/polemarch.git

#. Create a branch for your work named with number of issue:

   .. sourcecode:: bash

      cd polemarch
      git checkout -b issue/1

#. Create and activate virtualenv:

   .. sourcecode:: bash

      tox -e contrib
      source env/bin/activate

#. Initialize empty database with all required stuff (tables and so on)
   for Polemarch:

   .. sourcecode:: bash

      python -m polemarch migrate

#. For your comfort you can edit ``polemarch/main/settings.ini``, but make sure that changes in that file won't go to your commit.
   Or you can copy ``polemarch/main/settings.ini`` to ``/etc/polemarch/settings.ini``
   (default settings location for Polemarch).

    * First of all you can enable debug in settings.ini.
      Set ``debug = true`` in section ``[main]``.
      Otherwise there will be no available static files and debug
      features when you start development web-server.

    * You may also want to change ``log_level`` in section ``[main]`` for easy debugging.

    * If you want to see console output of Polemarch webserver during it work,
      you need to add following option ``daemon = false`` in section ``[uwsgi]``.

#. Run Polemarch GUI with web-server and investigate with your debugger how it works to find out what need to be changed:

   .. sourcecode:: bash

      # run web-server
      python -m polemarch webserver

   This command also starts worker, if you have added worker options
   in ``/etc/polemarch/settings.ini``. More about worker section you can
   find in :doc:`"Install from PyPI" </quickstart>`.


#. Write tests for your changes (we prefer TDD approach). Execute those tests with all other Polemarch's tests by:

   .. sourcecode:: bash

      tox

   This command do PEP8 check of codebase and static analyzing with
   pylint and flake and run main python tests.
   Make sure that your code meets those checks.

   .. warning::
      Some tests linked to git may fail because local ``file://`` clones are considered unsafe by default.
      For more information please see
      `this topic <https://github.blog/2022-10-18-git-security-vulnerabilities-announced/#cve-2022-39253>`_.
      If you are encountered this problem, one of the solutions might be:

      .. sourcecode:: bash

         git config --global protocol.file.allow always

      Keep in mind that this command allows file clone **globally at git level for all your projects**.

#. Reflect your changes in documentation (if needed). Build documentation,
   read what you have changed and make sure that all is right. To build documentation use:

   .. sourcecode:: bash

      tox -e builddoc

#. Make commit. We prefer commit messages with briefly explanations of your changes.
   Unacceptable: "issue #1" or "fix".
   Acceptable: "fix end slashes for GET in docs".

#. Create pull request and refer it in issue.

  .. ATTENTION:: You must agree to :doc:`our contributor agreement </cla>` to
     prevent any license problems to project in future with your contribution.

  We prefer to format requests as follows:

    * **Title** should start with a description of your changes and follow these rules:

        * Feature - if you added new functionality for the user;
        * Chore - if you refactored the code or optimized performance, but nothing changed for the user;
        * Fix - if you fixed some bug and didn't add new independent functionality.
        * Docs - if you add some documents and didn't make any changes to the code.

    * **Description** should contain structured information about the work done:

        * BREAKING CHANGES - list of changes that break backward compatibility;
        * Changelog - list of common changes;
        * Closes/WIP - link to the issue you were working on.
        * Add screenshots for easy review of your changes.

That's it. Thank you for your contribution.
