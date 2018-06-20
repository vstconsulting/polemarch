
var pmPeriodicTasks = inheritance(pmItems)

pmPeriodicTasks.model.page_name = "periodic-task"
pmPeriodicTasks.model.bulk_name = "periodictask"
pmPeriodicTasks.model.name = "periodic-tasks"
pmPeriodicTasks.model.selectedInventory = 0;
pmPeriodicTasks.model.className = "pmPeriodicTasks"

pmPeriodicTasks.inventoriesAutocompletefiled = new pmInventories.filed.inventoriesAutocomplete()

/**
 * Для ввода шаблона
 * @type Object
 */
pmPeriodicTasks.filed.projectTemplatesAutocomplete = inheritance(filedsLib.filed.simpleText)
pmPeriodicTasks.filed.projectTemplatesAutocomplete.type = 'projectTemplatesAutocomplete'
pmPeriodicTasks.filed.projectTemplatesAutocomplete.getValue = function(pmObj, filed)
{
    var template = $("#templates-autocomplete").val()

    return template;
}

/**
 * Функция для рендера поля
 * @type Object
 */
pmPeriodicTasks.filed.projectTemplatesAutocomplete.render = function(pmObj, filed, item_id, opt)
{
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id, filedObj:this, opt:opt})
    return spajs.just.onInsert(html, function()
    {
        $("#templates-autocomplete").select2({ width: '100%' });

        if(filed.onchange && item_id)
        {
            filed.onchange({value:filed.getFiledValue.apply(pmObj, [item_id])})
        }
        else if(filed.onchange)
        {
            if(pmTasksTemplates.model.itemslist.results[0])
            {
                filed.onchange({value:pmTasksTemplates.model.itemslist.results[0].id})
            }
            else
            {
                filed.onchange({value:""})
            }
        }
    });
}

pmPeriodicTasks.projectTemplatesAutocompletefiled = new pmPeriodicTasks.filed.projectTemplatesAutocomplete();


pmPeriodicTasks.copyAndEdit = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmPeriodicTasks.copyAndEdit with item_id = `" + item_id + "`"
    }

    var def = new $.Deferred();
    var thisObj = this;
    return $.when(this.copyItem(item_id)).done(function(newItemId)
    {
        $.when(spajs.open({ menuId:"project/"+thisObj.model.items[item_id].project+"/"+thisObj.model.page_name + "/"+newItemId})).done(function(){
            $.notify("Item was duplicate", "success");
            def.resolve()
        }).fail(function(e){
            $.notify("Error in duplicate item", "error");
            polemarch.showErrors(e)
            def.reject(e)
        })
    }).fail(function(e){
        def.reject(e)
    })

    return def.promise();
}

pmPeriodicTasks.copyItem = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmPeriodicTasks.copyItem with item_id = `" + item_id + "`"
    }

    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name
        data.vars.group = data.group
        data.vars.args = data.args

        delete data.group;
        delete data.args;

        $.when(encryptedCopyModal.replace(data)).done(function(data)
        {
            spajs.ajax.Call({
                url: hostname + "/api/v1/"+thisObj.model.name+"/",
                type: "POST",
                contentType:'application/json',
                data: JSON.stringify(data),
                success: function(data)
                {
                    thisObj.model.items[data.id] = data
                    def.resolve(data.id)
                },
                error:function(e)
                {
                    def.reject(e)
                }
            });
        }).fail(function(e)
        {
            def.reject(e)
        })

    }).fail(function(e)
    {
        def.reject(e)
    })


    return def.promise();
}


pmPeriodicTasks.selectInventory = function(inventory_id)
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

