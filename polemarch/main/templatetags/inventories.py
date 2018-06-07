import logging
import traceback
from django import template

logger = logging.getLogger('polemarch')
register = template.Library()


class BaseGenerateTag(template.Node):
    default_name = None
    join_string = '\n'

    def __init__(self, list_name=None):
        self._objects_name = list_name.token if list_name else self.default_name
        self._comment_name = self._objects_name.capitalize()

    def get_objects_strings(self, objects):
        return self.join_string.join([obj.rstrip() for obj in objects])

    def generate(self, objects):
        return '# {comment}\n{objects}'.format(
            objects=self.get_objects_strings(objects),
            comment=self._comment_name
        )

    def render(self, context):
        try:
            return self.generate(context.get(self._objects_name))
        except Exception as err:  # noce
            logger.error(traceback.format_exc())
            logger.error(str(err))
            return '# Invalid list.\n# {}'.format(str(err))

    @classmethod
    def handle_token(cls, parser, token):
        bits = token.split_contents()
        if len(bits) < 2:
            return cls()
        return cls(parser.compile_filter(bits[1]))  # noce


class GroupsTag(BaseGenerateTag):
    join_string = '\n\n'
    default_name = 'groups'


class HostsTag(BaseGenerateTag):
    default_name = 'hosts'


register.tag(name='gen_hosts', compile_function=HostsTag.handle_token)
register.tag(name='gen_groups', compile_function=GroupsTag.handle_token)
