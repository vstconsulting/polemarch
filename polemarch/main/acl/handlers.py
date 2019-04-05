from typing import Type
from django.db.models import Model


class Default:
    # pylint: disable=unused-argument
    qs_methods = []

    def __init__(self, model=None, instance=None):
        self.instance = instance
        self.model = model  # type: Type[Model]

    def set_owner(self, user):
        '''
        Set object owner.

        :param user:
        :return:
        '''
        self.instance.owner = user
        self.instance.save()

    def owned_by(self, user):
        return user.is_staff or (getattr(self.instance, 'owner', None) == user)

    def manageable_by(self, user):  # nocv
        return True

    def editable_by(self, user):  # nocv
        return True

    def viewable_by(self, user):
        return True

    def user_filter(self, qs, user, role=None):
        return qs

    def qs_create(self, original_method, **kwargs):
        return original_method(**kwargs)
