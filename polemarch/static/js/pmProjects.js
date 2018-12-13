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


tabSignal.connect("openapi.schema", function(data)
{
    window.guiSchema.path["/project/{pk}/"].schema.edit.fields.execute_view_data.format = 'null'
    window.guiSchema.path["/project/{pk}/"].schema.get.fields.execute_view_data.format = 'null'
})


gui_project = {

    polemarchYamlForm:undefined,

    hasForm:function()
    {
        return this.model && this.model.data && this.model.data.execute_view_data != null;
    },

    executePlaybook:function(data)
    {
        var def = new $.Deferred();

        let q = {
            data_type:["project", this.url_vars.api_pk, "execute_playbook"],
            data:data,
            method:'post'
        }

        $.when(this.apiQuery(q)).done(data =>
        {
            def.resolve(data)
            vstGO(['project', this.url_vars.api_pk, 'history', data.history_id])
        }).fail(e => {
            this.showErrors(e, q.method)
            def.reject(e)
        })
        def.reject()

        return def.promise();
    },

    renderForm:function()
    {
        let thisObj = this;
        let extra_fields = $.extend(true, {}, this.model.data.execute_view_data.fields)
        let execute_buttons = {};
        for(let i in this.model.data.execute_view_data.playbooks)
        {
            let val = this.model.data.execute_view_data.playbooks[i]

            execute_buttons[i] = {
                title:val.title,
                text:val.title,
                description: val.help || val.description,
                format:'formButton',
                value: i,
                class:'btn-primary',
                onclick:function(){
                    let val = thisObj.polemarchYamlForm.getValue()
                    val.playbook = this.getValue()

                    delete val.extra_vars[val.playbook]
                    val.extra_vars = JSON.stringify(val.extra_vars);

                    return thisObj.executePlaybook(val)
                }
            }
        }

        let formData = {
            title:"Deploy",
            form:{
                'inventory' : {
                    title:'inventory',
                    required:true,
                    format:'hybrid_autocomplete',
                    dynamic_properties:{
                        list_obj: "/project/{pk}/inventory/",
                        value_field: "id",
                        view_field: "name",
                    }
                },
                user:{
                    title:'User',
                    description: "connect as this user (default=None)",
                    format:'string',
                    type: "string",
                },
                key_file: {
                    title:'Key file',
                    description: "use this file to authenticate the connection",
                    format:'secretfile',
                    type: "string",
                    dynamic_properties:{
                        list_obj: "/project/{pk}/inventory/",
                        value_field: "id",
                        view_field: "name",
                    }
                },
                extra_vars: {
                    title:"Execute parametrs",
                    format:'form',
                    form:extra_fields,
                },
                execute_buttons: {
                    format:'form',
                    form: execute_buttons,
                }
            }
        }

        this.polemarchYamlForm = new guiElements.form(undefined, formData);
        return this.polemarchYamlForm.render();
    },
}

tabSignal.connect("openapi.schema.schema", function(obj)
{
    if (obj.path == '/project/{pk}/module/{module_id}/')
    {
        obj.value.fields.data.format = 'ansible_json'
        obj.value.fields.data.hide_title = true;
    }
})