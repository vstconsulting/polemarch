from vstutils.management.commands import web
from ..base import ServiceCommand


class Command(ServiceCommand, web.Command):  # nocv
    help = 'Polemarch web-server.'

    def handle(self, *args, **options):
        ServiceCommand.handle(self, *args, **options)
        return web.Command.handle(self, *args, **options)
