// 
//
///**
// *Функция сохраняет изменения в уже существующей опции.
// */
//pmTasksTemplates.saveOption = function(item_id)
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
//        playbook:$("#playbook-autocomplete").val(),
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
//                var project_and_id = pmTasksTemplates.defineProjectInUrl();
//                $.when(spajs.open({ menuId:project_and_id + "template/"+thisObj.model.kind+"/"+data.id+"/option/"+optionName})).always(function(){
//                    def.resolve();
//                });
//            },
//            error: function (e)
//            {
//                def.reject(e)
//                webGui.showErrors(e.responseJSON)
//            }
//        });
//    }
//    return def.promise();
//}
//
///**
// *Функция отрисовывает страницу для создания новой опции.
// */
//pmTasksTemplates.showNewOptionPage = function(holder, menuInfo, data)
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
//    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
//    {
//        thisObj.model.selectedProject = thisObj.model.items[item_id].data.project;
//        if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
//        {
//            var project_name = pmProjects.model.items[project_id].name;
//        }
//        var tpl = 'new_option_page'
//        if(!spajs.just.isTplExists(tpl))
//        {
//            tpl = 'items_page'
//        }
//
//        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
//        def.resolve();
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
//pmTasksTemplates.showOptionPage = function(holder, menuInfo, data)
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
//    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
//    {
//        thisObj.model.items[item_id].optionsCopyForDelete = JSON.parse(JSON.stringify(thisObj.model.items[item_id].options));
//        thisObj.model.selectedProject = thisObj.model.items[item_id].project;
//        var project_name = undefined;
//        if(project_id !== undefined && pmProjects.model.items[project_id] !== undefined)
//        {
//            project_name = pmProjects.model.items[project_id].name;
//        }
//
//        pmTasksTemplates.model.items[item_id].option_name=option_name;
//        pmTasksTemplates.model.items[item_id].dataForOption={};
//        for(var i in pmTasksTemplates.model.items[item_id].data)
//        {
//            if(i!='vars')
//            {
//                pmTasksTemplates.model.items[item_id].dataForOption[i]=pmTasksTemplates.model.items[item_id].data[i];
//            }
//        }
//        var optionAPI=pmTasksTemplates.model.items[item_id].options[pmTasksTemplates.model.items[item_id].option_name];
//        for(var i in optionAPI)
//        {
//            if(pmTasksTemplates.model.items[item_id].dataForOption.hasOwnProperty(i))
//            {
//                pmTasksTemplates.model.items[item_id].dataForOption[i]=optionAPI[i];
//            }
//        }
//        if(optionAPI.hasOwnProperty('vars'))
//        {
//            pmTasksTemplates.model.items[item_id].dataForOption['vars']={};
//            for(var i in optionAPI['vars'])
//            {
//                pmTasksTemplates.model.items[item_id].dataForOption['vars'][i]=optionAPI['vars'][i];
//            }
//        }
//
//        var tpl = 'module_option_page'
//        if(!spajs.just.isTplExists(tpl))
//        {
//            tpl = 'items_page'
//        }
//
//        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{project_id:project_id, project_name:project_name}}))
//        def.resolve();
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//
//    return def.promise()
//}
//
//pmTasksTemplates.inventoriesAutocompletefield = new pmInventories.field.inventoriesAutocomplete()
//pmTasksTemplates.showWidget = function(holder, kind)
//{
//    var thisObj = this;
//    var offset = 0
//    var limit = this.pageSize;
//    var ordering="-id";
//    // return $.when(this.sendSearchQuery({kind:kind}, limit, offset, ordering)).done(function()
//    // {
//    $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_widget', {query:"", kind:kind}))
//    // }).fail(function()
//    // {
//    //     $.notify("", "error");
//    // }).promise()
//}
//
//pmTasksTemplates.showTaskWidget = function(holder)
//{
//    return pmTasksTemplates.showWidget(holder, "Task")
//}
//
//pmTasksTemplates.showModuleWidget = function(holder)
//{
//    return pmTasksTemplates.showWidget(holder, "Module")
//}
//
//pmTasksTemplates.showItem = function(holder, menuInfo, data)
//{
//    setActiveMenuLi();
//    var def = new $.Deferred();
//    var thisObj = this;
//    var item_id = data.reg[1]
//    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id),
//        pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
//    {
//        $.when(pmProjects.loadItem(thisObj.model.items[item_id].data.project)).done(function ()
//        {
//            thisObj.model.selectedProject = pmTasksTemplates.model.items[item_id].data.project
//
//            var tpl = thisObj.model.name+'_page'
//            if(!spajs.just.isTplExists(tpl))
//            {
//                tpl = 'items_page'
//            }
//
//            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}}))
//            pmTasksTemplates.selectProject($("#projects-autocomplete").val());
//            def.resolve();
//        }).fail(function () {
//            $.notify("Error with loading of project data", "error");
//        });
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//
//    return def.promise()
//}
//
//pmTasksTemplates.showItemFromProject = function(holder, menuInfo, data)
//{
//    setActiveMenuLi();
//    var def = new $.Deferred();
//    var thisObj = this;
//    var project_id = data.reg[1];
//    var item_id = data.reg[2];
//    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id),
//        pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
//    {
//        if(pmTasksTemplates.model.items[item_id].data.project != project_id)
//        {
//            $.notify("This template is not for this project", "error");
//            def.reject();
//            return def.promise();
//        }
//        $.when(pmProjects.loadItem(project_id)).done(function ()
//        {
//            thisObj.model.selectedProject = pmTasksTemplates.model.items[item_id].data.project;
//            var project_name = pmProjects.model.items[project_id].name;
//            thisObj.model.parentObjectsData = [
//                {
//                    item_name: project_name,
//                    parent_item: project_id,
//                    parent_type: pmProjects.model.page_name,
//                    parent_type_plural: pmProjects.model.name
//                }
//            ];
//            thisObj.model.itemsForParent = {};
//            thisObj.model.itemsForParent[item_id] = thisObj.model.items[item_id];
//            var tpl = thisObj.model.name + '_page_from_another_class';
//            if (!spajs.just.isTplExists(tpl))
//            {
//                tpl = 'items_page_from_another_class';
//            }
//
//            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj,
//                opt:{ parent_item: project_id, parent_type: pmProjects.model.page_name, back_link: 'project/'+project_id+'/templates', link_with_parents:'project/'+project_id }}))
//            $("#projects-autocomplete").attr("disabled", "disabled");
//            pmTasksTemplates.selectProject($("#projects-autocomplete").val());
//            def.resolve();
//        }).fail(function () {
//            $.notify("Error with loading of project data", "error");
//        });
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//
//    return def.promise()
//}
//
//pmTasksTemplates.selectProject = function(project_id){
//    console.log("select project", project_id)
//    $(".autocomplete-suggestion").hide()
//    $(".playbook-project-"+project_id).show()
//    pmTasksTemplates.model.selectedProject = project_id
//}
//
//pmTasksTemplates.showNewItemPage = function(holder, menuInfo, data)
//{
//    setActiveMenuLi();
//    var def = new $.Deferred();
//    var thisObj = this;
//    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
//    {
//        if(pmProjects.model.itemslist.results.length != 0)
//        {
//            $.when(pmProjects.loadItem(pmProjects.model.itemslist.results[0].id)).done(function()
//            {
//                $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {opt:{}}))
//
//                $("#inventories-autocomplete").select2({ width: '100%' });
//                //$("#projects-autocomplete").select2({ width: '100%' });
//
//                new autoComplete({
//                    selector: '#playbook-autocomplete',
//                    minChars: 0,
//                    cache:false,
//                    showByClick:false,
//                    menuClass:'playbook-autocomplete',
//                    renderItem: function(item, search)
//                    {
//                        var style = "";
//                        if(thisObj.model.selectedProject != item.project)
//                        {
//                            style = "style='display:none'"
//                        }
//                        return '<div class="autocomplete-suggestion playbook-project-' + item.project + ' " '+style+' data-value="' + item.playbook + '" >' + item.playbook + '</div>';
//                    },
//                    onSelect: function(event, term, item)
//                    {
//                        $("#playbook-autocomplete").val($(item).text());
//                        //console.log('onSelect', term, item);
//                        //var value = $(item).attr('data-value');
//                    },
//                    source: function(term, response)
//                    {
//                        term = term.toLowerCase();
//
//                        var matches = []
//                        for(var i in pmTasks.model.itemslist.results)
//                        {
//                            var val=pmTasks.model.itemslist.results[i];
//                            if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
//                            {
//                                matches.push(val)
//                            }
//                        }
//                        if(matches.length)
//                        {
//                            response(matches);
//                        }
//                    }
//                });
//                pmTasksTemplates.selectProject($("#projects-autocomplete").val());
//                def.resolve();
//            }).fail(function(){
//                $.notify("Error with loading of project data");
//            });
//        }
//        else
//        {
//            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_no_projects', {}))
//
//            def.resolve();
//        }
//
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//
//    return def.promise()
//}
//
//pmTasksTemplates.showNewItemPageFromProject = function(holder, menuInfo, data)
//{
//    setActiveMenuLi();
//    var def = new $.Deferred();
//    var thisObj = this;
//    var project_id = data.reg[1];
//    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
//    {
//        $.when(pmProjects.loadItem(project_id)).done(function()
//        {
//            var project_name = pmProjects.model.items[project_id].name;
//            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {opt:{project_id:project_id, project_name:project_name}}))
//            def.resolve();
//        }).fail(function(){
//            $.notify("Error with loading of project data", "error");
//        });
//    }).fail(function(e)
//    {
//        def.reject(e);
//    })
//    return def.promise()
//} 