pmPeriodicTasks.deleteItem = function(item_id, force)
{
    if(!item_id)
    {
        throw "Error in pmPeriodicTasks.deleteItem with item_id = `" + item_id + "`"
    }

    if(!force && !confirm("Are you sure?"))
    {
        return;
    }

    var def = new $.Deferred();
    var thisObj = this;
    $.when(this.loadItem(item_id)).done(function()
    {
        var project_id = pmPeriodicTasks.model.items[item_id].project;
        var template_id = pmPeriodicTasks.model.items[item_id].template;
        $.when(thisObj.deleteItemQuery(item_id)).done(function(data)
        {
            if(/template/.test(window.location.href) || /templates/.test(window.location.href))
            {
                if(/Task/.test(window.location.href))
                {
                    var template_kind = "Task";
                }
                else
                {
                    var template_kind = "Module";
                }
                var project_and_id = pmTasksTemplates.defineProjectInUrl();
                $.when(spajs.open({ menuId: project_and_id+"template/"+template_kind + "/" + template_id + "/periodic-tasks"})).done(function(){
                    def.resolve();
                }).fail(function(e){
                    def.reject(e);
                    polemarch.showErrors(e.responseJSON)
                })
            }
            else
            {
                $.when(spajs.open({ menuId:"project/"+project_id+"/periodic-tasks"})).done(function(){
                    def.resolve()
                }).fail(function(e){
                    def.reject(e);
                    polemarch.showErrors(e.responseJSON)
                })
            }


        }).fail(function(e){
            def.reject(e);
            polemarch.showErrors(e.responseJSON)
        })
    }).fail(function(e){
        def.reject(e);
        polemarch.showErrors(e.responseJSON)
    })

    return def.promise();
}

pmPeriodicTasks.execute = function(project_id, item_id)
{
    var def = new $.Deferred();
    spajs.ajax.Call({
        url: hostname + "/api/v1/"+this.model.name+"/" + item_id+"/execute/",
        type: "POST",
        data:JSON.stringify({}),
        contentType:'application/json',
        success: function(data)
        {
            $.notify("Started", "success");
            if(data && data.history_id)
            {
                $.when(spajs.open({ menuId:"project/"+project_id+"/history/"+data.history_id}) ).done(function(){
                    def.resolve()
                }).fail(function(e){
                    def.reject(e)
                })
            }
            else
            {
                def.reject({text:"No history_id", status:500})
            }
        },
        error:function(e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    })

    return def.promise();
}

/**
 * Выделеть всё или снять выделение
 * @param {boolean} mode
 * @param {integer} project_id проект для которого с тасками работаем.
 * @returns {promise}
 */
pmPeriodicTasks.toggleSelectEachItem = function(mode, project_id)
{
    var thisObj = this;
    return $.when(this.searchItems(project_id, 'project')).done(function()
    {
        var delta = 0;
        for(var i in thisObj.model.itemslist.results)
        {
            var item_id = thisObj.model.itemslist.results[i].id

            if(thisObj.model.selectedItems[item_id] != mode)
            {
                if(mode)
                {
                    delta++
                }
                else
                {
                    delta--
                }
            }
            thisObj.model.selectedItems[item_id] = mode
        }
        thisObj.model.selectedCount += delta

        if(thisObj.model.selectedCount < 0)
        {
            thisObj.model.selectedCount = 0;
        }

    }).promise()
}

pmPeriodicTasks.showList = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize*(data.reg[2] - 1);
    }
    var project_id = data.reg[1];

    return $.when(this.searchItems(project_id, 'project'), pmProjects.loadItem(project_id), pmTasksTemplates.loadAllItemsFromProject(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:"", project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    }).promise();
}

pmPeriodicTasks.search = function(query, options)
{
    var project_and_id = pmTasksTemplates.defineProjectInUrl();

    if(this.isEmptySearchQuery(query))
    {
        if(options.template_kind === undefined)
        {
            return spajs.open({ menuId:'project/' + options.project_id +"/" + this.model.name, reopen:true});
        }
        else
        {
            return spajs.open({ menuId:project_and_id + 'template/'+ options.template_kind+ "/" + options.template_id +"/" + this.model.name, reopen:true});
        }

    }

    if(options.template_kind === undefined)
    {
        return spajs.open({ menuId:'project/' + options.project_id +"/" + this.model.name+"/search/"+this.searchObjectToString(trim(query)), reopen:true});

    }
    else
    {
        return spajs.open({ menuId:project_and_id + 'template/'+ options.template_kind+ "/" + options.template_id +"/" + this.model.name + "/search/"+this.searchObjectToString(trim(query)), reopen:true});
    }

}

pmPeriodicTasks.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1];


    var search = this.searchStringToObject(decodeURIComponent(data.reg[2]))
    search['project'] = project_id

    return $.when(this.sendSearchQuery(search), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[2]), project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    }).promise();
}

