
gui_project_template_option = {

    apiGetDataForQuery : function (query, option)
    {
        // debugger;
        if(option)
        {
            // debugger;
            if(query.method == "get")
            {
                let res =  {
                    "status": 200,
                    "item": "option",
                    "type": "mod",
                    "data": {},
                    "subitem": [
                        "1",
                        "template"
                    ]
                }

                let val = this.parent_template.model.data.options[option];
                res.data = {
                    "id": option,
                    "name": val.name || option,
                    "notes": val.notes
                }

                return res;
            }

            if(query.method == "put")
            {
                let template_data = this.parent_template.model.data

                if(option != query.data.name)
                {
                    template_data.options[query.data.name] = template_data.options[option];
                    delete template_data.options[option];
                }

                for(let field in query.data)
                {
                    template_data.options[query.data.name][field] = query.data[field];
                }

                // debugger;

                return this.parent_template.sendToApi("patch", undefined, undefined, template_data)
            }
        }
        else
        {
            if(query.method == "get")
            {
                let res =  {
                    "status": 200,
                    "item": "option",
                    "type": "mod",
                    "data": {
                        "count": 1,
                        "next": null,
                        "previous": null,
                        "results": [ ]
                    },
                    "subitem": [
                        "1",
                        "template"
                    ]
                }

                for(let i in this.parent_template.model.data.options)
                {
                    let val = this.parent_template.model.data.options[i]
                    //debugger;
                    res.data.results.push({
                        "id": i,
                        "name": val.name || i,
                    })
                }
                res.data.count = res.data.results.length
                return res;
            }

            if(query.method == "post")
            {
                let template_data = this.parent_template.model.data
                // debugger;
                if(template_data.options[query.data.name])
                {
                    query.data.name+=" copy "+Date()
                }

                template_data.options[query.data.name] = query.data

                return this.parent_template.sendToApi("patch", undefined, undefined, template_data)
            }
        }
    },

    apiQuery : function (query)
    {
        //debugger;
        let option;
        if(query.data_type[query.data_type.length-1] != 'option' && query.data_type.length == 6)
        {
            if(query.data_type[query.data_type.length-1] != 'new')
            {
                option = query.data_type[query.data_type.length-1];
            }
            //debugger;
        }
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/")
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{
            //debugger;
            def.resolve(this.apiGetDataForQuery(query, option))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },
}

gui_project_template_option_variables = {

    apiGetDataForQuery : function (query, variable)
    {
        // debugger;
        if(variable)
        {
            // debugger;
            if(query.method == "get")
            {
                let res =  {
                    "status": 200,
                    "item": "option",
                    "type": "mod",
                    "data": {},
                    "subitem": [
                        "1",
                        "template"
                    ]
                }

                let val = this.parent_template.model.data.options[query.data_type[5]];
                res.data = {
                    "id": variable,
                    "key": variable,
                    "value": val.vars[variable],
                }

                debugger;

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

                debugger;

                return this.parent_template.sendToApi("patch", undefined, undefined, template_data)
            }
        }
        else
        {
            if(query.method == "get")
            {
                let res =  {
                    "status": 200,
                    "item": "option",
                    "type": "mod",
                    "data": {
                        "count": 1,
                        "next": null,
                        "previous": null,
                        "results": [ ]
                    },
                    "subitem": [
                        "1",
                        "template"
                    ]
                }

                let option_data = this.parent_template.model.data.options[query.data_type[5]];
                for(let i in option_data.vars)
                {
                    let val = option_data.vars[i]
                    res.data.results.push({
                        "id": i,
                        "key": i,
                        "value": option_data.vars[i],
                    })
                }
                res.data.count = res.data.results.length
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
                // option_data.vars = {become:true, check:true};

                option_data.vars[query.data.key] = query.data.value;


                // option_data.vars = JSON.stringify(option_data.vars);

                debugger;

                return this.parent_template.sendToApi("patch", undefined, undefined, template_data)
            }
        }
    },

    apiQuery : function (query)
    {
        debugger;
        let variable;
        if(query.data_type[query.data_type.length-1] != 'variables')
        {
            if(query.data_type[query.data_type.length-1] != 'new')
            {
                variable = query.data_type[query.data_type.length-1];
                debugger;
            }
        }
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/")
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{
            //debugger;
            def.resolve(this.apiGetDataForQuery(query, variable))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },
}


tabSignal.connect("openapi.schema", function(obj) {
    // Модификация схемы до сохранения в кеш.
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
        "canRemove": true,
        "canCreate": true,
        "method": {'get': 'list', 'patch': '', 'put': '', 'post': 'new', 'delete': ''},
        "schema": {
            "list": {
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "integer",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "option_id"
                    },
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
                "filters": {},
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
            },
            "new": {
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "integer",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "option_id"
                    },
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
                    "notes": {
                        "title": "Notes",
                        "type": "string",
                        "format": "textarea",
                        "gui_links": [],
                        "definition": {},
                        "name": "notes",
                        "parent_name_format": "option_notes"
                    },
                },
                "query_type": "post",
                "operationId": "project_template_option_add",
                "responses": {
                    "201": {
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
                                "notes": {
                                    "title": "Notes",
                                    "type": "string",
                                    "format": "textarea"
                                },
                            },
                            "definition_name": "OneOption",
                            "definition_ref": "#/definitions/OneOption"
                        }
                    },
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
            }
        },
        "__link__page": "/project/{pk}/template/{template_id}/option/{option_id}/",
        "page_path": "/project/{pk}/template/{template_id}/option/{option_id}/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions": [],
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
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "string",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "option_id"
                    },
                    "name": {
                        "title": "Name",
                        "type": "string",
                        "maxLength": 512,
                        "minLength": 1,
                        "gui_links": [],
                        "definition": {},
                        "name": "name",
                        "parent_name_format": "option_name",
                        "readOnly": true
                    },
                    "notes": {
                        "title": "Notes",
                        "type": "string",
                        "format": "textarea",
                        "gui_links": [],
                        "definition": {},
                        "name": "notes",
                        "parent_name_format": "option_notes",
                        "readOnly": true
                    },
                    "owner": {
                        "$ref": "#/definitions/User",
                        "gui_links": [
                            {
                                "prop_name": "definition",
                                "list_name": "list",
                                "type": "list",
                                "$ref": "#/definitions/User"
                            },
                            {
                                "prop_name": "definition",
                                "list_name": "page",
                                "type": "page",
                                "$ref": "#/definitions/User"
                            },
                            {
                                "prop_name": "definition",
                                "list_name": "list",
                                "type": "list",
                                "$ref": "#/definitions/User"
                            },
                            {
                                "prop_name": "definition",
                                "list_name": "page",
                                "type": "page",
                                "$ref": "#/definitions/User"
                            }
                        ],
                        "definition": {
                            "__link__list": "/user/",
                            "__link__page": "/user/{pk}/"
                        },
                        "name": "owner",
                        "title": "Owner",
                        "required": [
                            "username"
                        ],
                        "type": "object",
                        "properties": {
                            "id": {
                                "title": "ID",
                                "type": "integer",
                                "readOnly": true
                            },
                            "username": {
                                "title": "Username",
                                "description": "Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                                "type": "string",
                                "pattern": "^[\\w.@+-]+$",
                                "maxLength": 150,
                                "minLength": 1,
                                "required": true
                            },
                            "is_active": {
                                "title": "Is active",
                                "type": "boolean",
                                "default": true
                            }
                        },
                        "readOnly": true,
                        "definition_name": "User",
                        "definition_ref": "#/definitions/User",
                        "format": "apiObject",
                        "api_original_format": "apiUser",
                        "parent_name_format": "option_owner"
                    }
                },
                "filters": {},
                "query_type": "get",
                "operationId": "project_template_option_get",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "string",
                                    "readOnly": true
                                },
                                "name": {
                                    "title": "Name",
                                    "type": "string",
                                    "maxLength": 512,
                                    "minLength": 1
                                },
                                "notes": {
                                    "title": "Notes",
                                    "type": "string",
                                    "format": "textarea"
                                },
                                "owner": {
                                    "$ref": "#/definitions/User"
                                }
                            },
                            "definition_name": "OneOption",
                            "definition_ref": "#/definitions/OneOption"
                        }
                    },
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
            },
            "edit": {
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "string",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "option_id"
                    },
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
                    "notes": {
                        "title": "Notes",
                        "type": "string",
                        "format": "textarea",
                        "gui_links": [],
                        "definition": {},
                        "name": "notes",
                        "parent_name_format": "option_notes"
                    },
                    "owner": {
                        "$ref": "#/definitions/User",
                        "gui_links": [
                            {
                                "prop_name": "definition",
                                "list_name": "list",
                                "type": "list",
                                "$ref": "#/definitions/User"
                            },
                            {
                                "prop_name": "definition",
                                "list_name": "page",
                                "type": "page",
                                "$ref": "#/definitions/User"
                            },
                            {
                                "prop_name": "definition",
                                "list_name": "list",
                                "type": "list",
                                "$ref": "#/definitions/User"
                            },
                            {
                                "prop_name": "definition",
                                "list_name": "page",
                                "type": "page",
                                "$ref": "#/definitions/User"
                            }
                        ],
                        "definition": {
                            "__link__list": "/user/",
                            "__link__page": "/user/{pk}/"
                        },
                        "name": "owner",
                        "title": "Owner",
                        "required": [
                            "username"
                        ],
                        "type": "object",
                        "properties": {
                            "id": {
                                "title": "ID",
                                "type": "integer",
                                "readOnly": true
                            },
                            "username": {
                                "title": "Username",
                                "description": "Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                                "type": "string",
                                "pattern": "^[\\w.@+-]+$",
                                "maxLength": 150,
                                "minLength": 1,
                                "required": true
                            },
                            "is_active": {
                                "title": "Is active",
                                "type": "boolean",
                                "default": true
                            }
                        },
                        "readOnly": true,
                        "definition_name": "User",
                        "definition_ref": "#/definitions/User",
                        "format": "apiObject",
                        "api_original_format": "apiUser",
                        "parent_name_format": "option_owner"
                    }
                },
                "query_type": "patch",
                "operationId": "project_template_option_edit",
                "responses": {
                    "200": {
                        "description": "Action accepted.",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "string",
                                    "readOnly": true
                                },
                                "name": {
                                    "title": "Name",
                                    "type": "string",
                                    "maxLength": 512,
                                    "minLength": 1
                                },
                                "notes": {
                                    "title": "Notes",
                                    "type": "string",
                                    "format": "textarea"
                                },
                                "owner": {
                                    "$ref": "#/definitions/User"
                                }
                            },
                            "definition_name": "OneOption",
                            "definition_ref": "#/definitions/OneOption"
                        }
                    },
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
            }
        },
        "__link__list": "/project/{pk}/template/{template_id}/option/",
        "list_path": "/project/{pk}/template/{template_id}/option/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {
            "set_owner": {
                "level": 8,
                "path": "/project/{pk}/template/{template_id}/option/{option_id}/set_owner/",
                "type": "action",
                "name": "set_owner",
                "bulk_name": "set_owner",
                "name_field": "name",
                "method": {
                    "get": "",
                    "patch": "",
                    "put": "",
                    "post": "",
                    "delete": "",
                    "post,put,delete,patch": "exec"
                },
                "buttons": [],
                "hide_non_required": 4,
                "extension_class_name": [
                    "gui_project_template_option_set_owner"
                ],
                "selectionTag": "_project__pk__template__template_id__option__option_id__set_owner_",
                "schema": {
                    "exec": {
                        "fields": {
                            "id": {
                                "title": "Id",
                                "type": "integer",
                                "readOnly": true,
                                "gui_links": [],
                                "definition": {},
                                "name": "id",
                                "parent_name_format": "set_owner_id"
                            },
                            "name": {
                                "title": "Name",
                                "type": "string",
                                "maxLength": 512,
                                "minLength": 1,
                                "gui_links": [],
                                "definition": {},
                                "name": "name",
                                "parent_name_format": "set_owner_name"
                            },
                        },
                        "query_type": "post",
                        "operationId": "project_template_option_template_set_owner",
                        "responses": {
                            "201": {
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
                    }
                },
                "methodExec": "post",
                "sublinks": [],
                "sublinks_l2": [],
                "actions": {},
                "links": {},
                "multi_actions": [],
                "__link__parent": "/project/{pk}/template/{template_id}/option/{option_id}/",
                "parent_path": "/project/{pk}/template/{template_id}/option/{option_id}/"
            }
        },
        "links": {
            "variables": {
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
                    "post": "",
                    "delete": "",
                    "new": "post"
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
                        "fields": {
                            "id": {
                                "title": "Id",
                                "type": "integer",
                                "readOnly": true,
                                "gui_links": [],
                                "definition": {},
                                "name": "id",
                                "parent_name_format": "variables_id"
                            },
                            "key": {
                                "title": "Key",
                                "type": "string",
                                "format": "enum",
                                "enum": [
                                    "ansible_host",
                                    "ansible_port",
                                    "ansible_user",
                                    "ansible_connection",
                                    "ansible_ssh_pass",
                                    "ansible_ssh_private_key_file",
                                    "ansible_ssh_common_args",
                                    "ansible_sftp_extra_args",
                                    "ansible_scp_extra_args",
                                    "ansible_ssh_extra_args",
                                    "ansible_ssh_executable",
                                    "ansible_ssh_pipelining",
                                    "ansible_become",
                                    "ansible_become_method",
                                    "ansible_become_user",
                                    "ansible_become_pass",
                                    "ansible_become_exe",
                                    "ansible_become_flags",
                                    "ansible_shell_type",
                                    "ansible_python_interpreter",
                                    "ansible_ruby_interpreter",
                                    "ansible_perl_interpreter",
                                    "ansible_shell_executable"
                                ],
                                "required": true,
                                "gui_links": [],
                                "definition": {},
                                "name": "key",
                                "parent_name_format": "variables_key"
                            },
                            "value": {
                                "title": "Value",
                                "type": "string",
                                "default": "",
                                "gui_links": [],
                                "definition": {},
                                "name": "value",
                                "parent_name_format": "variables_value"
                            }
                        },
                        "filters": {
                            "0": {
                                "name": "id",
                                "in": "query",
                                "description": "A unique integer value (or comma separated list) identifying this instance.",
                                "required": false,
                                "type": "string"
                            },
                            "1": {
                                "name": "key",
                                "in": "query",
                                "description": "A key name string value (or comma separated list) of instance.",
                                "required": false,
                                "type": "string"
                            },
                            "2": {
                                "name": "value",
                                "in": "query",
                                "description": "A value of instance.",
                                "required": false,
                                "type": "string"
                            },
                            "3": {
                                "name": "id__not",
                                "in": "query",
                                "description": "A unique integer value (or comma separated list) identifying this instance.",
                                "required": false,
                                "type": "string"
                            },
                            "4": {
                                "name": "ordering",
                                "in": "query",
                                "description": "Which field to use when ordering the results.",
                                "required": false,
                                "type": "string"
                            }
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
                                    "properties": {
                                        "id": {
                                            "title": "Id",
                                            "type": "integer",
                                            "readOnly": true
                                        },
                                        "key": {
                                            "title": "Key",
                                            "type": "string",
                                            "format": "autocomplete",
                                            "enum": [
                                                "ansible_host",
                                                "ansible_port",
                                                "ansible_user",
                                                "ansible_connection",
                                                "ansible_ssh_pass",
                                                "ansible_ssh_private_key_file",
                                                "ansible_ssh_common_args",
                                                "ansible_sftp_extra_args",
                                                "ansible_scp_extra_args",
                                                "ansible_ssh_extra_args",
                                                "ansible_ssh_executable",
                                                "ansible_ssh_pipelining",
                                                "ansible_become",
                                                "ansible_become_method",
                                                "ansible_become_user",
                                                "ansible_become_pass",
                                                "ansible_become_exe",
                                                "ansible_become_flags",
                                                "ansible_shell_type",
                                                "ansible_python_interpreter",
                                                "ansible_ruby_interpreter",
                                                "ansible_perl_interpreter",
                                                "ansible_shell_executable"
                                            ],
                                            "required": true
                                        },
                                        "value": {
                                            "title": "Value",
                                            "type": "string",
                                            "default": ""
                                        }
                                    },
                                    "definition_name": "TemplateVariable",
                                    "definition_ref": "#/definitions/TemplateVariable"
                                }
                            },
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
                    },
                    "new": {
                        "fields": {
                            "id": {
                                "title": "Id",
                                "type": "integer",
                                "readOnly": true,
                                "gui_links": [],
                                "definition": {},
                                "name": "id",
                                "parent_name_format": "variables_id"
                            },
                            "key": {
                                "title": "Key",
                                "type": "string",
                                "format": "enum",
                                "enum": [
                                    "ansible_host",
                                    "ansible_port",
                                    "ansible_user",
                                    "ansible_connection",
                                    "ansible_ssh_pass",
                                    "ansible_ssh_private_key_file",
                                    "ansible_ssh_common_args",
                                    "ansible_sftp_extra_args",
                                    "ansible_scp_extra_args",
                                    "ansible_ssh_extra_args",
                                    "ansible_ssh_executable",
                                    "ansible_ssh_pipelining",
                                    "ansible_become",
                                    "ansible_become_method",
                                    "ansible_become_user",
                                    "ansible_become_pass",
                                    "ansible_become_exe",
                                    "ansible_become_flags",
                                    "ansible_shell_type",
                                    "ansible_python_interpreter",
                                    "ansible_ruby_interpreter",
                                    "ansible_perl_interpreter",
                                    "ansible_shell_executable"
                                ],
                                "required": true,
                                "gui_links": [],
                                "definition": {},
                                "name": "key",
                                "parent_name_format": "variables_key"
                            },
                            "value": {
                                "title": "Value",
                                "type": "string",
                                "default": "",
                                "gui_links": [],
                                "definition": {},
                                "name": "value",
                                "parent_name_format": "variables_value"
                            }
                        },
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
                                    "properties": {
                                        "id": {
                                            "title": "Id",
                                            "type": "integer",
                                            "readOnly": true
                                        },
                                        "key": {
                                            "title": "Key",
                                            "type": "string",
                                            "format": "autocomplete",
                                            "enum": [
                                                "ansible_host",
                                                "ansible_port",
                                                "ansible_user",
                                                "ansible_connection",
                                                "ansible_ssh_pass",
                                                "ansible_ssh_private_key_file",
                                                "ansible_ssh_common_args",
                                                "ansible_sftp_extra_args",
                                                "ansible_scp_extra_args",
                                                "ansible_ssh_extra_args",
                                                "ansible_ssh_executable",
                                                "ansible_ssh_pipelining",
                                                "ansible_become",
                                                "ansible_become_method",
                                                "ansible_become_user",
                                                "ansible_become_pass",
                                                "ansible_become_exe",
                                                "ansible_become_flags",
                                                "ansible_shell_type",
                                                "ansible_python_interpreter",
                                                "ansible_ruby_interpreter",
                                                "ansible_perl_interpreter",
                                                "ansible_shell_executable"
                                            ],
                                            "required": true
                                        },
                                        "value": {
                                            "title": "Value",
                                            "type": "string",
                                            "default": ""
                                        }
                                    },
                                    "definition_name": "TemplateVariable",
                                    "definition_ref": "#/definitions/TemplateVariable"
                                }
                            },
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
                    }
                },
                "__link__page": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
                "page_path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
                "sublinks": [],
                "sublinks_l2": [],
                "actions": {},
                "links": {},
                "multi_actions": [],
                "__link__parent": "/project/{pk}/template/{template_id}/option/{option_id}/",
                "parent_path": "/project/{pk}/template/{template_id}/option/{option_id}/"
            }
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
            "new": "post"
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
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "string",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "variables_id"
                    },
                    "key": {
                        "title": "Key",
                        "type": "string",
                        "format": "enum",
                        "enum": [
                            "ansible_host",
                            "ansible_port",
                            "ansible_user",
                            "ansible_connection",
                            "ansible_ssh_pass",
                            "ansible_ssh_private_key_file",
                            "ansible_ssh_common_args",
                            "ansible_sftp_extra_args",
                            "ansible_scp_extra_args",
                            "ansible_ssh_extra_args",
                            "ansible_ssh_executable",
                            "ansible_ssh_pipelining",
                            "ansible_become",
                            "ansible_become_method",
                            "ansible_become_user",
                            "ansible_become_pass",
                            "ansible_become_exe",
                            "ansible_become_flags",
                            "ansible_shell_type",
                            "ansible_python_interpreter",
                            "ansible_ruby_interpreter",
                            "ansible_perl_interpreter",
                            "ansible_shell_executable"
                        ],
                        "required": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "key",
                        "parent_name_format": "variables_key"
                    },
                    "value": {
                        "title": "Value",
                        "type": "string",
                        "default": "",
                        "gui_links": [],
                        "definition": {},
                        "name": "value",
                        "parent_name_format": "variables_value"
                    }
                },
                "filters": {
                    "0": {
                        "name": "id",
                        "in": "query",
                        "description": "A unique integer value (or comma separated list) identifying this instance.",
                        "required": false,
                        "type": "string"
                    },
                    "1": {
                        "name": "key",
                        "in": "query",
                        "description": "A key name string value (or comma separated list) of instance.",
                        "required": false,
                        "type": "string"
                    },
                    "2": {
                        "name": "value",
                        "in": "query",
                        "description": "A value of instance.",
                        "required": false,
                        "type": "string"
                    },
                    "3": {
                        "name": "id__not",
                        "in": "query",
                        "description": "A unique integer value (or comma separated list) identifying this instance.",
                        "required": false,
                        "type": "string"
                    },
                    "4": {
                        "name": "ordering",
                        "in": "query",
                        "description": "Which field to use when ordering the results.",
                        "required": false,
                        "type": "string"
                    }
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
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "integer",
                                    "readOnly": true
                                },
                                "key": {
                                    "title": "Key",
                                    "type": "string",
                                    "format": "autocomplete",
                                    "enum": [
                                        "ansible_host",
                                        "ansible_port",
                                        "ansible_user",
                                        "ansible_connection",
                                        "ansible_ssh_pass",
                                        "ansible_ssh_private_key_file",
                                        "ansible_ssh_common_args",
                                        "ansible_sftp_extra_args",
                                        "ansible_scp_extra_args",
                                        "ansible_ssh_extra_args",
                                        "ansible_ssh_executable",
                                        "ansible_ssh_pipelining",
                                        "ansible_become",
                                        "ansible_become_method",
                                        "ansible_become_user",
                                        "ansible_become_pass",
                                        "ansible_become_exe",
                                        "ansible_become_flags",
                                        "ansible_shell_type",
                                        "ansible_python_interpreter",
                                        "ansible_ruby_interpreter",
                                        "ansible_perl_interpreter",
                                        "ansible_shell_executable"
                                    ],
                                    "required": true
                                },
                                "value": {
                                    "title": "Value",
                                    "type": "string",
                                    "default": ""
                                }
                            },
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
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
            },
            "new": {
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "string",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "variables_id"
                    },
                    "key": {
                        "title": "Key",
                        "type": "string",
                        // "format": "enum",
                        // "enum": [
                        //     "ansible_host",
                        //     "ansible_port",
                        //     "ansible_user",
                        //     "ansible_connection",
                        //     "ansible_ssh_pass",
                        //     "ansible_ssh_private_key_file",
                        //     "ansible_ssh_common_args",
                        //     "ansible_sftp_extra_args",
                        //     "ansible_scp_extra_args",
                        //     "ansible_ssh_extra_args",
                        //     "ansible_ssh_executable",
                        //     "ansible_ssh_pipelining",
                        //     "ansible_become",
                        //     "ansible_become_method",
                        //     "ansible_become_user",
                        //     "ansible_become_pass",
                        //     "ansible_become_exe",
                        //     "ansible_become_flags",
                        //     "ansible_shell_type",
                        //     "ansible_python_interpreter",
                        //     "ansible_ruby_interpreter",
                        //     "ansible_perl_interpreter",
                        //     "ansible_shell_executable"
                        // ],
                        "required": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "key",
                        "parent_name_format": "variables_key"
                    },
                    "value": {
                        "title": "Value",
                        "type": "string",
                        "default": "",
                        "gui_links": [],
                        "definition": {},
                        "name": "value",
                        "parent_name_format": "variables_value"
                    }
                },
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
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "string",
                                    "readOnly": true
                                },
                                "key": {
                                    "title": "Key",
                                    "type": "string",
                                    "format": "autocomplete",
                                    "enum": [
                                        "ansible_host",
                                        "ansible_port",
                                        "ansible_user",
                                        "ansible_connection",
                                        "ansible_ssh_pass",
                                        "ansible_ssh_private_key_file",
                                        "ansible_ssh_common_args",
                                        "ansible_sftp_extra_args",
                                        "ansible_scp_extra_args",
                                        "ansible_ssh_extra_args",
                                        "ansible_ssh_executable",
                                        "ansible_ssh_pipelining",
                                        "ansible_become",
                                        "ansible_become_method",
                                        "ansible_become_user",
                                        "ansible_become_pass",
                                        "ansible_become_exe",
                                        "ansible_become_flags",
                                        "ansible_shell_type",
                                        "ansible_python_interpreter",
                                        "ansible_ruby_interpreter",
                                        "ansible_perl_interpreter",
                                        "ansible_shell_executable"
                                    ],
                                    "required": true
                                },
                                "value": {
                                    "title": "Value",
                                    "type": "string",
                                    "default": ""
                                }
                            },
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
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
            }
        },
        "__link__page": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
        "page_path": "/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/",
        "sublinks": [],
        "sublinks_l2": [],
        "actions": {},
        "links": {},
        "multi_actions": [],
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
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "string",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "variables_id"
                    },
                    "key": {
                        "title": "Key",
                        "type": "string",
                        "format": "enum",
                        "enum": [
                            "ansible_host",
                            "ansible_port",
                            "ansible_user",
                            "ansible_connection",
                            "ansible_ssh_pass",
                            "ansible_ssh_private_key_file",
                            "ansible_ssh_common_args",
                            "ansible_sftp_extra_args",
                            "ansible_scp_extra_args",
                            "ansible_ssh_extra_args",
                            "ansible_ssh_executable",
                            "ansible_ssh_pipelining",
                            "ansible_become",
                            "ansible_become_method",
                            "ansible_become_user",
                            "ansible_become_pass",
                            "ansible_become_exe",
                            "ansible_become_flags",
                            "ansible_shell_type",
                            "ansible_python_interpreter",
                            "ansible_ruby_interpreter",
                            "ansible_perl_interpreter",
                            "ansible_shell_executable"
                        ],
                        "required": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "key",
                        "parent_name_format": "variables_key",
                        "readOnly": true
                    },
                    "value": {
                        "title": "Value",
                        "type": "string",
                        "default": "",
                        "gui_links": [],
                        "definition": {},
                        "name": "value",
                        "parent_name_format": "variables_value",
                        "readOnly": true
                    }
                },
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
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "string",
                                    "readOnly": true
                                },
                                "key": {
                                    "title": "Key",
                                    "type": "string",
                                    "format": "autocomplete",
                                    "enum": [
                                        "ansible_host",
                                        "ansible_port",
                                        "ansible_user",
                                        "ansible_connection",
                                        "ansible_ssh_pass",
                                        "ansible_ssh_private_key_file",
                                        "ansible_ssh_common_args",
                                        "ansible_sftp_extra_args",
                                        "ansible_scp_extra_args",
                                        "ansible_ssh_extra_args",
                                        "ansible_ssh_executable",
                                        "ansible_ssh_pipelining",
                                        "ansible_become",
                                        "ansible_become_method",
                                        "ansible_become_user",
                                        "ansible_become_pass",
                                        "ansible_become_exe",
                                        "ansible_become_flags",
                                        "ansible_shell_type",
                                        "ansible_python_interpreter",
                                        "ansible_ruby_interpreter",
                                        "ansible_perl_interpreter",
                                        "ansible_shell_executable"
                                    ],
                                    "required": true
                                },
                                "value": {
                                    "title": "Value",
                                    "type": "string",
                                    "default": ""
                                }
                            },
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
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
            },
            "edit": {
                "fields": {
                    "id": {
                        "title": "Id",
                        "type": "string",
                        "readOnly": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "id",
                        "parent_name_format": "variables_id"
                    },
                    "key": {
                        "title": "Key",
                        "type": "string",
                        "format": "enum",
                        "enum": [
                            "ansible_host",
                            "ansible_port",
                            "ansible_user",
                            "ansible_connection",
                            "ansible_ssh_pass",
                            "ansible_ssh_private_key_file",
                            "ansible_ssh_common_args",
                            "ansible_sftp_extra_args",
                            "ansible_scp_extra_args",
                            "ansible_ssh_extra_args",
                            "ansible_ssh_executable",
                            "ansible_ssh_pipelining",
                            "ansible_become",
                            "ansible_become_method",
                            "ansible_become_user",
                            "ansible_become_pass",
                            "ansible_become_exe",
                            "ansible_become_flags",
                            "ansible_shell_type",
                            "ansible_python_interpreter",
                            "ansible_ruby_interpreter",
                            "ansible_perl_interpreter",
                            "ansible_shell_executable"
                        ],
                        "required": true,
                        "gui_links": [],
                        "definition": {},
                        "name": "key",
                        "parent_name_format": "variables_key"
                    },
                    "value": {
                        "title": "Value",
                        "type": "string",
                        "default": "",
                        "gui_links": [],
                        "definition": {},
                        "name": "value",
                        "parent_name_format": "variables_value"
                    }
                },
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
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "type": "string",
                                    "readOnly": true
                                },
                                "key": {
                                    "title": "Key",
                                    "type": "string",
                                    "format": "autocomplete",
                                    "enum": [
                                        "ansible_host",
                                        "ansible_port",
                                        "ansible_user",
                                        "ansible_connection",
                                        "ansible_ssh_pass",
                                        "ansible_ssh_private_key_file",
                                        "ansible_ssh_common_args",
                                        "ansible_sftp_extra_args",
                                        "ansible_scp_extra_args",
                                        "ansible_ssh_extra_args",
                                        "ansible_ssh_executable",
                                        "ansible_ssh_pipelining",
                                        "ansible_become",
                                        "ansible_become_method",
                                        "ansible_become_user",
                                        "ansible_become_pass",
                                        "ansible_become_exe",
                                        "ansible_become_flags",
                                        "ansible_shell_type",
                                        "ansible_python_interpreter",
                                        "ansible_ruby_interpreter",
                                        "ansible_perl_interpreter",
                                        "ansible_shell_executable"
                                    ],
                                    "required": true
                                },
                                "value": {
                                    "title": "Value",
                                    "type": "string",
                                    "default": ""
                                }
                            },
                            "definition_name": "TemplateVariable",
                            "definition_ref": "#/definitions/TemplateVariable"
                        }
                    },
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

// debugger;

// tabSignal.connect("openapi.paths",  {api: window.api});
tabSignal.connect("openapi.paths", function()
{
    // for(let i in all_regexp)
    // {
    //     if(all_regexp[i].path == "/project/{pk}/template/{template_id}/option/{option_id}/")
    //     {
    //         all_regexp[i].regexp = "^(?<parents>[A-z]+\/[0-9]+\/)*(?<page>project\/(?<api_pk>[0-9,]+)\/template\/(?<api_template_id>[0-9,]+)\/option\/(?<api_option_id>[A-z0-9 %\-.:,=]+))$"
    //         // debugger;
    //     }
    // }

    // console.log('spajs.opt.menu', spajs.opt.menu);
    // for(let i in spajs.opt.menu)
    // {
    //     let menu = spajs.opt.menu[i];
    //     if(menu.id == getMenuIdFromApiPath('/project/{pk}/template/{template_id}/option/{option_id}/'))
    //     {
    //         menu.urlregexp = [/^(?<page>project\/(?<api_pk>[0-9,]+)\/template\/(?<api_template_id>[0-9,]+)\/option\/(?<api_option_id>[A-z0-9%\-.:,=]+))$/];
    //         debugger;
    //     }
    // }
});

















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
