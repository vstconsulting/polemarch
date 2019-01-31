window.projPath = "/project/{pk}"

gui_project_template = {

    getValue : function (hideReadOnly)
    {
        let arr_data_fields = [];
        let delete_data_fields = [];

        let common_fields = ['inventory'];
        let module_fields = ['module', 'args', 'group'];
        let playbook_fields = ['playbook'];

        let template_data = gui_base_object.getValue.apply(this, arguments);
        let data_field = {};

        if(template_data.data)
        {
            data_field = JSON.parse(template_data.data);
        }

        if(this.model && this.model.data && this.model.data.data && this.model.data.data.vars)
        {
            data_field.vars = this.model.data.data.vars;
        }

        if(this.model && this.model.data && this.model.data.options)
        {
            template_data.options = this.model.data.options;
        }

        if(template_data.kind && template_data.kind.toLowerCase() == 'module')
        {
            arr_data_fields = module_fields;
            delete_data_fields = playbook_fields;
        }
        else
        {
            arr_data_fields = playbook_fields;
            delete_data_fields = module_fields;
        }

        arr_data_fields = arr_data_fields.concat(common_fields);

        // filters fields for this current kind
        arr_data_fields.forEach(function(value)
        {
            if(template_data[value])
            {
                data_field[value] = template_data[value];
                delete template_data[value];
            }
        })

        if(!data_field.vars)
        {
            data_field.vars = {};
        }

        // deletes fields from opposite kind
        delete_data_fields.forEach(function(value)
        {
            if(template_data[value])
            {
                delete template_data[value];
            }
        });

        let kind_was_changed = false;
        if(this.model && this.model.data && this.model.data.kind && template_data.kind)
        {
            kind_was_changed = !(this.model.data.kind.toLowerCase() == template_data.kind.toLowerCase())
        }
        // if kind was changed, we delete all previous vars
        if(kind_was_changed)
        {
            data_field.vars = {};
            template_data.options = {};
        }

        template_data.data = JSON.stringify(data_field);
        template_data.options = JSON.stringify(template_data.options);

        return template_data;
    },

    prepareDataBeforeRender: function()
    {
        let template_data = this.model.data;
        let arr_data_fields = [];
        if(template_data)
        {
            if(template_data.kind.toLowerCase() == 'module')
            {
                arr_data_fields = ['module', 'args', 'inventory', 'group']
            }
            else
            {
                arr_data_fields = ['playbook', 'inventory'];
            }

            arr_data_fields.forEach(function(value)
            {
                template_data[value] = template_data.data[value];
            })
        }

        return template_data;
    },

    updateFromServer : function ()
    {
        if(this.api.type != "page"){
            return gui_list_object.updateFromServer.apply(this, arguments);
        }

        let res = this.load(this.model.filters);
        let data_field = ['inventory'];

        $.when(res).done(() =>
        {
            for(let i in this.model.guiFields)
            {
                if($.inArray(i, data_field) == -1) {
                    this.model.guiFields[i].updateValue(this.model.data[i], this.model.data);
                } else {
                    this.model.guiFields[i].updateValue(this.model.data.data[i], this.model.data);
                }
            }

            this.onUpdateFromServer();
        })

        return res;
    },

}


