function execute_module_group_callback(fieldObj, newValue)
{
    let obj = {
        type: 'autocomplete'
    }

    if(!isNaN(Number(newValue.value)))
    {
        let list_obj = []
        let new_value = newValue.value
        let inventory_path = '/inventory/{inventory_id}'

        list_obj.push(projPath + inventory_path + '/all_groups/')
        list_obj.push(projPath + inventory_path + '/all_hosts/')

        let additional_props = {
            api_inventory_id: new_value
        }

        obj.override_opt = {
            dynamic_properties:{
                list_obj: list_obj,
                value_field:'name',
                view_field:'name',
                url_vars: additional_props
            }
        }
    }

    return obj;
}

tabSignal.connect("openapi.schema.definition.AnsibleModule", function(obj) {
    let properties = obj.definition.properties;

    properties.inventory = {
        name: 'inventory',
        title: 'Inventory',
        description: 'specify inventory host path or comma separated host list. --inventory-file is deprecated',
        type: 'string',
        format: 'hybrid_autocomplete',
        dynamic_properties: {
            list_obj:projPath + "/inventory/",
            value_field:'id',
            view_field:'name',
        },
        __func__custom_getValue: 'inventory_hybrid_autocomplete_getValue',

    }
    properties.group = {
        name: 'group',
        title: 'Group',
        type: 'string',
        format: 'dynamic',
        default: 'all',
        parent_field: ['inventory'],
        dynamic_properties: {
            __func__callback: 'execute_module_group_callback',
            value_field:'name',
            view_field:'name',
            list_obj: []
        }
    }
})

tabSignal.connect("openapi.schema.definition.AnsiblePlaybook", function(obj) {
    let properties = obj.definition.properties;

    properties.inventory = {
        name: 'inventory',
        title: 'Inventory',
        description: 'specify inventory host path or comma separated host list. --inventory-file is deprecated',
        type: 'string',
        format: 'hybrid_autocomplete',
        dynamic_properties: {
            list_obj:projPath + "/inventory/",
            value_field:'id',
            view_field:'name',
        },
        __func__custom_getValue: 'inventory_hybrid_autocomplete_getValue',

    }

    properties.limit = {
        name: 'limit',
        title: 'Limit',
        description: "further limit selected hosts to an additional pattern",
        type: 'string',
        format: 'dynamic',
        default: 'all',
        parent_field: ['inventory'],
        dynamic_properties: {
            __func__callback: 'execute_module_group_callback',
            value_field:'name',
            view_field:'name',
            list_obj: []
        }
    }
})




guiElements.form = function(opt = {}, value, parent_object)
{
    this.name = 'string'
    guiElements.base.apply(this, arguments)


}