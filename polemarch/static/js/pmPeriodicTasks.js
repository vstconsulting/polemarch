
let projPath = "/project/{pk}"

function PeriodicTaskVariable_key_onInit(opt = {}, value, parent_object)
{
    let thisObj = this;
    let periodicTask = new guiObjectFactory(projPath + "/periodic_task/{periodic_task_id}/");
    $.when(periodicTask.load(parent_object.url_vars.api_periodic_task_id)).done(data => {

        let inventory_path = '/inventory/{inventory_id}'
        let list_obj = [];
        list_obj.push(projPath + inventory_path + '/all_groups/')
        list_obj.push(projPath + inventory_path + '/all_hosts/')

        let additional_props = {
            api_inventory_id: data.data.inventory,
        }

        let new_dynamic_properties = {
            list_obj: list_obj,
            value_field:'name',
            view_field:'name',
            url_vars: additional_props
        }

        let delete_fields = [];

        let fields_options = {};

        let fields = {}

        if(periodicTask.model.data.kind == "PLAYBOOK")
        {
            fields = window.guiSchema.path[projPath + "/execute_playbook/"].schema.exec.fields;

            delete_fields = ['playbook', 'inventory'];

            // this is done, because we need to modify window.guiSchema.path[projPath + "/execute_playbook/"].schema.exec.fields,
            // but we can't modify original object, because it's used in execute_playbook
            fields_options = get_field_options_for_PeriodicTaskVariable_value(fields, delete_fields, 'playbook', new_dynamic_properties);

        }
        if(periodicTask.model.data.kind == "MODULE")
        {
            fields = window.guiSchema.path[projPath + "/execute_module/"].schema.exec.fields;

            delete_fields = ['module', 'inventory'];

            fields_options = get_field_options_for_PeriodicTaskVariable_value(fields, delete_fields, 'module', new_dynamic_properties);
        }

        thisObj.setType("enum", {
            enum: fields_options.fields_names
        });
        thisObj.opt.all_fields = fields
        thisObj.opt.fields_options = fields_options;

        thisObj._callAllonChangeCallback()
    })
}

/*
 * because we need to modify window.guiSchema.path[projPath + "/execute_playbook/"].schema.exec.fields,
 * but we can't modify original object, because it's used in execute_playbook
 * @param object - fields -  object with fields,
 * @param array - delete_fields - names of fields, that we need to delete,
 * @param string - pt_kind - kind of periodic task
 * @param object - new_dynamic_properties - object with overwritten dynamic_properties
 */

function get_field_options_for_PeriodicTaskVariable_value(fields, delete_fields, pt_kind, new_dynamic_properties)
{
    let fields_options = {
        fields_names: [],
        fields_formats: {},
        fields_overwrite_opt: {},
    }

    fields_options.fields_names = Object.keys(fields);

    for(let i in fields_options.fields_names)
    {
        if($.inArray(fields_options.fields_names[i], delete_fields) != -1)
        {
            delete fields_options.fields_names[i];
            continue;
        }

        fields_options.fields_formats[fields_options.fields_names[i]] = getFieldType(fields[fields_options.fields_names[i]]);
    }

    let ex_field = 'group';

    if(pt_kind == 'playbook')
    {
        ex_field = 'limit';
    }

    fields_options.fields_formats[ex_field] = 'autocomplete';
    fields_options.fields_overwrite_opt[ex_field] = {
        dynamic_properties: new_dynamic_properties,
        default: 'all',
        required: true
    }

    return fields_options;
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

    let field_format = newValue.opt.fields_options.fields_formats[newValue.value]

    if(newValue.value == 'group' || newValue.value == 'limit')
    {
        return {
            format: field_format,
            override_opt: newValue.opt.fields_options.fields_overwrite_opt[newValue.value],
        }
    }

    return {
        format:field_format,
        override_opt: {
            required: newValue.opt.all_fields[newValue.value].required || false,
        }
    }
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
                value_field:'playbook',
                view_field:'playbook',
            }
        };
    }
    else if(newValue.value == "MODULE")
    {
        obj.override_opt = {
            dynamic_properties:{
                list_obj:projPath + "/module/",
                value_field:'name',
                view_field:'path',
            }
        };

    }
    else
    {
        obj.type = "hidden"
    }
    return obj
}

function OnePeriodictask_template_callback (fieldObj, newValue)
{
    let obj = {
        type:"null"
    }

    if(newValue.value == "TEMPLATE")
    {
        $(".sublink-btn-variables").addClass('hidden-true').removeClass('hidden-false')
        obj.type = "select2"
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
        $(".sublink-btn-variables").removeClass('hidden-true').addClass('hidden-false')
    }

    return obj
}

function OnePeriodictask_template_opt_callback (fieldObj, newValue)
{
    let obj = {
        type:"hidden"
    }
    
    if(newValue.value)
    {
        obj.type = "select2"
        obj.override_opt = {
            dynamic_properties:{
                list_obj:projPath + "/template/{template_id}/option/",
                value_field:'name',
                view_field:'name',
                url_vars:{
                    api_template_id:newValue.value
                }
            }
        };
    }

    return obj
}

function OnePeriodictask_inventory_callback (fieldObj, newValue)
{
    let obj = {
        type:"hybrid_autocomplete"
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


function signal_gui_schema_name_periodic_task(data){

    data.value.fields.mode.type = "dynamic"
    data.value.fields.mode.dynamic_properties = {}
    data.value.fields.mode.required = false
    data.value.fields.mode.dynamic_properties.__func__callback = "OnePeriodictask_mode_callback"

    data.value.fields.template_opt.type = "dynamic"
    data.value.fields.template_opt.required = false
    data.value.fields.template_opt.additionalProperties.field = "template"
    data.value.fields.template_opt.dynamic_properties = {}
    data.value.fields.template_opt.dynamic_properties.__func__callback = "OnePeriodictask_template_opt_callback"

    data.value.fields.inventory.type = "dynamic"
    data.value.fields.inventory.required = false
    data.value.fields.inventory.dynamic_properties = {}
    data.value.fields.inventory.dynamic_properties.__func__callback = "OnePeriodictask_inventory_callback"

    data.value.fields.template.format = "dynamic"
    data.value.fields.template.parent_field = "kind"
    data.value.fields.template.required = false
    data.value.fields.template.dynamic_properties = {}
    data.value.fields.template.dynamic_properties.__func__callback = "OnePeriodictask_template_callback"

    data.value.fields.schedule.dynamic_properties.types["INTERVAL"] = "uptime";
}

tabSignal.connect("gui.schema.name.periodic_task.edit", signal_gui_schema_name_periodic_task)
tabSignal.connect("gui.schema.name.periodic_task.new", signal_gui_schema_name_periodic_task)


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
