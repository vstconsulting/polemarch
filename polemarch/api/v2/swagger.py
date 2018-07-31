import ansible
from vstutils.api import swagger

api_info_dict = swagger.api_info_dict.copy()
api_info_dict['x-versions']['ansible'] = ansible.__version__

api_info = swagger.openapi.Info(**api_info_dict)
