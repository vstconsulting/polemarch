Polemarch's GUI
===============

Login
-----

Right after you open Polemarch web-gui, you will see login page. Default
login/password is admin/admin. Don't forget to change it in ``Users`` section.

After successfully login you will redirected to Polemarch main page. From there
you can access any function using menu at left of page (at top for mobile
versions). In menu you have followin sections: Users, Hosts, Groups,
Inventories, Projects, Tasks, Documentation (TODO: append more and ask about
appropriate documentation link). There is info for every section.

Users
-----

User management is important. It least you must change your user default
password if Polemarch is accessible from outside network. If your team have
many people, you can create account for everybody. Either with restricted
access or with full. Do do that press ``Create user``. Form will be opened.
Here you can specify information about new user (same form used for modyfing
existed user). ``Staff`` field means is user have full access to all entities
in system (aka admin/root user). After completion press ``Save`` user to save a
form.

Hosts
-----

Polemarch executes playbook at some hosts in your infrastructure. Host are
placed in groups, or directly in inventories. To add host press ``Create host``
in ``Hosts`` section. Specify here name of host (ip or dns-name). Also you can
specify range of hosts by choosing ``Type`` as ``RANGE`` and typing something
like this ``192.168.0.[1-10]``. You can add variables, associated to host,
which you currently edit by pressing ``Add variable``.

TODO: it must be rewrited somehow. I am writing obvious things...