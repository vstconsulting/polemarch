# pylint: disable=no-member,invalid-name,broad-except,import-error
from __future__ import absolute_import, unicode_literals
import celery
import ansible
from django.utils.six.moves import input
from vstutils.management.commands._base import BaseCommand as _BaseCommand


class BaseCommand(_BaseCommand):

    def _get_versions(self):
        versions = super(BaseCommand, self)._get_versions()
        versions['ansible'] = ansible.__version__
        versions['celery'] = celery.__version__
        return versions


class ServiceCommand(BaseCommand):  # nocv
    '''
    Command class for service utils.
    '''
    interactive = False

    def add_arguments(self, parser):
        super(ServiceCommand, self).add_arguments(parser)
        if self.interactive:
            parser.add_argument(
                '--noinput', '--no-input',
                action='store_false', dest='interactive', default=True,
                help="Do NOT prompt the user for input of any kind.",
            )

    def handle(self, *args, **options):
        super(ServiceCommand, self).handle(*args, **options)
        self.interactive_mode = options.pop('interactive', False)

    def ask_user(self, message, default=None):
        if getattr(self, 'interactive_mode', False):
            return input(message)
        return default

    def ask_user_bool(self, message, default=True):
        reply = self.ask_user(message, 'yes' if default else 'no').lower()
        if reply in ['y', 'yes']:
            return True
        elif reply in ['n', 'no']:
            return False
