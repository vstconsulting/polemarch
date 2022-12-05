
Welcome to Polemarch's documentation!
=====================================

**Polemarch** is a web interface that makes it easy for IT teams to work with ansible. It's designed to be compatible
with all other projects using the ansible cli without complicated adaptation.
Polemarch collects all ansible best practices for organizing the code of infrastructure projects and adds such features as
execution of scheduled tasks, creating execution templates (instead of complex bash/powershell scripts).
Each launch is logged and stored in the history to control and monitor the execution.

Polemarch allows you to control access to infrastructure, credentials without having to transfer these data.
You can set up Inventory so that different projects only have access to the host they need.
This is possible by reusing hosts and groups, as well as a set of their variables in different inventories.
All variables are stored in the database, and key variables (such as passwords and keys)
after loading are stored on the server without showing the user their contents.

Since Polemarch is a web app, you can run the infrastructure remotely without actually having access to your infrastructure.
This may be handy for remote teams. Besides in some scripts you can organize infrastructure management work
without employees having access to the interface.

Polemarch developers have tried to provide the maximum set of options for extending functionality through web or script hooks,
as well as through customization of the cli utility for launching playbooks/modules (for example, running in an isolated chroot/docker environment).
The well-documented REST API allows the user to integrate Polemarch with any product that can make remote requests.

The project implies maximum compatibility with ansible cli (specifically with ansible and ansible-playbook, at the moment),
so it doesn't require special knowledge other than that required to work with ansible.
It is not the intention of this documentation to describe all use cases,
only those that are necessary to understand how the web interface works.
In some cases it's worth having official ansible documentation.

You could find latest releases
`there <https://github.com/vstconsulting/polemarch/releases>`_.
Also you could find source code in `official repository
<https://gitlab.com/vstconsulting/polemarch/>`_.

Contact us on `any questions
<https://gitlab.com/vstconsulting/polemarch/issues/new?issuable_template%5D=Ask&issue%5Btitle%5D=Ask%20about>`_
or `report bugs
<https://gitlab.com/vstconsulting/polemarch/issues/new?issuable_template%5D=Bug&issue%5Btitle%5D=Bug%20in>`_.

Official site: https://polemarch.org/

We also help you via:

`Stack Overflow
<https://stackoverflow.com/questions/tagged/polemarch>`_ - tag for questions about our application on Stack Overflow

.. toctree::
   :hidden:

   Home <self>

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   quickstart
   config
   gui
   plugins
   api
   contribute
   cla
