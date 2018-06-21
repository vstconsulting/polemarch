

var pmTasksTemplates = inheritance(pmTemplates)


pmTasksTemplates.model.name = "templates"
pmTasksTemplates.model.page_name = "template"
pmTasksTemplates.model.bulk_name = "template"
pmTasksTemplates.model.className = "pmTasksTemplates"

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTasksTemplates.model.kind = "Task"
pmTemplates.model.kindObjects[pmTasksTemplates.model.kind] = pmTasksTemplates

/**
 * Для ввода пароля
 * @type Object
 */
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook = inheritance(filedsLib.filed.simpleText)
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook.type = 'selectProjectInventoryAndPlaybook'
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook.getValue = function(pmObj, filed){
    return '';
}

pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForNewOption = inheritance(filedsLib.filed.simpleText)
pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForNewOption.type = 'selectProjectInventoryAndPlaybookForNewOption'
pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForNewOption.getValue = function(pmObj, filed){
    return '';
}

pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForOption = inheritance(filedsLib.filed.simpleText)
pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForOption.type = 'selectProjectInventoryAndPlaybookForOption'
pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForOption.getValue = function(pmObj, filed){
    return '';
}


/**
 * Функция для рендера текстового поля
 * @type Object
 */
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook.render = function(pmObj, filed, item_id){
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()
    {
        $("#inventories-autocomplete").select2({ width: '100%' });
        $("#projects-autocomplete").select2({ width: '100%' });

        pmTasksTemplates.newAutoCompletePlaybook();

    })
}

pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForNewOption.render = function(pmObj, filed, item_id){
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()
    {
        pmTasksTemplates.newAutoCompletePlaybook();

    })
}

pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForOption.render = function(pmObj, filed, item_id){
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()
    {
        pmTasksTemplates.newAutoCompletePlaybook();

    })
}

// <a href="#" onclick="pmTasksTemplates.exportSelecedToFile(); return false;" >Export all selected templates</a>

pmTasksTemplates.newAutoCompletePlaybook = function()
{
    var thisObj=this;
    return new autoComplete({
        selector: '#playbook-autocomplete',
        minChars: 0,
        cache:false,
        showByClick:false,
        menuClass:'playbook-autocomplete',
        renderItem: function(item, search)
        {
            return '<div class="autocomplete-suggestion" data-value="' + item.playbook + '" >' + item.playbook + '</div>';
        },
        onSelect: function(event, term, item)
        {
            $("#playbook-autocomplete").val($(item).text());
            //console.log('onSelect', term, item);
            //var value = $(item).attr('data-value');
        },
        source: function(term, response)
        {
            term = term.toLowerCase();

            var matches = []
            for(var i in pmTasks.model.itemslist.results)
            {
                var val=pmTasks.model.itemslist.results[i];
                if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
                {
                    matches.push(val)
                }
            }
            if(matches.length)
            {
                response(matches);
            }
        }
    });
}

pmTasksTemplates.model.page_list = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function() {  return "spajs.open({ menuId:'template/new-task'}); return false;" },
            title:'Create task template',
            link:function() { return '/?template/new-task'; }
        },
        {
            class:'btn btn-primary',
            function:function() { return "spajs.open({ menuId:'template/new-module'}); return false;" },
            title:'Create module template',
            link:function() { return '/?template/new-module'; }
        },
    ],
    actionsOnSelected:[
        {},
        {
            class:'btn btn-primary',
            function:function(){ return "pmTasksTemplates.exportSelecedToFile(); return false;"},
            title:'Export all selected templates',
            link:function(){ return '#'},
        },
    ],
    title: "Templates",
    short_title: "Templates",
    fileds:[
        {
            title:'Name',
            name:'name',
            value:function(item) {
                return '<a href="/?'+this.model.page_name+'/'+item.kind+'/'+item.id+'" class="item-name" onclick="return spajs.openURL(this.href);" >'+item.name+'</a>'
            }
        },
        {
            title:'Kind',
            name:'kind',
            style:function(item){ return 'style="width: 110px"'},
            class:function(item)
            {
                return 'class="hidden-xs hidden-sm"';
            },
            value:function(item)
            {
                return item.kind;
            }
        }
    ],
    actions:[
        {
            function:function(item, option_name){ return "spajs.showLoader(pmTemplates.model.kindObjects['"+item.kind+"'].execute("+item.id+" , '"+option_name +"')); return false;"},
            title:'Execute',
            link:function(){ return '#'}
        },
    ]
}

