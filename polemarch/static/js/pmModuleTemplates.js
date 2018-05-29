
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
            function:function(item_id){
                return "spajs.open({ menuId:'template/"+this.model.kind+"/"+item_id+"/options'}); return false;"
            },
            title:'Options',
            link:function(){ return '#'},
            help:'Options of this template'
        },
        {
            class:'btn btn-info',
            function:function(item_id){
                return "spajs.open({ menuId:'template/"+this.model.kind+"/"+item_id+"/periodic-tasks'}); return false;"
            },
            title:'Periodic tasks',
            link:function(){ return '#'},
            help:'Periodic tasks linked to this template'
        },
        {
            class:'btn btn-info',
            function:function(){ return 'return spajs.openURL(this.href);'},
            title:'History',
            link:function(item_id){ return polemarch.opt.host +'/?template/'+this.model.kind+'/'+ item_id + '/history'},
            help:'Template execution history'
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


pmModuleTemplates.model.page_item_new_option = {
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


pmModuleTemplates.saveAndExecute = function(item_id)
{
    var def = new $.Deferred();
    $.when(this.updateItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.execute(item_id)).always(function(){
            def.resolve();
        })
    }).fail(function(e){
        def.reject(e);
    })
    return def.promise()
}

/**
 *Функция открывает страницу для создания новой опции.
 */
pmModuleTemplates.setNewOption = function(item_id)
{
    return spajs.open({ menuId:"template/"+this.model.kind+"/"+item_id+"/new-option"});
}

/**
 *Функция сохраняет новую опцию.
 */
pmModuleTemplates.saveNewOption = function(item_id)
{
    var def = new $.Deferred();
    var optionName=$('#filed_option_name').val();
    optionName=optionName.trim();
    optionName=optionName.replace( /\s/g, "-" );
    var templateOptionList=this.model.items[item_id].options_list;
    for (var i=0; i<templateOptionList.length; i++)
    {
        if(templateOptionList[i]==optionName)
        {
            $.notify("Option with this name already exists", "error");
            def.reject({text:"Option with this name already exists"});
            return def.promise();
        }
    }

    return pmModuleTemplates.saveOption(item_id);
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
                $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id+"/option/"+optionName})).always(function(){
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
 *Функция сохраняет изменения в уже существующей опции
 *и запускает выполнение шаблона с этой опцией.
 */
pmModuleTemplates.saveAndExecuteOption = function(item_id)
{
    var def = new $.Deferred();
    $.when(pmModuleTemplates.saveOption(item_id)).done(function()
    {
        pmTemplates.model.kindObjects['Module'].execute(item_id, pmModuleTemplates.model.items[item_id].option_name);
        def.resolve();
    }).fail(function(e)
    {
        def.reject(e);
        polemarch.showErrors(e.responseJSON);
    }).promise();

    return def.promise();
}

/**
 *Функция отрисовывает страницу для создания новой опции.
 */
pmModuleTemplates.showNewOptionPage = function(holder, menuInfo, data)
{
    var item_id = data.reg[1];
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
        {
            var tpl = 'new_option_page'
            if(!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_page'
            }

            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}}))
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
    var item_id = data.reg[1];
    var option_name=data.reg[2];
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
        {
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

            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}}))
            def.resolve();
        });
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

/**
 *Функция удаляет опцию.
 */
