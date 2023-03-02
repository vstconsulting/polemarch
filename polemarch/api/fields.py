from vstutils.api import fields as vstfields
from ..main.models import Inventory
from ..main.validators import path_validator


class InventoryAutoCompletionField(vstfields.VSTCharField):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        inventory = super().to_internal_value(data)
        try:
            inventory = Inventory.objects.get(id=int(inventory))
        except (ValueError, KeyError):
            if ',' not in inventory:
                path_validator(inventory)
        return inventory
