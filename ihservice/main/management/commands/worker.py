from __future__ import absolute_import, unicode_literals

import sys

from django.conf import settings
from django.core.management import call_command

from cloudns_app.cloudns.management.base import CloudnsDaemonCommand


class Command(CloudnsDaemonCommand):
    help = 'Worker management cli'

    def add_arguments(self, parser):
        super(Command, self).add_arguments(parser)
        parser.set_defaults(pid_file='cloudns_worker.pid')
        parser.add_argument(
            '-c', '--concurrency',
            action='store',
            dest='concurrency',
            default=getattr(settings, "CONCURRENCY", 4),
            type=int,
            help='Number of parallel processes to handle tasks.')

    def loop_callback(self, options):
        call_command('celeryd',
                     event=True,
                     beat=True,
                     loglevel=self.LOG_LEVEL,
                     verbosity=3,
                     concurrency=options['concurrency'],
                     stdout=sys.stdout)