pmTasksTemplates.model.page_list_from_another_class = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(opt) { return "spajs.open({ menuId:'" + opt.parent_type + "/" + opt.parent_item + "/template/new-task'}); return false;" },
            title:'Create task template',
            link:function(opt)
            { return '/?project/' + opt.parent_item + '/templates/new-task'; },
        },
        {
            class:'btn btn-primary',
            function:function(opt) {  return "spajs.open({ menuId:'" + opt.parent_type + "/" + opt.parent_item + "/template/new-module'}); return false;"},
            title:'Create module template',
            link:function(opt) { return '/?' + opt.parent_type + '/' + opt.parent_item + '/templates/new-module';}
        },
    ],
    actionsOnSelected:[
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.showLoader(pmTasksTemplates.deleteRows($('.multiple-select .item-row.selected'))); return false;"},
            title:'Delete from this page',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.showLoader(pmTasksTemplates.deleteSelected()); return false;"},
            title:'Delete all selected elements',
            link:function(){ return '#'},
        },
        {
            class:'divider'
        },
        {
            class:'btn btn-primary',
            function:function(){ return "pmTasksTemplates.exportSelecedToFile(); return false;"},
            title:'Export all selected templates',
            link:function(){ return '#'},
        },
    ],
    title: "Templates",
    short_title: "Templates",
    fileds:[
        {
            title:'Name',
            name:'name',
            value:function(item, name, opt)
            {
                return '<a href="/?' + opt.parent_type + '/'+opt.parent_item+'/'+this.model.page_name+'/'+item.kind+'/'+item.id+'" class="item-name" onclick="return spajs.openURL(this.href);" >'+item.name+'</a>';
            }
        },
        {
            title:'Kind',
            name:'kind',
            style:function(item){ return 'style="width: 110px"'},
            class:function(item)
            {
                return 'class="hidden-xs hidden-sm"';
            },
            value:function(item)
            {
                return item.kind;
            }
        }
    ],
    actions:[
        {
            function:function(item, option_name){ return "spajs.showLoader(pmTemplates.model.kindObjects['"+item.kind+"'].execute("+item.id+" , '"+option_name +"')); return false;"},
            title:'Execute',
            link:function(){ return '#'}
        },
    ]
}