pmPeriodicTasks.showNewItemPage = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var project_id = data.reg[1];
    var thisObj = this;
    return $.when(pmTasks.searchItems(project_id, "project"), pmProjects.loadItem(project_id), pmInventories.loadAllItems(), pmTasksTemplates.loadAllItemsFromProject(project_id)).done(function()
    {
        thisObj.model.newitem = {type:'INTERVAL', kind:'PLAYBOOK'}
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {project_id:project_id}))

        $('#new_periodic-tasks_inventory').select2({ width: '100%' });

        new autoComplete({
            selector: '#new_periodic-tasks_playbook',
            minChars: 0,
            cache:false,
            showByClick:false,
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.playbook + '">' + item.playbook + '</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#new_periodic-tasks_playbook").val($(item).text());
                //console.log('onSelect', term, item);
                //var value = $(item).attr('data-value');
            },
            source: function(term, response)
            {
                term = term.toLowerCase();

                var matches = []
                for(var i in pmTasks.model.items)
                {
                    var val = pmTasks.model.items[i]
                    if(val.name.toLowerCase().indexOf(term) != -1 && val.project == project_id)
                    {
                        matches.push(val)
                    }
                }
                response(matches);
            }
        });
    }).fail(function()
    {
        $.notify("", "error");
    }).promise();
}

/**
 * Для ввода пароля
 * @type Object
 */
pmPeriodicTasks.filed.selectInventoryKindPlaybookGroupModuleAndTime = inheritance(filedsLib.filed.simpleText)
pmPeriodicTasks.filed.selectInventoryKindPlaybookGroupModuleAndTime.type = 'selectInventoryKindPlaybookGroupModuleAndTime'
pmPeriodicTasks.filed.selectInventoryKindPlaybookGroupModuleAndTime.getValue = function(pmObj, filed){
    return '';
}

pmPeriodicTasks.filed.selectTemplateFromProjectToPT = inheritance(filedsLib.filed.simpleText)
pmPeriodicTasks.filed.selectTemplateFromProjectToPT.type = 'selectTemplateFromProjectToPT'
pmPeriodicTasks.filed.selectTemplateFromProjectToPT.getValue = function(pmObj, filed){
    return '';
}

pmPeriodicTasks.model.page_list = {
    short_title: 'Periodic tasks',
}

