from django.conf import settings
from ..utils import import_class

ACLPermissionAbstract = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLPermissionAbstract"]
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
ACLInventoriesQuerySet = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLInventoriesQuerySet"]
)
ACLHistoryQuerySet = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLHistoryQuerySet"]
)
ACLUserGroupsQuerySet = import_class(
    settings.ACL['DEFAULT_ACL_CLASSES']["ACLUserGroupsQuerySet"]
)
