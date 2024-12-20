from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.db import models
from django.dispatch import receiver
from vstutils.models import BaseModel
from vstutils.utils import get_session_store

User = get_user_model()


class Oauth2Token(BaseModel):
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    name = models.CharField(max_length=30)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.TextField()

    class Meta:
        default_related_name = "oauth2_token"
        constraints = [
            models.UniqueConstraint(
                name="oauth2_token_session_id_unique",
                fields=["session_id"],
            ),
        ]

    @property
    def expires(self):
        return self.session.expire_date.date()  # pylint: disable=no-member


@receiver(models.signals.post_delete, sender=Oauth2Token)
def handle_delete(instance: Oauth2Token, **kwargs):
    session = get_session_store()(instance.session_id)
    session.delete()