gui_project_template_variables = {

    pkValuePriority: ["key"],

    apiGetDataForQuery : function (query, variable)
    {
        try{
            if(variable)
            {
                if(query.method == "get")
                {
                    let res = {
                        status: 200,
                        item: "project",
                        type: "mod",
                        data: {},
                        subitem: [
                            this.url_vars['api_pk'],
                            "template",
                            this.url_vars['api_template_id'],
                            "variables",
                            variable
                        ]
                    }
                    let val = this.parent_template.model.data.data['vars'];
                    if(val[variable] !== undefined)
                    {
                        res.data = {
                            key: variable,
                            value: val[variable],
                        }
                    }
                    else
                    {
                        res.status = 404;
                        res.data.detail = "No Variable matches the given query.";
                    }

                    return res;
                }

                if(query.method == "put")
                {
                    let template_data = this.parent_template.model.data

                    let vars = template_data.data['vars'];

                    if(!vars)
                    {
                        vars = {};
                    }

                    vars[query.data.key] = query.data.value;

                    var def = new $.Deferred();
                    $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
                        def.resolve({
                            status:200,
                            item:"project",
                            type:"mod",
                            data:query.data,
                            subitem: [
                                this.url_vars['api_pk'],
                                "template",
                                this.url_vars['api_template_id'],
                                "variables",
                                variable,
                            ]
                        })
                    }).fail((e) =>{
                        def.reject(e)
                    })
                    return  def.promise()
                }
            }
            else
            {
                if(query.method == "get")
                {
                    let res =  {
                        status: 200,
                        item: "project",
                        type: "mod",
                        data: {
                            count: 0,
                            next: null,
                            previous: null,
                            results: [ ]
                        },
                        subitem: [
                            this.url_vars['api_pk'],
                            "template",
                            this.url_vars['api_template_id'],
                            "variables",
                        ]
                    }

                    let vars = this.parent_template.model.data.data['vars'];
                    let limit =+ query.filters.match(/limit=([0-9]+)/)[1] ||  guiLocalSettings.get('page_size');
                    let offset =+ query.filters.match(/offset=([0-9]+)/)[1] || 0;
                    if(vars && typeof vars == "object") {
                        let vars_keys = Object.keys(vars);
                        for(let i=offset; i<limit+offset; i++) {
                            let key = vars_keys[i];
                            if(key && vars[key] !== undefined) {
                                res.data.results.push({
                                    id: key,
                                    key: key,
                                    value: vars[key],
                                })
                            }
                        }
                        res.data.count = vars_keys.length;
                    }
                    return res;
                }

                if(query.method == "post")
                {
                    let template_data = this.parent_template.model.data

                    let vars = template_data.data['vars'];

                    if(!vars)
                    {
                        vars = {};
                    }

                    vars[query.data.key] = query.data.value;

                    var def = new $.Deferred();
                    $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
                        def.resolve({
                            status:201,
                            item:"project",
                            type:"mod",
                            data:query.data,
                            subitem: [
                                this.url_vars['api_pk'],
                                "template",
                                this.url_vars['api_template_id'],
                                "variables",
                            ]
                        })
                    }).fail((e) =>{
                        def.reject(e)
                    })
                    return  def.promise()
                }
            }
        }catch (exception) {
            var def = new $.Deferred();
            def.reject({
                status:404,
                data:{detail:"Option not found"}
            })
            return def.promise()
        }
    },

    apiQuery : function (query)
    {
        let variable;
        if(query.data_type[query.data_type.length-1] != 'variables')
        {
            variable = query.data_type[query.data_type.length-1];
        }
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/")
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{

            $.when(this.apiGetDataForQuery(query, variable)).done((d) =>{
                if(d.status >= 200 && d.status < 300) {
                    def.resolve(d);
                } else {
                    def.reject(d);
                }
            }).fail((e) =>{
                def.reject(e);
            })

        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    delete: function()
    {
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars);

        let def = new $.Deferred();

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            let template_data = data.data;
            delete template_data.data.vars[url_info.api_variables_id]
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, template_data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    deleteArray : function (ids)
    {
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars);

        let def = new $.Deferred();

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            let template_data = data.data;
            for(let i in ids)
            {
                let id = ids[i];
                delete template_data.data.vars[id];
            }
            guiPopUp.success("Objects of '"+this.api.bulk_name+"' type were successfully deleted");
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, template_data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    search: function(filters)
    {
        return customTemplateInnerObjectsSearch.apply(this, arguments);
    },
}

gui_project_template_option = {

    load: function(filters)
    {
        if(this.api.type == 'page')
        {
            let def = new $.Deferred();

            $.when(gui_page_object.load.apply(this, arguments)).done(d => {
                this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/");
                $.when(this.parent_template.load(this.url_vars['api_template_id'])).done((d1) => {

                    let template_data = this.parent_template.model.data;
                    prepareOptionFields(template_data, this.api.schema.edit);
                    prepareOptionFields(template_data, this.api.schema.get);
                    def.resolve(d1);
                })
            }).fail((e) =>{
                def.reject(e);
            })

            return def.promise();
        }
        else
        {
            return gui_list_object.load.apply(this, arguments)
        }

    },

    renderAsNewPage : function (render_options = {})
    {
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/");
        $.when(this.parent_template.load(this.url_vars['api_template_id'])).done((d1) =>{

            let template_data = this.parent_template.model.data;
            prepareOptionFields(template_data, this.api.schema.new);

            def.resolve(gui_list_object.renderAsNewPage.apply(this, arguments));
        })

        return def.promise();
    },

    apiGetDataForQuery : function (query, option)
    {
        try{

            if(option)
            {
                if(query.method == "get")
                {
                    let res =  {
                        status: 200,
                        item: "project",
                        type: "mod",
                        data: {},
                        subitem: [
                            this.url_vars['api_pk'],
                            "template",
                            this.url_vars['api_template_id'],
                            "option",
                            option,
                        ]
                    }

                    let val = this.parent_template.model.data.options[option];

                    res.data = { }
                    for(let i in gui_project_template_option_Schema)
                    {
                        res.data[i] = val[i]

                        if(i == 'name' && val[i] == undefined)
                        {
                            res.data[i] = option;
                        }
                    }

                    return res;
                }

                if(query.method == "put")
                {
                    let template_data = this.parent_template.model.data

                    if(query.data.name)
                    {
                        query.data.name = query.data.name.replace(/[\s\/\-]+/g,'_');
                    }

                    if(option != query.data.name)
                    {
                        template_data.options[query.data.name] = template_data.options[option];
                        delete template_data.options[option];
                    }

                    for(let field in query.data)
                    {
                        template_data.options[query.data.name][field] = query.data[field];
                    }

                    delete template_data.options[query.data.name].name

                    var def = new $.Deferred();
                    $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
                        def.resolve({
                            status:200,
                            item:"project",
                            type:"mod",
                            data:query.data,
                            subitem: [
                                this.url_vars['api_pk'],
                                "template",
                                this.url_vars['api_template_id'],
                                "option",
                                option,
                            ]
                        })
                    }).fail((e) =>{
                        def.reject(e)
                    })
                    return  def.promise()
                }
            }
            else
            {
                if(query.method == "get")
                {
                    let res =  {
                        status: 200,
                        item: "project",
                        type: "mod",
                        data: {
                            count: 0,
                            next: null,
                            previous: null,
                            results: [ ]
                        },
                        subitem: [
                            this.url_vars['api_pk'],
                            "template",
                            this.url_vars['api_template_id'],
                            "option",
                        ]
                    }

                    let limit =+ query.filters.match(/limit=([0-9]+)/)[1] ||  guiLocalSettings.get('page_size');
                    let offset =+ query.filters.match(/offset=([0-9]+)/)[1] || 0;
                    if(this.parent_template.model.data.options && typeof this.parent_template.model.data.options == "object") {
                        let option_keys = Object.keys(this.parent_template.model.data.options);
                        for (let i = offset; i < limit + offset; i++) {
                            let key = option_keys[i];
                            if (key && this.parent_template.model.data.options[key]) {
                                let val = this.parent_template.model.data.options[key];
                                res.data.results.push({
                                    "id": key,
                                    "name": val.name || key,
                                })
                            }
                        }
                        res.data.count = option_keys.length;
                    }
                    return res;
                }

                if(query.method == "post")
                {
                    let template_data = this.parent_template.model.data
                    if(query.data.name)
                    {
                        query.data.name = query.data.name.replace(/[\s\/\-]+/g,'_');
                    }
                    if(template_data.options[query.data.name])
                    {
                        guiPopUp.error('Option with "' + query.data.name + '" name exists already');
                        return undefined;
                    }

                    template_data.options[query.data.name] = $.extend(true, {}, query.data)
                    delete template_data.options[query.data.name].name

                    var def = new $.Deferred();
                    $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
                        def.resolve({
                            status:201,
                            item:"project",
                            type:"mod",
                            data:query.data,
                            subitem: [
                                this.url_vars['api_pk'],
                                "template",
                                this.url_vars['api_template_id'],
                                "option",
                            ],
                        })
                    }).fail((e) =>{
                        def.reject(e)
                    })
                    return  def.promise()
                }
            }
        }catch (exception) {
            var def = new $.Deferred();

            def.reject({
                status:404,
                data:{detail:"Option not found"}
            })
            return def.promise()
        }
    },

    apiQuery : function (query)
    {
        let option;
        if(query.data_type[query.data_type.length-1] != 'option' && query.data_type.length == 6)
        {
            option = query.data_type[query.data_type.length-1];
        }
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars)
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{
            $.when(this.apiGetDataForQuery(query, option)).done((d) =>{
                def.resolve(d)
            }).fail((e) =>{
                def.reject(e);
            })

        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    delete: function()
    {
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars);

        let def = new $.Deferred();

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            let template_data = data.data;
            delete template_data.options[url_info.api_option_id]
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, template_data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    deleteArray : function (ids)
    {
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars);

        let def = new $.Deferred();

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            let template_data = data.data;
            for(let i in ids)
            {
                let id = ids[i];
                delete template_data.options[id];
            }
            guiPopUp.success("Objects of '"+this.api.bulk_name+"' type were successfully deleted");
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, template_data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    search: function(filters)
    {
        return customTemplateInnerObjectsSearch.apply(this, arguments);
    },
}

