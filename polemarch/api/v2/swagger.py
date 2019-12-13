from vstutils.api.schema.info import api_info_dict, openapi
from ...main.utils import AnsibleArgumentsReference

api_info_dict = api_info_dict.copy()
api_info_dict['x-versions']['ansible'] = AnsibleArgumentsReference().version

api_info = openapi.Info(**api_info_dict)
