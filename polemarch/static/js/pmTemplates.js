window.projPath = "/project/{pk}";
var delete_success_message = "Object of '{0}' type was successfully deleted";
var deleteArray_success_message = "Objects of '{0}' type were successfully deleted";

/**
 * Extension class for:
 * - /project/{pk}/template/;
 * - /project/{pk}/template/{template_id}.
 */
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
        });

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
        });

        return res;
    },

};


/**
 * Base extension class for template children objects' extension classes:
 *  - gui_project_template_variables
 *  - gui_project_template_option
 *  - gui_project_template_option_variables
 */
base_gui_project_template_extension = {
    _getBaseResponseSubitems: function(){
        if(this.api && this.api.path && this.url_vars) {
            return makeUrlForApiKeys(this.api.path.replace(/^\/|\/$/g, '')).format(this.url_vars).split("/");
        }
    },

    _getBaseResponse: function(opt={}){
        let res = {
            status: 200,
            item: "project",
            type: "mod",
            data: {},
            subitem: this._getBaseResponseSubitems(),
        };

        for(let item in opt){
            res[item] = opt[item];
        }

        return res;
    },

    _getObjList: function(query) {
        let data = this.parent_template.model.data.data;
        if(!data.vars){
            data.vars = {};
        }
        return data.vars;
    },

    _prepareDataForQuery_get: function(res, val, obj_id) {
        if(val[obj_id] !== undefined) {
            res.data = {
                key: obj_id,
                value: val[obj_id],
            }
        } else {
            res.status = 404;
            res.data.detail = "No Variable matches the given query.";
        }
        return res;
    },

    _prepareDataForQuery_put: function(query, obj_id){
        let vars = this._getObjList(query);
        vars[query.data.key] = query.data.value;
    },

    _prepareDataForQuery_list: function(res, key, obj_list) {
        res.data.results.push({
            id: key,
            key: key,
            value: obj_list[key],
        });
    },

    apiGetDataForQuery_get: function(query, obj_id) {
        let res = this._getBaseResponse();
        let vars = this._getObjList(query);
        return this._prepareDataForQuery_get(res, vars, obj_id);
    },

    apiGetDataForQuery_put: function(query, obj_id, is_post) {
        let def = new $.Deferred();
        this._prepareDataForQuery_put(query, obj_id);

        $.when(this.parent_template.sendToApi("patch", undefined, undefined, this.parent_template.model.data)).done(() => {
            def.resolve(this._getBaseResponse({data:query.data, status: is_post ? 201 : 200}));
        }).fail((e) =>{
            def.reject(e);
        });

        return def.promise();
    },

    apiGetDataForQuery_list: function(query, obj_id) {
        let res = this._getBaseResponse({
            data: {
                count: 0,
                next: null,
                previous: null,
                results: [ ],
            }
        });
        let obj_list = this._getObjList(query);
        let limit =+ query.filters.match(/limit=([0-9]+)/)[1] || guiLocalSettings.get('page_size');
        let offset =+ query.filters.match(/offset=([0-9]+)/)[1] || 0;
        if(obj_list && typeof obj_list == "object") {
            let obj_list_keys = Object.keys(obj_list);
            for(let i=offset; i<limit+offset; i++) {
                let key = obj_list_keys[i];
                if(key && obj_list[key] !== undefined) {
                    this._prepareDataForQuery_list(res, key, obj_list);
                }
            }
            res.data.count = obj_list_keys.length;
            res.data.offset = offset;
        }
        return res;
    },

    apiGetDataForQuery_post: function(query, obj_id) {
        return this.apiGetDataForQuery_put(query, obj_id, true);
    },

    apiGetDataForQuery : function (query, obj_id)
    {
        try{
            if(obj_id)
            {
                if(query.method == "get")
                {
                    return this.apiGetDataForQuery_get(query, obj_id);
                }

                if(query.method == "put")
                {
                    return this.apiGetDataForQuery_put(query, obj_id);
                }
            }
            else
            {
                if(query.method == "get")
                {
                    return this.apiGetDataForQuery_list(query, obj_id);
                }

                if(query.method == "post")
                {
                    return this.apiGetDataForQuery_post(query, obj_id);
                }
            }
        }catch (exception) {
            let def = new $.Deferred();
            def.reject({
                status:404,
                data:{detail: capitalizeString(this.api.bulk_name) + " was not found"}
            });
            return def.promise();
        }
    },

    apiQuery : function (query)
    {
        let obj;
        if(query.data_type[query.data_type.length-1] != this.api.bulk_name)
        {
            obj = query.data_type[query.data_type.length-1];
        }
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/")
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{

            $.when(this.apiGetDataForQuery(query, obj)).done((d) =>{
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

    _loadTemplateAndSendToApi: function(success_callback, opt={}){
        let def = new $.Deferred();
        let url_info = this.url_vars;
        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/", url_info);

        $.when(this.parent_template.load(url_info.api_template_id)).done((data) =>{
            success_callback.apply(this, [data.data, opt]);
            def.resolve(this.parent_template.sendToApi("patch", undefined, undefined, data.data))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },

    _delete_callback: function(data, opt) {
        delete data.data.vars[this.url_vars.api_variables_id];
    },

    delete: function() {
        return this._loadTemplateAndSendToApi((data, opt) => {
            this._delete_callback(data, opt);
            guiPopUp.success(delete_success_message.format(this.api.bulk_name));
        });
    },

    _deleteArray_callback: function(data, opt) {
        for(let i in opt.ids) {
            let id = opt.ids[i];
            delete data.data.vars[id];
        }
    },

    deleteArray : function (ids) {
        return this._loadTemplateAndSendToApi((data, opt) => {
            this._deleteArray_callback(data, opt);
            guiPopUp.success(deleteArray_success_message.format(this.api.bulk_name));
        }, {ids: ids});
    },

    search: function(filters) {
        return customTemplateInnerObjectsSearch.apply(this, arguments);
    },
};


/**
 * Extension class for:
 * - /project/{pk}/template/{template_id}/variables/ ;
 * - /project/{pk}/template/{template_id}/variables/{variables_id}/.
 */
gui_project_template_variables = $.extend(true, {}, base_gui_project_template_extension);
gui_project_template_variables.pkValuePriority = ["key"];


/**
 * Extension class for:
 * - /project/{pk}/template/{template_id}/option/ ;
 * - /project/{pk}/template/{template_id}/option/{option_id}/.
 */
gui_project_template_option = {
    load:  function(filters) {
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
            return gui_list_object.load.apply(this, arguments);
        }

    },

    renderAsNewPage:  function (render_options = {}) {
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/");
        $.when(this.parent_template.load(this.url_vars['api_template_id'])).done((d1) =>{

            let template_data = this.parent_template.model.data;
            prepareOptionFields(template_data, this.api.schema.new);

            def.resolve(gui_list_object.renderAsNewPage.apply(this, arguments));
        })

        return def.promise();
    },

    _getObjList: function(query) {
        return this.parent_template.model.data.options;
    },

    _prepareDataForQuery_get:  function(res, val, obj_id) {
        let option = val[obj_id];
        if(!option) {
            res.status = 404;
            res.data.detail = "No Option matches the given query.";
            return res;
        }

        res.data = {}
        for(let i in gui_project_template_option_Schema)
        {
            res.data[i] = option[i]

            if(i == 'name' && option[i] == undefined)
            {
                res.data[i] = obj_id;
            }
        }
        return res;
    },

    _prepareDataForQuery_put:  function(query, obj_id){
        let template_data = this.parent_template.model.data;

        if(query.data.name)
        {
            query.data.name = query.data.name.replace(/[\s\/\-]+/g,'_');
        }

        if(obj_id != query.data.name)
        {
            template_data.options[query.data.name] = template_data.options[obj_id];
            delete template_data.options[obj_id];
        }

        for(let field in query.data)
        {
            template_data.options[query.data.name][field] = query.data[field];
        }

        delete template_data.options[query.data.name].name
    },

    _prepareDataForQuery_list:  function(res, key, obj_list) {
        let val = obj_list[key];
        res.data.results.push({
            "id": key,
            "name": val.name || key,
        })
    },

    apiGetDataForQuery_post: function(query, obj_id, is_post) {
        let template_data = this.parent_template.model.data;
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
        delete template_data.options[query.data.name].name;

        var def = new $.Deferred();
        $.when(this.parent_template.sendToApi("patch", undefined, undefined, template_data)).done(() =>{
            def.resolve(this._getBaseResponse({data:query.data, status: is_post ? 201 : 200}));
        }).fail((e) =>{
            def.reject(e)
        })
        return  def.promise()
    },

    _delete_callback:  function(data, opt) {
        delete data.options[this.url_vars.api_option_id];
    },

    _deleteArray_callback:  function(data, opt) {
        for(let i in opt.ids) {
            let id = opt.ids[i];
            delete data.options[id];
        }
    },
};

gui_project_template_option = $.extend(true, {}, base_gui_project_template_extension, gui_project_template_option);


/**
 * Extension class for:
 * - /project/{pk}/template/{template_id}/option/variables/ ;
 * - /project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/.
 */
gui_project_template_option_variables = {
    _getObjList: function(query) {
        let option = this.parent_template.model.data.options[query.data_type[5]];
        if(!option.vars) {
            option.vars = {};
        }
        return option.vars;
    },

    _delete_callback:  function(data, opt) {
        delete data.options[this.url_vars.api_option_id].vars[this.url_vars.api_variables_id];
    },

    _deleteArray_callback:  function(data, opt) {
        for(let i in opt.ids) {
            let id = opt.ids[i];
            delete data.options[this.url_vars.api_option_id].vars[id];
        }
    },
};

gui_project_template_option_variables = $.extend(true, {}, gui_project_template_variables);


/**
 * Object with schema properties of /project/{pk}/template/{template_id}/option/ path.
 */
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
};


/**
 * Object with schema properties of /project/{pk}/template/{template_id}/option/{option_id}/variables/ path.
 */
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
};

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

});

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
        obj.type = "hidden";
    }
    return obj;
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
        obj.type = "hidden";
    }
    return obj;
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
        let fields = {};
        if(template.model.data.kind.toLowerCase() == "task")
        {
            fields = window.guiSchema.path["/project/{pk}/execute_playbook/"].schema.exec.fields;
            delete fields.playbook;
        }
        if(template.model.data.kind.toLowerCase() == "module")
        {
            fields = window.guiSchema.path["/project/{pk}/execute_module/"].schema.exec.fields;
            delete fields.module;
        }

        delete fields.inventory;
        thisObj.setType("enum", {
            enum:Object.keys(fields),
        });
        thisObj.opt.all_fields = fields;

        thisObj._callAllonChangeCallback();
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

    let field = newValue.opt.all_fields[newValue.value];

    field.format = getFieldType(field);

    return field;
}

guiElements.template_data = function(opt = {})
{
    this.name = 'template_data';
    guiElements.base.apply(this, arguments);
}

guiElements.template_options = function(opt = {})
{
    this.name = 'template_data';
    guiElements.base.apply(this, arguments);
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
            let inventory_path = '/inventory/{inventory_id}';

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
});
