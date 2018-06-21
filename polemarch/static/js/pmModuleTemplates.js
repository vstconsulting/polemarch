
var pmModuleTemplates =  inheritance(pmTemplates)

pmModuleTemplates.model.name = "templates"
pmModuleTemplates.model.page_name = "template"
pmModuleTemplates.model.bulk_name = "template"
pmModuleTemplates.model.selectedInventory = 0
pmModuleTemplates.model.className = "pmModuleTemplates"

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmModuleTemplates.model.kind = "Module"

pmModuleTemplates.inventoriesAutocompletefiled = new pmInventories.filed.inventoriesAutocomplete()

pmTemplates.model.kindObjects[pmModuleTemplates.model.kind] = pmModuleTemplates


/**
 * Для ввода пароля
 * @type Object
 */
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule = inheritance(filedsLib.filed.simpleText)
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule.type = 'selectProjectInventoryGroupAndModule'
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule.getValue = function(pmObj, filed){
    return '';
}

pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForNewOption = inheritance(filedsLib.filed.simpleText)
pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForNewOption.type = 'selectProjectInventoryGroupAndModuleForNewOption'
pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForNewOption.getValue = function(pmObj, filed){
    return '';
}

pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForOption = inheritance(filedsLib.filed.simpleText)
pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForOption.type = 'selectProjectInventoryGroupAndModuleForOption'
pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForOption.getValue = function(pmObj, filed){
    return '';
}

/**
 * Функция для рендера текстового поля
 * @type Object
 */
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule.render = function(pmObj, filed, item_id){
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()
    {
        $("#inventories-autocomplete").select2({ width: '100%' });
        $("#projects-autocomplete").select2({ width: '100%' });
    })
}

pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForNewOption.render = function(pmObj, filed, item_id){
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()  {})
}

pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForOption.render = function(pmObj, filed, item_id){
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function() {})
}


pmModuleTemplates.model.page_list = {
    short_title: 'Module template',
}

