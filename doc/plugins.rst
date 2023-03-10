Plugins
=======

Polemarch can be extended with different type of plugins. This manual describes how to create, setup and start using
your first Execution or Inventory plugin and provides full API reference to learn more about them.

Execution plugins
-----------------

Execution plugins system allows you to execute any external command from Polemarch. To create an execution plugin you
need to

* create a python class describing the argument processing and API talking logic;
* configure this plugin in your ``settings.ini``.

.. warning::
    Since v3.0.0 path to execution plugins has been changed from ``polemarch.plugins`` to
    ``polemarch.plugins.execution``.

Execution plugins: quick start
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

All built-in execution backends, such as ansible playbook or module execution, use plugins (starting from 2.2.0).

To get started let's create a simple plugin allows you to run ``echo`` command.

.. sourcecode:: python

    from rest_framework.fields import BooleanField, empty
    from vstutils.api.fields import VSTCharField
    from polemarch.plugins.execution.base import BasePlugin


    # Any plugin must be inherited from BasePlugin
    class TestEcho(BasePlugin):
        # Define fields which will be used to execute this plugin and create template with
        serializer_fields = {
            # You can use fields either from rest_framework or vstutils
            'string': VSTCharField(),
            'n': BooleanField(default=empty, required=False, label='No trailing newlines'),
            'e': BooleanField(default=empty, required=False, label='Interpret backslash escapes'),
        }
        # Value of this field will be shown on history detail page as Mode
        arg_shown_on_history_as_mode = 'string'

        # This is our binary from which any command starts
        @property
        def base_command(self):
            return ['echo']

        # This method is called by get_args method of BasePlugin for each argument received from API. As we defined
        # 'string', 'n', and 'e' arguments in serializer_fields, we can get their keys and values here.
        def _process_arg(self, key, value):
            # As 'string' argument in this case is a positional argument, let's return just it's value, so the final
            # command will be something like ['echo', 'string to output', ...]
            if key == 'string':
                return value
            # As this guys are just boolean flags, let's return them as '-n' or '-e' accordingly
            if key in ('n', 'e') and value:
                return f'-{key}'
            # Note, that if we received for example `n` argument with False value, we are returning None,
            # means that it won't be included to execution command. But of course, you may override this behavior
            # in get_args method.

Supposing that described plugin is located at ``polemarch.plugins.execution.custom.Echo``, let's connect it to
Polemarch. In your ``/etc/polemarch/settings.ini`` add following section:

.. sourcecode:: ini

    [execution.plugin.echo]
    backend = polemarch.plugins.execution.custom.Echo

Also you may want to provide additional options directly to plugin:

.. sourcecode:: ini

    [execution.plugin.echo.options]
    some_option = 'some_option'

In this example `some_option` will be available in any plugin's instance method as ``self.config['some_option']``, as
all options are initialized in the ``__init__`` method.

So it's all done! After restarting your polemarch server and resetting schema, you can check
``#/project/<your_project_id>/execute_echo/``. Here you should be able to execute echo plugin as any built-in one.
Also you should be able to create a :ref:`template<Execution templates>` with it at ``#/project/<your_project_id>/execution_templates/new/``.

If you tried executing echo plugin with flags, you may see that this flags are being outputted too. This is because
they goes after ``string`` argument. To fix this issue, we may do something like this:

.. sourcecode:: python

    ...

    class TestEcho(BasePlugin):
        ...

        def get_args(self, raw_args):
            # We know that 'string' is required so no default for .pop() is needed
            string_value = raw_args.pop('string')
            args = super().get_args(raw_args)
            # Push our string to the end of command
            args += [string_value]
            return args

        @property
        def base_command(self):
            return ['echo']

        def _process_arg(self, key, value):
            if key in ('n', 'e') and value:
                return f'-{key}'

Now if you are passing flags to execution, they should work the same except not being outputted.

.. note::
    If your execution plugin may work with inventories, you should specify which inventory plugins are compatible
    with your execution plugin. By default it's assumed that execution plugin can't work with inventories. For more
    information about inventory plugins please see :ref:`Inventory plugins`.

To learn more about what plugins are provide, please check API reference.

Inventory plugins
-----------------

Inventory plugins system allows you to define how inventory stores, manages and displays its state. To create an
inventory plugin you need to

* create a python class which manages inventory state and API talking logic;
* configure this plugin in your ``settings.ini``.

Inventory plugins: quick start
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To get started let's create a simple plugin which works like a simplified version of built-in ``AnsibleString`` with
some additional changes.

.. sourcecode:: python

    from vstutils.api import fields as vstfields
    from polemarch.plugins.inventory.base import BasePlugin

    class CustomAnsibleString(BasePlugin):
        # Our plugin will support import and we will implement corresponding method
        supports_import = True

        # These fields will be used for working with inventory state in API
        serializer_fields = {
            # You can use fields either from rest_framework or vstutils
            'body': vstfields.TextareaField(allow_blank=True, default=''),
        }
        # Default values for our fields which will be used to initialize inventory state
        defaults = {
            'body': 'localhost ansible_connection=local',
        }
        # These fields will be used for import action in API
        serializer_import_fields = {
            'body': vstfields.FileInStringField(),
        }

        def render_inventory(self, execution_dir):
            # Getting inventory state. This is possible because by default state_managed attribute of plugin class
            # is True
            state_data = self.instance.inventory_state.data
            filename = str(uuid1())
            # Any created files must be in execution_dir
            filepath = Path(execution_dir) / filename
            filepath.write_text(state_data['body'])
            # We doesn't need any additional files so the second argument is empty list
            return filepath, []

        def get_raw_inventory(self, inventory_string):
            # This string will be shown on history page
            return f'File contents:\n{inventory_string}'

        @classmethod
        def import_inventory(cls, instance, data):
            # Here we got data which structure corresponds to serializer_import_fields
            # and created inventory instance. It's recommended to always use update_inventory_state method
            # rather than accessing inventory state directly.
            instance.update_inventory_state(data=data)
            return instance


Supposing that described plugin is located at ``polemarch.plugins.inventory.custom.CustomInventoryString``, let's
connect it to Polemarch. In your ``/etc/polemarch/settings.ini`` add following section:

.. sourcecode:: ini

    [inventory.plugin.custom_inventory_string]
    backend = polemarch.plugins.inventory.custom.CustomInventoryString

Also you may want to provide additional options directly to plugin:

.. sourcecode:: ini

    [inventory.plugin.custom_inventory_string.options]
    some_option = 'some_option'

In this example `some_option` will be available in any plugin's instance method as ``self.options['some_option']``, as all options are initialized in the ``__init__`` method.

To start working with the created plugin we also need to allow some execution plugin work with this one. Let's
say that `ANSIBLE_MODULE` plugin can play with our new `CUSTOM_ANSIBLE_STRING`:

.. sourcecode:: ini

    [execution.plugin.ansible_module.options]
    ; Make sure you not disabled other built-in inventory plugins
    compatible_inventory_plugins = polemarch_db,ansible_file,ansible_string,custom_inventory_string

Done! Now you can create inventory with your plugin at ``#/project/<your_project_id>/inventory/new/``,
execute `ANSIBLE_MODULE` plugin at ``#/project/<your_project_id>/execute_ansible_module/`` selecting created inventory.

API reference
-------------

.. autoclass:: polemarch.plugins.execution.base::BasePlugin
    :members:
    :private-members:

.. autoclass:: polemarch.plugins.inventory.base::BasePlugin
    :members:
    :private-members:
