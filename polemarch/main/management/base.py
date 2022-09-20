# pylint: disable=no-member,invalid-name,broad-except,import-error
from __future__ import absolute_import, unicode_literals
import celery
from vstutils.management.commands._base import BaseCommand as _BaseCommand
from ..constants import ANSIBLE_REFERENCE


class BaseCommand(_BaseCommand):

    def _get_versions(self):
        versions = super()._get_versions()
        versions['ansible'] = ANSIBLE_REFERENCE.version
        versions['celery'] = celery.__version__
        return versions


class ServiceCommand(BaseCommand):
    '''
    Command class for service utils.
    '''
