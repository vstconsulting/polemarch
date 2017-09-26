from __future__ import absolute_import, unicode_literals

import os

from django.conf import settings
from ..base import ServiceCommand


class Command(ServiceCommand):
    help = 'Polemarch WebServer management cli'

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
        parser.add_argument(
            '--access-log',
            action='store_true',
            dest='access-log',
            help='Flag indicating whether the web server access log'
                 'should be enabled. Defaults to being disabled.')
        parser.add_argument(
            '--user',
            action='store',
            dest='user',
            default='',
            type=str,
            help='When being run by the root user, the user that the'
                 'WSGI application should be run as.')
        parser.add_argument(
            '--group',
            action='store',
            dest='group',
            default='',
            type=str,
            help='When being run by the root user, the group that the'
                 'WSGI application should be run as.')
        parser.add_argument(
            '--server-root',
            action='store',
            dest='server-root',
            default='/tmp/polemarchweb',
            type=str,
            help='Specify an alternate directory for where the generated'
                 'web server configuration, startup files and logs will'
                 'be stored. Defaults to directory /tmp/polemarchweb.')
        parser.add_argument(
            '--log-directory',
            action='store',
            dest='log-directory',
            default='',
            type=str,
            help='Specify an alternate directory for where the log files'
                 'will be stored. Defaults to the server root directory.')
        parser.add_argument(
            '--pid-file',
            action='store',
            dest='pid-file',
            default='',
            type=str,
            help='Specify an alternate file to be used to store the'
                 'process ID for the root process of the web server.')

    def _get_options(self, kwargs):
        options = ["runmodwsgi", '--port=' + kwargs['port'],
                   '--process-name=polemarch', '--compress-responses',
                   '--processes=' + kwargs['processes'],
                   '--python-path=' + os.path.join(settings.BASE_DIR, '..'),
                   '--working-directory=' + kwargs['workdir'],
                   '--server-root=' + kwargs['server-root'],
                   '--rotate-logs']
        options += ['--access-log'] if kwargs['access-log'] else []
        if kwargs.get("setup-only", False):
            options += ['--setup-only']
            for param in ['user', 'group', 'log-directory', 'pid-file']:
                options += ["--{}={}".format(param, kwargs[param])] \
                            if kwargs[param] else []
        else:
            options += ['--log-to-terminal']
        return options

    def handle(self, *args, **options):
        super(Command, self).handle(*args, **options)
        self._error("This command is DEPRECATED! No longer working.")
        return
        # call_command(*self._get_options(options),
        #             stdout=sys.stdout)