gui_project_template_option_variables = {

    pkValuePriority: ["key"],

    apiGetDataForQuery : function (query, variable)
    {
        try{
            if(variable)
            {
                if(query.method == "get")
                {
                    let res = {
                        status: 200,
                        item: "project",
                        type: "mod",
                        data: {},
                        subitem: [
                            this.url_vars['api_pk'],
                            "template",
                            this.url_vars['api_template_id'],
                            "option",
                            this.url_vars['api_option_id'],
                            "variables",
                            variable,
                        ]
                    }

                    let val = this.parent_template.model.data.options[query.data_type[5]];
                    if(val.vars && val.vars[variable] !== undefined)
                    {
                        res.data = {
                            key: variable,
                            value: val.vars[variable],
                        }
                    }
                    else
                    {
                        res.status = 404;
                        res.data.detail = "No Variable matches the given query.";
                    }

                    return res;
                }

                if(query.method == "put")
                {
                    let template_data = this.parent_template.model.data

                    let option_data = template_data.options[query.data_type[5]];

                    if(!option_data.vars)
                    {
                        option_data.vars = {};
                    }

                    option_data.vars[query.data.key] = query.data.value;

                    var def = new $.Deferred();
                    $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
                        def.resolve({
                            status:200,
                            item:"project",
                            type:"mod",
                            data:query.data,
                            subitem: [
                                this.url_vars['api_pk'],
                                "template",
                                this.url_vars['api_template_id'],
                                "option",
                                this.url_vars['api_option_id'],
                                "variables",
                                variable,
                            ]
                        })
                    }).fail((e) =>{
                        def.reject(e)
                    })
                    return  def.promise()
                }
            }
            else
            {
                if(query.method == "get")
                {
                    let res =  {
                        status: 200,
                        item: "option",
                        type: "mod",
                        data: {
                            count: 0,
                            next: null,
                            previous: null,
                            results: [ ]
                        },
                        subitem: [
                            this.url_vars['api_pk'],
                            "template",
                            this.url_vars['api_template_id'],
                            "option",
                            this.url_vars['api_option_id'],
                            "variables",
                        ]
                    }

                    let option_data = this.parent_template.model.data.options[query.data_type[5]];
                    let limit =+ query.filters.match(/limit=([0-9]+)/)[1] ||  guiLocalSettings.get('page_size');
                    let offset =+ query.filters.match(/offset=([0-9]+)/)[1] || 0;
                    if(option_data.vars && typeof option_data.vars == "object") {
                        let vars_keys = Object.keys(option_data.vars);
                        for (let i = offset; i < limit + offset; i++) {
                            let key = vars_keys[i];
                            if (key && option_data.vars[key] !== undefined) {
                                res.data.results.push({
                                    id: key,
                                    key: key,
                                    value: option_data.vars[key],
                                })
                            }
                        }
                        res.data.count = vars_keys.length;
                    }
                    return res;
                }

                if(query.method == "post")
                {
                    let template_data = this.parent_template.model.data

                    let option_data = template_data.options[query.data_type[5]];

                    if(!option_data.vars)
                    {
                        option_data.vars = {};
                    }

                    option_data.vars[query.data.key] = query.data.value;

                    var def = new $.Deferred();
                    $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
                        def.resolve({
                            status:201,
                            item:"project",
                            type:"mod",
                            data:query.data,
                            subitem: [
                                this.url_vars['api_pk'],
                                "template",
                                this.url_vars['api_template_id'],
                                "option",
                                this.url_vars['api_option_id'],
                                "variables",
                            ]
                        })
                    }).fail((e) =>{
                        def.reject(e)
                    })
                    return  def.promise()
                }
            }
        }catch (exception) {
            var def = new $.Deferred();
            def.reject({
                status:404,
                data:{detail:"Option not found"}
            })
            return def.promise()
        }
    },

    apiQuery : function (query)
    {
        let variable;
        if(query.data_type[query.data_type.length-1] != 'variables')
        {
            variable = query.data_type[query.data_type.length-1];
        }
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars)
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{

            $.when(this.apiGetDataForQuery(query, variable)).done((d) =>{
                if(d.status >= 200 && d.status < 300)
                {
                    def.resolve(d);
                } else {
                    def.reject(d);
                }

            }).fail((e) =>{
                def.reject(e);
            })

        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    delete: function()
    {
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars);

        let def = new $.Deferred();

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            let template_data = data.data;
            delete template_data.options[url_info.api_option_id].vars[url_info.api_variables_id]
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, template_data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    deleteArray : function (ids)
    {
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", this.url_vars);

        let def = new $.Deferred();

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            let template_data = data.data;
            for(let i in ids)
            {
                let id = ids[i];
                delete template_data.options[url_info.api_option_id].vars[id];
            }
            guiPopUp.success("Objects of '"+this.api.bulk_name+"' type were successfully deleted");
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, template_data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    search: function(filters)
    {
        return customTemplateInnerObjectsSearch.apply(this, arguments);
    },
}

gui_project_template_option_Schema = {
    "name": {
        "title": "Name",
        "type": "string",
        "required": true,
        "maxLength": 512,
        "minLength": 1,
        "gui_links": [],
        "definition": {},
        "name": "name",
        "parent_name_format": "option_name"
    },
    "group": {
        "title": "Group",
        "type": "string",
        "maxLength": 512,
        "minLength": 1,
        "default": "all",
        "gui_links": [],
        "definition": {},
        "name": "group",
        "parent_name_format": "option_group",
        "format":"autocomplete",
        "dynamic_properties":{
            "list_obj":[],
            "value_field":'name',
            "view_field":'name',
        },
    },
    "module": {
        "title": "Module",
        "type": "string",
        "maxLength": 512,
        "minLength": 1,
        "gui_links": [],
        "definition": {},
        "name": "module",
        "format":"autocomplete",
        "dynamic_properties":{
            "list_obj":projPath + "/module/",
            "value_field":'name',
            "view_field":'path',
        },
        "parent_name_format": "option_module"
    },
    "args": {
        "title": "Args",
        "type": "string",
        "maxLength": 512,
        "minLength": 1,
        "gui_links": [],
        "definition": {},
        "name": "args",
        "parent_name_format": "option_args"
    },
    "playbook": {
        "title": "Playbook",
        "type": "string",
        "maxLength": 512,
        "minLength": 1,
        "gui_links": [],
        "definition": {},
        "name": "playbook",
        "format":"autocomplete",
        "dynamic_properties":{
            "list_obj":projPath + "/playbook/",
            "value_field":'playbook',
            "view_field":'playbook',
        },
        "parent_name_format": "option_playbook"
    },
}

gui_project_template_option_variables_fields_Schema = {
    "key": {
        "title": "Key",
        "type": "dynamic",
        "dynamic_properties": {},
        "required": true,
        "__func__onInit": "TemplateVariable_key_onInit",
        "gui_links": [],
        "definition": {},
        "name": "key",
        "parent_name_format": "variables_key"
    },
    "value": {
        "title": "Value",
        "type": "dynamic",
        "dynamic_properties": {"__func__callback": "TemplateVariable_value_callback",},
        "required": true,
        "default": "",
        "gui_links": [],
        "definition": {},
        "name": "value",
        "parent_name_format": "variables_value",
        "parent_field":"key"
    }
}

let api_error_responses = {
    "400": {
        "description": "Validation error or some data error.",
        "schema": {
            "required": [
                "detail"
            ],
            "type": "object",
            "properties": {
                "detail": {
                    "title": "Detail",
                    "type": "string",
                    "minLength": 1,
                    "required": true
                }
            },
            "definition_name": "Error",
            "definition_ref": "#/definitions/Error"
        }
    },
    "401": {
        "description": "Unauthorized access error.",
        "schema": {
            "required": [
                "detail"
            ],
            "type": "object",
            "properties": {
                "detail": {
                    "title": "Detail",
                    "type": "string",
                    "minLength": 1,
                    "required": true
                }
            },
            "definition_name": "Error",
            "definition_ref": "#/definitions/Error"
        }
    },
    "403": {
        "description": "Permission denied error.",
        "schema": {
            "required": [
                "detail"
            ],
            "type": "object",
            "properties": {
                "detail": {
                    "title": "Detail",
                    "type": "string",
                    "minLength": 1,
                    "required": true
                }
            },
            "definition_name": "Error",
            "definition_ref": "#/definitions/Error"
        }
    },
    "404": {
        "description": "Not found error.",
        "schema": {
            "required": [
                "detail"
            ],
            "type": "object",
            "properties": {
                "detail": {
                    "title": "Detail",
                    "type": "string",
                    "minLength": 1,
                    "required": true
                }
            },
            "definition_name": "Error",
            "definition_ref": "#/definitions/Error"
        }
    }
}

tabSignal.connect("openapi.schema", function(obj) {
    // Modify schema before save in cache
    obj.schema.path["/project/{pk}/template/{template_id}/variables/"] = {
        "level": 6,
        "path": "/project/{pk}/template/{template_id}/variables/",
        "type": "list",
        "name": "variables",
        "bulk_name": "variables",
        "name_field": "name",
        "method": {
            "get": "list",
            "patch": "",
            "put": "",
            "post": "new",
            "delete": "",
        },
        "buttons": [],
        "short_name": "project/template/variables",
        "hide_non_required": 4,
        "extension_class_name": [
            "gui_project_template_variables"
        ],
        "selectionTag": "_project__pk__template__template_id__variables_",
        "methodAdd": "post",
        "canAdd": false,
        "canRemove": false,
        "canCreate": true,
        "schema": {
            "list": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "filters": {
                    0: {
                        "name": "key",
                        "in": "query",
                        "description": "A key name string value (or comma separated list) of instance.",
                        "required": false,
                        "type": "string"
                    },
                    1: {
                        "name": "value",
                        "in": "query",
                        "description": "A value of instance.",
                        "required": false,
                        "type": "string"
                    },
                },
                "query_type": "get",
                "operationId": "project_template_variables_list",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            },
            "new": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "query_type": "post",
                "operationId": "project_template_variables_add",
                "responses": {
                    "201": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            }
        },
        "__link__page": "/project/{pk}/template/{template_id}/variables/{variables_id}/",
        "page_path": "/project/{pk}/template/{template_id}/variables/{variables_id}/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions":{
            "delete": {
                "name":"delete",
                "__func__onClick": "multi_action_delete",
            }
        },
        "__link__parent": "/project/{pk}/template/{template_id}/",
        "parent_path": "/project/{pk}/template/{template_id}/"
    }

    obj.schema.path["/project/{pk}/template/{template_id}/variables/{variables_id}/"] = {
        "level": 7,
        "path": "/project/{pk}/template/{template_id}/variables/{variables_id}/",
        "type": "page",
        "name": "variables",
        "bulk_name": "variables",
        "name_field": "name",
        "method": {
            "get": "page",
            "patch": "edit",
            "put": "edit",
            "post": "",
            "delete": ""
        },
        "buttons": [],
        "short_name": "project/template/variables",
        "hide_non_required": 4,
        "extension_class_name": [
            "gui_project_template_variables"
        ],
        "methodEdit": "put",
        "selectionTag": "_project__pk__template__template_id__variables__variables_id__",
        "canDelete": true,
        "methodDelete": "delete",
        "canEdit": true,
        "schema": {
            "get": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "filters": {},
                "query_type": "get",
                "operationId": "project_template_variables_get",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            },
            "edit": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "query_type": "patch",
                "operationId": "project_template_variables_edit",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": {
                                "key": {
                                    "title": "Key",
                                    "type": "dynamic",
                                    "dynamic_properties": {},
                                    "required": true,
                                    "__func__onInit": "TemplateVariable_key_onInit",
                                    "gui_links": [],
                                    "definition": {},
                                    "name": "key",
                                    "parent_name_format": "variables_key"
                                },
                                "value": {
                                    "title": "Value",
                                    "type": "dynamic",
                                    "dynamic_properties": {},
                                    "required": true,
                                    "__func__callback": "TemplateVariable_value_callback",
                                    "default": "",
                                    "gui_links": [],
                                    "definition": {},
                                    "name": "value",
                                    "parent_name_format": "variables_value"
                                }
                            },
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            }
        },
        "__link__list": "/project/{pk}/template/{template_id}/variables/",
        "list_path": "/project/{pk}/template/{template_id}/variables/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions": [],
        "__link__parent": "/project/{pk}/template/{template_id}/variables/",
        "parent_path": "/project/{pk}/template/{template_id}/variables/"
    };

    obj.schema.path["/project/{pk}/template/{template_id}/option/"] = {
        "level": 6,
        "path": "/project/{pk}/template/{template_id}/option/",
        "type": "list",
        "name": "option",
        "bulk_name": "option",
        "name_field": "name",
        "buttons": [],
        "short_name": "project/template/option",
        "hide_non_required": 4,
        "extension_class_name": [
            "gui_project_template_option"
        ],
        "selectionTag": "_project__pk__template__template_id__option_",
        "methodAdd": "post",
        "canAdd": false,
        "canRemove": false,
        "canCreate": true,
        "method": {'get': 'list', 'patch': '', 'put': '', 'post': 'new', 'delete': ''},
        "schema": {
            "list": {
                "fields": {
                    "name": {
                        "title": "Name",
                        "type": "string",
                        "maxLength": 512,
                        "minLength": 1,
                        "gui_links": [],
                        "definition": {},
                        "name": "name",
                        "parent_name_format": "option_name"
                    },
                },
                "filters": {
                    0: {
                        "name": "name",
                        "in": "query",
                        "description": "A name string value (or comma separated list) of instance.",
                        "required": false,
                        "type": "string"
                    },
                },
                "query_type": "get",
                "operationId": "project_template_option_list",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "integer",
                                    "readOnly": true
                                },
                                "name": {
                                    "title": "Name",
                                    "type": "string",
                                    "maxLength": 512,
                                    "minLength": 1
                                },
                            },
                            "definition_name": "Option",
                            "definition_ref": "#/definitions/Option"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            },
            "new": {
                "fields": $.extend(true, {}, gui_project_template_option_Schema),
                "query_type": "post",
                "operationId": "project_template_option_add",
                "responses": {
                    "201": {
                        "description": "Action accepted.",
                        "schema": {
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_Schema),
                            "definition_name": "OneOption",
                            "definition_ref": "#/definitions/OneOption"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            }
        },
        "__link__page": "/project/{pk}/template/{template_id}/option/{option_id}/",
        "page_path": "/project/{pk}/template/{template_id}/option/{option_id}/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions":{
            "delete": {
                "name":"delete",
                "__func__onClick": "multi_action_delete",
            }
        },
        "__link__parent": "/project/{pk}/template/{template_id}/",
        "parent_path": "/project/{pk}/template/{template_id}/"
    }


    obj.schema.path["/project/{pk}/template/{template_id}/option/{option_id}/"] = {
        "level": 7,
        "path": "/project/{pk}/template/{template_id}/option/{option_id}/",
        "type": "page",
        "name": "option",
        "bulk_name": "option",
        "name_field": "name",
        "method": {
            "get": "page",
            "patch": "edit",
            "put": "edit",
            "post": "",
            "delete": ""
        },
        "buttons": [],
        "short_name": "project/template/option",
        "hide_non_required": 4,
        "extension_class_name": [
            "gui_project_template_option"
        ],
        "methodEdit": "put",
        "selectionTag": "_project__pk__template__template_id__option__option_id__",
        "canDelete": true,
        "methodDelete": "delete",
        "canEdit": true,
        "schema": {
            "get": {
                "fields": $.extend(true, {}, gui_project_template_option_Schema),
                "filters": {},
                "query_type": "get",
                "operationId": "project_template_option_get",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_Schema),
                            "definition_name": "OneOption",
                            "definition_ref": "#/definitions/OneOption"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            },
            "edit": {
                "fields": $.extend(true, {}, gui_project_template_option_Schema),
                "query_type": "patch",
                "operationId": "project_template_option_edit",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_Schema),
                            "definition_name": "OneOption",
                            "definition_ref": "#/definitions/OneOption"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            }
        },
        "__link__list": "/project/{pk}/template/{template_id}/option/",
        "list_path": "/project/{pk}/template/{template_id}/option/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {
            "__link__variables": "/project/{pk}/template/{template_id}/option/{option_id}/variables/",
        },
        "multi_actions": [],
        "__link__parent": "/project/{pk}/template/{template_id}/option/",
        "parent_path": "/project/{pk}/template/{template_id}/option/"
    }

    obj.schema.path["/project/{pk}/template/{template_id}/option/{option_id}/variables/"] = {
        "level": 8,
        "path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/",
        "type": "list",
        "name": "variables",
        "bulk_name": "variables",
        "name_field": "name",
        "method": {
            "get": "list",
            "patch": "",
            "put": "",
            "post": "new",
            "delete": "",
        },
        "buttons": [],
        "short_name": "project/template/option/variables",
        "hide_non_required": 4,
        "extension_class_name": [
            "gui_project_template_option_variables"
        ],
        "selectionTag": "_project__pk__template__template_id__option__option_id__variables_",
        "methodAdd": "post",
        "canAdd": false,
        "canRemove": false,
        "canCreate": true,
        "schema": {
            "list": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "filters": {
                    0: {
                        "name": "key",
                        "in": "query",
                        "description": "A key name string value (or comma separated list) of instance.",
                        "required": false,
                        "type": "string"
                    },
                    1: {
                        "name": "value",
                        "in": "query",
                        "description": "A value of instance.",
                        "required": false,
                        "type": "string"
                    },
                },
                "query_type": "get",
                "operationId": "project_template_option_variables_list",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            },
            "new": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "query_type": "post",
                "operationId": "project_template_option_variables_add",
                "responses": {
                    "201": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            }
        },
        "__link__page": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
        "page_path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions":{
            "delete": {
                "name":"delete",
                "__func__onClick": "multi_action_delete",
            }
        },
        "__link__parent": "/project/{pk}/template/{template_id}/option/{option_id}/",
        "parent_path": "/project/{pk}/template/{template_id}/option/{option_id}/"
    }

    obj.schema.path["/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/"] = {
        "level": 9,
        "path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
        "type": "page",
        "name": "variables",
        "bulk_name": "variables",
        "name_field": "name",
        "method": {
            "get": "page",
            "patch": "edit",
            "put": "edit",
            "post": "",
            "delete": ""
        },
        "buttons": [],
        "short_name": "project/template/option/variables",
        "hide_non_required": 4,
        "extension_class_name": [
            "gui_project_template_option_variables"
        ],
        "methodEdit": "put",
        "selectionTag": "_project__pk__template__template_id__option__option_id__variables__variables_id__",
        "canDelete": true,
        "methodDelete": "delete",
        "canEdit": true,
        "schema": {
            "get": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "filters": {},
                "query_type": "get",
                "operationId": "project_template_option_variables_get",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            },
            "edit": {
                "fields": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                "query_type": "patch",
                "operationId": "project_template_option_variables_edit",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "required": [
                                "key"
                            ],
                            "type": "object",
                            "properties": $.extend(true, {}, gui_project_template_option_variables_fields_Schema),
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
                    "400": api_error_responses["400"],
                    "401": api_error_responses["401"],
                    "403": api_error_responses["403"],
                    "404": api_error_responses["404"]
                }
            }
        },
        "__link__list": "/project/{pk}/template/{template_id}/option/{option_id}/variables/",
        "list_path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions": [],
        "__link__parent": "/project/{pk}/template/{template_id}/option/{option_id}/variables/",
        "parent_path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/"
    };

})