pmTasksTemplates.model.page_item = {
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
            return jsonEditor.editor(pmTasksTemplates.model.items[item_id].data.vars, {block:'playbook', title1:'Arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return "Task template "+this.model.items[item_id].justText('name')
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
            // @todo дорефакторить поля ввода
        ],
        [
            {
                filed: new pmTasksTemplates.filed.selectProjectInventoryAndPlaybook(),
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
    onBeforeSave:function(data, item_id)
    {
        data.kind = this.model.kind

        data.data = {
            inventory:pmTasksTemplates.inventoriesAutocompletefiled.getValue(),
            vars:jsonEditor.jsonEditorGetValues()
        }

        data.data.playbook = $("#playbook-autocomplete").val()
        data.data.project = $("#projects-autocomplete").val()/1

        return data;
    },
}

pmTasksTemplates.model.page_item_from_another_class = inheritance(pmTasksTemplates.model.page_item);

pmTasksTemplates.model.page_item_from_another_class['buttons'] = [
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

pmTasksTemplates.model.page_item_new_option = {
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
            function:function(item_id){ return 'spajs.showLoader(pmTasksTemplates.saveNewOption('+item_id+'));  return false;'},
            title:'Create',
            link:function(){ return '#'},
        }
    ],
    sections:[
        function(section, item_id){
            pmTasksTemplates.model.items[item_id].data.varsForOption={};
            return jsonEditor.editor(pmTasksTemplates.model.items[item_id].data.varsForOption, {block:'playbook', title1:'Arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return "New option for task template "+this.model.items[item_id].justText('name');
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
            // @todo дорефакторить поля ввода
        ],
        [
            {
                filed: new pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForNewOption(),
                name:'project',
            },
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    }
}


pmTasksTemplates.model.page_item_option = {
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
            function:function(item_id){ return 'spajs.showLoader(pmTasksTemplates.saveOption('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            title:'Save and execute',
            function:function(item_id){ return "spajs.showLoader(pmTasksTemplates.saveAndExecuteOption("+item_id+")); return false;"},
            link:function(){ return '#'},
            help:'Save and execute'
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){
                return 'spajs.showLoader(pmTasksTemplates.removeOption('+item_id+', "'+pmTasksTemplates.model.items[item_id].option_name+'"));  return false;'
            },
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        }
    ],
    sections:[
        function(section, item_id){
            pmTasksTemplates.model.items[item_id].data.varsForOption={};
            for(var i in pmTasksTemplates.model.items[item_id].dataForOption.vars)
            {
                pmTasksTemplates.model.items[item_id].data.varsForOption[i]=pmTasksTemplates.model.items[item_id].dataForOption.vars[i];
            }
            return jsonEditor.editor(pmTasksTemplates.model.items[item_id].data.varsForOption, {block:'module', title1:'Additional arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return 'Option '+pmTasksTemplates.model.items[item_id].option_name+' for task template '+this.model.items[item_id].justText('name');
    },
    short_title: function(item_id){
        return pmTasksTemplates.model.items[item_id].option_name;
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'option_name',
                placeholder:'Enter option name'
            }
            // @todo дорефакторить поля ввода
        ],[
            {
                filed: new pmTasksTemplates.filed.selectProjectInventoryAndPlaybookForOption(),
                name:'project',
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
pmTasksTemplates.saveOption = function(item_id)
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
        playbook:$("#playbook-autocomplete").val(),
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
                var project_and_id = pmTasksTemplates.defineProjectInUrl();
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
pmTasksTemplates.showNewOptionPage = function(holder, menuInfo, data)
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
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        thisObj.model.selectedProject = thisObj.model.items[item_id].data.project;
        if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
        {
            var project_name = pmProjects.model.items[project_id].name;
        }
        var tpl = 'new_option_page'
        if(!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
        def.resolve();
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

/**
 *Функция отрисовывает страницу для просмотра/редактирования уже существующей опции.
 */
pmTasksTemplates.showOptionPage = function(holder, menuInfo, data)
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
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        thisObj.model.items[item_id].optionsCopyForDelete = JSON.parse(JSON.stringify(thisObj.model.items[item_id].options));
        thisObj.model.selectedProject = thisObj.model.items[item_id].project;
        var project_name = undefined;
        if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
        {
            project_name = pmProjects.model.items[project_id].name;
        }

        pmTasksTemplates.model.items[item_id].option_name=option_name;
        pmTasksTemplates.model.items[item_id].dataForOption={};
        for(var i in pmTasksTemplates.model.items[item_id].data)
        {
            if(i!='vars')
            {
                pmTasksTemplates.model.items[item_id].dataForOption[i]=pmTasksTemplates.model.items[item_id].data[i];
            }
        }
        var optionAPI=pmTasksTemplates.model.items[item_id].options[pmTasksTemplates.model.items[item_id].option_name];
        for(var i in optionAPI)
        {
            if(pmTasksTemplates.model.items[item_id].dataForOption.hasOwnProperty(i))
            {
                pmTasksTemplates.model.items[item_id].dataForOption[i]=optionAPI[i];
            }
        }
        if(optionAPI.hasOwnProperty('vars'))
        {
            pmTasksTemplates.model.items[item_id].dataForOption['vars']={};
            for(var i in optionAPI['vars'])
            {
                pmTasksTemplates.model.items[item_id].dataForOption['vars'][i]=optionAPI['vars'][i];
            }
        }

        var tpl = 'module_option_page'
        if(!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
        def.resolve();
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmTasksTemplates.inventoriesAutocompletefiled = new pmInventories.filed.inventoriesAutocomplete()
pmTasksTemplates.showWidget = function(holder, kind)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    var ordering="-id";
    // return $.when(this.sendSearchQuery({kind:kind}, limit, offset, ordering)).done(function()
    // {
    $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_widget', {query:"", kind:kind}))
    // }).fail(function()
    // {
    //     $.notify("", "error");
    // }).promise()
}

pmTasksTemplates.showTaskWidget = function(holder)
{
    return pmTasksTemplates.showWidget(holder, "Task")
}

pmTasksTemplates.showModuleWidget = function(holder)
{
    return pmTasksTemplates.showWidget(holder, "Module")
}

pmTasksTemplates.showItem = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[1]
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id),
        pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        $.when(pmProjects.loadItem(thisObj.model.items[item_id].data.project)).done(function ()
        {
            thisObj.model.selectedProject = pmTasksTemplates.model.items[item_id].data.project

            var tpl = thisObj.model.name+'_page'
            if(!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_page'
            }

            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}}))
            pmTasksTemplates.selectProject($("#projects-autocomplete").val());
            def.resolve();
        }).fail(function () {
            $.notify("Error with loading of project data", "error");
        });
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmTasksTemplates.showItemFromProject = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = data.reg[1];
    var item_id = data.reg[2];
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id),
        pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        if(pmTasksTemplates.model.items[item_id].data.project != project_id)
        {
            $.notify("This template is not for this project", "error");
            def.reject();
            return def.promise();
        }
        $.when(pmProjects.loadItem(project_id)).done(function ()
        {
            thisObj.model.selectedProject = pmTasksTemplates.model.items[item_id].data.project;
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
                opt:{ parent_item: project_id, parent_type: pmProjects.model.page_name, back_link: 'project/'+project_id+'/templates', link_with_parents:'project/'+project_id }}))
            $("#projects-autocomplete").attr("disabled", "disabled");
            pmTasksTemplates.selectProject($("#projects-autocomplete").val());
            def.resolve();
        }).fail(function () {
            $.notify("Error with loading of project data", "error");
        });
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmTasksTemplates.selectProject = function(project_id){
    console.log("select project", project_id)
    $(".autocomplete-suggestion").hide()
    $(".playbook-project-"+project_id).show()
    pmTasksTemplates.model.selectedProject = project_id
}

pmTasksTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        if(pmProjects.model.itemslist.results.length != 0)
        {
            $.when(pmProjects.loadItem(pmProjects.model.itemslist.results[0].id)).done(function()
            {
                $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {opt:{}}))

                $("#inventories-autocomplete").select2({ width: '100%' });
                //$("#projects-autocomplete").select2({ width: '100%' });

                new autoComplete({
                    selector: '#playbook-autocomplete',
                    minChars: 0,
                    cache:false,
                    showByClick:false,
                    menuClass:'playbook-autocomplete',
                    renderItem: function(item, search)
                    {
                        var style = "";
                        if(thisObj.model.selectedProject != item.project)
                        {
                            style = "style='display:none'"
                        }
                        return '<div class="autocomplete-suggestion playbook-project-' + item.project + ' " '+style+' data-value="' + item.playbook + '" >' + item.playbook + '</div>';
                    },
                    onSelect: function(event, term, item)
                    {
                        $("#playbook-autocomplete").val($(item).text());
                        //console.log('onSelect', term, item);
                        //var value = $(item).attr('data-value');
                    },
                    source: function(term, response)
                    {
                        term = term.toLowerCase();

                        var matches = []
                        for(var i in pmTasks.model.itemslist.results)
                        {
                            var val=pmTasks.model.itemslist.results[i];
                            if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
                            {
                                matches.push(val)
                            }
                        }
                        if(matches.length)
                        {
                            response(matches);
                        }
                    }
                });
                pmTasksTemplates.selectProject($("#projects-autocomplete").val());
                def.resolve();
            }).fail(function(){
                $.notify("Error with loading of project data");
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_no_projects', {}))

            def.resolve();
        }

    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmTasksTemplates.showNewItemPageFromProject = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = data.reg[1];
    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        $.when(pmProjects.loadItem(project_id)).done(function()
        {
            var project_name = pmProjects.model.items[project_id].name;
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {opt:{project_id:project_id, project_name:project_name}}))
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

/**
 * @return $.Deferred
 * @todo дорефакторить форму создания Task template
 */
pmTasksTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    var inventory = pmTasksTemplates.inventoriesAutocompletefiled.getValue()

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        playbook:$("#playbook-autocomplete").val(),
        inventory:inventory,
        project:$("#projects-autocomplete").val(),
        vars:jsonEditor.jsonEditorGetValues()
    }


    if(!data.name)
    {
        console.warn("Invalid value in field name")
        $.notify("Invalid value in field name", "error");
        def.reject("Invalid value in field name")
        return def.promise();
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
    // Tasks Templates
    spajs.addMenu({
        id:"tasks",
        urlregexp:[/^templates$/, /^templates\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"tasks-search",
        urlregexp:[/^templates\/search\/([A-z0-9 %\-.:,=]+)$/, /^templates\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Task-item",
        urlregexp:[/^template\/Task\/([0-9]+)$/, /^templates\/Task\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showItem(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"task-new",
        urlregexp:[/^template\/new-task$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showNewItemPage(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-new-option",
        urlregexp:[/^template\/Task\/([0-9]+)\/new-option$/, /^templates\/Task\/([0-9]+)\/new-option$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/new-option$/, /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/new-option$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showNewOptionPage(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-option",
        urlregexp:[/^template\/Task\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Task\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showOptionPage(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-options",
        urlregexp:[/^template\/Task\/([0-9]+)\/options$/, /^templates\/Task\/([0-9]+)\/options$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/options$/, /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/options$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showOptionsList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-options-search",
        urlregexp:[/^template\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^template\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showOptionsSearchResult(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-periodic-tasks",
        urlregexp:[/^template\/Task\/([0-9]+)\/periodic-tasks$/, /^templates\/Task\/([0-9]+)\/periodic-tasks$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/periodic-tasks$/, /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/periodic-tasks$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showPeriodicTasksList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-new-periodic-task",
        urlregexp:[/^template\/Task\/([0-9]+)\/new-periodic-task$/, /^templates\/Task\/([0-9]+)\/new-periodic-task$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/new-periodic-task$/, /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/new-periodic-task$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showNewPeriodicTaskFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-periodic-task",
        urlregexp:[/^template\/Task\/([0-9]+)\/periodic-task\/([0-9]+)$/, /^templates\/Task\/([0-9]+)\/periodic-task\/([0-9]+)$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/periodic-task\/([0-9]+)$/, /^project\/([0-9]+)\/templates\/Task\/([0-9]+)\/periodic-task\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showPeriodicTaskPageFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-periodic-tasks-search",
        urlregexp:[/^template\/Task\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^template\/Task\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^project\/([0-9]+)\/template\/Task\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showSearchResultsFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"templates-of-project",
        urlregexp:[/^project\/([0-9]+)\/templates$/, /^project\/([0-9]+)\/templates\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showListForProject(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"templates-search-from-project",
        urlregexp:[/^project\/([0-9]+)\/templates\/search\/([A-z0-9 %\-.:,=]+)$/, /^project\/([0-9]+)\/templates\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showSearchResultsForProject(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"task-new-for-project",
        urlregexp:[/^project\/([0-9]+)\/template\/new-task$/, /^project\/([0-9]+)\/templates\/new-task$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showNewItemPageFromProject(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Task-item-from-project",
        urlregexp:[/^project\/([0-9]+)\/template\/Task\/([0-9]+)$/, /^project\/([0-9]+)\/templates\/Task\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showItemFromProject(holder, menuInfo, data);},
    })

})