pmPeriodicTasks.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id, opt){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+', {project_id:'+opt.project_id+'}));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            function:function(item_id, opt){
                return "spajs.showLoader(pmPeriodicTasks.execute("+opt.project_id+", "+item_id+")); return false;"
            },
            title:'Execute',
            link:function(){ return '#'},
            help:'Execute'
        },
        {
            class:'btn btn-default copy-btn',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.copyAndEdit('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-duplicate" ></span>',
            link:function(){ return '#'},
            help:'Copy'
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    sections:[
        function(section, item_id)
        {
            return spajs.just.render('periodic-tasks_page_vars_section', {
                item_id:item_id,
                pmObj:this,
                PLAYBOOK_VARS: jQuery.extend(true, {}, pmPeriodicTasks.model.items[item_id].vars),
                MODULE_VARS: jQuery.extend(true, {}, pmPeriodicTasks.model.items[item_id].vars)
            })
        }
    ],
    title: function(item_id){
        return "Periodic task "+this.model.items[item_id].justText('name')
    },
    back_link: function(item_id, opt){
        return  polemarch.opt.host + "/?project/" + opt.project_id + "/" + this.model.name;
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
            {
                filed: new filedsLib.filed.boolean(),
                title:'Save in history',
                name:'save_result',
                help:'Save result of task in history',
            },
            {
                filed: new filedsLib.filed.boolean(),
                title:'Enabled',
                name:'enabled',
                help:'',
            },
        ],
        [
            {
                filed: new pmPeriodicTasks.filed.selectInventoryKindPlaybookGroupModuleAndTime(),
                name:'project',
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
    onBeforeSave:function(data, item_id, opt)
    {
        if(!opt || !opt.project_id)
        {
            throw "Error in pmPeriodicTasks.onBeforeSave with opt.project_id is null"
        }

        data.project = opt.project_id

        data.type = $("#periodic-tasks_"+item_id+"_type").val()

        data.kind = $("#periodic-tasks_"+item_id+"_kind").val()

        if(data.kind == "MODULE")
        {
            data.mode = moduleArgsEditor.getSelectedModuleName()
            if(!data.mode)
            {
                $.notify("Module name is empty", "error");
                return false;
            }
        }
        else if(data.kind == "PLAYBOOK")
        {
            data.mode = $("#periodic-tasks_"+item_id+"_playbook").val()
            if(!data.mode)
            {
                $.notify("Playbook name is empty", "error");
                return false;
            }
        }
        else
        {
            var template_val = pmPeriodicTasks.projectTemplatesAutocompletefiled.getValue();
            var template_val_arr = template_val.split("/");
            data.template = template_val_arr[0];
            if(template_val_arr[1] !== undefined)
            {
                data.template_opt = template_val_arr[1];
            }
            else
            {
                data.template_opt = null;
            }

        }

        if(data.kind != "TEMPLATE")
        {
            data.inventory = pmPeriodicTasks.inventoriesAutocompletefiled.getValue()

            if(!data.inventory)
            {
                $.notify("Invalid field `inventory` ", "error");
                return false;
            }
        }

        if(data.type == "CRONTAB")
        {
            data.schedule = crontabEditor.getCronString()
        }
        else
        {
            data.schedule = $("#periodic-tasks_"+item_id+"_schedule_INTERVAL").val()
            if(!data.schedule)
            {
                $.notify("Invalid field `Interval schedule` ", "error");
                return;
            }
        }

        data.vars = jsonEditor.jsonEditorGetValues(data.kind)

        if(data.kind == "MODULE")
        {
            data.vars.group = pmGroups.getGroupsAutocompleteValue()
            data.vars.args =  moduleArgsEditor.getModuleArgs();
        }
        return data;
    },
}

pmPeriodicTasks.model.page_item_from_template = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id, opt){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+', {project_id:'+opt.project_id+'}));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            function:function(item_id, opt){
                return "spajs.showLoader(pmPeriodicTasks.execute("+opt.project_id+", "+item_id+")); return false;"
            },
            title:'Execute',
            link:function(){ return '#'},
            help:'Execute'
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    sections:[

    ],
    title: function(item_id){
        return "Periodic task "+this.model.items[item_id].justText('name')
    },
    back_link: function(item_id, opt){
        if(opt.url_project_id === undefined)
        {
            return  polemarch.opt.host + "/?template/" + opt.template_kind + "/" + opt.template_id + "/" + this.model.name;
        }
        else
        {
            return  polemarch.opt.host + "/?project/" + opt.url_project_id + "/template/" + opt.template_kind + "/" + opt.template_id + "/" + this.model.name;
        }
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
            {
                filed: new filedsLib.filed.boolean(),
                title:'Save in history',
                name:'save_result',
                help:'Save result of task in history',
            },
            {
                filed: new filedsLib.filed.boolean(),
                title:'Enabled',
                name:'enabled',
                help:'',
            },
        ],
        [
            {
                filed: new pmPeriodicTasks.filed.selectTemplateFromProjectToPT(),
                name:'template',
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
    onBeforeSave:function(data, item_id, opt)
    {
        if(!opt || !opt.project_id)
        {
            throw "Error in pmPeriodicTasks.onBeforeSave with opt.project_id is null"
        }

        data.project = opt.project_id

        data.type = $("#periodic-tasks_"+item_id+"_type").val()

        data.kind = $("#periodic-tasks_"+item_id+"_kind").val()

        if(data.kind == "MODULE")
        {
            data.mode = moduleArgsEditor.getSelectedModuleName()
            if(!data.mode)
            {
                $.notify("Module name is empty", "error");
                return false;
            }
        }
        else if(data.kind == "PLAYBOOK")
        {
            data.mode = $("#periodic-tasks_"+item_id+"_playbook").val()
            if(!data.mode)
            {
                $.notify("Playbook name is empty", "error");
                return false;
            }
        }
        else
        {
            var template_val = pmPeriodicTasks.projectTemplatesAutocompletefiled.getValue();
            var template_val_arr = template_val.split("/");
            data.template = template_val_arr[0];
            if(template_val_arr[1] !== undefined)
            {
                data.template_opt = template_val_arr[1];
            }
            else
            {
                data.template_opt = null;
            }

        }

        if(data.kind != "TEMPLATE")
        {
            data.inventory = pmPeriodicTasks.inventoriesAutocompletefiled.getValue()

            if(!data.inventory)
            {
                $.notify("Invalid field `inventory` ", "error");
                return false;
            }
        }

        if(data.type == "CRONTAB")
        {
            data.schedule = crontabEditor.getCronString()
        }
        else
        {
            data.schedule = $("#periodic-tasks_"+item_id+"_schedule_INTERVAL").val()
            if(!data.schedule)
            {
                $.notify("Invalid field `Interval schedule` ", "error");
                return;
            }
        }

        data.vars = jsonEditor.jsonEditorGetValues(data.kind)

        if(data.kind == "MODULE")
        {
            data.vars.group = pmGroups.getGroupsAutocompleteValue()
            data.vars.args =  moduleArgsEditor.getModuleArgs();
        }
        return data;
    },
}

pmPeriodicTasks.showItem = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[2];
    var project_id = data.reg[1];

    $.when(pmPeriodicTasks.loadItem(item_id), pmTasks.loadAllItems(), pmInventories.loadAllItems(),
        pmProjects.loadItem(project_id), pmTasksTemplates.loadAllItemsFromProject(project_id)).done(function()
    {
        var tpl = thisObj.model.name+'_page'
        if(!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id}}))
        pmPeriodicTasks.selectInventory(pmPeriodicTasks.model.items[item_id].inventory)

        $('#periodic-tasks_'+item_id+'_inventory').select2({ width: '100%' });

        new autoComplete({
            selector: '#periodic-tasks_'+item_id+'_playbook',
            minChars: 0,
            cache:false,
            showByClick:false,
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.id + '.yaml">' + item.name + '.yaml</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#periodic-tasks_"+item_id+"_playbook").val($(item).text());
                //console.log('onSelect', term, item);
                //var value = $(item).attr('data-value');
            },
            source: function(term, response)
            {
                term = term.toLowerCase();

                var matches = []
                for(var i in pmTasks.model.items)
                {
                    var val = pmTasks.model.items[i]
                    if(val.name.toLowerCase().indexOf(term) != -1 && val.project == project_id)
                    {
                        matches.push(val)
                    }
                }
                response(matches);
            }
        });

        def.resolve();

    }).fail(function(e)
    {
        $.notify("", "error");
        def.reject(e);
    })

    return def.promise()
}

