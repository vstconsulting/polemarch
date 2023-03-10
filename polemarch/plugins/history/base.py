import re
import contextlib

import orjson

from ...main.models import History


class BasePlugin:
    __slots__ = ('history', 'options')
    writeable = False
    readable = False
    ansi_escape = re.compile(r'\x1b[^m]*m')

    def __init__(self, history: History, **options):
        self.history = history
        self.options = options

    def write_line(self, line: str, number: int, endl: str = ''):
        with contextlib.suppress(Exception):
            self._write_line(line, number, endl)

    def _write_line(self, line: str, number: int, endl: str = ''):
        raise NotImplementedError  # nocv

    def get_lines(self, **filters):
        raise NotImplementedError  # nocv

    def get_max_line(self):
        last_line_num = 0
        with contextlib.suppress(Exception):
            last_line_object = self.get_lines().last()
            if last_line_object:
                last_line_num = last_line_object.line_number
        return last_line_num

    def get_raw(self, original=True, excludes=()):
        qs = self.get_lines()
        if excludes:
            qs = qs.exclude(*excludes)
        qs = qs.order_by('line_gnumber', 'line_number')
        data = "".join(qs.values_list("line", flat=True))
        return data if original else self.ansi_escape.sub('', data)

    def get_facts_data(self):
        return self.get_raw(original=False)  # nocv

    def get_facts(self):
        data = self.get_facts_data()
        regex = (
            r"^([\S]{1,})\s\|\s([\S]{1,}) \=>"
            r" \{\s([^\r]*?\"[\w]{1,}\"\: .*?\s)\}\s{0,1}"
        )
        subst = '"\\1": {\n\t"status": "\\2", \n\\3},'
        result = re.sub(regex, subst, data, 0, re.MULTILINE)
        result = re.findall(r'^".*":[\s\S]*$', result, re.MULTILINE)[0]
        result = "{" + result[:-1] + "\n}"
        return orjson.loads(result)  # pylint: disable=no-member

    def clear(self, msg=''):
        ...  # nocv

    def finalize_output(self):
        ...