pmModuleTemplates.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            function:function(item_id){
                return "spajs.showLoader("+this.model.className+".saveAndExecute("+item_id+")); return false;"
            },
            title:'Save and execute',
            link:function(){ return '#'},
            help:'Save and execute'
        },
        {
            class:'btn btn-info',
            function:function(item_id)
            {
                return "spajs.open({ menuId:'template/"+this.model.kind+"/"+item_id+"/options'}); return false;";
            },
            title:'Options',
            link:function(){ return '#'},
            help:'Options of this template'
        },
        {
            class:'btn btn-info',
            function:function(item_id)
            {
                return "spajs.open({ menuId:'template/"+this.model.kind+"/"+item_id+"/periodic-tasks'}); return false;";
            },
            title:'Periodic tasks',
            link:function(){ return '#'},
            help:'Periodic tasks linked to this template'
        },
        {
            class:'btn btn-info',
            function:function(item_id)
            {
                return "spajs.open({ menuId:'template/"+this.model.kind+"/"+item_id+"/history'}); return false;";
            },
            title:'History',
            link:function(){ return '#'},
            help:'Template execution history'
        },
        {
            class:'btn btn-default copy-btn',
            function:function(item_id)
            {
                return 'spajs.showLoader('+this.model.className+'.copyAndEdit('+item_id+'));  return false;';
            },
            title:'<span class="glyphicon glyphicon-duplicate" ></span>',
            link:function(){ return '#'},
            help:'Copy'
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id, opt)
            {
                return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;';
            },
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    sections:[
        function(section, item_id){
            return jsonEditor.editor(pmModuleTemplates.model.items[item_id].data.vars, {block:'module', title1:'Arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return "Module template "+this.model.items[item_id].justText('name')
    },
    short_title: function(item_id){
        return this.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter template name',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
        ],
        [
            {
                filed: new pmModuleTemplates.filed.selectProjectInventoryGroupAndModule(),
                name:'inventory',
            },
        ],
        [
            {
                filed: new filedsLib.filed.textarea(),
                title:'Notes',
                name:'notes',
                placeholder:'Not required field, just for your notes'
            },
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        data.kind = this.model.kind
        data.data = {
            module:moduleArgsEditor.getSelectedModuleName(),
            inventory:pmModuleTemplates.inventoriesAutocompletefiled.getValue(),
            project:$("#projects-autocomplete").val(),
            group:pmGroups.getGroupsAutocompleteValue(),
            args:moduleArgsEditor.getModuleArgs(),
            vars:jsonEditor.jsonEditorGetValues(),
        }

        return data;
    },
}

pmModuleTemplates.model.page_item_from_another_class = inheritance(pmModuleTemplates.model.page_item);

pmModuleTemplates.model.page_item_from_another_class['buttons'] = [
    {
        class:'btn btn-primary',
        function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
        title:'Save',
        link:function(){ return '#'},
    },
    {
        class:'btn btn-warning',
        function:function(item_id){
            return "spajs.showLoader("+this.model.className+".saveAndExecute("+item_id+")); return false;"
        },
        title:'Save and execute',
        link:function(){ return '#'},
        help:'Save and execute'
    },
    {
        class:'btn btn-info',
        function:function(item_id, opt) {
            return "spajs.open({ menuId:'" + opt.parent_type + "/"+opt.parent_item+"/template/"+this.model.kind+"/"+item_id+"/options'}); return false;";
        },
        title:'Options',
        link:function(){ return '#'},
        help:'Options of this template'
    },
    {
        class:'btn btn-info',
        function:function(item_id, opt)
        {
            return "spajs.open({ menuId:'" + opt.parent_type + "/"+opt.parent_item+"/template/"+this.model.kind+"/"+item_id+"/periodic-tasks'}); return false;"
        },
        title:'Periodic tasks',
        link:function(){ return '#'},
        help:'Periodic tasks linked to this template'
    },
    {
        class:'btn btn-info',
        function:function(item_id, opt)
        {
            return "spajs.open({ menuId:'" + opt.parent_type + "/"+opt.parent_item+"/template/"+this.model.kind+"/"+item_id+"/history'}); return false;";
        },
        title:'History',
        link:function(){ return '#'},
        help:'Template execution history'
    },
    {
        class:'btn btn-default copy-btn',
        function:function(item_id, opt)
        {
            return 'spajs.showLoader('+this.model.className+'.copyAndEdit('+item_id+', "' + opt.parent_type + '/'+opt.parent_item+'/template/'+this.model.kind+'"));  return false;'
        },
        title:'<span class="glyphicon glyphicon-duplicate" ></span>',
        link:function(){ return '#'},
        help:'Copy'
    },
    {
        class:'btn btn-danger danger-right',
        function:function(item_id, opt)
        {
            return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+', false, "' + opt.parent_type + '/'+ opt.parent_item +'/templates"));  return false;'
        },
        title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
        link:function(){ return '#'},
    }
]


pmModuleTemplates.model.page_item_new_option = {
    back_link: function (item_id, opt)
    {
        if(opt.project_id !== undefined)
        {
            return "?project/" + opt.project_id + "/" + this.model.page_name + "/" + this.model.kind + "/" + item_id + "/options";
        }
        else
        {
            return "?" + this.model.page_name + "/" + this.model.kind + "/" + item_id + "/options";
        }
    },
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader(pmModuleTemplates.saveNewOption('+item_id+'));  return false;'},
            title:'Create',
            link:function(){ return '#'},
        }
    ],
    sections:[
        function(section, item_id){
            pmModuleTemplates.model.items[item_id].data.varsForOption={};
            return jsonEditor.editor(pmModuleTemplates.model.items[item_id].data.varsForOption, {block:'module', title1:'Additional arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return "New option for module template "+this.model.items[item_id].justText('name');
    },
    short_title: function(item_id){
        return "New option";
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'option_name',
                placeholder:'Enter option name',
                value:''
            }
        ],
        [
            {
                filed: new pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForNewOption(),
                name:'inventory',
            },
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    }
}

pmModuleTemplates.model.page_item_option = {
    back_link: function (item_id, opt)
    {
        if(opt.project_id !== undefined)
        {
            return "?project/" + opt.project_id + "/" +this.model.page_name + "/" +  this.model.kind + "/" + item_id + "/options";
        }
        else
        {
            return "?" + this.model.page_name + "/" +  this.model.kind + "/" + item_id + "/options";
        }
    },
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader(pmModuleTemplates.saveOption('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            title:'Save and execute',
            function:function(item_id){ return "spajs.showLoader(pmModuleTemplates.saveAndExecuteOption("+item_id+")); return false;"},
            link:function(){ return '#'},
            help:'Save and execute'
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){
                return 'spajs.showLoader(pmModuleTemplates.removeOption('+item_id+', "'+pmModuleTemplates.model.items[item_id].option_name+'"));  return false;'
            },
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        }
    ],
    sections:[
        function(section, item_id){
            pmModuleTemplates.model.items[item_id].data.varsForOption={};
            for(var i in pmModuleTemplates.model.items[item_id].dataForOption.vars)
            {
                pmModuleTemplates.model.items[item_id].data.varsForOption[i]=pmModuleTemplates.model.items[item_id].dataForOption.vars[i];
            }
            return jsonEditor.editor(pmModuleTemplates.model.items[item_id].data.varsForOption, {block:'module', title1:'Additional arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return 'Option '+pmModuleTemplates.model.items[item_id].option_name+' for module template '+this.model.items[item_id].justText('name');
    },
    short_title: function(item_id){
        return pmModuleTemplates.model.items[item_id].option_name;
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'option_name',
                placeholder:'Enter option name',
            }
        ],
        [
            {
                filed: new pmModuleTemplates.filed.selectProjectInventoryGroupAndModuleForOption(),
                name:'inventory',
            },
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    }
}


/**
 *Функция сохраняет изменения в уже существующей опции.
 */
pmModuleTemplates.saveOption = function(item_id)
{
    var optionName=$('#filed_option_name').val();
    optionName=optionName.trim();
    optionName=optionName.replace( /\s/g, "-" );
    var def = new $.Deferred();
    if(optionName=="")
    {
        $.notify("Option name is empty", "error");
        def.reject({text:"Option name is empty"});
        return def.promise();
    }
    var templateData=this.model.items[item_id].data;
    var optionData= {
        module:moduleArgsEditor.getSelectedModuleName(),
        //inventory:+pmModuleTemplates.inventoriesAutocompletefiled.getValue(),
        //project:+$("#projects-autocomplete").val(),
        group:pmGroups.getGroupsAutocompleteValue(),
        args:moduleArgsEditor.getModuleArgs(),
        vars:jsonEditor.jsonEditorGetValues(),
    };
    var dataToAdd={};
    for(var i in optionData)
    {
        for (var j in templateData)
        {
            if(i==j && i!='vars')
            {
                if(optionData[i]!=templateData[j])
                {
                    dataToAdd[i]=optionData[i];
                }
            }
        }
    }

    if(!($.isEmptyObject(optionData['vars'])))
    {
        for(var i in templateData['vars'])
        {
            if(optionData['vars'].hasOwnProperty(i))
            {
                $.notify('Template has already argument "'+i+'" ', "error");
                def.reject({text:"Option is the same as the template"});
                return def.promise();
            }
        }
        dataToAdd['vars']=optionData['vars'];
    }


    if($.isEmptyObject(dataToAdd))
    {
        $.notify("Option is absolutely the same as the template", "error");
        def.reject({text:"Option is the same as the template"});
        return def.promise();
    }
    else
    {
        var dataToAdd1={options:{}};
        dataToAdd1.options=this.model.items[item_id].options;
        if(dataToAdd1.options.hasOwnProperty(optionName))
        {
            delete dataToAdd1.options[optionName];
        }
        else
        {
            var linkPartArr=window.location.href.split("/");
            var previousNameOfOption=linkPartArr[linkPartArr.length-1];
            delete dataToAdd1.options[previousNameOfOption];
        }
        dataToAdd1.options[optionName]=dataToAdd;
        var thisObj = this;
        spajs.ajax.Call({
            url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
            type: "PATCH",
            contentType: 'application/json',
            data: JSON.stringify(dataToAdd1),
            success: function (data)
            {
                thisObj.model.items[item_id] = data
                $.notify('Option "'+optionName+'" was successfully saved', "success");
                var project_and_id = thisObj.defineProjectInUrl();
                $.when(spajs.open({ menuId:project_and_id + "template/"+thisObj.model.kind+"/"+data.id+"/option/"+optionName})).always(function(){
                    def.resolve();
                });
            },
            error: function (e)
            {
                def.reject(e)
                polemarch.showErrors(e.responseJSON)
            }
        });
    }
    return def.promise();
}


/**
 *Функция отрисовывает страницу для создания новой опции.
 */
pmModuleTemplates.showNewOptionPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = undefined;
    var project_id = undefined;
    if(data.reg[2] !== undefined)
    {
        project_id = data.reg[1];
        item_id = data.reg[2];
    }
    else
    {
        item_id = data.reg[1];
    }
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
        {
            var tpl = 'new_option_page'
            if(!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_page'
            }

            if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
            {
                var project_name = pmProjects.model.items[project_id].name;
            }

            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
            def.resolve();
        });
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

/**
 *Функция отрисовывает страницу для просмотра/редактирования уже существующей опции.
 */
pmModuleTemplates.showOptionPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = undefined;
    var item_id = data.reg[1];
    var option_name=data.reg[2];
    if(data.reg[3] !== undefined)
    {
        project_id = data.reg[1];
        item_id = data.reg[2];
        option_name = data.reg[3];
    }
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        thisObj.model.items[item_id].optionsCopyForDelete = JSON.parse(JSON.stringify(thisObj.model.items[item_id].options));
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
        {
            var project_name = undefined;
            if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
            {
                project_name = pmProjects.model.items[project_id].name;
            }
            pmModuleTemplates.model.items[item_id].option_name=option_name;
            pmModuleTemplates.model.items[item_id].dataForOption={};
            for(var i in pmModuleTemplates.model.items[item_id].data)
            {
                if(i!='vars')
                {
                    pmModuleTemplates.model.items[item_id].dataForOption[i]=pmModuleTemplates.model.items[item_id].data[i];
                }
            }
            var optionAPI=pmModuleTemplates.model.items[item_id].options[pmModuleTemplates.model.items[item_id].option_name];
            for(var i in optionAPI)
            {
                if(pmModuleTemplates.model.items[item_id].dataForOption.hasOwnProperty(i))
                {
                    pmModuleTemplates.model.items[item_id].dataForOption[i]=optionAPI[i];
                }
            }
            if(optionAPI.hasOwnProperty('vars'))
            {
                pmModuleTemplates.model.items[item_id].dataForOption['vars']={};
                for(var i in optionAPI['vars'])
                {
                    pmModuleTemplates.model.items[item_id].dataForOption['vars'][i]=optionAPI['vars'][i];
                }
            }

            var tpl = 'module_option_page'
            if(!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_page'
            }

            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
            def.resolve();
        });
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}