pmModuleTemplates.removeOption = function(item_id, option_name)
{
    var def = new $.Deferred();
    var optionName=option_name;
    delete pmModuleTemplates.model.items[item_id].options[optionName];
    var dataToAdd1={options:{}};
    dataToAdd1['options']=pmModuleTemplates.model.items[item_id].options;
    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(dataToAdd1),
        success: function (data)
        {
            thisObj.model.items[item_id] = data
            $.notify('Option "'+optionName+'" was successfully deleted', "success");
            if(/options/.test(window.location.href) == false)
            {
                $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id+"/options"})).always(function(){
                    def.resolve();
                });
            }
            else
            {
                def.resolve();
            }
        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    });
    return def.promise();
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
            $.notify("Error with loading of project data");
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
                $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

                $("#inventories-autocomplete").select2({ width: '100%' });
                $("#projects-autocomplete").select2({ width: '100%' });

                def.resolve();
            }).fail(function(){
                $.notify("Error with loading of project data");
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

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
            $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id})).always(function(){
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

/**
 * Функция предназначена для загрузки всех периодических тасок,
 * ссылающихся на данный шаблон.
 * @param number template_id - id of template
 */
pmModuleTemplates.loadLinkedPeriodicTasks = function(template_id)
{
    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/periodic-tasks/",
        type: "GET",
        contentType: 'application/json',
        data: "template="+template_id,
        success: function (data)
        {
            // thisObj.model.linkedPeriodicTask = [];
            // thisObj.model.linkedPeriodicTasks = data.results;
            pmPeriodicTasks.model.itemslist = data
            pmPeriodicTasks.model.items = {}

            for (var i in data.results)
            {
                var val = pmPeriodicTasks.afterItemLoad(data.results[i])
                pmPeriodicTasks.model.items.justWatch(val.id);
                pmPeriodicTasks.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)
            }
        },
        error: function (e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

/**
 * Функция открывает страницу со списком опций шаблона
 */
pmModuleTemplates.showOptionsList = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var offset = 0
    var limit = thisObj.pageSize;
    if (data.reg && data.reg[1] > 0)
    {
        offset = thisObj.pageSize * (data.reg[1] - 1);
    }
    return $.when(thisObj.loadItem(data.reg[1])).done(function ()
    {
        var tpl = 'template_options_list'

        $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj, item_id:data.reg[1], opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    })
}

/**
 * Функция выделяет/снимает выделение с опций в таблице списка опций.
 * @param {array} elements - массив выделенных элементов
 * @param {boolean} mode - true - добавить выделение, false - снять выделение
 * @param {string} div_id - id блока, в котором находятся данные элементы
 */
pmModuleTemplates.toggleSelectAllOptions = function (elements, mode, div_id)
{
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row'))
        {
            $(elements[i]).toggleClass('selected', mode);
        }
    }
    pmModuleTemplates.countSelectedOptions(div_id);
}

/**
 * Функция выделяет/снимает выделение с одного конкретного элемента в определенной таблице.
 * В данном случае в таблице со списком опций.
 * @param {object} thisEl - конкретный элемент
 * @param {string} div_id - id блока, в котором находится данный элемент
 */
pmModuleTemplates.toggleSelectOption = function (thisEl, div_id)
{
    $(thisEl).parent().toggleClass('selected');
    pmModuleTemplates.countSelectedOptions(div_id);
}

/**
 * Функция подсчитывает количество выделенных элементов в определенной таблице элементов.
 * И запоминает данное число в pmModuleTemplates.model.selectedOptionsCount,
 * а сами элементы в pmModuleTemplates.model.selectedOptions.
 * В зависимости от нового значения pmModuleTemplates.model.selectedOptionsCount
 * часть кнопок отображается либо скрывается.
 * @param {string} div_id - id блока, в котором находятся данные элементы
 */
pmModuleTemplates.countSelectedOptions = function (div_id)
{
    var elements=$("#"+div_id+"_table tr");
    var count=0;
    pmModuleTemplates.model.selectedOptions = [];
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row') && $(elements[i]).hasClass('selected'))
        {
            count+=1;
            pmModuleTemplates.model.selectedOptions.push($(elements[i]).attr('data-id'));
        }
    }

    if(count==0)
    {
        $($("#"+div_id+" .actions_button")[0]).addClass("hide");
    }
    else
    {
        $($("#"+div_id+" .actions_button")[0]).removeClass("hide");
    }
    pmModuleTemplates.model.selectedOptionsCount=count;
}

/**
 *Функция удаляет все выделенные опции.
 */
pmModuleTemplates.removeSelectedOptions = function(item_id, option_names)
{
    var def = new $.Deferred();
    for(var i in option_names)
    {
        var optionName=option_names[i];
        delete pmModuleTemplates.model.items[item_id].options[optionName];
    }
    var dataToAdd1={options:{}};
    dataToAdd1['options']=pmModuleTemplates.model.items[item_id].options;
    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(dataToAdd1),
        success: function (data)
        {
            thisObj.model.items[item_id] = data
            $.notify('Options were successfully deleted', "success");
            def.resolve();
        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    });
    return def.promise();
}

/**
 *Функция открывает список периодических тасок, созданных на основе данного шаблона.
 */
pmModuleTemplates.showPeriodicTasksList = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var offset = 0
    var limit = thisObj.pageSize;
    if (data.reg && data.reg[1] > 0)
    {
        offset = thisObj.pageSize * (data.reg[1] - 1);
    }
    var template_id = data.reg[1];
    return $.when(thisObj.loadItem(template_id), thisObj.loadLinkedPeriodicTasks(template_id)).done(function ()
    {
        var tpl = 'linked-to-template-periodic-tasks_list';
        var project_id = thisObj.model.items[template_id].data.project;

        $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj, project_id:project_id, item_id:template_id, opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    })
}

