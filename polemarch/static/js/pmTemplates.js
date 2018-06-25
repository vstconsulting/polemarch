
var pmTemplates = inheritance(pmItems)

pmTemplates.model.name = "templates"


// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTemplates.model.kind = "Task,Module"
pmTemplates.model.page_name = "templates"
pmTemplates.model.bulk_name = "template"
pmTemplates.model.className = "pmTemplates"

pmTemplates.copyAndEdit = function (item_id, back_link)
{
    var def = new $.Deferred();
    var thisObj = this;

    if (!item_id)
    {
        throw "Error in pmTemplates.copyAndEdit with item_id = `" + item_id + "`"
    }

    if(!back_link)
    {
        back_link =  thisObj.model.page_name + "/" + thisObj.model.items[item_id].kind;
    }

    $.when(this.copyItem(item_id)).done(function (newItemId)
    {
        $.when(spajs.open({menuId: back_link + "/" + newItemId})).done(function () {
            $.notify("Item was duplicate", "success");
            def.resolve()
        }).fail(function (e) {
            $.notify("Error in duplicate item", "error");
            polemarch.showErrors(e)
            def.reject(e)
        })
    }).fail(function (e) {
        def.reject(e)
    })

    return def.promise();
}

pmTemplates.execute = function (item_id, option)
{
    if(!option || option=="[object Object]")
    {
        option={};
    }
    else
    {
        option={"option": option};
    }
    var def = new $.Deferred();
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/execute/",
        type: "POST",
        data: JSON.stringify(option),
        contentType: 'application/json',
        success: function (data)
        {
            $.notify("Started", "success");
            if (data && data.history_id)
            {
                $.when(spajs.open({menuId: "history/" + data.history_id})).done(function () {
                    def.resolve()
                }).fail(function (e) {
                    def.reject(e)
                })
            } else
            {
                def.reject({text: "No history_id", status: 500})
            }
        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    })

    return def.promise();
}


// Содержит соответсвия разных kind к объектами с ними работающими.
pmTemplates.model.kindObjects = {}


pmTemplates.exportToFile = function (item_ids)
{
    var def = new $.Deferred();
    if (!item_ids)
    {
        $.notify("No data for export", "error");
        def.reject("No data for export");
        return def.promise();
    }

    var data = {
        "filter": {
            "id__in": item_ids,
        },
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/filter/?detail=1",
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (data)
        {
            var filedata = []
            for (var i in data.results)
            {
                var val = data.results[i]
                delete val['id'];
                delete val['url'];

                filedata.push({
                    item: thisObj.model.page_name,
                    data: val
                })
            }

            var fileInfo = {
                data: filedata,
                count: filedata.length,
                version: "1"
            }

            var textFileAsBlob = new Blob([JSON.stringify(fileInfo)], {
                type: 'text/plain'
            });

            var newLink = document.createElement('a')
            newLink.href = window.URL.createObjectURL(textFileAsBlob)
            newLink.download = thisObj.model.name + "-" + Date() + ".json"
            newLink.target = "_blanl"
            var event = new MouseEvent("click");
            newLink.dispatchEvent(event);


            def.resolve();
        },
        error: function (e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject(e);
        }
    });

    return def.promise();
}

pmTemplates.importFromFile = function (files_event, project_id)
{
    var def = new $.Deferred();
    this.model.files = files_event

    for (var i = 0; i < files_event.target.files.length; i++)
    {
        var t1 = $(".input-file")[0].files[0];
        var fileParts = t1.name.split(".");
        var fileExt = fileParts[fileParts.length - 1].toLowerCase();
        var fileSize = t1.size;
        if (fileExt == "txt" || fileExt == "json")
        {
            if (fileSize <= 2000000) {
                var reader = new FileReader();
                reader.onload = (function (index_in_files_array)
                {
                    return function (e)
                    {
                        console.log(e)
                        var bulkdata = []
                        try
                        {
                            var filedata = JSON.parse(e.target.result);
                            if (filedata.version / 1 > 1)
                            {
                                polemarch.showErrors("Error file version is " + filedata.version)
                                def.reject({text: "Error file version is " + filedata.version});
                                return;
                            }

                            for (var i in filedata.data)
                            {
                                var val = filedata.data[i]
                                val.data.data.project = project_id
                                val.type = "add"
                                bulkdata.push(val)
                            }
                            console.log(bulkdata)

                            spajs.ajax.Call({
                                url: hostname + "/api/v1/_bulk/",
                                type: "POST",
                                contentType: 'application/json',
                                data: JSON.stringify(bulkdata),
                                success: function (data)
                                {
                                    def.resolve();
                                    $.notify("JSON-file was imported", "success");
                                    spajs.openURL(window.location.href);
                                },
                                error: function (e)
                                {
                                    console.warn(e)
                                    polemarch.showErrors(e)
                                    def.reject(e);
                                }
                            });
                        } catch (e)
                        {
                            $.notify("Invalid/incorrect JSON-file", "error");
                            def.reject();
                        }
                    };
                })(i);
                reader.readAsText(files_event.target.files[i]);
            } else
            {
                $.notify("File's size has to be less, than 2MB", "error");
                def.reject();
            }

        } else
        {
            $.notify("File has to be .txt or .json format", "error");
            def.reject();
        }
        // Нет поддержки загрузки более одного файла за раз.
        break;
    }

    return def.promise();
}