pmModuleTemplates.showItem = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var item_id = data.reg[1];
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(),
        pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmProjects.loadItem(thisObj.model.items[item_id].data.project)).done(function ()
        {
            thisObj.model.selectedProject = thisObj.model.items[item_id].data.project;
            $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
            {
                var tpl = thisObj.model.name+'_module_page'
                if(!spajs.just.isTplExists(tpl))
                {
                    tpl = 'items_page'
                }

                $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}}))
                def.resolve();
            });
        }).fail(function () {
            $.notify("Error with loading of project data", "error");
        });

    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmModuleTemplates.showItemFromProject = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = data.reg[1];
    var item_id = data.reg[2];
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(),
        pmModuleTemplates.loadItem(item_id)).done(function()
    {
        if(thisObj.model.items[item_id].data.project != project_id)
        {
            $.notify("This template is not for this project", "error");
            def.reject();
            return def.promise();
        }
        $.when(pmProjects.loadItem(project_id)).done(function ()
        {
            thisObj.model.selectedProject = thisObj.model.items[item_id].data.project;
            $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
            {
                var project_name = pmProjects.model.items[project_id].name;
                thisObj.model.parentObjectsData = [
                    {
                        item_name: project_name,
                        parent_item: project_id,
                        parent_type: pmProjects.model.page_name,
                        parent_type_plural: pmProjects.model.name
                    }
                ];
                thisObj.model.itemsForParent = {};
                thisObj.model.itemsForParent[item_id] = thisObj.model.items[item_id];
                var tpl = thisObj.model.name + '_page_from_another_class';
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'items_page_from_another_class';
                }

                $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj,
                    opt:{parent_item: project_id, parent_type: pmProjects.model.page_name, back_link: 'project/'+project_id+'/templates', link_with_parents:'project/'+project_id }}))
                $("#projects-autocomplete").attr("disabled", "disabled");
                def.resolve();
            });
        }).fail(function () {
            $.notify("Error with loading of project data", "error");
        });

    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmModuleTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems()).done(function()
    {
        if(pmProjects.model.itemslist.results.length != 0)
        {
            $.when(pmProjects.loadItem(pmProjects.model.itemslist.results[0].id)).done(function()
            {
                //for P+
                thisObj.model.selectedProject = pmProjects.model.itemslist.results[0].id;
                //
                $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {opt:{}}))

                $("#inventories-autocomplete").select2({ width: '100%' });
                $("#projects-autocomplete").select2({ width: '100%' });

                def.resolve();
            }).fail(function(){
                $.notify("Error with loading of project data");
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {opt:{}}))

            $("#inventories-autocomplete").select2({ width: '100%' });
            $("#projects-autocomplete").select2({ width: '100%' });

            def.resolve();
        }

    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmModuleTemplates.showNewItemPageFromProject = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = data.reg[1];
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems()).done(function()
    {
        $.when(pmProjects.loadItem(project_id)).done(function()
        {
            //for P+
            thisObj.model.selectedProject = project_id;
            //
            var project_name = pmProjects.model.items[project_id].name;
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {opt:{project_id:project_id, project_name:project_name}}))

            $("#inventories-autocomplete").select2({ width: '100%' });
            // $("#projects-autocomplete").select2({ width: '100%' });
            def.resolve();
        }).fail(function(){
            $.notify("Error with loading of project data", "error");
        });

    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}