/**
 * Функция открывет страницу для отображения периодической таски,
 * созданной на основе шаблона, и на которую перешли со страницы этого шаблона.
 */
pmPeriodicTasks.showPeriodicTaskPageFromTemplate = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var url_project_id = undefined;
    var item_id = data.reg[2];
    var template_id = data.reg[1];
    if(data.reg[3] !== undefined)
    {
        url_project_id = data.reg[1];
        template_id = data.reg[2];
        item_id = data.reg[3];
    }
    $.when(pmPeriodicTasks.loadItem(item_id),
        pmInventories.loadAllItems(), pmTasksTemplates.loadItem(template_id)).done(function()
    {

        var tpl = 'periodic-task-from-template-page'
        var project_id =   pmTasksTemplates.model.items[template_id].data.project;
        var template_kind = pmTasksTemplates.model.items[template_id].kind;
        var url_project_name = undefined;

        if(url_project_id !== undefined)
        {
            $.when(pmProjects.loadItem(url_project_id)).done(function ()
            {
                url_project_name = pmProjects.model.items[url_project_id].name;
                $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj,
                    opt:{project_id:project_id, template_id:template_id, template_kind:template_kind,
                        url_project_id:url_project_id, url_project_name:url_project_name}}));
                pmPeriodicTasks.selectInventory(pmPeriodicTasks.model.items[item_id].inventory);
                def.resolve();
            }).fail(function (e)
            {
                polemarch.showErrors(e.responseJSON);
                def.reject(e);
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj,
                opt:{project_id:project_id, template_id:template_id, template_kind:template_kind,
                    url_project_id:url_project_id, url_project_name:url_project_name}}));
            pmPeriodicTasks.selectInventory(pmPeriodicTasks.model.items[item_id].inventory);
            def.resolve();
        }
    }).fail(function(e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })

    return def.promise()
}

/**
 * Функция открывет страницу для отображения результатов поиска периодических тасок,
 * созданной на основе шаблона, и на которую перешли со страницы этого шаблона.
 */
