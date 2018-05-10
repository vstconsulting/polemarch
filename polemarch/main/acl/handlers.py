

class Default(object):
    # pylint: disable=unused-argument
    qs_methods = []

    def __init__(self, model=None, instance=None):
        self.instance = instance
        self.model = model

    def set_owner(self, user):  # nocv
        pass

    def owned_by(self, user):  # nocv
        return True

    def manageable_by(self, user):  # nocv
        return True

    def editable_by(self, user):  # nocv
        return True

    def viewable_by(self, user):
        return True

    def user_filter(self, qs, user, only_leads=False):
        return qs

    def qs_create(self, original_method, **kwargs):
        return original_method(**kwargs)
