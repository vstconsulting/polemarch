.. |id_field_def| replace:: the unique key of object in database
.. |owner_field_def| replace:: user, who owns this
.. |create_button_def| replace:: this button opens the page for creation of new
.. |edit_button_def| replace:: this button turns on edit mod for this page
.. |save_new_button_def| replace:: this button saves new
.. |save_button_def| replace:: this button saves all changes you have made on this page
.. |reload_button_def| replace:: this button resets all changes that you have done on this page
.. |copy_button_def| replace:: this button opens "copy" action page
.. |set_owner_button_def| replace:: this button opens "set owner" action page
.. |remove_button_def| replace:: this button deletes
.. |exec_button_def| replace:: this button starts action execution


GUI workflow
==============

Welcome to Polemarch GUI
------------------------

In this section of our documentation we will tell you about Polemarch GUI's opportunities.

Let's begin with Dashboard page:

.. image:: new_screenshots/dashboard.png

As you can see, Polemarch GUI provides user with 2 menus:

* the first one is located in the left sidebar and it is aimed
  to provide user with navigation between main system objects, like projects, inventories, history records and etc.

* the second one is located at the top of browser window and it is aimed
  to navigate user to API section, to user's page and to logout page.

Also there are some widgets on content block of Dashboard page.
For example, there you can check the statistics of your tasks for different periods of time.

Before you start
----------------

Before you can do any job with Polemarch you should create at least one project, because all
Polemarch's functions are linked to the project.


Projects
--------

So, to start your work with Polemarch you should create project. To do this, you need to select 'Projects' in the left side menu
and click the :guilabel:`Create` button.

There are 3 project types in Polemarch:

* GIT - Polemarch can sync with your git project.

* TAR - If you don't have git repository, you can upload tar archive with project files
  from any http url.

* MANUAL - Empty project. This kind of project will be appropriate for you,
  if you want run only modules without any playbooks or something. Polemarch will
  create folder for your project files in `projects_dir` (you can specify it
  in settings) named as project id (you can see at URL), where you
  place manually your project files (like playbooks or something).

Let's look at the example of GIT project's creation:

.. image:: new_screenshots/create_project.png

As you can see, the form of new project creation consists of 7 fields:

General:

* **Name** - name of your project;

* **Repo type** - type of project repository (GIT, TAR, MANUAL);

* **Directory with playbooks** - you can specify the path to the directory with playbooks.

Repository:

* **Repo URL** - URL to your repository;

* **Branch for GIT (branch/tag/SHA) or TAR (subdir)** - you can specify the branch you want or leave this field blank
  to get the default branch;

* **Repo auth type** - type of authentication (NONE, KEY, PASSWORD);

* **Repo auth data** - key or password value (if you choose KEY or PASSWORD authentication type);

Before we continue talking about the structure of our project, we used
`ansible best practice <https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html#directory-layout>`_
and run playbooks from project:

    * ``ansible.cfg`` - used to setup settings. For detailed information about configuration file read `settings reference <https://docs.ansible.com/ansible/latest/reference_appendices/config.html#ansible-configuration-settings-locations>`_.

      If you setup modules directory, we import all modules from this directory and set name ``polemarch.project.[module_name]``.

    * Playbook - import all files with ``.yml`` extention from root directory of the **Project**.

    * If you need to set variables globally, not only for run, you can use ``group_vars`` and ``host_vars`` in root directory of project.

After project creation you'll see the next page:

.. image:: new_screenshots/test_project_1.png

As you can see there are some new fields on this page:

* **Id**: |id_field_def|.

* **Status**: Polemarch project status.
  Possible values are:

  * NEW - newly created project,
  * WAIT_SYNC - repository synchronization has been scheduled, but has not started to perform yet,
  * SYNC - synchronization is in progress,
  * ERROR - synchronization failed,
  * OK - project is synchronized.

* **Revision** - GIT project revision.