pmModuleTemplates.selectInventory = function(inventory_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    inventory_id = inventory_id/1
    if(inventory_id)
    {
        $.when(pmInventories.loadItem(inventory_id)).done(function(){
            thisObj.model.selectedInventory = inventory_id;
            def.resolve();
        }).fail(function(e){
            def.reject(e);
        });
    }
    else
    {
        thisObj.model.selectedInventory = 0;
        def.resolve();
    }
    return def.promise()
}

/**
 * @return $.Deferred
 */
pmModuleTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        module:moduleArgsEditor.getSelectedModuleName(),
        inventory:pmModuleTemplates.inventoriesAutocompletefiled.getValue(),
        project:$("#projects-autocomplete").val(),
        group:pmGroups.getGroupsAutocompleteValue(),
        args:moduleArgsEditor.getModuleArgs(),
        vars:jsonEditor.jsonEditorGetValues(),
    }

    if(!data.name)
    {
        console.warn("Invalid value in field name")
        $.notify("Invalid value in field name", "error");
        def.reject()
        return;
    }

    data.notes=$("#filed_notes").val();

    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/templates/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(data),
        success: function(data)
        {
            $.notify("template created", "success");
            var project_and_id = thisObj.defineProjectInUrl();
            $.when(spajs.open({ menuId:project_and_id+"template/"+thisObj.model.kind+"/"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
            def.reject(e)
        }
    });

    return def.promise();
}