pmPeriodicTasks.showSearchResultsFromTemplate = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var url_project_id = undefined;
    var template_id = data.reg[1];
    var search_query = decodeURIComponent(data.reg[2]);
    if(data.reg[3] !== undefined)
    {
        url_project_id = data.reg[1];
        template_id = data.reg[2];
        search_query = decodeURIComponent(data.reg[3]);
    }
    var search = this.searchStringToObject(search_query);
    search['template'] = template_id
    return $.when(pmTasksTemplates.loadItem(template_id), pmModuleTemplates.loadItem(template_id)).done(function(){
        var project_id = pmTasksTemplates.model.items[template_id].data.project;
        var pmObj = undefined;
        if(pmTasksTemplates.model.items[template_id].kind == "Task")
        {
            pmObj = pmTasksTemplates;
        }
        else
        {
            pmObj = pmModuleTemplates;
        }
        return $.when(thisObj.sendSearchQuery(search), pmProjects.loadItem(project_id)).done(function()
        {
            var url_project_name = pmProjects.model.items[project_id].name;
            $(holder).insertTpl(spajs.just.render('linked-to-template-periodic-tasks_list', {query:search_query,
                project_id:project_id, item_id:template_id, pmObj:pmObj, opt:{project_id:url_project_id, project_name: url_project_name}}))
        }).fail(function()
        {
            $.notify("", "error");
        }).promise();

    }).fail(function(){
        $.notify("Error with loading project data", "error");
    }).promise();


}

/**
 * @return $.Deferred
 */
pmPeriodicTasks.addItem = function(project_id)
{
    if(!project_id)
    {
        throw "Error in pmPeriodicTasks.addItem with project_id = `" + project_id + "`"
    }

    var def = new $.Deferred();

    var data = {}

    data.project = project_id

    data.name = $("#new_periodic-tasks_name").val()
    data.type = $("#new_periodic-tasks_type").val()

    if(!data.name)
    {
        $.notify("Invalid field `name` ", "error");
        def.reject();
        return def.promise();
    }

    data.kind = $("#new_periodic-tasks_kind").val()

    if(data.kind == "MODULE")
    {
        data.mode = moduleArgsEditor.getSelectedModuleName()
        if(!data.mode)
        {
            $.notify("Module name is empty", "error");
            def.reject();
            return def.promise();
        }
    }
    else if(data.kind == "PLAYBOOK")
    {
        data.mode = $("#new_periodic-tasks_playbook").val()
        if(!data.mode)
        {
            $.notify("Playbook name is empty", "error");
            def.reject();
            return def.promise();
        }
    }
    else
    {
        var template_val = pmPeriodicTasks.projectTemplatesAutocompletefiled.getValue();
        var template_val_arr = template_val.split("/");
        data.template = template_val_arr[0];
        if(template_val_arr[1] !== undefined)
        {
            data.template_opt = template_val_arr[1];
        }
        else
        {
            data.template_opt = null;
        }

    }

    if(data.kind != "TEMPLATE")
    {
        data.inventory = pmPeriodicTasks.inventoriesAutocompletefiled.getValue()
        if(!data.inventory)
        {
            $.notify("Invalid field `inventory` ", "error");
            def.reject();
            return def.promise();
        }
    }

    if(data.type == "CRONTAB")
    {
        data.schedule = crontabEditor.getCronString()
    }
    else
    {
        data.schedule = $("#new_periodic-tasks_schedule_INTERVAL").val()
        if(!data.schedule)
        {
            $.notify("Invalid field `Interval schedule` ", "error");
            def.reject();
            return def.promise();
        }
    }

    data.save_result = $("#new_periodic-tasks_save_result").hasClass('selected')

    data.vars = jsonEditor.jsonEditorGetValues(data.kind)

    if(data.kind == "MODULE")
    {
        data.vars.group = pmGroups.getGroupsAutocompleteValue()
        data.vars.args =  moduleArgsEditor.getModuleArgs();
    }

    data.notes=$("#filed_notes").val();

    spajs.ajax.Call({
        url: hostname + "/api/v1/"+this.model.name+"/",
        type: "POST",
        contentType:'application/json',
        data: JSON.stringify(data),
        success: function(data)
        {
            $.notify("periodic task created", "success");

            if(/template/.test(window.location.href) || /templates/.test(window.location.href))
            {
                if(/Task/.test(window.location.href))
                {
                    var template_kind = "Task";
                }
                else
                {
                    var template_kind = "Module";
                }
                var project_and_id = pmTasksTemplates.defineProjectInUrl();
                $.when(spajs.open({ menuId:project_and_id+"template/"+template_kind+ "/" + data.template +"/periodic-task/"+data.id})).always(function(){
                    def.resolve()
                })
            }
            else
            {
                $.when(spajs.open({ menuId:"project/"+project_id+"/periodic-task/"+data.id})).always(function(){
                    def.resolve()
                })
            }

        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
            def.reject(e)
        }
    });
    return def.promise();
}

