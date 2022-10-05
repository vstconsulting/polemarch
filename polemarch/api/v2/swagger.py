from vstutils.api.schema.info import api_info_dict, openapi
from ...main.constants import ANSIBLE_REFERENCE

api_info_dict = api_info_dict.copy()
api_info_dict['x-versions']['ansible'] = ANSIBLE_REFERENCE.version

api_info = openapi.Info(**api_info_dict)
