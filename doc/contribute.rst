How to participate
==================

If you found some bug in the codebase or documentation or want some
improvement in project, you can easily do it myself. Here is how to proceed:

1. Create (or find if already exist) an
   `issue <https://gitlab.com/vstconsulting/polemarch/issues>`_
   for problem you want to solve. Maybe somebody is working on that or maybe
   during discussion will become clear that is not a problem.

2. To investigate problem, you probably must be able to run cloned project.
   To do so install required dependencies. See
   :doc:`"Run from source distribution" </pipinstall>` for more detailed
   explanation, which dependencies and why they are needed. System packages
   (example for Ubuntu 16.04):

   .. sourcecode:: bash

      sudo apt-get install python-pip python-dev libffi-dev libssl-dev git sshpass libyaml-dev

   Note: Your patch must work at Python 2 and Python 3. For Python 3 you should
   have at least Python 3.4.5, because older Python 3 may not work correctly
   with Polemarch.

3. Make sure you have latest pip and virtualenv in your system. You can do it
   with those commands:

   .. sourcecode:: bash

      sudo pip install --upgrade pip
      sudo pip install --upgrade virtualenv

4. Create virtualenv for Polemarch. It is only supported method to run
   Polemarch. Don't try to install it system-wide or locally using
   ``pip install --user``.

   .. sourcecode:: bash

      mkdir polemarch_project
      cd polemarch_project
      virtualenv venv
      source venv/bin/activate

5. Make your fork of our repository and clone it to your local development
   machine.

   .. sourcecode:: bash

      git clone https://gitlab.com/cepreu/polemarch.git

6. Create a branch for your work named with number of issue:

   .. sourcecode:: bash

      cd polemarch
      git checkout -b issue_1

7. Install python dependencies:

   .. sourcecode:: bash

      pip install -r requirements-git.txt -r requirements.txt -r requirements-doc.txt tox

8. Initialize empty database with all required stuff (tables and so on)
   for Polemarch:

   .. sourcecode:: bash

      ./polemarchctl migrate

9. Enable debug in settings.ini. You can edit ``polemarch/main/settings.ini``
   but make sure that changes in that file does not goes to you commit. Or you
   can copy ``polemarch/main/settings.ini`` to ``/etc/polemarch/settings.ini``
   (default settings location for Polemarch). Type ``debug = true`` in section
   ``[main]``. Otherwise there will no available static files and debug
   features when you start development web-server.

10. Run Polemarch GUI with development web-server and investigate with your
    debugger how it works to find out what need to be changed:

    .. sourcecode:: bash

       # run web-server
       python polemarchctl runserver  0.0.0.0:8080

    .. sourcecode:: bash

       # run worker
       python ../venv/bin/celery -A polemarch.wapp:app worker -l INFO -B -S schedule_file

11. You may also want to change ``./polemarch/main/settings.ini``
    to change ``log_level`` for easy debugging.

12. Write tests for your changes and changes itself (we prefer TDD approach).
    Execute those tests with all other Polemarch's tests by:

    .. sourcecode:: bash

       make test

    This command also doing PEP8 check of codebase and static analyzing with
    pylint and flake. Make sure that your code meet those checks.

13. Reflect your changes in documentation (if needed). Build documentation,
    read what you changed and make sure that all right. To build documentation
    use:

    .. sourcecode:: bash

       make docs

14. Make commit. We prefer commit messages with briefly explains your
    changes. Bad: "issue #1" or "fix". Good: "fix end slashes for GET in docs".

15. Create pull request and refer it in issue.

**ATTENTION**: You must agree to :doc:`our contributor agreement </cla>` to
prevent any license problems to project in future with your contribution.

That's it. Thank you for your contribution.