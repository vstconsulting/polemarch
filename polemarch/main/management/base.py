# pylint: disable=no-member,invalid-name,broad-except
from __future__ import absolute_import, unicode_literals
import logging
import sys

from django.core.management.base import CommandError as CommandErrorBase
from django.conf import settings
import celery
import ansible
from vstutils.utils import exception_with_traceback
from vstutils.management.commands._base import BaseCommand

logger = logging.getLogger("polemarch")


class CommandError(CommandErrorBase):
    pass


class ServiceCommand(BaseCommand):
    requires_system_checks = False
    keep_base_opts = False
    stdout, stderr = sys.stdout, sys.stderr

    def add_arguments(self, parser):
        super(ServiceCommand, self).add_arguments(parser)
        parser.add_argument(
            '-l', '--log-level',
            action='store',
            dest='log-level',
            default=False,
            type=str,
            help='Set logs level [debug|warning|error|critical]')

    @exception_with_traceback()
    def handle(self, *args, **options):
        LOG_LEVEL = settings.LOG_LEVEL
        if options.get('log-level', False):
            LOG_LEVEL = options.get('log-level', LOG_LEVEL)
        logger.setLevel(LOG_LEVEL.upper())
        self.LOG_LEVEL = LOG_LEVEL.upper()

    def get_version(self):
        versions = super(ServiceCommand, self).get_version()
        vstr = (u' Celery={r.__version__} Ansible={a.__version__}')
        return versions + vstr.format(r=celery, a=ansible)
