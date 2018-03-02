
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
                return "spajs.showLoader("+this.model.className+".setNewOption("+item_id+")); return false;"
            },
            title:'Create new option',
            link:function(){ return '#'},
            help:'Create new option'
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
        },
        function(section, item_id){
            return spajs.just.render("options_section", {item_id:item_id})
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
        ],[
            {
                filed: new pmModuleTemplates.filed.selectProjectInventoryGroupAndModule(),
                name:'inventory',
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
            function:function(item_id){ return 'spajs.showLoader(pmModuleTemplates.saveOption('+item_id+'));  return false;'},
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
                return 'spajs.showLoader(pmModuleTemplates.removeOption('+item_id+'));  return false;'
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

pmModuleTemplates.setNewOption = function(item_id)
{
    return spajs.openURL(window.location.href+"/new-option");
}

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
        dataToAdd1.options[optionName]=dataToAdd;
        var thisObj = this;
        spajs.ajax.Call({
            url: "/api/v1/" + this.model.name + "/" + item_id + "/",
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

pmModuleTemplates.removeOption = function(item_id)
{
    var def = new $.Deferred();
    var optionName=pmModuleTemplates.model.items[item_id].option_name;
    delete pmModuleTemplates.model.items[item_id].options[optionName];
    var dataToAdd1={options:{}};
    dataToAdd1['options']=pmModuleTemplates.model.items[item_id].options;
    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(dataToAdd1),
        success: function (data)
        {
            thisObj.model.items[item_id] = data
            $.notify('Option "'+optionName+'" was successfully deleted', "success");
            $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id})).always(function(){
                def.resolve();
            });

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
    var item_id = data.reg[1];
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
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
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise()
}

pmModuleTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

        $("#inventories-autocomplete").select2({ width: '100%' });
        $("#projects-autocomplete").select2({ width: '100%' });

        def.resolve();
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

    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/templates/",
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
        id:"Module-item",
        urlregexp:[/^template\/Module\/([0-9]+)$/, /^templates\/Module\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showItem(holder, menuInfo, data);},
    })

    spajs.addMenu({
        id:"module-new",
        urlregexp:[/^template\/new-module$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewItemPage(holder, menuInfo, data);}
    })

})