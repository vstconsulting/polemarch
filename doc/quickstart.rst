.. include:: installation.rst

.. include:: backup.rst

Update
------

Before updating of package of any type it is strongly recommended to stop all services and create backup for safety.

Update from any old version
---------------------------

1. Firstly, we strongly recommend you to create a database backup and to stop all Polemarch services for safety.

2. Secondly, if you are updating from 0.x.y to 1.x.y, you need to update you current 0.x.y version to 1.0.0 version.

3. Then update to the latest version. If you don't know how to do it, look :doc:`"Install from PyPI" </quickstart>`.


Migrate
-------

Migrations are Django’s way of propagating changes you make to your models (adding a field, deleting a model, etc.)
into your database schema. They’re designed to be mostly automatic, but you need to know when to make migrations,
when to run them, and the common problems you might run into.

To run a ``migrate`` command you should run follow code:

.. sourcecode:: python

   polemarchctl migrate

Create superuser
----------------

A superuser is the user, who has all permissions.

To create a superuser account use the follow command:

.. sourcecode:: python

   polemarchctl createsuperuser

This command prompts for all required user's options.

Change password
---------------

To change password use the follow command:

.. sourcecode:: python

   polemarchctl changepassword [<username>]

It prompts you to enter a new password twice for the given user.
If the entries are identical, this immediately becomes the new password.
If you do not supply a user, the command will attempt to change the password of user whose username matches
the current user.