* **Branch** - branch of your GIT project, to what your Polemarch project was synced.

* **Owner** - |owner_field_def| project.

Also there are some new buttons:

* :guilabel:`Edit` - |edit_button_def|;
* :guilabel:`Remove` - |remove_button_def| project.

Sublinks buttons:

* :guilabel:`Execution template` - this button opens project's template list;
* :guilabel:`History` - this button opens project executions' history list;
* :guilabel:`Inventory` - this button opens project's inventory list;
* :guilabel:`Module` - this button opens project's module list;
* :guilabel:`Periodic task` - this button opens project's periodic task list;
* :guilabel:`Playbook` - this button opens project's playbook list;
* :guilabel:`Variables` - this button opens project's variables list.

Action buttons:

* :guilabel:`Copy` - |copy_button_def|;
* :guilabel:`Execute module` - this button opens "execute module" action page;
* :guilabel:`Execute playbook` - this button opens "execute playbook" action page;
* :guilabel:`Set owner` - |set_owner_button_def|;
* :guilabel:`Sync` - this button syncs your Polemarch project with GIT repository.

If you want to edit values of some fields on any page in Polemarch, you should click the
:guilabel:`Edit` button to activate edit mod.

.. image:: new_screenshots/test_project_1_edit.png

In this mode, you can change the project's name, update the repository URL, and make notes about your project.

* :guilabel:`Save` - |save_button_def|.
* :guilabel:`Reload` - |reload_button_def|.

Now, let's back to read only mod of our project page.

.. image:: new_screenshots/test_project_1.png

As you can see, now project's status is "NEW", so we need to click the :guilabel:`Sync` button
to get all needed data from your GIT project.

.. image:: new_screenshots/test_project_2.png

Once your project status changes to "OK", you can start working with Polemarch.

.. warning:: If you update something in your GIT repository, don't forget to run sync in
             Polemarch for pulling your changes.


Project variables
-----------------

If you need to change some properties of your project (for example, branch, key or password of project),
you can do it on the "variables" page of your project:

.. image:: new_screenshots/test_project_variables_1.png

As you can see, now current project has only 2 variables:

* **repo_branch** - branch of GIT repository;
* **repo_type** - type of Polemarch project.

Other available project variables, that you can add with clicking the :guilabel:`Create` button:

* **repo_sync_on_run** - boolean, if true, Polemarch will sync project before every task execution (don't use in concurrent executions, experimental);
* **repo_sync_on_run_timeout** - you can select a timeout when "repo_sync_on_run" will stop the sync attempt;
* **repo_password** - GIT repository password;
* **repo_key** - GIT repository key;
* **playbook_path** - path to playbook;
* **ci_template** - runs the selected template during project synchronization;
* Environment variables, with key starting from **env_**. For example **env_test_var** would create environment variable ``test_var`` on run tasks from this project.

Let's edit **repo_branch** variable. To do it you need click the **repo_branch** item in list.
Then you will see the following page:

.. image:: new_screenshots/test_project_variables_2.png

After clicking the :guilabel:`Edit` button you need to change branch name of 'value' field. Then click the :guilabel:`Save` button.

.. image:: new_screenshots/test_project_variables_3.png

After changing of **repo_branch** variable you need to sync your Polemarch project
to get files from selected branch.
Until you synchronize the project, you'll see in the "Branch" field your old branch and the new one.

.. image:: new_screenshots/test_project_variables_3_1.png

.. note::
    If your need to choose branch with tag name
    you should use following format of branch name ``tags/[tag_name]``.

After successful project synchronization you will see selected branch name in 'branch' field:

.. image:: new_screenshots/test_project_variables_4.png


Module execution
----------------

The simplest way to start using Polemarch is to execute module.
To make this action click the :guilabel:`Execute module` button on project page.

.. image:: new_screenshots/execute_module_1.png

As you can see, there are two fields on this page:

* **Module** - autocomplete field with the list of project's modules.
* **Add field** - select field, that provides user with new variables fields for module execution.

Also there is only one button on this page:

* :guilabel:`Execute module` - |exec_button_def|.

For example, let's execute module ``shell`` on ``localhost`` with argument ``uptime``.
To do it we need to add next fields:

* **Inventory** - it can be inventory from Polemarch system, list of hosts, that are separated by ``,``, or path to your inventory in project folder.
* **Group** - to which hosts from inventory execute this module.
* **Connection** - type of connection.
* **Args** - list of arguments for current module.

After all fields have been filled, our page started look like:

.. image:: new_screenshots/execute_module_2.png

So, let's execute our first task on Polemarch! To do it click the :guilabel:`Execute module` button.

When status of your module execution changes to "OK" you will see the next page:

.. image:: new_screenshots/execute_module_3.png
.. image:: new_screenshots/execute_module_4.png


Execution templates
-------------------

In previous abstract to execute module we needed to fill several fields.
To do it before every module/playbook execution is rather inconvenient.
In this case Polemarch templates save our time and nerves.
Polemarch template is an object, that saves all options that user used during task execution.

For example, let's create task template (template that uses playbooks).
To do it click the :guilabel:`Execution templates` button on project page.
As you can see, there are no templates in the project's template list now.

.. image:: new_screenshots/create_template.png

There is only one button here:

* :guilabel:`Create` - |create_button_def| template.

To create template click the :guilabel:`Create` button on this page.

.. image:: new_screenshots/create_template_2.png

As you can see, there are several fields on this page:

* **Name** - name of template.

* **Type** - type of template (MODULE or TASK).

* **Notes** - not required field for some user’s notes, for example,
  for what purpose this template was created or something like this.

* **Inventory** - it can be inventory from Polemarch system, list of hosts, that are separated by ``,``, or path to your inventory in project folder.

* **Playbook** - name of playbook, which template will be used during execution.

* **Add fields** - here you can add variables for this template. In our case we need to create variable ``connection=local``,
  because we use "localhost" as inventory.

After all fields have been filled, our page started look like:

.. image:: new_screenshots/create_template_3.png

After template creation you will see the next page:

.. image:: new_screenshots/create_template_4.png

As you can see there is only one new field on this page:

* **Id** - |id_field_def|.

There are also several buttons here:

* :guilabel:`Edit` - |edit_button_def|.
* :guilabel:`Remove` - |remove_button_def| template.

Sublinks buttons:

* :guilabel:`Option` - this button opens template's option list.

Action buttons:

* :guilabel:`Execute` - this button opens "execute template" action page.

Now we are ready to execute our template. To do it you need to click the :guilabel:`Execute` button.

.. image:: new_screenshots/execute_template_1.png

As you can see, there is only one field on this page:

* **Option** - autocomplete field with the list of template's options.

Also there is only one button on this page:

* :guilabel:`Execute` - |exec_button_def|

We don't have any template's options in our system, so just click the :guilabel:`Execute` button.

When status of your template execution changes to "OK" you will see the next page:

.. image:: new_screenshots/execute_template_2.png
.. image:: new_screenshots/execute_template_3.png


Periodic tasks
--------------

Now let's imagine, that you need to execute some task (module/playbook/template)
with some interval or on the first day of month, for example, and you do not want
to execute it everytime by yourself.

In this case, Polemarch has such useful object type, as periodic task.

Periodic task - is a module/playbook/template execution
which Polemarch makes by himself with some interval.

Let's create periodic task based on our "test-task-template".
To do it open project page:

.. image:: new_screenshots/test_project_variables_4.png

And choose :menuselection:`Sublinks --> Periodic task`:

.. image:: new_screenshots/periodic_task_empty_list.png

As you can see, there are no periodic tasks in the project's periodic task list now.

There is only one button here:

* :guilabel:`Create` - |create_button_def| periodic task.

To create periodic task click the :guilabel:`Create` button on this page.

.. image:: new_screenshots/create_periodic_task_1.png

As you can see, the form of new periodic task creation consists of following fields:

* **Name** - name of your periodic task.

* **Notes** - not required field for some user’s notes, for example,
  for what purpose this periodic task was created or something like this.

**Execute Parameters**

* **Task type** - type of periodic task (PLAYBOOK, MODULE, TEMPLATE).

* **Mode** - name of module or playbook (for periodic tasks with PLAYBOOK/MODULE type only).

* **Inventory** - it can be inventory from Polemarch system, list of hosts, that are separated by ``,``, or path to your inventory in project folder
  (for periodic tasks with PLAYBOOK/MODULE type only).

* **Template** - name of template (for periodic tasks with TEMPLATE type only).

* **Template opt** - name of template's option (for periodic tasks with TEMPLATE type only).

* **Save result** - boolean field, it means to save or not to save results of periodic tasks execution in history.

**Schedule**

* **Enable** - boolean field, it means to activate or deactivate periodic task.

* **Interval type** - type of execution interval (CRONTAB, INTERVAL).

* **Schedule** - value of execution interval.

  * If "interval type" = INTERVAL, value of this field means amount of seconds.
  * If "interval type" = CRONTAB, value of this field means CRONTAB interval.

After all fields have been filled, our page started look like:

.. image:: new_screenshots/create_periodic_task_2.png

After periodic task creation you will see the next page:

.. image:: new_screenshots/test_periodic_task.png

As you can see there is only one new fields on this page:

* **Id** - |id_field_def|.

There are also several buttons here:

* :guilabel:`Edit` - |edit_button_def|.
* :guilabel:`Remove` - |remove_button_def| periodic task.

Sublinks buttons:

* :guilabel:`Variables` - this button opens project’s variables list (for periodic tasks with PLAYBOOK/MODULE type only).

Action buttons:

* :guilabel:`Execute` - this button opens "execute periodic task" action page.

Let's start our periodic task execution. To do it click the :guilabel:`Execute` button.

.. image:: new_screenshots/periodic_task_execution_1.png
.. image:: new_screenshots/periodic_task_execution_2.png

As you can see on history page, our 'test-periodic-task' executes every 10 seconds,
as we set it during periodic task creation.

.. image:: new_screenshots/periodic_task_execution_history.png


Inventory
---------

If you don't want to use 'inventory' as just list of hosts separated by ``,``
or do not have inventory file in you GIT project ("./inventory", for example),
you need to create it in Polemarch.

.. warning::
    Do not forget to add you inventory to project after it's creation.
    To do it click the :guilabel:`Inventory` button on project page.

By inventory’s creation in this case, we mean creation of inventory
that includes at least one group, which, in turn, includes at least one host.
In other words, in addition to the inventory, the user must create a host and a group.

To better understand this, let’s look at next images, which will explain you how to create
inventory.

To create inventory you should choose 'Inventories' in left side menu and click the :guilabel:`Create` button.
Here you can see the inventory creation form.

.. image:: new_screenshots/create_inventory.png

As you can see, there are only 2 fields on this page:

* **Name** - name of inventory.

* **Notes** - not required field for some user’s notes, for example,
  for what purpose this inventory was created or something like this.

And there is only one button here:

* :guilabel:`Save` - |save_new_button_def| inventory.

After inventory creation you will see the next page:

.. image:: new_screenshots/test_inventory.png

As you can see there are two new fields on this page:

* **Id** - |id_field_def|.

* **Owner** - |owner_field_def| inventory.

Also there are some new buttons here:

* :guilabel:`Edit` - |edit_button_def|.
* :guilabel:`Remove` - |remove_button_def| inventory.

Sublinks buttons:

* :guilabel:`All groups` - this button opens inventory's all groups list
  (list of groups, which includes also groups that are nested into inventory groups).
* :guilabel:`All hosts` - this button opens inventory's all hosts list.
  (list of hosts, which includes also hosts that are nested into inventory groups).
* :guilabel:`Group` - this button opens inventory's group list.
* :guilabel:`Host` - this button opens inventory's host list.
* :guilabel:`Variables` - this button opens inventory's variables list.

Action buttons:

* :guilabel:`Copy` - |copy_button_def|.
* :guilabel:`Set owner` - |set_owner_button_def|.

Let’s look how you can create a group for this inventory.
To do it click the :guilabel:`Group` button.


Group
-----

.. image:: new_screenshots/test_inventory_group.png

As you can see, there are no groups in the inventory's group list now.

There are two buttons here:

* :guilabel:`Create` - |create_button_def| group.
* :guilabel:`Add` - this button opens the all group list from database,
  from which you can choose group for this inventory.

We need to create a group. To do it click the :guilabel:`Create` button.

.. image:: new_screenshots/create_group.png

As you can see, the form of new group creation consists of following fields:

* **Name** - name of your group.

* **Contains groups** - boolean field, it means ability of group to contain child groups.

* **Notes** - not required field for some user’s notes, for example,
  for what purpose this group was created or something like this.

After group creation you will see the next page:

.. image:: new_screenshots/test_group.png

As you can see there are two new fields on this page:

* **Id** - |id_field_def|.

* **Owner** - |owner_field_def| group.

Also there are some buttons here:

* :guilabel:`Edit` - |edit_button_def|.
* :guilabel:`Remove` - |remove_button_def| group.

Sublinks buttons:

* :guilabel:`Hosts` - this button opens group's host list.
* :guilabel:`Variables` - this button opens group's variables list.

Action buttons:

* :guilabel:`Copy` - |copy_button_def|.
* :guilabel:`Set owner` - |set_owner_button_def|.

Hosts
-----

Let’s look how you can create a host for this group.
To do it click the :guilabel:`Create` button.

.. image:: new_screenshots/test_inventory_group_host.png

As you can see, there are no hosts in the group's host list now.

There are two buttons here:

* :guilabel:`Create` - |create_button_def| host.
* :guilabel:`Add` - this button opens the all host list from database,
  from which you can choose host for this group.

We need to create host. To do it click the :guilabel:`Create` button.

.. image:: new_screenshots/create_host.png

As you can see, the form of new host creation consists of following fields:

* **Name** - name of your host.

* **Notes** - not required field for some user’s notes, for example,
  for what purpose this host was created or something like this.

* **Type** - type of host (RANGE, HOST).

  * RANGE -  range of IPs or hosts.
  * HOST - single host.

After host creation you will see the next page:

.. image:: new_screenshots/test_host.png

As you can see there are two new fields on this page:

* **Id** - |id_field_def|

* **Owner** - |owner_field_def| host.

Also there are some buttons here:

* :guilabel:`Edit` - |edit_button_def|.
* :guilabel:`Remove` - |remove_button_def| host.

Sublinks buttons:

* :guilabel:`Variables` - this button opens host's variables list.

Action buttons:

* :guilabel:`Copy` - |copy_button_def|.
* :guilabel:`Set owner` - |set_owner_button_def|.

Let’s look how you can create a variables for host, group and inventory.


Variables for inventory, group, hosts
-------------------------------------

The process of variable creation for inventory is the same as for group or host.
So, let's look it at the example of variable creation for host.

.. image:: new_screenshots/test_host.png

To do it click the :guilabel:`Variables` button on the host page:

.. image:: new_screenshots/test_host_variables.png

As you can see, there are no variables in the host's variables list now.

There is only one button here:

* :guilabel:`Create` - |create_button_def| variable.

To create variable click the :guilabel:`Create` button:

.. image:: new_screenshots/test_host_variables_1.png

As you can see, the form of new host variable creation consists of following fields:

* **Key** - key of variable.

* **Value** - value of variable.

After variable creation you will see the next page:

.. image:: new_screenshots/test_host_variables_2.png

As you can see there is only 1 new field on this page:

* **Id** - |id_field_def|.


Import inventory
----------------

If you have an inventory file and you want to add items from it to Polemarch,
you can do it quickly using "Import Inventory".

For example, let's use next inventory file:

.. sourcecode:: ini

    [imported-test-group]
    imported-test-host ansible_host=10.10.10.17

    [imported-test-group:vars]
    ansible_user=ubuntu
    ansible_ssh_private_key_file=example_key

To import inventory you should open inventory list page:

.. image:: new_screenshots/import_inventory.png

And click the :guilabel:`Import inventory` button. Then you will see the next page:

.. image:: new_screenshots/import_inventory_2.png

As you can see, the form of "Import inventory" action consists of two fields:

* **Name** - name of your inventory.
* **Row data** - content of your inventory file.

After filling of all fields you should click the :guilabel:`Import inventory` button and then you will see
page of your imported inventory:

.. image:: new_screenshots/import_inventory_3.png

This inventory includes "imported-test-group" from imported inventory file:

.. image:: new_screenshots/import_inventory_4.png

And "imported-test-group" includes "imported-test-host" from imported inventory file:

.. image:: new_screenshots/import_inventory_5.png

Also "imported-test-group" includes variables "ansible_user" and "ansible_ssh_private_key_file" from imported inventory file:

.. image:: new_screenshots/import_inventory_7.png

"imported-test-host" includes variable "ansible-host" from imported inventory file:

.. image:: new_screenshots/import_inventory_6.png


.polemarch.yaml
---------------

``.polemarch.yaml`` is a file for a quick deployment of Polemarch project.
By quick deployment of Polemarch project we mean automatic creation of some templates
for this project (during project sync) and using of additional interface for quick task execution.

``.polemarch.yaml`` is not required file for Polemarch work,
but if you want to use features of ``.polemarch.yaml``, you have to store it in
the base directory of (GIT, MANUAL, TAR) project.

Structure of ``.polemarch.yaml`` consists of next fields:

* **sync_on_run** - boolean, it means to get or not to get settings from ``.polemarch.yaml``
  during each project sync.
* **templates** - dictionary, consists of template objects
  (their structure is similar to template's API structure except the 'name' field).
* **templates_rewrite** - boolean, it means to rewrite or not to rewrite templates in project
  with names equal to templates' names from ``.polemarch.yaml``.
* **view** - dictionary, it is a description of web-form, that will be generated from ``.polemarch.yaml``.
  It consists of:

  * **fields** - dictionary, it consists of objects, that describe fields properties:

    * **title**: title of field, that Polemarch will show in web-form.
    * **default**: default value of field. Default: ``''`` - for strings, ``0`` - for numbers.
    * **format**: format of field. For today next field formats are available: string, integer, float, boolean. Default: string.
    * **help**: some help text for this field.

  * **playbooks** - dictionary, it consists of objects, that describes playbook properties:

    * **title**: title of playbook, that Polemarch will use during playbook execution.
    * **help**: some help text for this playbook.

Example of ``.polemarch.yaml``:

.. sourcecode:: yaml

    ---
    sync_on_run: true
    templates:
        test-module:
            notes: Module test template
            kind: Module
            data:
                group: all
                vars: {}
                args: ''
                module: ping
                inventory: localhost,
            options:
                uptime:
                    args: uptime
                    module: shell
        test playbook:
            notes: Playbook test template
            kind: Task
            data:
                vars: {"become": true}
                playbook: main.yml
                inventory: localhost,
            options:
                update: {"playbook": "other.yml"}
    templates_rewrite: true
    view:
        fields:
            string:
                title: Field string
                default: 0
                format: string
                help: Some help text
            integer:
                title: Field integer
                default: 0
                format: integer
                help: Some help text
            float:
                title: Field float
                default: 0
                format: float
                help: Some help text
            boolean:
                title: Field boolean
                default: 0
                format: boolean
                help: Some help text
            enum_string:
                title: Field enum_string
                default: 0
                format: string
                help: Some help text
                enum: ['Choice1', 'Choice2', 'Choice3']
            unknown:
                title: Field unknown
                default: 0
                format: invalid_or_unknown
                help: Some help text
        playbooks:
            main.yml:
                title: Execute title
                help: Some help text


In GUI process of working with ``.polemarch.yaml`` will be the following:

Firstly, you need to create a project with ``.polemarch.yaml``
(or to add ``.polemarch.yaml`` to existing project).
For example, let's create new GIT project, that has in its base directory ``.polemarch.yaml`` file
from the example above:

.. image:: new_screenshots/create_project_with_polemarch_yaml.png

In the field 'Repo url' you should insert URL of project that has in its base directory
``.polemarch.yaml`` file.

After project creation you will see the ordinary project page:

.. image:: new_screenshots/create_project_with_polemarch_yaml_2.png

Then you need to click the :guilabel:`Sync` button. After project synchronization you will see the next page:

.. image:: new_screenshots/create_project_with_polemarch_yaml_3.png
.. image:: new_screenshots/create_project_with_polemarch_yaml_3_1.png

As you can see, all fields that we mentioned in the example ``.polemarch.yaml`` were added
to this web-form. Values of all these fields will be used as ansible ``extra_vars`` parameter during task execution.

The remaining fields mean following:

* **Inventory** - it can be inventory from Polemarch system, list of hosts, that are separated by ``,``, or path to your inventory in project folder.
* **User** - set it if your don't have ``ansible_user`` variable in your inventory.
* **Key file** - set it if your don't have ``ansible_ssh_private_key_file`` variable in your inventory.

Button :guilabel:`Execute title` will execute playbook "main.yml", as we mentioned in ``.polemarch.yaml`` file.

Also templates from ``.polemarch.yaml`` were added to just created Polemarch project.

.. image:: new_screenshots/create_project_with_polemarch_yaml_4.png

Community project samples
-------------------------

Polemarch has his own list of community repositories, which provide you with stuff,
that is able to deploy different services in extremely quick and convenient way.
Community project sample is an entity, that clones repository from community list into your Polemarch.
Some community project samples have only list of playbooks, but most have ``.polemarch.yaml`` file,
that helps you to deploy tasks even faster.

Let's look how it works on examples.

Firstly, open page with community project samples list.

.. image:: new_screenshots/community_template.png

As you can see, there is a table with list of community repositories,
that consists of following columns:

* **Name** - name of community repository.
* **Type** - type of community repository.

Let's open "WordPress" community repository page.

.. image:: new_screenshots/community_template_1.png

As you can see, the community repository page consists of following fields:

* **Id** - id of community repository;
* **Name** - name of community repository;
* **Description** - description of community repository;
* **Type** - type of community repository;
* **Repository** - URL of community repository.

Also there is only one action button on this page:

* :guilabel:`Use it` - this buttons opens page where you can set project's name.

Let's click the :guilabel:`Use it` button.

.. image:: new_screenshots/community_template_2.png

As you can see, this action page has only one field:

* **Name** - name of project, that will be clone of current community repository in your Polemarch.
  By default it will be name of community repository with UUID.

After that you need to click :guilabel:`Use it` button once more time and you will be redirected to the page of just created project:

.. image:: new_screenshots/community_template_3.png

As you can see value of field "Repository" is the same as in "WordPress" community repository.

Then you need to click the :guilabel:`Sync` button. After project synchronization you will see the next page:

.. image:: new_screenshots/community_template_4.png
.. image:: new_screenshots/community_template_5.png

This page has :guilabel:`Deploy wordpress` button (because project has ``.polemarch.yaml`` file)
and all that you need to do for WordPress deployment on your hosts is filling following fields:

* **Inventory** - it can be inventory from Polemarch system, list of hosts, that are separated by ``,``, or path to your inventory in project folder.
* **User** - set it if your do not have ``ansible_user`` variable in your inventory.
* **Key file** - set it if your do not have ``ansible_ssh_private_key_file`` variable in your inventory.
* **Mysql user** - name of MySQL user of your wordpress site's database.
* **Mysql password** - password of MySQL user of your wordpress site's database.

After all required fields have been filled, you need to click the :guilabel:`Deploy wordpress` button
to start wordpress deployment on your hosts.

Hooks
-----

Polemarch has his own system of hooks.
Polemarch hooks are synchronous and you can appoint them on different events
like “on_execution”, “after_execution” and so on.

.. warning:: You should be accurate with hooks appointment,
             because the more hooks you have, the more time they need for execution and,
             finally, the more time Ansible needs for task execution.

.. image:: new_screenshots/hooks_empty_list.png

As you can see, there are no hooks in the system now.

There is only one button here:

* :guilabel:`Create` - |create_button_def| hook.

To create hook click the :guilabel:`Create` button.

.. image:: new_screenshots/create_hook.png

As you can see, the form of new hook creation consists of following fields:

* **Name** - name of your hook.

* **Type** - type of hook (HTTP, SCRIPT).
  * If type is "HTTP", Polemarch will send "POST" request with JSON to all recipients.
  * If type is "SCRIPT", Polemarch will execute script.

* **When** - event on each Polemarch have to execute hook.

* **Enable** - boolean field, it means to activate or to deactivate hook.

* **Recipients** - if type of hook is HTTP, then this field represents list of recipients, separated by " | ".
  For example, "ex1.com | ex2.com | ex3.com".
  If type of hook is SCRIPT, then recipients are actually list of files containing scripts, similarly separated by " | ".
  For example: "notify.sh | counter.sh". Files must be in HOOKS_DIR directory.

.. image:: new_screenshots/create_hook_1.png

Users
-----

Polemarch provides you with several types of user:

* superuser;
* staff.

If you need to create a superuser, you need to do it with terminal command.
Look for more information here ":ref:`Create superuser`".

If you need to create user with "staff" rights you can do it with Polemarch GUI:

.. image:: new_screenshots/user_list.png

To create new user click the :guilabel:`Create` button.

.. image:: new_screenshots/create_user.png

As you can see, the form of new user creation consists of following fields:

* **Username** - name of new user.

* **Is active** - boolean field, it means to activate or to deactivate user.

* **First name** - first name of user.

* **Last name** - last name of user.

* **Email** - email of user.

* **Password** - password of user.

* **Repeat password** - password of user.

Also you can use action :guilabel:`Generate password`.

* :guilabel:`Generate password` - generates random password from 12 to 20 characters long. Password will contain capital and lower letters, numbers and special symbols.

After user creation you will see next page:

.. image:: new_screenshots/test_user.png

As you can see there is only one new fields on this page:

* **Id** - |id_field_def|.

Also there are several buttons here:

* :guilabel:`Edit` - |edit_button_def|.
* :guilabel:`Two factor authentication` - you can use TFA if you want to protect your account.
* :guilabel:`Remove` - |remove_button_def| periodic task.

Action buttons:

* :guilabel:`Change password` - this button opens "change password" action page.
* :guilabel:`Copy` - |copy_button_def|.

Let's look on "change password" action page.

.. image:: new_screenshots/change_password.png

As you can see, the form of "change password" action consists of following fields:

* **Old password** - current password of user.

* **New password** - new password of user.

* **Confirm new password** - new password of user.

There are two buttons here:

* :guilabel:`Change password` - this button saves your new password.
* :guilabel:`Generate password` - generates random password from 12 to 20 characters long. Password will contain capital and lower letters, numbers and special symbols.