pmTemplates.saveAndExecute = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(thisObj.updateItem(item_id)).done(function()
    {
        $.when(thisObj.execute(item_id)).always(function(){
            def.resolve();
        })
    }).fail(function(e){
        def.reject(e);
    })
    return def.promise()
}

/**
 *Функция сохраняет новую опцию.
 */
pmTemplates.saveNewOption = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    var optionName=$('#filed_option_name').val();
    optionName=optionName.trim();
    optionName=optionName.replace( /\s/g, "-" );
    var templateOptionList=thisObj.model.items[item_id].options_list;
    for (var i=0; i<templateOptionList.length; i++)
    {
        if(templateOptionList[i]==optionName)
        {
            $.notify("Option with this name already exists", "error");
            def.reject({text:"Option with this name already exists"});
            return def.promise();
        }
    }

    return thisObj.saveOption(item_id);
}


/**
 *Функция сохраняет изменения в уже существующей опции
 *и запускает выполнение шаблона с этой опцией.
 */
pmTemplates.saveAndExecuteOption = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(thisObj.saveOption(item_id)).done(function()
    {
        var tpl_kind = thisObj.model.kind;
        pmTemplates.model.kindObjects[tpl_kind].execute(item_id, thisObj.model.items[item_id].option_name);
        def.resolve();
    }).fail(function(e)
    {
        def.reject(e);
        polemarch.showErrors(e.responseJSON);
    }).promise();

    return def.promise();
}

pmTemplates.defineProjectInUrl = function ()
{
    var project_and_id = "";
    var link = window.location.href.split(/[&?]/g)[1];
    if(/project\/([0-9]+)/.test(link))
    {
        project_and_id = "project/" + link.split(/project\/([0-9]+)/g)[1] + "/";
    }

    return project_and_id;
}

/**
 *Функция удаляет опцию.
 */
