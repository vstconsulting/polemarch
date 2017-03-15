from __future__ import absolute_import, unicode_literals

import os
import sys

from django.core.management import call_command
from django.conf import settings
from ..base import ServiceCommand


class Command(ServiceCommand):
    help = 'WebServer management cli'

    def add_arguments(self, parser):
        super(Command, self).add_arguments(parser)
        parser.add_argument(
            '--processes',
            action='store',
            dest='processes',
            default='2',
            type=str,
            help='The number of worker processes (instances of the WSGI'
                 'application) to be started up and which will handle'
                 'requests concurrently. Defaults to a single process.')
        parser.add_argument(
            '-P', '--port',
            action='store',
            dest='port',
            default='8080',
            type=str,
            help='Set port for binding.[8080]')
        parser.add_argument(
            '-wd', '--workdir',
            action='store',
            dest='workdir',
            default='/tmp/',
            type=str,
            help='Setup working directory.')
        parser.add_argument(
            '--setup-only',
            action='store_true',
            dest='setup-only',
            help='Setup service.')

    def _get_options(self, options):
        options = ["runmodwsgi", '--port=' + options['port'],
                   '--process-name=ihservice', '--compress-responses',
                   '--processes=' + options['processes'], '--log-to-terminal',
                   '--python-path=' + os.path.join(settings.BASE_DIR, '..'),
                   '--working-directory=' + options['workdir']]
        if options.get("setup-only", False):
            # TODO: Add options for setup apache settings
            options += []
        return options

    def handle(self, *args, **options):
        super(Command, self).handle(*args, **options)
        call_command(*self._get_options(options),
                     stdout=sys.stdout)
