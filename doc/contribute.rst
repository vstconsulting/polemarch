How to participate
==================

If you found some bug in the codebase or documentation, or you want some
improvement in 'Polemarch' project, you can easily inform us about it.
Here is how to proceed:

1. Create (or find if it already exists) an
   `issue <https://gitlab.com/vstconsulting/polemarch/issues>`_
   for problem you want to solve. Maybe somebody is already working on it or maybe
   during discussion becomes clear that it is not a problem at all.

2. To investigate problem, you probably must be able to run cloned project.
   To do so install required dependencies. See
   :doc:`"Install from PyPI" </quickstart>` for more detailed
   explanation, which dependencies and why they are needed. System packages
   (example for Ubuntu 16.04):

   .. sourcecode:: bash

        sudo apt-get install python-pip python-dev libffi-dev libssl-dev git sshpass libyaml-dev

   Note: Your patch must work at Python 2 and Python 3. For Python 3 you should
   have at least Python 3.5, because older Python 3 may not work correctly
   with Polemarch.

3. Make sure you have latest pip and tox in your system. You can do it
   with those commands:

   .. sourcecode:: bash

      sudo pip install --upgrade pip
      sudo pip install --upgrade tox==3.0.0


5. Make fork of our repository and clone it to your local development
   machine.

   .. sourcecode:: bash

      git clone https://gitlab.com/vstconsulting/polemarch.git

6. Create a branch for your work named with number of issue:

   .. sourcecode:: bash

      cd polemarch
      git checkout -b issue/1

7. Create and activate virtualenv:

   .. sourcecode:: bash

      tox -e contrib
      source env/bin/activate

8. Initialize empty database with all required stuff (tables and so on)
   for Polemarch:

   .. sourcecode:: bash

      python -m polemarch migrate

9. Enable debug in settings.ini. You can edit ``polemarch/main/settings.ini``
   but make sure that changes in that file does not goes to you commit. Or you
   can copy ``polemarch/main/settings.ini`` to ``/etc/polemarch/settings.ini``
   (default settings location for Polemarch). Type ``debug = true`` in section
   ``[main]``. Otherwise there will be no available static files and debug
   features when you start development web-server.

10. Run Polemarch GUI with web-server and investigate with your
    debugger how it works to find out what need to be changed:

    .. sourcecode:: bash

       # run web-server
       python -m polemarch webserver

    This command also starts worker, if you have added worker options
    in ``/etc/polemarch/settings.ini``. More about worker section you can
    find on :doc:`"Install from PyPI" </quickstart>`.

    If you want to see console output of Polemarch webserver during it work,
    you need to add following option in ``/etc/polemarch/settings.ini``:

    .. sourcecode:: ini

      [uwsgi]
      daemon = false

11. You may also want to change ``./polemarch/main/settings.ini``
    to change ``log_level`` for easy debugging.

12. Write tests for your changes (we prefer TDD approach).
    Execute those tests with all other Polemarch's tests by:

    .. sourcecode:: bash

       make test ENVS=flake,pylint,py27-install,py36-coverage

    This command do PEP8 check of codebase and static analyzing with
    pylint and flake and run main python tests.
    Make sure that your code meets those checks.

13. Reflect your changes in documentation (if needed). Build documentation,
    read what you have changed and make sure that all is right. To build documentation
    use:

    .. sourcecode:: bash

       make docs

14. Make commit. We prefer commit messages with briefly explanations of your
    changes. Unacceptable: "issue #1" or "fix".
    Acceptable: "fix end slashes for GET in docs".

15. Create pull request and refer it in issue.

.. ATTENTION::
    You must agree to :doc:`our contributor agreement </cla>` to
    prevent any license problems to project in future with your contribution.

That's it. Thank you for your contribution.
