import logging

from .base import BasePlugin

logger = logging.getLogger('polemarch.history.output')


class Plugin(BasePlugin):
    __slots__ = ('extra',)
    writeable = True
    readable = False
    get_lines = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.extra = {
            "HISTORY_ID": self.history.id,
            "PROJECT_ID": self.history.project_id,
        }

    def _write_line(self, line: str, number: int, endl: str = ''):
        logger.info(f"{line}", extra=self.extra)
