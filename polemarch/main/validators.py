from __future__ import unicode_literals
from typing import AnyStr
import re
from django.utils.translation import ugettext_lazy as _
from django.core.validators import (RegexValidator,
                                    URLValidator as OldURLValidator)


##############################################################################
# Validation Classes
class URLValidator(OldURLValidator):
    ul = r'\u00a1-\uffff'


path_validator = RegexValidator(
    regex=r'^([\w\d_\-]+|[\.][\/\w\d_\-\+=\^,])(\.?[\w\d\-\/\\_()\+=\^,]+)+$',
    message=_('Invalid path. Path must not contain "..", "~" or any other special characters and must be relative.')
)


class DomainNameValidator(RegexValidator):
    message = _('Invalid domain name value.')
    surl = URLValidator.ul
    ipv4_re = URLValidator.ipv4_re
    ipv6_re = URLValidator.ipv6_re
    domain_re = r"(?:\.{0,1}(?!-)[a-zA-Z"+surl+r"0-9-]{1,63}(?<!-)\.{0,1})*"
    hostname_re = URLValidator.hostname_re
    regex = re.compile(
        r"^(?:" +
        ipv4_re + r"|" +
        ipv6_re + r"|" +
        hostname_re + r"|" +
        domain_re +
        r")$",
        re.MULTILINE
    )


def validate_hostname(address: AnyStr):
    msg = _("Invalid hostname or IP '{}'.".format(address))
    DomainNameValidator(message=msg)(address)
