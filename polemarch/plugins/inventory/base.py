import typing as _t
from pathlib import Path
from rest_framework.fields import Field
from vstutils.api.serializers import BaseSerializer
from ...main.exceptions import NotSupported
from ...main.models.hosts import Inventory


class BasePlugin:
    """
    Base inventory plugin class from which any other plugin should inherit. The plugin itself is an entity which, on
    the one hand provides appropriate fields for the API, and on the other hand, manages inventory state.

    :param options: ``settings.ini`` options for this plugin.
    """

    __slots__ = ('options',)

    state_managed: bool = True
    """
    Flag indicating whether ``Inventory`` stores all its data in json field or in separate models.
    """

    supports_import: bool = False
    """
    Flag indicating whether ``Inventory`` supports import from external source or not. If ``True`` ``import_inventory``
    method must be implemented.
    """

    serializer_fields: _t.Mapping[str, Field] = {}
    """
    Fields mapping used to generate serializer for working with state in API. By default returned by
    ``_get_serializer_fields`` method.
    """

    serializer_import_fields: _t.Mapping[str, Field] = {}
    """
    Fields mapping used to generate serializer for import action. By default returned by
    ``_get_serializer_import_fields`` method.
    """

    defaults: _t.Mapping[str, _t.Any] = {}
    """
    Field name and its default value mapping used to initialize inventory state. Only works if plugin is
    ``state_managed``.
    """

    def __init__(self, options):
        self.options = options

    def render_inventory(self, instance: Inventory, execution_dir: Path) -> _t.Tuple[Path, list]:
        """
        Renders inventory into text file and puts it into ``execution_dir`` directory. Additional files may be returned
        by second argument as list (or empty list, if no any).

        :param instance: ``Inventory`` instance.
        :param execution_dir: path
        """

        raise NotImplementedError  # nocv

    @classmethod
    def get_raw_inventory(cls, inventory_string: str) -> str:
        """
        Returns raw inventory string used to show it on history page.

        :param inventory_string: inventory string which is needed to be processed.
        """

        return ''  # nocv

    @classmethod
    def import_inventory(cls, instance: Inventory, data: dict):
        """
        Method which implements importing inventory from external source. Must be implemented if ``supports_import``
        is ``True``.

        :param data: data received from user in API as a result of import action.
        :param instance: created ``Inventory`` instance.
        """

        raise NotImplementedError if cls.supports_import else NotSupported  # nocv

    def get_serializer_class(self) -> _t.Type[BaseSerializer]:
        """
        Returns serializer class which will be used for working with state in API. Uses metaclass returned by
        ``_get_serializer_metaclass`` method.
        """

        class Serializer(BaseSerializer, metaclass=self._get_serializer_metaclass()):
            class Meta:
                ref_name = f'{self.__class__.__name__}InventoryPlugin'

        Serializer.__name__ = f'{Serializer.Meta.ref_name}Serializer'
        return Serializer

    def _get_serializer_metaclass(self) -> _t.Type[_t.Type[BaseSerializer]]:
        """
        Returns serializer metaclass used to generate fields in serializer for working with state in API.
        """

        class SerializerMeta(type(BaseSerializer)):
            def __new__(mcs, name, bases, attrs):
                attrs.update(self._get_serializer_fields())
                return super().__new__(mcs, name, bases, attrs)

        return SerializerMeta

    def _get_serializer_fields(self) -> _t.Mapping[str, Field]:
        """
        Returns field name and field instance mapping used to generate fields for serializer used for
        working with state in API.
        """

        return self.serializer_fields

    def get_serializer_import_class(self) -> _t.Type[BaseSerializer]:
        """
        Returns serializer class which will be used for import action. Uses metaclass returned by
        ``_get_serializer_metaclass`` method.
        """

        class Serializer(BaseSerializer, metaclass=self._get_serializer_import_metaclass()):
            class Meta:
                ref_name = f'{self.__class__.__name__}ImportInventory'

        Serializer.__name__ = f'{Serializer.Meta.ref_name}Serializer'
        return Serializer

    def _get_serializer_import_metaclass(self) -> _t.Type[_t.Type[BaseSerializer]]:  # pylint: disable=invalid-name
        """
        Returns serializer metaclass used to generate fields in serializer for import action.
        """

        class SerializerMeta(type(BaseSerializer)):
            def __new__(mcs, name, bases, attrs):
                attrs.update(self._get_serializer_import_fields())
                return super().__new__(mcs, name, bases, attrs)

        return SerializerMeta

    def _get_serializer_import_fields(self) -> _t.Mapping[str, Field]:
        """
        Returns field name and field instance mapping used to generate fields for serializer used for import action.
        """

        return self.serializer_import_fields