tabSignal.connect("polemarch.start", function()
{
    spajs.addMenu({
        id:"Module-new-option",
        urlregexp:[/^template\/Module\/([0-9]+)\/new-option$/, /^templates\/Module\/([0-9]+)\/new-option$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/new-option$/, /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/new-option$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewOptionPage(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"Module-option",
        urlregexp:[/^template\/Module\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Module\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showOptionPage(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"Module-options",
        urlregexp:[/^template\/Module\/([0-9]+)\/options$/, /^templates\/Module\/([0-9]+)\/options$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/options$/, /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/options$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showOptionsList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-options-search",
        urlregexp:[/^template\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^template\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showOptionsSearchResult(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-item",
        urlregexp:[/^template\/Module\/([0-9]+)$/, /^templates\/Module\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showItem(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"module-new",
        urlregexp:[/^template\/new-module$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewItemPage(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-periodic-tasks",
        urlregexp:[/^template\/Module\/([0-9]+)\/periodic-tasks$/, /^templates\/Module\/([0-9]+)\/periodic-tasks$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/periodic-tasks$/, /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/periodic-tasks$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showPeriodicTasksList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-new-periodic-task",
        urlregexp:[/^template\/Module\/([0-9]+)\/new-periodic-task$/,
            /^templates\/Module\/([0-9]+)\/new-periodic-task$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/new-periodic-task$/,
            /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/new-periodic-task$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewPeriodicTaskFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-periodic-task",
        urlregexp:[/^template\/Module\/([0-9]+)\/periodic-task\/([0-9]+)$/,
            /^templates\/Module\/([0-9]+)\/periodic-task\/([0-9]+)$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/periodic-task\/([0-9]+)$/,
            /^project\/([0-9]+)\/templates\/Module\/([0-9]+)\/periodic-task\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showPeriodicTaskPageFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-periodic-tasks-search",
        urlregexp:[/^template\/Module\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^template\/Module\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Module\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showSearchResultsFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-new-for-project",
        urlregexp:[/^project\/([0-9]+)\/template\/new-module$/, /^project\/([0-9]+)\/templates\/new-module$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewItemPageFromProject(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-item-from-project",
        urlregexp:[/^project\/([0-9]+)\/template\/Module\/([0-9]+)$/, /^project\/([0-9]+)\/templates\/Module\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showItemFromProject(holder, menuInfo, data);},
    })

})
