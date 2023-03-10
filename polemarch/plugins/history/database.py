from django.db import transaction, models
from .base import BasePlugin
from ...main.models.history import HistoryLines


class Plugin(BasePlugin):
    __slots__ = ()
    writeable = True
    readable = True

    def _write_line(self, line: str, number: int, endl: str = ''):
        HistoryLines.objects.bulk_create([
            HistoryLines(line_gnumber=number, line_number=1, line=line + endl, history=self.history)
        ])

    def get_lines(self):
        return HistoryLines.objects.filter(history=self.history)

    def get_facts_data(self):
        return self.get_raw(
            original=False,
            excludes=(
                models.Q(line__contains="No config file") | models.Q(line__contains="as config file"),
            )
        )

    @transaction.atomic()
    def clear(self, msg=''):
        self.get_lines().delete()
        if msg:
            self.write_line(msg, number=1, endl='')