pmPeriodicTasks.loadItem = function(item_id)
{
    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "GET",
        contentType:'application/json',
        data: "",
        success: function(data)
        {
            if(data.kind == "MODULE")
            {
                if(data && data.vars && data.vars.group !== undefined)
                {
                    data.group = data.vars.group
                    delete data.vars.group
                }

                if(data && data.vars && data.vars.args !== undefined)
                {
                    data.args = data.vars.args
                    delete data.vars.args
                }
            }
            thisObj.model.items.justWatch(item_id)
            thisObj.model.items[item_id] = data
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

/**
 *Данная функция в зависимости от текущего значения свойства enabled
 *вызывает функцию активации/деактивации periodic task соответственно.
 */
pmPeriodicTasks.changeItemActivation = function(item_id) {
    if(pmPeriodicTasks.model.items[item_id].enabled==true)
    {
        return pmPeriodicTasks.deactivateItem(item_id);
    }
    else
    {
        return pmPeriodicTasks.activateItem(item_id);
    }
}

/**
 *Функция деактивирует periodic task, переводя значение поля enabled из true в false.
 */
pmPeriodicTasks.deactivateItem = function(item_id) {
    var thisObj = this;
    var def = new $.Deferred();
    var data = JSON.parse(JSON.stringify(pmPeriodicTasks.model.items[item_id]));
    data.enabled = false;
    if(data.kind == "TEMPLATE")
    {
        delete data.inventory;
        delete data.mode;
    }
    spajs.ajax.Call({
        url: hostname + "/api/v1/"+thisObj.model.name+"/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data: JSON.stringify(data),
        success: function(data)
        {
            $.notify("Periodic task was deactivated", "success");
            pmPeriodicTasks.model.items[item_id].enabled=!pmPeriodicTasks.model.items[item_id].enabled;
            var t=$(".change-activation-"+item_id)[0];
            $(t).html("Activate");
            var s=$(".pt-enabled-"+item_id)[0];
            $(s).html("");
            def.resolve()
        },
        error:function(e)
        {
            def.reject(e)
        }
    });

    return def.promise();
}

/**
 *Функция активирует periodic task, переводя значение поля enabled из false в true.
 */
pmPeriodicTasks.activateItem = function(item_id) {
    var thisObj = this;
    var def = new $.Deferred();
    var data = JSON.parse(JSON.stringify(pmPeriodicTasks.model.items[item_id]));
    data.enabled = true;
    if(data.kind == "TEMPLATE")
    {
        delete data.inventory;
        delete data.mode;
    }
    spajs.ajax.Call({
        url: hostname + "/api/v1/"+thisObj.model.name+"/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data: JSON.stringify(data),
        success: function(data)
        {
            $.notify("Periodic task was activated", "success");
            pmPeriodicTasks.model.items[item_id].enabled=!pmPeriodicTasks.model.items[item_id].enabled;
            var t=$(".change-activation-"+item_id)[0];
            $(t).html("Deactivate");
            var s=$(".pt-enabled-"+item_id)[0];
            $(s).html('<i class="fa fa-check" style="font-size:20px;"></i>');
            def.resolve()
        },
        error:function(e)
        {
            def.reject(e)
        }
    });

    return def.promise();
}

tabSignal.connect("polemarch.start", function()
{
    // tasks
    spajs.addMenu({
        id:"PeriodicTasks",
        urlregexp:[/^project\/([0-9]+)\/periodic-tasks$/, /^project\/([0-9]+)\/periodic-task$/, /^project\/([0-9]+)\/periodic-tasks\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"PeriodicTasks-search",
        urlregexp:[/^project\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)$/, /^project\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"PeriodicTask",
        urlregexp:[/^project\/([0-9]+)\/periodic-task\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newPeriodicTask",
        urlregexp:[/^project\/([0-9]+)\/new-periodic-tasks$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showNewItemPage(holder, menuInfo, data);}
    })

})
