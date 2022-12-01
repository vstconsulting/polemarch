Execution plugins
=================

Plugins system allows you to execute any external command from Polemarch. To create a plugin you need to

* create a python class describing the argument processing and API talking logic;
* configure this plugin in your ``settings.ini``.

Quick start
-----------

All built-in execution backends, such as ansible playbook or module execution, use plugins (starting from 2.2.0).

To get started let's create a simple plugin allows you to run ``echo`` command.

.. sourcecode:: python

    from polemarch.plugins.base import BasePlugin
    from rest_framework.fields import BooleanField, empty
    from vstutils.api.fields import VSTCharField


    # Any plugin must be inherited from BasePlugin
    class TestEcho(BasePlugin):
        # Define fields which will be used to execute this plugin and create template with
        serializer_fields = {
            # You can use fields either from rest_framework or vstutils
            'string': VSTCharField(),
            'n': BooleanField(default=empty, required=False, label='No trailing newlines'),
            'e': BooleanField(default=empty, required=False, label='Interpret backslash escapes'),
        }
        # Value of this field will be shown in history detail page as Mode
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

Supposing that described plugin is located at ``polemarch.plugins.custom.Echo``, let's connect it to Polemarch.
In your ``/etc/polemarch/settings.ini`` add following section:

.. sourcecode:: ini

    [plugins.echo]
    backend = polemarch.plugins.custom.Echo

Also you may want to provide additional options directly to plugin:

.. sourcecode:: ini

    [plugins.echo.options]
    some_option = 'some_option'

In this example `some_option` will be available in any plugin's method as ``self.config['some_option']``, as all options are initialized in the constructor.

So it's all done! After restarting your polemarch server and resetting schema, you can check
``/project/<your_project_id>/execute_echo/``. Here you should be able to execute echo plugin as any built-in one.
Also you should be able to create a :ref:`template<Execution templates>` with it at ``/project/<your_project_id>/execution_templates/new/``.

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

To learn more about what plugins are provide, please check API reference.

API reference
-------------

.. autoclass:: polemarch.plugins.base::BasePlugin
    :members:
    :private-members:
