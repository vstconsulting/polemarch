Run from source distribution
============================

If you not satisfied with packages, provided by Polemarch because you want
to install it to system for which those packages not provided (Ubuntu 14.04,
CentOS 6, etc) or customize your installation in more wide range, you may
appreciate our source distribution. Here is simple manual how to install it.

Let's assume that you have already downloaded Polemarch distribution - file
``polemarch-0.0.1.tar.gz`` placed in your home directory. Here what you need
to do:

1. **Prerequisites**:

   * Apache web server and his development headers (packages
     ``apache2``, ``apache2-dev`` in Ubuntu).

   * Python pip installed (package ``python-pip`` in Ubuntu).

   * Python development headers (``python-dev`` in Ubuntu).

   * Openssl development headers (``libssl-dev`` in Ubuntu).

   * libffi (``libffi-dev`` in Ubuntu).

   Optional:

   * ``git`` to get working git import.

   * ``sshpass`` to get working ssh password auth during playbook execution.

2. Run installation:

   .. sourcecode:: bash

      pip install polemarch --user

   **Caution**: without ``--user`` switch this operation installs many binaries
   in system ``bin`` folder and many python libraries in system ``lib`` folder.
   It can break some of your packages installed by regular package management
   system. We recommend you to use ``--user`` switch of pip to install
   Polemarch only for current user in his home directory, but it is up to you
   to make decision.

3. After installation you have available command - ``polemarchctl`` in your
   ``.local/bin/`` directory. We suggest you to add it to your path like this:

   .. sourcecode:: bash

      export PATH=$PATH:~/.local/bin

   You can type this command without arguments to get help about available
   subcommands. For every subcommand you can get help by entering
   ``polemarchctl help <subcommand>``. Probably you have to use only two
   commands: ``migrate`` and ``webserver``. First one is to create database
   structure for you Polemarch installation (by default it is creates SQLite
   database). Use it right after installation and every time after update in
   order to update you database schema for new version of Polemarch (you don't
   lose your old data during this process).

   .. sourcecode:: bash

      polemarchctl migrate

4. Second one is ``webserver``. It is to run web-GUI of Polemarch under Apache.
   Here of example how to use this subcommand:

   .. sourcecode:: bash

      polemarchctl webserver -P 8080

   It will start Polemarch GUI listening at 8080 port. All logging redirected
   to stderr.

5. And finally to make your Polemarch able to actually run jobs, you must start
   at least one worker process. Because worker executes long-running tasks,
   such as running jobs or cloning repositories. Without him web-gui absolutely
   useless. Start it with this command:

   .. sourcecode:: bash

      celery -A polemarch.celery_app:app worker -B -S django

   Celery is distributed task queue included in Polemarch installation. All
   options above is required to for worker to run properly. But there is many
   additional options which you can learn from Celery help. Use ``celery -h``
   for details.

Congratulations! After all those commands if the moon and stars are in the
right position and your beard is impressive enough you end up with up and
running Polemarch installation.