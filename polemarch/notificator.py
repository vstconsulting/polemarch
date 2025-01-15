from django.conf import settings
from vstutils.models.cent_notify import Notificator


class PolemarchNotificator(Notificator):
    def create_notification_from_instance(self, instance):
        super().create_notification_from_instance(instance)
        # pylint: disable=protected-access
        if self.label != 'history_lines' and instance.__class__._meta.label in settings.NOTIFY_WITHOUT_QUEUE_MODELS:
            self.send()