function OneTemplate_args_callback(fieldObj, newValue)
{
    let obj = {}

    if(newValue.value.toLowerCase() == "module")
    {
        obj.type = "string";
    }
    else
    {
        obj.type = "hidden";
    }
    return obj

}

function OneTemplate_group_callback(fieldObj, newValue)
{
    let obj = {
        type: 'autocomplete'
    }
    if (newValue.opt.title.toLowerCase() == 'type')
    {
        if(newValue.value.toLowerCase() == "module")
        {
            obj.override_opt = {
                hidden: false,
                required: false,
            }
        } else {
            obj.override_opt = {
                hidden: true,
                required: false,
            }
        }
    }
    else
    {
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
                hidden: fieldObj.realElement.opt.hidden,
                required: true,
                dynamic_properties:{
                    list_obj: list_obj,
                    value_field:'name',
                    view_field:'name',
                    url_vars: additional_props
                }
            }
        }
        else
        {
            obj.override_opt = {
                hidden: fieldObj.realElement.opt.hidden,
                required: true,
            }
        }
    }

    return obj;
}

function OneTemplate_module_callback(fieldObj, newValue)
{
    let obj = {
        type:"autocomplete"
    }
    if(newValue.value.toLowerCase() == "module")
    {
        obj.override_opt = {
            dynamic_properties:{
                list_obj:projPath + "/module/",
                value_field:'name',
                view_field:'path',
            },
            required: true,
        };
    }
    else
    {
        obj.type = "hidden"
    }
    return obj
}