pmTemplates.removeOption = function(item_id, option_name)
{
    var def = new $.Deferred();
    var thisObj = this;
    var optionName=option_name;
    delete thisObj.model.items[item_id].optionsCopyForDelete[optionName];
    var dataToAdd1={options:{}};
    dataToAdd1['options']=thisObj.model.items[item_id].optionsCopyForDelete;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + thisObj.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(dataToAdd1),
        success: function (data)
        {
            $.notify('Option "'+optionName+'" was successfully deleted', "success");
            if(/\/search\//i.test(window.location.href))
            {
                $.when(spajs.openURL(window.location.href)).always(function(){
                    def.resolve();
                });
            }
            else
            {
                var project_and_id = thisObj.defineProjectInUrl();
                $.when(spajs.open({ menuId:project_and_id + "template/"+thisObj.model.kind+"/"+data.id+"/options"})).always(function(){
                    def.resolve();
                });
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

/**
 * Функция предназначена для загрузки всех шаблонов(task, module),
 * привязанных к определенному проекту.
 * @param number project_id - id of project
 */
pmTemplates.loadAllItemsFromProject = function(project_id)
{
    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/",
        type: "GET",
        contentType: 'application/json',
        data: "project="+project_id,
        success: function (data)
        {
            thisObj.model.itemslist = data

            for (var i in data.results)
            {
                var val = thisObj.afterItemLoad(data.results[i])
                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)
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
 * Функция предназначена для загрузки всех периодических тасок,
 * ссылающихся на данный шаблон.
 * @param number template_id - id of template
 */
pmTemplates.loadLinkedPeriodicTasks = function(template_id)
{
    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/periodic-tasks/",
        type: "GET",
        contentType: 'application/json',
        data: "template="+template_id,
        success: function (data)
        {
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
pmTemplates.showOptionsList = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var def = new $.Deferred();
    var project_id = undefined;
    var item_id = data.reg[1];
    if(data.reg[2] !== undefined)
    {
        project_id = data.reg[1];
        item_id = data.reg[2];
    }
    $.when(thisObj.loadItem(item_id)).done(function ()
    {
        thisObj.model.items[item_id].optionsCopyForDelete = JSON.parse(JSON.stringify(thisObj.model.items[item_id].options));
        var tpl = 'template_options_list'
        var project_name = undefined;
        if(project_id !== undefined)
        {
            $.when(pmProjects.loadItem(project_id)).done(function ()
            {
                project_name = pmProjects.model.items[project_id].name;
                $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj, item_id:item_id, opt: {project_id:project_id, project_name:project_name}}))
                def.resolve();
            }).fail(function (e)
            {
                polemarch.showErrors(e);
                def.reject(e);
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj, item_id:item_id, opt: {project_id:project_id, project_name:project_name}}))
            def.resolve();
        }
    }).fail(function (e)
    {
        polemarch.showErrors(e);
        def.reject(e);
    })
    return def.promise();
}

/**
 * Функция выделяет/снимает выделение с опций в таблице списка опций.
 * @param {array} elements - массив выделенных элементов
 * @param {boolean} mode - true - добавить выделение, false - снять выделение
 * @param {string} div_id - id блока, в котором находятся данные элементы
 */
pmTemplates.toggleSelectAllOptions = function (elements, mode, div_id)
{
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row'))
        {
            $(elements[i]).toggleClass('selected', mode);
        }
    }
    this.countSelectedOptions(div_id);
}

/**
 * Функция выделяет/снимает выделение с одного конкретного элемента в определенной таблице.
 * В данном случае в таблице со списком опций.
 * @param {object} thisEl - конкретный элемент
 * @param {string} div_id - id блока, в котором находится данный элемент
 */
pmTemplates.toggleSelectOption = function (thisEl, div_id)
{
    $(thisEl).parent().toggleClass('selected');
    this.countSelectedOptions(div_id);
}

/**
 * Функция подсчитывает количество выделенных элементов в определенной таблице элементов.
 * И запоминает данное число в pmTemplates.model.selectedOptionsCount,
 * а сами элементы в pmTemplates.model.selectedOptions.
 * В зависимости от нового значения pmTemplates.model.selectedOptionsCount
 * часть кнопок отображается либо скрывается.
 * @param {string} div_id - id блока, в котором находятся данные элементы
 */
pmTemplates.countSelectedOptions = function (div_id)
{
    var elements=$("#"+div_id+"_table tr");
    var count=0;
    var thisObj = this;
    thisObj.model.selectedOptions = [];
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row') && $(elements[i]).hasClass('selected'))
        {
            count+=1;
            thisObj.model.selectedOptions.push($(elements[i]).attr('data-id'));
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
    thisObj.model.selectedOptionsCount=count;
}

/**
 *Функция удаляет все выделенные опции.
 */
pmTemplates.removeSelectedOptions = function(item_id, option_names)
{
    var def = new $.Deferred();
    var thisObj = this;
    for(var i in option_names)
    {
        var optionName=option_names[i];
        delete thisObj.model.items[item_id].optionsCopyForDelete[optionName];
    }
    var dataToAdd1={options:{}};
    dataToAdd1['options']=thisObj.model.items[item_id].optionsCopyForDelete;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + thisObj.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(dataToAdd1),
        success: function (data)
        {
            $.when(spajs.openURL(window.location.href)).done(function ()
            {
                $.notify('Options were successfully deleted', "success");
                def.resolve();
            }).fail(function (e)
            {
                polemarch.showErrors(e.responseJSON);
                def.reject(e)
            });
        },
        error: function (e)
        {
            polemarch.showErrors(e.responseJSON);
            def.reject(e)
        }
    });
    return def.promise();
}

/**
 *Функция открывает список периодических тасок, созданных на основе данного шаблона.
 */
pmTemplates.showPeriodicTasksList = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var def = new $.Deferred();
    var url_project_id = undefined;
    var template_id = data.reg[1];
    if(data.reg[2] !== undefined)
    {
        url_project_id = data.reg[1];
        template_id = data.reg[2];
    }
    $.when(thisObj.loadItem(template_id), thisObj.loadLinkedPeriodicTasks(template_id)).done(function ()
    {
        var tpl = 'linked-to-template-periodic-tasks_list';
        var project_id = thisObj.model.items[template_id].data.project;
        var url_project_name = undefined;
        if(url_project_id !== undefined)
        {
            $.when(pmProjects.loadItem(url_project_id)).done(function ()
            {
                url_project_name = pmProjects.model.items[url_project_id].name;
                $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj,
                    project_id:project_id, item_id:template_id, opt: {project_id:url_project_id, project_name: url_project_name}}))
                def.resolve();

            }).fail(function (e)
            {
                polemarch.showErrors(e.responseJSON);
                def.reject(e);
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj,
                project_id:project_id, item_id:template_id, opt: {project_id:url_project_id, project_name: url_project_name}}))
            def.resolve();
        }
    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })
    return def.promise();
}

