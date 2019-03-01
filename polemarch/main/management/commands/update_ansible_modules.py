from django.db import transaction
from ..base import ServiceCommand
from ...utils import AnsibleModules
from ...models import Module


class Command(ServiceCommand):
    help = "Update ansible modules. Needs when ansible version updated."
    interactive = True

    @transaction.atomic()
    def update_modules(self):
        try:
            modules = AnsibleModules(detailed=False)
            modules.clear_cache()
            modules_list = modules.all()
            modules_list.sort()
            Module.objects.filter(project=None).delete()
            Module.objects.bulk_create([
                Module(path=module, project=None) for module in modules_list
            ])
        # pylint: disable=try-except-raise
        except:  # nocv
            raise
        else:
            self._print('The modules have been successfully updated.', 'SUCCESS')

    def handle(self, *args, **options):
        super(Command, self).handle(*args, **options)
        if self.ask_user_bool("Update ansible modules?[y/n]:"):
            self.update_modules()
