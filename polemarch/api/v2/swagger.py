from vstutils.api import swagger
from ...main.utils import AnsibleArgumentsReference

api_info_dict = swagger.api_info_dict.copy()
api_info_dict['x-versions']['ansible'] = AnsibleArgumentsReference().version

api_info = swagger.openapi.Info(**api_info_dict)