/**
 *Функция открывает страницу создания новой периодической таски для шаблона.
 */
pmTemplates.showNewPeriodicTaskFromTemplate = function (holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var url_project_id = undefined;
    var item_id = data.reg[1];
    if(data.reg[2] !== undefined)
    {
        url_project_id = data.reg[1];
        item_id = data.reg[2];
    }
    $.when(thisObj.loadItem(item_id), pmInventories.loadAllItems()).done(function()
    {
        var project_id = thisObj.model.items[item_id].data.project;
        var url_project_name = undefined;
        pmPeriodicTasks.model.newitem = {type:'INTERVAL', kind:'TEMPLATE'}
        var tpl = 'from-template-periodic-tasks_new_page';
        if(!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page';
        }
        if(url_project_id !== undefined)
        {
            $.when(pmProjects.loadItem(url_project_id)).done(function ()
            {
                url_project_name = pmProjects.model.items[url_project_id].name;
                $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, project_id:project_id, pmObj:thisObj, opt:{project_id:url_project_id, project_name:url_project_name}}))
                def.resolve();
            }).fail(function (e)
            {
                polemarch.showErrors(e.responseJSON);
                def.reject(e);
            });
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, project_id:project_id, pmObj:thisObj, opt:{project_id:url_project_id, project_name:url_project_name}}))
            def.resolve();
        }
    }).fail(function(e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })

    return def.promise();
}


/**
 * Функция рендерит шаблон для поля поиска на странице списка опций шаблона.
 */
pmTemplates.searchFiledForTemplateOptions = function (options)
{
    options.className = this.model.className;
    this.model.searchAdditionalData = options
    return spajs.just.render('searchFiledForTemplateOptions', {opt: options});
}

/**
 * Функция для поиска опций на странице списка опций шаблона.
 */
pmTemplates.searchTemplateOptions = function (query, options)
{
    var thisObj = this;
    var project_and_id = thisObj.defineProjectInUrl();
    if (thisObj.isEmptySearchQuery(query))
    {
        return spajs.open({menuId: project_and_id + 'template/' + thisObj.model.kind + '/' + options.template_id +'/options', reopen: true});
    }

    return spajs.open({menuId: project_and_id + 'template/' + thisObj.model.kind + '/' + options.template_id +'/options' + '/search/' + this.searchObjectToString(trim(query)), reopen: true});
}


/**
 * Функция показывает результаты поиска опций шаблона.
 */