function OneTemplate_playbook_callback(fieldObj, newValue)
{
    let obj = {
        type:"autocomplete"
    }
    if(newValue.value.toLowerCase() == "task")
    {
        obj.override_opt = {
            dynamic_properties:{
                list_obj:projPath + "/playbook/",
                value_field:'playbook',
                view_field:'playbook',
            },
            required: true,
        };
    }
    else
    {
        obj.type = "hidden"
    }
    return obj
}

tabSignal.connect("openapi.schema.definition.OneTemplate", function(obj) {
    let properties = obj.definition.properties;

    properties.options.hidden = true;
    properties.options_list.hidden = true;
    properties.data.hidden = true;
    properties.data.required = false;

    properties.inventory = {
        name: 'inventory',
        title: 'Inventory',
        enable_button: true,
        enable_button_tooltip: disabled_inv_text,
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
        hidden: true,
        required: true,
        default: 'all',
        parent_field: ['inventory', 'kind'],
        dynamic_properties: {
            __func__callback: 'OneTemplate_group_callback',
            value_field:'name',
            view_field:'name',
            list_obj: []
        }
    }
    properties.module = {
        name: 'module',
        title: 'Module',
        type: 'string',
        format: 'dynamic',
        minLength: 1,
        parent_field: 'kind',
        dynamic_properties: {
            __func__callback: 'OneTemplate_module_callback',
        }
    }

    properties.args = {
        name: 'args',
        title: 'Arguments',
        type: 'string',
        format: 'dynamic',
        parent_field: 'kind',
        dynamic_properties: {
            __func__callback: 'OneTemplate_args_callback',
        }
    }

    properties.playbook = {
        name: 'playbook',
        title: 'Playbook',
        type: 'string',
        format: 'dynamic',
        minLength: 1,
        parent_field: 'kind',
        dynamic_properties: {
            __func__callback: 'OneTemplate_playbook_callback',
        }
    }

});


