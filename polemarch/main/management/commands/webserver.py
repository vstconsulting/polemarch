from vstutils.management.commands import web
from ..base import BaseCommand


class Command(BaseCommand, web.Command):
    help = 'Polemarch web-server.'
