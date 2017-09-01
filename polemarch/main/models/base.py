from __future__ import unicode_literals

from django.db import models


class BQuerySet(models.QuerySet):
    # all methods in this class was before not using by anything in Polemarch
    pass


class BManager(models.Manager.from_queryset(BQuerySet)):
    # pylint: disable=no-member
    pass


class BModel(models.Model):
    objects    = BManager()
    id         = models.AutoField(primary_key=True,
                                  max_length=20)

    def __init__(self, *args, **kwargs):
        super(BModel, self).__init__(*args, **kwargs)
        self.no_signal = False

    class Meta:
        abstract = True

    def __unicode__(self):
        return "<{}>".format(self.id)  # nocv

    def __str__(self):
        return self.__unicode__()


class BGroupedModel(BModel):
    parent     = models.ForeignKey('self', blank=True, null=True)
    group      = models.BooleanField(default=False)

    class Meta:
        abstract = True