tabSignal.connect("openapi.schema",  function(obj)
{
    let template = obj.schema.path['/project/{pk}/template/{template_id}/']
    template.links['options'] = obj.schema.path['/project/{pk}/template/{template_id}/option/'];
    template.links['variables'] = obj.schema.path['/project/{pk}/template/{template_id}/variables/'];

    let template_list = obj.schema.path['/project/{pk}/template/'];
    template_list.schema['list'].fields['data'].hidden = true;
    template_list.schema['list'].fields['options'].hidden = true;
    template_list.schema['list'].fields['options_list'].title = 'Options';
});

tabSignal.connect('openapi.completed', function(obj)
{
    window.guiSchema.path['/project/{pk}/template/{template_id}/'].schema.edit.fields.kind.on_change_calls = [questionChangeKindOrNot];
});

function TemplateVariable_key_onInit(opt = {}, value, parent_object)
{
    let thisObj = this;
    let template = new guiObjectFactory("/project/{pk}/template/{template_id}/", parent_object.url_vars);

    $.when(template.load()).done(function(){
        let fields = {}
        if(template.model.data.kind.toLowerCase() == "task")
        {
            fields = window.guiSchema.path["/project/{pk}/execute_playbook/"].schema.exec.fields
            delete fields.playbook
        }
        if(template.model.data.kind.toLowerCase() == "module")
        {
            fields = window.guiSchema.path["/project/{pk}/execute_module/"].schema.exec.fields
            delete fields.module
        }

        delete fields.inventory
        thisObj.setType("enum", {
            enum:Object.keys(fields),
        });
        thisObj.opt.all_fields = fields

        thisObj._callAllonChangeCallback()
    })
}

