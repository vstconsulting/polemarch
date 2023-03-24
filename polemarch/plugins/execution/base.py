from typing import Callable, Mapping, List, Tuple, Type, Optional, Any
from pathlib import Path
from rest_framework.fields import Field
from vstutils.api.serializers import BaseSerializer


class BasePlugin:
    """
    Base execution plugin class from which any other plugin should inherit. The plugin itself is an entity which, on
    the one hand provides appropriate fields for the API, and on the other hand, processes arguments received from
    it to build execution command.

    For each configured plugin an endpoint will be generated allows you to choose arguments and execute it.
    Also, this plugin will be available to create template with.

    :param options: ``settings.ini`` options mapping for this plugin.
    :param output_handler: executor's function which handles logging and outputting to history. Used by
                           ``verbose_output`` method.
    """

    __slots__ = (
        'options',
        '_output_handler',
        'execution_dir',
        'secret_files',
        'env_vars',
    )

    base_command: List[str]
    """
    Base command (usually binary) from which execution command starts, e.g. ``['echo']``. You may also override this
    attribute as a property if more complex logic needs to be performed.
    """

    serializer_fields: Mapping[str, Field] = {}
    """Fields mapping used to generate serializer. By default returned by ``_get_serializer_fields`` method."""

    arg_shown_on_history_as_mode: Optional[str] = None
    """
    Name of argument presented in generated serializer which will be shown on detail history page as *Mode*. For
    example, if you are executing some module with additional arguments and fields contains `module` field, than you
    can set `'module'` here, and it's value will be shown after execution. If not set, *Mode* in the history will show
    ``[<plugin name> plugin]`` string.
    """

    arg_shown_on_history_as_inventory: Optional[str] = None  # pylint: disable=invalid-name
    """
    Name of argument presented in generated serializer which will be shown on list history page as *Inventory*.
    """

    error_codes: Mapping[int, str] = {}
    """
    This mapping will be looked up to choose an appropriate error message for history output if execution finished with
    errors. If no code found, then just "ERROR" string outputs.
    """

    def __init__(self, options: dict = None, output_handler: Optional[Callable] = None):
        self.options = options or {}
        self._output_handler = output_handler

    @property
    def name(self) -> str:
        """
        Returns name of plugin, class name by default. Primarily used to generate an appropriate model name for
        OpenAPI schema.
        """

        return self.__class__.__name__  # pylint: disable=no-member

    def get_serializer_class(self, exclude_fields: tuple = ()) -> Type[BaseSerializer]:
        """
        Returns serializer class which will be used to generate fields for arguments. Uses metaclass returned by
        ``_get_serializer_metaclass`` method.

        :param exclude_fields: field names that should not be presented in serializer.
        """
        class Serializer(BaseSerializer, metaclass=self._get_serializer_metaclass(exclude_fields=exclude_fields)):

            _hide_not_required = True

            class Meta:
                ref_name = f'Execute{self.name}'

        Serializer.__name__ = f'{Serializer.Meta.ref_name}Serializer'
        return Serializer

    def get_execution_data(
        self,
        execution_dir: Path,
        raw_args: dict,
        project_data,
    ) -> Tuple[List[str], dict]:
        """
        Returns tuple of execution command and env variables. This method will be called directly by executor before
        execution starts.

        :param execution_dir: path to execution directory in which project copy located. All additional files that
                              should be generated (e.g. inventory file) must be placed here.
        :param raw_args: argument name-value mapping which should be processed.
        :param project_data: proxy of the project instance, allows you to access it's readonly properties, such as
                     ``config`` ``vars``, ``env_vars`` etc.
        """

        self.prepare_execution_dir(execution_dir)
        self.env_vars = self.get_env_vars(project_data)
        args = self.get_args(raw_args)
        return self.base_command + args, self.env_vars

    def prepare_execution_dir(self, dir: Path) -> None:
        """
        Gets execution directory with copied project. All files needed for execution (e.g. generated inventory file)
        should be here.

        :param dir: path to execution directory in which project copy located. All additional files that
                    should be generated (e.g. inventory file) must be placed here.
        """

        self.execution_dir = dir

    def get_raw_inventory(self) -> str:
        """
        Returns raw inventory string used to show it on history page.
        """

        return ''

    def get_env_vars(self, project_data) -> Mapping[str, str]:
        """
        Returns env variables which will be used in execution, project's env variables by default.

        :param project_data: proxy of the project instance, allows you to access it's readonly properties, such as
                             ``config`` ``vars``, ``env_vars`` etc.
        """

        return project_data.env_vars

    def get_args(self, raw_args: dict) -> List[str]:
        """
        Returns list of processed arguments which will be substituted into execution command.

        :param raw_args: argument name-value mapping which should be processed.
        """

        args = []
        for key, value in raw_args.items():
            arg = self._process_arg(key, value)
            if arg:
                args.append(arg)
        return args

    def get_verbose_level(self, raw_args: dict) -> int:
        """
        Returns verbose level used for history output and logging. Should be taken from execution arguments (usually
        from ``verbose`` argument). This method will be called directly by executor.

        :param raw_args: argument name-value mapping which should be processed.
        """

        return int(raw_args.get('verbose', 0))

    def verbose_output(self, message: str, level: int = 3) -> None:
        """
        Logs value with logger and outputs it to history.

        :param message: message to output.
        :param level: verbosity level from which message should be outputted.
        """

        if self._output_handler:
            self._output_handler(message, level)

    def get_pre_commands(self, raw_args: dict) -> List[List[str]]:
        """
        This method will be called before execution. Returns list of commands which are needed to be executed before
        main execution command.

        :param raw_args: dictionary with arguments received from API.
        """

        return []  # nocv

    def post_execute_hook(self, cmd: List[str], raw_args: dict) -> None:
        """
        This method will be called after execution.

        :param cmd: list of arguments which were used for execution.
        :param raw_args: dictionary with arguments received from API.
        """

    def _get_serializer_metaclass(self, exclude_fields: tuple = ()) -> Type[Type[BaseSerializer]]:
        """
        Returns serializer metaclass used to generate fields in serializer.

        :param exclude_fields: field names that should not be presented in serializer.
        """

        class SerializerMeta(type(BaseSerializer)):
            def __new__(mcs, name, bases, attrs):
                attrs.update(self._get_serializer_fields(exclude_fields=exclude_fields))
                return super().__new__(mcs, name, bases, attrs)

        return SerializerMeta

    def _get_serializer_fields(self, exclude_fields: tuple = ()) -> Mapping[str, Field]:
        """
        Returns field name and field instance mapping used to generate fields for serializer.

        :param exclude_fields: field names that should not be presented in serializer.
        """

        return {
            name: field for name, field in self.serializer_fields.items()
            if name not in exclude_fields
        }

    def _process_arg(self, key: str, value: Any) -> Optional[str]:
        """
        Returns single argument with value for ``get_args`` method. Should return ``None`` if argument must not be
        included to the execution command.

        :param key: argument key (e.g. `verbose`).
        :param value: argument value (e.g. `2`).
        """

        return f'--{key}={value}'
