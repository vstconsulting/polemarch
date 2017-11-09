from django.conf import settings
from ..utils import import_class

ACLPermission = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLPermission"]
)
ACLPermissionSubclass = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLPermissionSubclass"]
)
ACLGroupSubclass = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLGroupSubclass"]
)
ACLModel = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLModel"]
)
ACLQuerySet = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLQuerySet"]
)
