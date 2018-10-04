
gui_project_template_option = {

    apiGetDataForQuery : function (query)
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
                res.data.results.push({
                    "id": i,
                    "name": val.name,
                })
            }
            res.data.count = res.data.results.length
            return res;
        }

        if(query.method == "post")
        {
            let template_data = this.parent_template.model.data
            
            if(template_data.options[query.data.name])
            {
                query.data.name+=" copy "+Date()
            }
            
            template_data.options[query.data.name] = query.data 
              
            return this.parent_template.sendToApi("patch", undefined, undefined, template_data)
        }
    },

    apiQuery : function (query)
    {
        let def = new $.Deferred();

        this.parent_template = new guiObjectFactory("/project/{pk}/template/{template_id}/")
        $.when(this.parent_template.load(query.data_type[3])).done(() =>{
            def.resolve(this.apiGetDataForQuery(query))
        }).fail((e) =>{
            def.reject(e);
        })

        return def.promise();
    },
}


tabSignal.connect("openapi.schema", function(obj)
{
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
  "method":{'get':'list', 'patch':'', 'put':'', 'post':'new', 'delete':''},
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
            "definition_name": "Host",
            "definition_ref": "#/definitions/Host"
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
            "definition_name": "OneHost",
            "definition_ref": "#/definitions/OneHost"
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
  //"__link__page": "/project/{pk}/template/{template_id}/option/{option_id}/",
  //"page_path": "/project/{pk}/template/{template_id}/option/{option_id}/",
  "sublinks": [],
  "sublinks_l2": [],
  "actions": {},
  "links": {},
  "multi_actions": [],
  "__link__parent": "/project/{pk}/template/{template_id}/",
  "parent_path": "/project/{pk}/template/{template_id}/"
}



    obj.schema.path["/project/{pk}/template/{template_id}/option/{option_id}/"];
    obj.schema.path["/project/{pk}/template/{template_id}/option/{option_id}/variables/"];
    obj.schema.path["/project/{pk}/template/{template_id}/option/{option_id}/variables/{variables_id}/"];
   // debugger;


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