function TemplateVariable_value_callback(fieldObj, newValue)
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

/*
 * Function deletes fields, that are not needed for option of this template's type.
 * For example, it deletes 'module', 'args', 'group' fields from task template's option schema.
 * @param {template_data} -  object -  template data (values of template's fields);
 * @param {schema_name} - string -  name of option schema.
 */
function prepareOptionFields(template_data, schema)
{
    if(template_data.kind.toLowerCase() == 'task')
    {
        schema.fields['module'].hidden = true;
        schema.fields['args'].hidden = true;
        schema.fields['group'].hidden = true;

        schema.fields['playbook'].hidden = false;
    }
    else
    {
        schema.fields['module'].hidden = false;
        schema.fields['args'].hidden = false;
        schema.fields['group'].hidden = false;

        schema.fields['playbook'].hidden = true;

        if(template_data.data && template_data.data.inventory && !isNaN(template_data.data.inventory))
        {
            let inventory_path = '/inventory/{inventory_id}'

            let list_obj = [
                projPath + inventory_path + '/all_groups/',
                projPath + inventory_path + '/all_hosts/',
            ]

            let additional_props = {
                api_inventory_id: template_data.data.inventory
            }

            schema.fields['group'].dynamic_properties.list_obj = list_obj;
            schema.fields['group'].dynamic_properties.url_vars = additional_props;
        }
        else
        {
            schema.fields['group'].dynamic_properties.list_obj = [];
            schema.fields['group'].dynamic_properties.url_vars = [];
        }


    }
}

