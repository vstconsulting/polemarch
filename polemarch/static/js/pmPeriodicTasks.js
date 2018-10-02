
tabSignal.connect("openapi.schema.definition.Periodictask", function(data)
{
    //debugger;
})

tabSignal.connect("openapi.schema.definition.OnePeriodictask", function(data)
{
    let projPath = "/project/{pk}"
    data.definition.properties.mode.dynamic_properties = {}
    data.definition.properties.mode.required = false
    data.definition.properties.mode.dynamic_properties.callback = function(fieldObj, newValue){

        let obj = {
            type:"autocomplete"
        }
        if(newValue.value == "PLAYBOOK")
        {
            obj.override_opt = {
                dynamic_properties:{
                    list_obj:projPath + "/playbook/",
                    value_field:'id',
                    view_field:'name',
                }
            };
        }
        else if(newValue.value == "MODULE")
        {
            obj.override_opt = {
                dynamic_properties:{
                    list_obj:projPath + "/module/",
                    value_field:'id',
                    view_field:'name',
                }
            };

        }
        else
        {
            obj.type = "hidden"
        }
        return obj
    }

    data.definition.properties.template.type = "number"
    data.definition.properties.template.required = false
    data.definition.properties.template.dynamic_properties = {}
    data.definition.properties.template.dynamic_properties.callback = function(fieldObj, newValue)
    {

        let obj = {
            type:"select2"
        }
        if(newValue.value == "TEMPLATE")
        {
            obj.override_opt = {
                dynamic_properties:{
                    list_obj:projPath + "/template/",
                    value_field:'id',
                    view_field:'name',
                }
            };
        }
        else
        {
            obj.type = "hidden"
        }
        return obj
    }

    data.definition.properties.template_opt.required = false
    data.definition.properties.template_opt.dynamic_properties = {}
    data.definition.properties.template_opt.dynamic_properties.callback = function(fieldObj, newValue)
    {
        let obj = { 
            type:"hidden"
        }
        
        if(newValue.value && newValue.value.options_list)
        { 
            obj.type = "enum"
            obj.override_opt = {
                enum:newValue.value.options_list
            };
        }
        
        return obj
    } 
    
    data.definition.properties.inventory.type = "number"
    data.definition.properties.inventory.required = false
    data.definition.properties.inventory.dynamic_properties = {}
    data.definition.properties.inventory.dynamic_properties.callback = function(fieldObj, newValue)
    {

        let obj = {
            type:"select2"
        }
        if(newValue.value != "TEMPLATE")
        {
            obj.override_opt = {
                dynamic_properties:{
                    list_obj:projPath + "/inventory/",
                    value_field:'id',
                    view_field:'name',
                }
            };
        }
        else
        {
            obj.type = "hidden"
        }
        return obj
    }
})


guiElements.template_data = function(opt = {})
{
    this.name = 'template_data'
    guiElements.base.apply(this, arguments)
}

guiElements.template_options = function(opt = {})
{
    this.name = 'template_data'
    guiElements.base.apply(this, arguments)
}
 