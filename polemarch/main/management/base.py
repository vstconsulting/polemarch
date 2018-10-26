# pylint: disable=no-member,invalid-name,broad-except,import-error
from __future__ import absolute_import, unicode_literals
import celery
from vstutils.management.commands._base import BaseCommand as _BaseCommand
from ..utils import AnsibleArgumentsReference


class BaseCommand(_BaseCommand):

    def _get_versions(self):
        versions = super(BaseCommand, self)._get_versions()
        versions['ansible'] = AnsibleArgumentsReference().version
        versions['celery'] = celery.__version__
        return versions


class ServiceCommand(BaseCommand):
    '''
    Command class for service utils.
    '''
