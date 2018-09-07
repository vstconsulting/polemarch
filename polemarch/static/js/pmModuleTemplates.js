// 
//
///**
// *Функция сохраняет изменения в уже существующей опции.
// */
//pmModuleTemplates.saveOption = function(item_id)
//{
//    var optionName=$('#field_option_name').val();
//    optionName=optionName.trim();
//    optionName=optionName.replace( /\s/g, "-" );
//    var def = new $.Deferred();
//    if(optionName=="")
//    {
//        $.notify("Option name is empty", "error");
//        def.reject({text:"Option name is empty"});
//        return def.promise();
//    }
//    var templateData=this.model.items[item_id].data;
//    var optionData= {
//        module:moduleArgsEditor.getSelectedModuleName(),
//        //inventory:+pmModuleTemplates.inventoriesAutocompletefield.getValue(),
//        //project:+$("#projects-autocomplete").val(),
//        group:pmGroups.getGroupsAutocompleteValue(),
//        args:moduleArgsEditor.getModuleArgs(),
//        vars:jsonEditor.jsonEditorGetValues(),
//    };
//    var dataToAdd={};
//    for(var i in optionData)
//    {
//        for (var j in templateData)
//        {
//            if(i==j && i!='vars')
//            {
//                if(optionData[i]!=templateData[j])
//                {
//                    dataToAdd[i]=optionData[i];
//                }
//            }
//        }
//    }
//
//    if(!($.isEmptyObject(optionData['vars'])))
//    {
//        for(var i in templateData['vars'])
//        {
//            if(optionData['vars'].hasOwnProperty(i))
//            {
//                $.notify('Template has already argument "'+i+'" ', "error");
//                def.reject({text:"Option is the same as the template"});
//                return def.promise();
//            }
//        }
//        dataToAdd['vars']=optionData['vars'];
//    }
//
//
//    if($.isEmptyObject(dataToAdd))
//    {
//        $.notify("Option is absolutely the same as the template", "error");
//        def.reject({text:"Option is the same as the template"});
//        return def.promise();
//    }
//    else
//    {
//        var dataToAdd1={options:{}};
//        dataToAdd1.options=this.model.items[item_id].options;
//        if(dataToAdd1.options.hasOwnProperty(optionName))
//        {
//            delete dataToAdd1.options[optionName];
//        }
//        else
//        {
//            var linkPartArr=window.location.href.split("/");
//            var previousNameOfOption=linkPartArr[linkPartArr.length-1];
//            delete dataToAdd1.options[previousNameOfOption];
//        }
//        dataToAdd1.options[optionName]=dataToAdd;
//        var thisObj = this;
//        spajs.ajax.Call({
//            url: hostname + "/api/v2/" + this.model.name + "/" + item_id + "/",
//            type: "PATCH",
//            contentType: 'application/json',
//            data: JSON.stringify(dataToAdd1),
//            success: function (data)
//            {
//                thisObj.model.items[item_id] = data
//                $.notify('Option "'+optionName+'" was successfully saved', "success");
//                var project_and_id = thisObj.defineProjectInUrl();
//                $.when(spajs.open({ menuId:project_and_id + "template/"+thisObj.model.kind+"/"+data.id+"/option/"+optionName})).always(function(){
//                    def.resolve();
//                });
//            },
//            error: function (e)
//            {
//                def.reject(e)
//                polemarch.showErrors(e.responseJSON)
//            }
//        });
//    }
//    return def.promise();
//}
//
//
///**
// *Функция отрисовывает страницу для создания новой опции.
// */
//pmModuleTemplates.showNewOptionPage = function(holder, menuInfo, data)
//{
//    var def = new $.Deferred();
//    var thisObj = this;
//    var item_id = undefined;
//    var project_id = undefined;
//    if(data.reg[2] !== undefined)
//    {
//        project_id = data.reg[1];
//        item_id = data.reg[2];
//    }
//    else
//    {
//        item_id = data.reg[1];
//    }
//    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
//    {
//        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
//        {
//            var tpl = 'new_option_page'
//            if(!spajs.just.isTplExists(tpl))
//            {
//                tpl = 'items_page'
//            }
//
//            if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
//            {
//                var project_name = pmProjects.model.items[project_id].name;
//            }
//
//            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
//            def.resolve();
//        });
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//
//    return def.promise()
//}
//
///**
// *Функция отрисовывает страницу для просмотра/редактирования уже существующей опции.
// */
//pmModuleTemplates.showOptionPage = function(holder, menuInfo, data)
//{
//    var def = new $.Deferred();
//    var thisObj = this;
//    var project_id = undefined;
//    var item_id = data.reg[1];
//    var option_name=data.reg[2];
//    if(data.reg[3] !== undefined)
//    {
//        project_id = data.reg[1];
//        item_id = data.reg[2];
//        option_name = data.reg[3];
//    }
//    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
//    {
//        thisObj.model.items[item_id].optionsCopyForDelete = JSON.parse(JSON.stringify(thisObj.model.items[item_id].options));
//        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
//        {
//            var project_name = undefined;
//            if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
//            {
//                project_name = pmProjects.model.items[project_id].name;
//            }
//            pmModuleTemplates.model.items[item_id].option_name=option_name;
//            pmModuleTemplates.model.items[item_id].dataForOption={};
//            for(var i in pmModuleTemplates.model.items[item_id].data)
//            {
//                if(i!='vars')
//                {
//                    pmModuleTemplates.model.items[item_id].dataForOption[i]=pmModuleTemplates.model.items[item_id].data[i];
//                }
//            }
//            var optionAPI=pmModuleTemplates.model.items[item_id].options[pmModuleTemplates.model.items[item_id].option_name];
//            for(var i in optionAPI)
//            {
//                if(pmModuleTemplates.model.items[item_id].dataForOption.hasOwnProperty(i))
//                {
//                    pmModuleTemplates.model.items[item_id].dataForOption[i]=optionAPI[i];
//                }
//            }
//            if(optionAPI.hasOwnProperty('vars'))
//            {
//                pmModuleTemplates.model.items[item_id].dataForOption['vars']={};
//                for(var i in optionAPI['vars'])
//                {
//                    pmModuleTemplates.model.items[item_id].dataForOption['vars'][i]=optionAPI['vars'][i];
//                }
//            }
//
//            var tpl = 'module_option_page'
//            if(!spajs.just.isTplExists(tpl))
//            {
//                tpl = 'items_page'
//            }
//
//            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
//            def.resolve();
//        });
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//
//    return def.promise()
//}
 