pmTemplates.showOptionsSearchResult = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var def = new $.Deferred();
    var project_id = undefined;
    var template_id = data.reg[1];
    var search = this.searchStringToObject(decodeURIComponent(data.reg[2]));
    if(data.reg[3] !== undefined)
    {
        project_id = data.reg[1];
        template_id = data.reg[2];
        search = this.searchStringToObject(decodeURIComponent(data.reg[3]));
    }
    $.when(thisObj.loadItem(template_id)).done(function ()
    {
        thisObj.model.items[template_id].optionsCopyForDelete = JSON.parse(JSON.stringify(thisObj.model.items[template_id].options));
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
        var project_name = undefined;

        if(project_id !== undefined)
        {
            $.when(pmProjects.loadItem(project_id)).done(function ()
            {
                project_name = pmProjects.model.items[project_id].name;
                $(holder).insertTpl(spajs.just.render(tpl, {query:decodeURIComponent(search.name), pmObj: thisObj, item_id:template_id, opt: {project_id:project_id, project_name:project_name}}))
                def.resolve();
            }).fail(function (e)
            {
                polemarch.showErrors(e.responseJSON);
                def.reject(e);
            })
        }
        else
        {
            $(holder).insertTpl(spajs.just.render(tpl, {query:decodeURIComponent(search.name), pmObj: thisObj, item_id:template_id, opt: {project_id:project_id, project_name:project_name}}))
            def.resolve();
        }


    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })
    return def.promise();
}

pmTemplates.showListForProject = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var def = new $.Deferred();
    var offset = 0
    var limit = this.pageSize;
    if (data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize * (data.reg[2] - 1);
    }
    var project_id = data.reg[1];
    $.when(pmProjects.loadItem(project_id)).done(function ()
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
        spajs.ajax.Call({
            url: hostname + "/api/v1/templates/",
            type: "GET",
            contentType:'application/json',
            data:"project="+project_id,
            success: function(data)
            {
                thisObj.model.itemsForParent = {};
                thisObj.model.itemslistForParent = {};
                data.limit = limit
                data.offset = offset
                thisObj.model.itemslistForParent = data

                for (var i in data.results)
                {
                    var val = thisObj.afterItemLoad(data.results[i])
                    thisObj.model.itemsForParent.justWatch(val.id);
                    thisObj.model.itemsForParent[val.id] = mergeDeep(thisObj.model.itemsForParent[val.id], val)
                }

                var tpl = 'items_list_from_another_class';

                $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj, parentObj:pmProjects, opt: {project_id:project_id, project_name:project_name,
                        parent_item: project_id, parent_type: pmProjects.model.page_name, back_link: 'project/'+project_id, link_with_parents:'project/'+project_id  }}))
                def.resolve();
            },
            error:function(e)
            {
                polemarch.showErrors(e.responseJSON)
                def.reject(e)
            }
        });
    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON)
        def.reject(e)
    });

    return def.promise();
}

pmTemplates.showSearchResultsForProject = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var def = new $.Deferred();
    var offset = 0
    var limit = this.pageSize;
    if (data.reg && data.reg[3] > 0)
    {
        offset = this.pageSize * (data.reg[3] - 1);
    }
    var project_id = data.reg[1];
    var search_query = decodeURIComponent(data.reg[2]);
    $.when(pmProjects.loadItem(project_id)).done(function ()
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
        spajs.ajax.Call({
            url: hostname + "/api/v1/templates/",
            type: "GET",
            contentType:'application/json',
            data:"project=" + project_id + "&name=" + search_query,
            success: function(data)
            {
                thisObj.model.itemsForParent = {};
                thisObj.model.itemslistForParent = {};
                data.limit = limit
                data.offset = offset
                thisObj.model.itemslistForParent = data

                for (var i in data.results)
                {
                    var val = thisObj.afterItemLoad(data.results[i])
                    thisObj.model.itemsForParent.justWatch(val.id);
                    thisObj.model.itemsForParent[val.id] = mergeDeep(thisObj.model.itemsForParent[val.id], val)
                }

                var tpl = 'items_list_from_another_class';

                $(holder).insertTpl(spajs.just.render(tpl, {query: search_query, pmObj: thisObj, parentObj:pmProjects,
                    opt: {parent_item: project_id, parent_type: pmProjects.model.page_name, back_link: 'project/'+project_id, link_with_parents:'project/'+project_id  }}))
                def.resolve();
            },
            error:function(e)
            {
                polemarch.showErrors(e.responseJSON);
                def.reject(e);
            }
        });
    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    });

    return def.promise();
}

pmTemplates.search = function (query, options)
{
    var project_and_id = this.defineProjectInUrl();

    if (this.isEmptySearchQuery(query))
    {
        return spajs.open({menuId: project_and_id + this.model.name, reopen: true});
    }

    return spajs.open({menuId: project_and_id + this.model.name + "/search/" + this.searchObjectToString(trim(query)), reopen: true});
}
