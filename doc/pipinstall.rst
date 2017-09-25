Run from source distribution
============================

If you not satisfied with packages, provided by Polemarch because you want
to install it to system for which those packages not provided (Ubuntu 14.04,
CentOS 6, etc) or customize your installation in more wide range, you may
appreciate our source distribution. Here is simple manual how to install it.

We assume that you have already downloaded Polemarch distribution - file
``polemarch-X.X.X.tar.gz`` placed in your home directory. But of course you
can install directly from PyPI without manually downloading package. In that
case this manual is also applicable with only one exception: use command
``pip install polemarch`` at 4 stage.

1. **Prerequisites**:

   * Python pip installed (package ``python-pip`` in Ubuntu).

   * Python development headers (``python-dev`` in Ubuntu).

   * Openssl development headers (``libssl-dev`` in Ubuntu).

   * libffi development headers (``libffi-dev`` in Ubuntu).

   * LibYAML development headers (``libyaml-dev`` in Ubuntu)

   Optional:

   * ``git`` to get working git import.

   * ``sshpass`` to get working ssh password auth during playbook execution.

2. Make sure you have latest pip and virtualenv in your system. You can do it
   with those commands:

   .. sourcecode:: bash

      sudo pip install --upgrade pip
      sudo pip install --upgrade virtualenv

3. Create virtualenv for Polemarch. It is only supported method to run
   Polemarch. Don't try to install it system-wide or locally using
   ``pip install --user``.

   .. sourcecode:: bash

      virtualenv polemarch
      cd polemarch
      source bin/activate

4. Run installation:

   .. sourcecode:: bash

      pip install ../polemarch-X.X.X.tar.gz

5. Now we need to create database structure for your
   Polemarch installation (by default it is creates SQLite database).
   Use this command right after installation and every time after update in
   order to update you database schema for new version of Polemarch (you don't
   lose your old data during this process).

   .. sourcecode:: bash

      polemarchctl migrate

6. Next part is start Polemarch web-server. Web-GUI of Polemarch works
   under uWSGI web-server. Before you start it, you must customize folders in
   config file, because by default our configuration suitable for .deb or
   .rpm installation, not for PyPI. Copy standard config template to preferred
   location and then edit it:

   .. sourcecode:: bash

      cp lib/python2.7/site-packages/polemarch/main/settings.ini ./
      vi settings.ini

   You must change options ``static-map``, ``pidfile`` and ``daemonize`` in
   ``[uwsgi]`` section to something like this (replace
   ``/home/username/polemarch`` with absolute path to your virtualenv created
   before):

   .. sourcecode:: ini

      [uwsgi]
      static-map = /static=/home/username/polemarch/lib/python2.7/site-packages/polemarch/static
      pidfile = /tmp/polemarchweb.pid
      daemonize = /tmp/polemarchweb.log

7. Then we just run it with command. We use ``web.ini`` instead of previously
   edited ``settings.ini`` because ``web.ini`` does some basic configuration
   and then executes ``settings.ini`` (replace ``/home/username/polemarch``
   with absolute path to your virtualenv created before):

   .. sourcecode:: bash

      export POLEMARCH_SETTINGS_FILE=/home/username/polemarch/settings.ini
      uwsgi ./lib/python2.7/site-packages/polemarch/web.ini

   It will start Polemarch GUI listening at 8080 port. To stop daemon later
   you can use command:

   .. sourcecode:: bash

      uwsgi --stop /tmp/polemarchweb.pid

   Where path to your pid file is same, which you specified in configuration
   before.

8. And finally to make your Polemarch able to actually run jobs, you must start
   at least one worker process. Because worker executes long-running tasks,
   such as running jobs or cloning repositories. Without him web-gui absolutely
   useless. Start it with this command:

   .. sourcecode:: bash

      celery -A polemarch.wapp:app worker -B -S schedule_file

   Here ``schedule_file`` is path to file, which Celery will use to store info
   about scheduling to run periodic tasks. You may prefer some other location
   for that file.

Congratulations! After all those commands if the moon and stars are in the
right position and your beard is impressive enough you end up with up and
running Polemarch installation.