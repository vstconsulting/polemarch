from ._base import BaseIntegration


class Integration(BaseIntegration):

    def prepare_service(self, service):
        if service.nodeid is not None:
            return
        service.nodeid = "default"
        service.save()

    def prepare_environment(self):
        pass