/*
* Function makes question for user, if he/she changed kind of template.
* @param object - args - object with field, value and its options
* */
function questionChangeKindOrNot(args) {
    var answer;
    var question = "Change of template's type will <b> delete </b> all existing <b> 'variables' </b> and <b>'options'</b> during saving. Do you really want to do it?";
    var answer_buttons = ["Yes", "No"];

    if(args.value && args.value != args.field.value)
    {
        return $.when(guiPopUp.question(question, answer_buttons)).done(data => {
            answer = data;

            if($.inArray(answer, answer_buttons) != -1)
            {
                if(answer == answer_buttons[1])
                {
                    $('#' + args.field.element_id).val(args.field.value).trigger('change');
                }
            }
        });
    }

    return false;
}

/**
 * Function for search in list of template variables, in list of template options
 * and in list of option variables.
 * @param {string} filters - search filters
 */
function customTemplateInnerObjectsSearch(filters)
{
    let def = new $.Deferred();

    $.when(gui_list_object.load.apply(this, arguments)).done(data => {

        this.model.data = data.data;

        if(!$.isEmptyObject(filters.search_query))
        {
            this.model.data.results = searchObjectsInListByJs(filters, this.model.data.results);
            this.model.data.count = this.model.data.results.length;
        }
        def.resolve({data:this.model.data});
    }).fail(e => {
        def.reject(e);
    });

    return def.promise();
}


tabSignal.connect('openapi.schema', function(obj){
    let path = obj.schema.path[projPath + '/template/{template_id}/execute/']
    let options_field = path.schema.exec.fields.option
    options_field.format = 'select2'
    options_field.dynamic_properties = {
        list_obj:projPath + "/template/{template_id}/option/",
        value_field:'name',
        view_field:'name',
        default_value:{
            id: '',
            text: 'None'
        }
    }
})