/**
 *Функция открывает страницу создания новой периодической таски для шаблона.
 */
pmModuleTemplates.showNewPeriodicTaskFromTemplate = function (holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[1]
    $.when(thisObj.loadItem(item_id), pmInventories.loadAllItems()).done(function()
    {
        var project_id = thisObj.model.items[item_id].data.project
        pmPeriodicTasks.model.newitem = {type:'INTERVAL', kind:'TEMPLATE'}
        var tpl = 'from-template-periodic-tasks_new_page'
        if(!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, project_id:project_id, pmObj:thisObj, opt:{}}))
        def.resolve();
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()

}


/**
 * Функция рендерит шаблон для поля поиска на странице списка опций шаблона.
 */
pmModuleTemplates.searchFiledForTemplateOptions = function (options)
{
    options.className = this.model.className;
    this.model.searchAdditionalData = options
    return spajs.just.render('searchFiledForTemplateOptions', {opt: options});
}

/**
 * Функция для поиска опций на странице списка опций шаблона.
 */
pmModuleTemplates.searchTemplateOptions = function (query, options)
{
    if (this.isEmptySearchQuery(query))
    {
        return spajs.open({menuId: 'template/Module/' + options.template_id +'/options', reopen: true});
    }

    return spajs.open({menuId: 'template/Module/' + options.template_id +'/options' + '/search/' + this.searchObjectToString(trim(query)), reopen: true});
}

/**
 * Функция показывает результаты поиска опций шаблона.
 */
pmModuleTemplates.showOptionsSearchResult = function (holder, menuInfo, data)
{

    setActiveMenuLi();
    var thisObj = this;
    var template_id = data.reg[1];
    var search = this.searchStringToObject(decodeURIComponent(data.reg[2]))

    return $.when(thisObj.loadItem(data.reg[1])).done(function ()
    {
        var unvalidSearchOptions = [];
        for (var i in thisObj.model.items[template_id].options_list)
        {
            var option_name = thisObj.model.items[template_id].options_list[i];
            if(option_name.match(search.name) == null)
            {
                unvalidSearchOptions.push(option_name);
                delete thisObj.model.items[template_id].options_list[i];
            }
        }

        for(var i in unvalidSearchOptions)
        {
            delete thisObj.model.items[template_id].options[unvalidSearchOptions[i]];
        }

        var tpl = 'template_options_list';

        $(holder).insertTpl(spajs.just.render(tpl, {query:decodeURIComponent(search.name), pmObj: thisObj, item_id:template_id, opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    })
}


tabSignal.connect("polemarch.start", function()
{
    spajs.addMenu({
        id:"Module-new-option",
        urlregexp:[/^template\/Module\/([0-9]+)\/new-option$/, /^templates\/Module\/([0-9]+)\/new-option$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewOptionPage(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"Module-option",
        urlregexp:[/^template\/Module\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/, /^templates\/Module\/([0-9]+)\/option\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showOptionPage(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"Module-options",
        urlregexp:[/^template\/Module\/([0-9]+)\/options$/, /^templates\/Module\/([0-9]+)\/options$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showOptionsList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-options-search",
        urlregexp:[/^template\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^template\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/,
            /^templates\/Module\/([0-9]+)\/options\/search\/([A-z0-9 %\-.:,=]+)$/],
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
        urlregexp:[/^template\/Module\/([0-9]+)\/periodic-tasks/, /^templates\/Module\/([0-9]+)\/periodic-tasks/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showPeriodicTasksList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-new-periodic-task",
        urlregexp:[/^template\/Module\/([0-9]+)\/new-periodic-task/, /^templates\/Module\/([0-9]+)\/new-periodic-task/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewPeriodicTaskFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-periodic-task",
        urlregexp:[/^template\/Module\/([0-9]+)\/periodic-task\/([0-9]+)/, /^templates\/Module\/([0-9]+)\/periodic-task\/([0-9]+)/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showPeriodicTaskPageFromTemplate(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"Module-periodic-tasks-search",
        urlregexp:[/^template\/Module\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)$/, /^template\/Module\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showSearchResultsFromTemplate(holder, menuInfo, data);}
    })

})
