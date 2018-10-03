
let projPath = "/project/{pk}"

function PeriodicTaskVariable_key_onInit(opt = {}, value, parent_object)
{  
    let thisObj = this;
    let periodicTask = new guiObjectFactory(projPath + "/periodic_task/{periodic_task_id}/"); 
    $.when(periodicTask.load(parent_object.url_vars.api_periodic_task_id)).done(function(){

        let fields = {}
        if(periodicTask.model.data.kind == "PLAYBOOK")
        {
            fields = window.guiSchema.path[projPath + "/execute_playbook/"].schema.exec.fields  
            delete fields.playbook 
        }
        if(periodicTask.model.data.kind == "MODULE")
        {
            fields = window.guiSchema.path[projPath + "/execute_module/"].schema.exec.fields 
            delete fields.mode 
        }

        delete fields.inventory 
        thisObj.setType("enum", {
            enum:Object.keys(fields), 
        });
        thisObj.opt.all_fields = fields

        thisObj._callAllonChangeCallback()
    }) 
}

function PeriodicTaskVariable_value_callback(fieldObj, newValue)
{
    if(!newValue.value)
    {
        return;
    }

    if(!newValue.opt.all_fields)
    {
        return;
    }

    if(!newValue.opt.all_fields[newValue.value])
    {
        return;
    }

    let field = newValue.opt.all_fields[newValue.value]

    field.format = getFieldType(field)

    return field 
}

tabSignal.connect("openapi.schema.definition.PeriodicTaskVariable", function(data)
{
    data.definition.properties.key.dynamic_properties = {}
    data.definition.properties.key.format = "dynamic"
    data.definition.properties.key.required = true
    data.definition.properties.key.__func__onInit = "PeriodicTaskVariable_key_onInit"
        
        
    data.definition.properties.value.dynamic_properties = {}
    data.definition.properties.value.format = "dynamic"
    data.definition.properties.value.required = true
    data.definition.properties.value.parent_field = 'key'
    data.definition.properties.value.dynamic_properties.__func__callback = "PeriodicTaskVariable_value_callback" 
})

function OnePeriodictask_mode_callback (fieldObj, newValue)
{
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
        obj.type = "null"
    }
    return obj
}

function OnePeriodictask_template_callback (fieldObj, newValue)
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
        obj.type = "null"
    }
    return obj
}

function OnePeriodictask_template_opt_callback (fieldObj, newValue)
{  
    let obj = {
        type:"null"
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

function OnePeriodictask_inventory_callback (fieldObj, newValue)
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
        obj.type = "null"
    }
    return obj 
}

tabSignal.connect("openapi.schema.definition.OnePeriodictask", function(data)
{  
    data.definition.properties.mode.dynamic_properties = {}
    data.definition.properties.mode.required = false
    data.definition.properties.mode.dynamic_properties.__func__callback = "OnePeriodictask_mode_callback"

    data.definition.properties.template.type = "number"
    data.definition.properties.template.required = false
    data.definition.properties.template.dynamic_properties = {}
    data.definition.properties.template.dynamic_properties.__func__callback = "OnePeriodictask_template_callback"

    data.definition.properties.template_opt.required = false
    data.definition.properties.template_opt.dynamic_properties = {}
    data.definition.properties.template_opt.dynamic_properties.__func__callback = "OnePeriodictask_template_opt_callback"

    data.definition.properties.inventory.type = "number"
    data.definition.properties.inventory.required = false
    data.definition.properties.inventory.dynamic_properties = {}
    data.definition.properties.inventory.dynamic_properties.__func__callback = "OnePeriodictask_inventory_callback"
})

tabSignal.connect("guiList.renderLine.periodic_task", function(obj)
{
    // Для kind == TEMPLATE прятать ссылку на Variables
    if(obj.dataLine.line.kind == "TEMPLATE")
    {
        if(obj.dataLine.sublinks_l2['variables'])
        {
            obj.dataLine.sublinks_l2['variables'].hidden = true
        }
    }
    else
    {
        if(obj.dataLine.sublinks_l2['variables'])
        {
            obj.dataLine.sublinks_l2['variables'].hidden = false
        }
    }
})

tabSignal.connect("guiList.renderPage.periodic_task", function(obj)
{
    // Для kind == TEMPLATE прятать ссылку на Variables
    if(obj.data.kind == "TEMPLATE")
    {
        if(obj.options.links['variables'])
        {
            obj.options.links['variables'].hidden = true
        }
    }
    else
    {
        if(obj.options.links['variables'])
        {
            obj.options.links['variables'].hidden = false
        }
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
