Backup
------

Regular uploading of backups is a guarantee of the reliability of the application.
We recomended use SQL backup or copy database.

There are examples of SQL backup for MySQL and PostgreSQL below.

Making backup in MySQL:

    .. sourcecode:: mysql

       shell> mysqldump dbname > dump.sql

Here dbname is the name of your database, dump.sql is the file, where all SQL backup statements
will be saved.

Uploading of backup in MySQL:

    .. sourcecode:: mysql

       shell> mysqladmin create dbname
       shell> mysql dbname < dump.sql

Making backup in PostgreSQL:

    .. sourcecode:: bash

       pg_dump dbname > dump.sql

Uploading of backup in PostgreSQL:

    .. sourcecode:: bash

       createdb dbname
       psql dbname < dump.sql