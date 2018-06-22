function pmItems()
{

}

pmItems.pageSize = 20;
pmItems.model = {};
pmItems.model.selectedItems = {};

pmItems.model.itemslist = []
pmItems.model.items = {}
pmItems.model.items_permissions = {}
pmItems.model.name = "based"
pmItems.model.page_name = "based"
pmItems.model.bulk_name = "base"
pmItems.model.selectedCount = 0;
pmItems.model.className = "pmItems"

pmItems.filed = {}


pmItems.toggleSelect = function (item_id, mode)
{
    if (!item_id)
    {
        return;
    }

    console.log(item_id, mode)
    if (mode === undefined)
    {
        this.model.selectedItems[item_id] = !this.model.selectedItems[item_id]
        if (this.model.selectedItems[item_id])
        {
            this.model.selectedCount++
        } else
        {
            this.model.selectedCount--
        }
    } else
    {
        if (this.model.selectedItems[item_id] != mode)
        {
            if (mode)
            {
                this.model.selectedCount++
            } else
            {
                this.model.selectedCount--
            }
        }
        this.model.selectedItems[item_id] = mode
    }

    if (this.model.selectedCount < 0)
    {
        this.model.selectedCount = 0;
    }

    return this.model.selectedItems[item_id];
}

/**
 * Выделеть всё или снять выделение
 * @param {boolean} mode
 * @returns {promise}
 */
pmItems.toggleSelectEachItem = function (mode)
{
    var thisObj = this;
    return $.when(this.loadAllItems()).done(function ()
    {
        var delta = 0;
        for (var i in thisObj.model.itemslist.results)
        {
            var item_id = thisObj.model.itemslist.results[i].id

            if (thisObj.model.selectedItems[item_id] != mode)
            {
                if (mode)
                {
                    delta++
                } else
                {
                    delta--
                }
            }
            thisObj.model.selectedItems[item_id] = mode
        }
        thisObj.model.selectedCount += delta

        if (thisObj.model.selectedCount < 0)
        {
            thisObj.model.selectedCount = 0;
        }

    }).promise()
}

pmItems.toggleSelectAll = function (elements, mode)
{
    for (var i = 0; i < elements.length; i++)
    {
        this.toggleSelect($(elements[i]).attr('data-id'), mode)
    }
}

pmItems.validateHostName = function (name)
{
    if (!name)
    {
        return false;
    }

    var regexp = {
        ipTest: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
        ip6Test: /((^|:)([0-9a-fA-F]{0,4})){1,8}$/,
        domenTest: /^((\.{0,1}[a-z0-9][a-z0-9-]{0,62}[a-z0-9]\.{0,1})*)$/
    }

    if (regexp.ipTest.test(name.toLowerCase()))
    {
        return true;
    }

    if (regexp.ip6Test.test(name.toLowerCase()))
    {
        return true;
    }

    if (regexp.domenTest.test(name.toLowerCase()))
    {
        return true;
    }

    return false;
}

pmItems.validateRangeName = function (name)
{
    if (!name)
    {
        return false;
    }

    return this.validateHostName(name.replace(/\[([0-9A-z]+):([0-9A-z]+)\]/g, "$1") && name.replace(/\[([0-9A-z]+):([0-9A-z]+)\]/g, "$2"))
}


/**
 * Строит страницу со списком объектоа
 * @param {type} holder
 * @param {type} menuInfo
 * @param {type} data
 * @returns {$.Deferred}
 */
pmItems.showList = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if (data.reg && data.reg[1] > 0)
    {
        offset = this.pageSize * (data.reg[1] - 1);
    }

    return $.when(this.loadItems(limit, offset)).done(function ()
    {
        var tpl = thisObj.model.name + '_list'
        if (!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_list'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {query: "", pmObj: thisObj, opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    })
}

/**
 * @param {string} query
 * @returns {HTML} Шаблон формы поиска
 */
pmItems.searchFiled = function (options)
{
    options.className = this.model.className;
    this.model.searchAdditionalData = options
    return spajs.just.render('searchFiled', {opt: options});
}

/**
 * Выполняет переход на страницу с результатами поиска
 * @param {string} query
 * @returns {$.Deferred}
 */
pmItems.search = function (query, options)
{ 
    if(options.parent_type === undefined && options.parent_item === undefined)
    {
        if (this.isEmptySearchQuery(query))
        {
            return spajs.open({menuId: this.model.name, reopen: true});
        }

        return spajs.open({menuId: this.model.name + "/search/" + this.searchObjectToString(trim(query)), reopen: true});
    }
    else
    { 
        var link = window.location.href.split(/[&?]/g)[1];
        var pattern = /([A-z0-9_]+)\/([0-9]+)/g;
        var link_parts = link.match(pattern);
        var link_with_parents = "";
        for(var i in link_parts)
        {
            if(link_parts[i].split("/")[0] != 'page' && link_parts[i].split("/")[0] != 'search')
            {
                link_with_parents += link_parts[i]+"/";
            }
        }

        if (this.isEmptySearchQuery(query))
        {
            return spajs.open({menuId: link_with_parents + this.model.name, reopen: true});
        }

        return spajs.open({menuId: link_with_parents + this.model.name + "/search/" +
            this.searchObjectToString(trim(query)), reopen: true});
    }

}


/**
 * Если поисковый запрос пуст то вернёт true
 * @param {type} query
 * @returns {Boolean}
 */
pmItems.isEmptySearchQuery = function (query)
{
    if (!query || !trim(query))
    {
        return true;
    }

    return false;
}

/**
 * Строит страницу результатов поиска на основе урла страницы
 * @param {type} holder
 * @param {type} menuInfo
 * @param {type} data
 * @returns {$.Deferred}
 */
pmItems.showSearchResults = function (holder, menuInfo, data)
{
    // @todo Refactor  убрать все вызовы setActiveMenuLi в систему событий
    setActiveMenuLi();
    var thisObj = this;

    var limit = this.pageSize;

    if (data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize * (data.reg[2] - 1);
    } else {
        offset = 0;
    }
    return $.when(this.sendSearchQuery(this.searchStringToObject(decodeURIComponent(data.reg[1])), limit, offset)).done(function ()
    {
        var tpl = thisObj.model.name + '_list'
        if (!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_list'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {query: decodeURIComponent(data.reg[1]), pmObj: thisObj, opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    })
}

/**
 * Строит страницу результатов поиска по списку дочерних элементов.
 * @param {type} holder
 * @param {type} menuInfo
 * @param {type} data
 * @returns {$.Deferred}
 */
pmItems.showSearchResultsForParent = function (holder, menuInfo, data)
{
    // @todo Refactor  убрать все вызовы setActiveMenuLi в систему событий
    setActiveMenuLi(); 
    var def = new $.Deferred();
    var thisObj = this;

    var offset = 0;
    var limit = thisObj.pageSize;
    var link = window.location.href.split(/[&?]/g)[1];
    if(/page\/([0-9]+)/.test(link))
    {
        var pageNumber = link.split(/page\/([0-9]+)/)[1];
        offset = thisObj.pageSize * (pageNumber - 1);
    }

    if(/search\/([A-z0-9 %\-.:,=]+)/.test(link))
    {
        var searchQuery = decodeURIComponent(link.split(/search\/([A-z0-9 %\-.:,=]+)/)[1]);
    }

    var pattern = /([A-z0-9_]+)\/([0-9]+)/g;
    var link_parts = link.match(pattern);
    var link_with_parents = "";
    var parentObjectsArr = [];
    for(var i in link_parts)
    {
        var parObj = {};
        if(link_parts[i].split("/")[0] != 'page' && link_parts[i].split("/")[0] != 'search')
        {
            parObj.parent_type = link_parts[i].split("/")[0];
            parObj.parent_item = link_parts[i].split("/")[1];
            parentObjectsArr.push(parObj);
            link_with_parents += link_parts[i] +"/";
        }
    }
    var back_link = link_with_parents.slice(0,-1);
    link_with_parents = back_link;

    thisObj.model.parentObjectsData = [];
    var defArr = thisObj.loadAllParentsData(parentObjectsArr);

    $.when.apply($, defArr).done(function ()
    {
        var parentObj = thisObj.definePmObject(thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length - 1].parent_type);
        var parent_type = parentObj.model.page_name;
        var parent_item = thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length - 1].parent_item;

        //$.when(thisObj.loadAllItems()).done(function()
        //{ 
            var childrenItems = [];
            for(var i in parentObj.model.items[parent_item][thisObj.model.name])
            {
                childrenItems.push(parentObj.model.items[parent_item][thisObj.model.name][i]);
            }
            thisObj.model.itemsForParent = {};
            thisObj.model.itemslistForParent = {};
            for(var i in childrenItems)
            {
                thisObj.model.itemsForParent[childrenItems[i].id] = childrenItems[i];
            }
            var childrenItemsValidToQuery = [];
            for (var i in childrenItems)
            {
                if(childrenItems[i].name.match(searchQuery) != null)
                {
                    childrenItemsValidToQuery.push(childrenItems[i]);
                }
            }
            thisObj.model.itemslistForParent.count = childrenItemsValidToQuery.length;
            thisObj.model.itemslistForParent.limit = limit;
            thisObj.model.itemslistForParent.offset = offset;
            thisObj.model.itemslistForParent.next = null;
            thisObj.model.itemslistForParent.previos = null;
            thisObj.model.itemslistForParent.results = [];
            if(childrenItemsValidToQuery.length != 0)
            {
                if(childrenItemsValidToQuery.length > limit)
                {
                    for(var i=offset; i<offset+limit; i++)
                    {
                        if(childrenItemsValidToQuery[i] !== undefined)
                        {
                            thisObj.model.itemslistForParent.results.push(childrenItemsValidToQuery[i]);
                        }
                    }
                }
                else
                {
                    for(var i=0; i<childrenItemsValidToQuery.length; i++ )
                    {
                        thisObj.model.itemslistForParent.results.push(childrenItemsValidToQuery[i]);
                    }
                }
            }

            var tpl = thisObj.model.name + '_list_from_another_class';
            if (!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_list_from_another_class';
            }
            var text = spajs.just.render(tpl, {
                                                query: searchQuery,
                                                pmObj: thisObj,
                                                parentObj:parentObj,
                                                opt: {
                                                    parent_item: parent_item,
                                                    parent_type: parent_type,
                                                    back_link:back_link,
                                                    link_with_parents:link_with_parents
                                                }
                                            });

            $(holder).insertTpl(text);
            $('#add_existing_item_to_parent').select2({
                placeholder: true,
                allowClear: true
            });
            
            def.resolve();
        //}).fail(function(e)
        //{
        //    polemarch.showErrors(e.responseJSON);
        //    def.reject(e);
        //})

    }).fail(function(e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })

    return def.promise();
}

pmItems.copyItem = function (item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function ()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name

        $.when(encryptedCopyModal.replace(data)).done(function (data)
        {
            spajs.ajax.Call({
                url: hostname + "/api/v1/" + thisObj.model.name + "/",
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function (data)
                {
                    thisObj.model.items[data.id] = data
                    def.resolve(data.id)
                },
                error: function (e)
                {
                    def.reject(e)
                }
            });
        }).fail(function (e)
        {
            def.reject(e)
        })
    }).fail(function () {
        def.reject(e)
    })

    return def.promise();
}

pmItems.importItem = function (data)
{
    var def = new $.Deferred();
    var thisObj = this;

    spajs.ajax.Call({
        url: hostname + "/api/v1/" + thisObj.model.name + "/",
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (data)
        {
            thisObj.model.items[data.id] = data
            def.resolve(data.id)
        },
        error: function (e)
        {
            $.notify("Error in import item", "error");
            polemarch.showErrors(e)
            def.reject(e)
        }
    });
    return def.promise();
}

pmItems.copyAndEdit = function (item_id, back_link)
{
    var def = new $.Deferred();
    var thisObj = this;
    if(!back_link)
    {
        back_link = thisObj.model.page_name;
    }
    $.when(this.copyItem(item_id)).done(function (newItemId)
    {
        $.when(spajs.open({menuId: back_link+ "/" + newItemId})).done(function () {
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

pmItems.showItem = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;
    //console.log(menuInfo, data)

    return $.when(this.loadItem(data.reg[1])).done(function ()
    {
        var tpl = thisObj.model.name + '_page'
        if (!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {item_id: data.reg[1], pmObj: thisObj, opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    }).promise()
}

pmItems.showItemFromAnotherClass = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;

    var link = window.location.href.split(/[&?]/g)[1];
    var pattern = /([A-z0-9_]+)\/([0-9]+)/g;
    var link_parts = link.match(pattern);
    var link_with_parents = "";
    var back_link = "";
    var parentObjectsArr = [];
    for(var i in link_parts)
    {
        var parObj = {};
        if(link_parts[i].split("/")[0] != 'page' && link_parts[i].split("/")[0] != 'search')
        {
            link_with_parents += link_parts[i] +"/";
            if(i != link_parts.length -1)
            {
                back_link += link_parts[i] +"/";
                parObj.parent_type = link_parts[i].split("/")[0];
                parObj.parent_item = link_parts[i].split("/")[1];
                parentObjectsArr.push(parObj);
            }
            else
            {
                var child_item = link_parts[i].split("/")[1];
            }
        }
    }
    back_link += thisObj.model.name;

    var parent_type = undefined;
    var parent_item = undefined;
    thisObj.model.parentObjectsData = [];
    var defArr = thisObj.loadAllParentsData(parentObjectsArr);

    $.when.apply($, defArr).done(function ()
    {
        var parentObj = thisObj.definePmObject(thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length - 1].parent_type);

        parent_type = parentObj.model.page_name;
        parent_item = thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length - 1].parent_item;

        $.when(thisObj.loadItem(child_item), parentObj.loadItem(parent_item)).done(function ()
        {
            thisObj.model.itemsForParent = {};
            var children = parentObj.model.items[parent_item][thisObj.model.name];
            for (var i in children)
            {
                thisObj.model.itemsForParent[children[i].id] = children[i];
            }

            var tpl = thisObj.model.name + '_page_from_another_class';
            if (!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_page_from_another_class';
            }

            $(holder).insertTpl(spajs.just.render(tpl, {item_id: child_item, pmObj: thisObj, parentObj:parentObj,
                opt: {parent_type:parent_type, parent_item:parent_item, back_link:back_link, link_with_parents:link_with_parents}}))
            def.resolve();
        }).fail(function(e)
        {
            polemarch.showErrors(e.responseJSON);
            def.reject(e);
        }).promise();

    }).fail(function(e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })

    return def.promise();
}

/**
 * Функция принимает строку, содержащую в себе название типа pm объекта,
 * и возвращает соответствующий данному типу pm объект.
 */
pmItems.definePmObject = function(pmObj_type)
{
    var pmObj = undefined;
    switch(pmObj_type)
    {
        case 'project':
        case 'projects':
            pmObj = pmProjects;
            break;
        case 'inventory':
        case 'inventories':
            pmObj = pmInventories;
            break;
        case 'group':
        case 'groups':
            pmObj = pmGroups;
            break;
        case 'host':
        case 'hosts':
            pmObj = pmHosts;
            break;
        case 'template':
        case 'templates':
            pmObj = pmTasksTemplates;
            break;
        case 'user':
        case 'users':
            pmObj = pmUsers;
            break;
    }
    return pmObj;
}

pmItems.showNewItemPage = function (holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;

    var tpl = this.model.name + '_new_page';
    if (!spajs.just.isTplExists(tpl))
    {
        tpl = 'items_new_page';
    }

    var parent_item = undefined;
    var parent_type = undefined;

    var link = window.location.href.split(/[&?]/g)[1];

    var pattern = /([A-z0-9_]+)\/([0-9]+)/g;
    var link_parts = link.match(pattern);
    var link_with_parents = "";
    var parentObjectsArr = [];
    for(var i in link_parts)
    {
        var parObj = {};
        parObj.parent_type = link_parts[i].split("/")[0];
        parObj.parent_item = link_parts[i].split("/")[1];
        parentObjectsArr.push(parObj);
        link_with_parents += link_parts[i] +"/";
    }

    link_with_parents += thisObj.model.name +"/";
    var back_link = link_with_parents.slice(0,-1);

    if(link_parts != null)
    {
        thisObj.model.parentObjectsData = [];
        var defArr = thisObj.loadAllParentsData(parentObjectsArr);

        $.when.apply($, defArr).done(function ()
        {
            var parentObj = thisObj.definePmObject(thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length - 1].parent_type);

            parent_type = parentObj.model.page_name;
            parent_item = thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length - 1].parent_item;
            var text = spajs.just.render(tpl, {pmObj: thisObj, parentObj: parentObj,
                opt: {parent_item: parent_item, parent_type: parent_type, link_with_parents:link_with_parents,
                    back_link:back_link}
            });
            $(holder).insertTpl(text);
            def.resolve();

        }).fail(function (e)
        {
            polemarch.showErrors(e.responseJSON);
            def.reject(e);
        })
    }
    else
    {
        var text = spajs.just.render(tpl, {pmObj: thisObj, opt: {parent_item: parent_item, parent_type: parent_type}});
        $(holder).insertTpl(text);
        def.resolve();
    }

    return def.promise();
}

/**
 * Функция принимает строку, содержащую в себе название типа родительского pm объекта,
 * и возвращает соответствующий данному типу pm объект.
 */
pmItems.loadAllParentsData = function (parentObjectsArr)
{
    var defArr = [];
    var thisObj = this;
    for(var i in parentObjectsArr)
    {
        var parentObj = thisObj.definePmObject(parentObjectsArr[i].parent_type);
        var promise = $.when(parentObj.loadItem(parentObjectsArr[i].parent_item)).done(function(data)
        {
            for(var j in defArr)
            {
                if(defArr[j] == this)
                {
                    parentObj = thisObj.definePmObject(parentObjectsArr[j].parent_type);
                    parentObjectsArr[j].parent_type_plural = parentObj.model.name;
                    parentObjectsArr[j].item_name = parentObj.model.items[parentObjectsArr[j].parent_item].name;
                    thisObj.model.parentObjectsData[j] = parentObjectsArr[j];
                }
            }

        }).fail(function (e)
        {
            console.warn(e);
            polemarch.showErrors(e);
        }).promise();

        defArr.push(promise);
    }
    return defArr;
}

pmItems.showListFromAnotherClass = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var def = new $.Deferred();
    var thisObj = this;

    var offset = 0;
    var limit = thisObj.pageSize;
    var link = window.location.href.split(/[&?]/g)[1];
    if(/page\/([0-9]+)/.test(link))
    {
        var pageNumber = link.split(/page\/([0-9]+)/g)[1];
        offset = thisObj.pageSize * (pageNumber - 1);
    }
    var pattern = /([A-z0-9_]+)\/([0-9]+)/g;
    var link_parts = link.match(pattern);
    var link_with_parents = "";
    var parentObjectsArr = [];
    for(var i in link_parts)
    {
        var parObj = {};
        if(link_parts[i].split("/")[0] != 'page' && link_parts[i].split("/")[0] != 'search')
        {
            parObj.parent_type = link_parts[i].split("/")[0];
            parObj.parent_item = link_parts[i].split("/")[1];
            parentObjectsArr.push(parObj);
            link_with_parents += link_parts[i] +"/";
        }
    }
    var back_link = link_with_parents.slice(0,-1);
    link_with_parents = back_link;

    var parent_type = undefined;
    var parent_item = undefined;
    thisObj.model.parentObjectsData = [];
    var defArr = thisObj.loadAllParentsData(parentObjectsArr);

    $.when.apply($, defArr).done(function ()
    {
        var parentObj = thisObj.definePmObject(thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length-1].parent_type);
        parent_type = parentObj.model.page_name;
        parent_item = thisObj.model.parentObjectsData[thisObj.model.parentObjectsData.length-1].parent_item;

        $.when(thisObj.loadAllItems()).done(function()
        {
            var childrenItems = [];
            for(var i in parentObj.model.items[parent_item][thisObj.model.name])
            {
                childrenItems.push(parentObj.model.items[parent_item][thisObj.model.name][i]);
            }
            thisObj.model.itemsForParent = {};
            thisObj.model.itemslistForParent = {};
            thisObj.model.itemslistForParent.count = childrenItems.length;
            thisObj.model.itemslistForParent.limit = limit;
            thisObj.model.itemslistForParent.offset = offset;
            thisObj.model.itemslistForParent.next = null;
            thisObj.model.itemslistForParent.previos = null;
            thisObj.model.itemslistForParent.results = [];
            for(var i in childrenItems)
            {
                thisObj.model.itemsForParent[childrenItems[i].id] = childrenItems[i];
            }
            if(childrenItems.length != 0)
            {
                if(childrenItems.length > limit)
                {
                    for(var i=offset; i<offset+limit; i++)
                    {
                        if(childrenItems[i] !== undefined)
                        {
                            thisObj.model.itemslistForParent.results.push(childrenItems[i]);
                        }
                    }
                }
                else
                {
                    for(var i=0; i<childrenItems.length; i++ )
                    {
                        thisObj.model.itemslistForParent.results.push(childrenItems[i]);
                    }
                }
            }

            var tpl = thisObj.model.name + '_list_from_another_class';
            if (!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_list_from_another_class';
            }
            var text = spajs.just.render(tpl, {query: "",  pmObj: thisObj, parentObj:parentObj,
                opt: {parent_item: parent_item, parent_type: parent_type, link_with_parents:link_with_parents,
                    back_link:back_link}});
            $(holder).insertTpl(text);
            $('#add_existing_item_to_parent').select2({
                placeholder: true,
                allowClear: true
            });
            def.resolve();
        }).fail(function(e)
        {
            polemarch.showErrors(e.responseJSON);
            def.reject(e);
        })
    }).fail(function(e)
    {
        polemarch.showErrors(e.responseJSON);
        def.reject(e);
    })

    return def.promise();
}

pmItems.loadAllItems = function ()
{
    return this.loadItems(999999);
}

/**
 * Вызывается после загрузки информации об элементе но до его вставки в любые массивы.
 * Должна вернуть отредактированый или не изменный элемент
 * @param {object} item загруженный с сервера элемента
 * @returns {object} обработаный элемент
 */
pmItems.afterItemLoad = function (item)
{
    return item;
}

/**
 * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
 * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
 */
pmItems.loadItems = function (limit, offset)
{
    if (!limit)
    {
        limit = 30;
    }

    if (!offset)
    {
        offset = 0;
    }

    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/",
        type: "GET",
        contentType: 'application/json',
        data: "limit=" + encodeURIComponent(limit) + "&offset=" + encodeURIComponent(offset),
        success: function (data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

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
 * Преобразует строку поиска в объект с параметрами для фильтрации
 * @param {string} query строка запроса
 * @param {string} defaultName имя параметра по умолчанию
 * @returns {pmItems.searchStringToObject.search} объект для поиска
 */
pmItems.searchStringToObject = function (query, defaultName)
{
    var search = {}
    if (query == "")
    {
        return search;
    }

    if (!defaultName)
    {
        defaultName = 'name'
    }

    search[defaultName] = query;

    return search;
}

/**
 * Преобразует строку и объект поиска в строку для урла страницы поиска
 * @param {string} query строка запроса
 * @param {string} defaultName имя параметра по умолчанию
 * @returns {string} строка для параметра страницы поиска
 */
pmItems.searchObjectToString = function (query, defaultName)
{
    return encodeURIComponent(query);
}

/**
 * Функция поиска
 * @param {string|object} query запрос
 * @param {integer} limit
 * @param {integer} offset
 * @param {string} ordering - сортировка по какому-то свойству объекта(id, name и т.д). Для обратной сортировки передавать "-id"
 * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
 */
pmItems.sendSearchQuery = function (query, limit, offset, ordering)
{
    if (!limit)
    {
        limit = 999;
    }

    if (!offset)
    {
        offset = 0;
    }

    if (!ordering)
    {
        ordering = "";
    }

    var q = [];

    q.push("limit=" + encodeURIComponent(limit))
    q.push("offset=" + encodeURIComponent(offset))
    q.push("ordering=" + encodeURIComponent(ordering))

    for (var i in query)
    {
        if (Array.isArray(query[i]))
        {
            for (var j in query[i])
            {
                query[i][j] = encodeURIComponent(query[i][j])
            }
            q.push(encodeURIComponent(i) + "=" + query[i].join(","))
            continue;
        }
        q.push(encodeURIComponent(i) + "=" + encodeURIComponent(query[i]))
    }


    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/?" + q.join("&"),
        type: "GET",
        contentType: 'application/json',
        success: function (data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            for (var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items[val.id] = val
            }
        },
        error: function (e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

pmItems.searchItems = function (query, attrName, limit, offset)
{
    if (!attrName)
    {
        attrName = "name";
    }

    var q = {}
    q[attrName] = query
    return this.sendSearchQuery(q, limit, offset);
}

pmItems.loadItemsByIds = function (ids)
{
    var q = {id: ids}
    for (var i in ids)
    {
        if (this.model.items[ids[i]] === undefined)
        {
            this.model.items[ids[i]] = {}
        }
    }
    return this.sendSearchQuery(q);
}
/**
 * Обновляет поле модел this.model.items[item_id] и ложит туда пользователя
 */
pmItems.loadItem = function (item_id)
{
    if (!item_id)
    {
        throw "Error in pmItems.loadItem with item_id = `" + item_id + "`"
    }

    var def = new $.Deferred();
    var thisObj = this;

    if (thisObj.model.items[item_id] === undefined)
    {
        thisObj.model.items[item_id] = {}
    }

    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "GET",
        contentType: 'application/json',
        data: "",
        success: function (data)
        {
            //console.log("loadUser", data) 
            thisObj.model.items.justWatch(item_id)
            thisObj.model.items[item_id] = thisObj.afterItemLoad(data)
            def.resolve(data)
        },
        error: function (e)
        {
            console.warn(e)
            //polemarch.showErrors(e)
            def.reject(e)
        }
    });

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmItems.deleteItem = function (item_id, force, back_link)
{
    var thisObj = this;

    if (!item_id)
    {
        throw "Error in pmItems.deleteItem with item_id = `" + item_id + "`"
    }

    var def = new $.Deferred();
    if (!force && !confirm("Are you sure?"))
    {
        def.reject();
        return def.promise()
    }

    if(!back_link)
    {
        back_link = thisObj.model.name;
    }

    $.when(this.deleteItemQuery(item_id)).done(function (data)
    {
        $.when(spajs.open({menuId: back_link})).done(function ()
        {
            def.resolve()
        }).fail(function (e) {
            def.reject(e);
            polemarch.showErrors(e.responseJSON)
        })
    }).fail(function (e) {
        def.reject(e);
        polemarch.showErrors(e.responseJSON)
    })

    return def.promise()
}

pmItems.multiOperationsOnEachRow = function (elements, operation, force)
{
    var def = new $.Deferred();
    var item_ids = []
    for (var i = 0; i < elements.length; i++)
    {
        item_ids.push($(elements[i]).attr('data-id'))
    }

    $.when(this.multiOperationsOnItems(operation, item_ids, force)).always(function () {
        def.resolve()
    })

    return def.promise();
}

pmItems.deleteRows = function (elements)
{
    if ($.inArray(this.model.bulk_name, ['history', 'host', 'group', 'inventory', 'project', 'periodictask', 'template']) != -1)
    {
        var deleteBulk = []
        for (var i = 0; i < elements.length; i++)
        {
            deleteBulk.push({
                type: "del",
                item: this.model.bulk_name,
                pk: $(elements[i]).attr('data-id')
            })
        }

        var thisObj = this;
        return $.when(spajs.ajax.Call({
            url: hostname + "/api/v1/_bulk/",
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify(deleteBulk)
        })).always(function ()
        {
            for (var i in deleteBulk)
            {
                $(".item-" + deleteBulk[i].pk).hide();
                thisObj.toggleSelect(deleteBulk[i].pk, false);
            }
            spajs.openURL(window.location.href);
        }).promise();
    }

    $.when(this.multiOperationsOnEachRow(elements, 'deleteItemQuery')).always(function () {
        spajs.openURL(window.location.href);
    })
}

/**
 * Удалит все выделенные элементы
 * @returns {promise}
 */
pmItems.deleteSelected = function ()
{
    if ($.inArray(this.model.bulk_name, ['history', 'host', 'group', 'inventory', 'project', 'periodictask', 'template', 'user', 'team', 'hook']) != -1)
    {
        var thisObj = this;
        var deleteBulk = []
        for (var i in this.model.selectedItems)
        {
            if (this.model.selectedItems[i])
            {
                deleteBulk.push({
                    type: "del",
                    item: this.model.bulk_name,
                    pk: i
                })
            }
        }
        return $.when(spajs.ajax.Call({
            url: hostname + "/api/v1/_bulk/",
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify(deleteBulk)
        })).always(function ()
        {
            for (var i in deleteBulk)
            {
                $(".item-" + deleteBulk[i].pk).hide();
                thisObj.toggleSelect(deleteBulk[i].pk, false);
            }
            spajs.openURL(window.location.href);
        }).promise();
    }

    var item_ids = []
    for (var i in this.model.selectedItems)
    {
        if (this.model.selectedItems[i])
        {
            item_ids.push(i)
        }
    }

    return $.when(this.multiOperationsOnItems('deleteItemQuery', item_ids)).always(function () {
        spajs.openURL(window.location.href);
    }).promise();
}

pmItems.multiOperationsOnItems = function (operation, item_ids, force, def)
{
    if (!force && !confirm("Are you sure?"))
    {
        return;
    }

    if (def === undefined)
    {
        def = new $.Deferred();
    }

    if (!item_ids || !item_ids.length)
    {
        def.resolve()
        return def.promise();
    }

    var thisObj = this;
    $.when(this[operation](item_ids[0])).always(function () {
        item_ids.splice(0, 1)
        thisObj.multiOperationsOnItems(operation, item_ids, true, def);
    })

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmItems.deleteItemQuery = function (item_id)
{
    $(".item-" + item_id).hide();
    this.toggleSelect(item_id, false);

    return spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "DELETE",
        contentType: 'application/json',
        success: function (data)
        {
            $(".item-" + item_id).remove();
        },
        error: function (e)
        {
            $(".item-" + item_id).show();
        }
    });
}

pmItems.updateList = function (updated_ids)
{

    var thisObj = this;
    $.when(this.loadItemsByIds(updated_ids)).always(function ()
    {
        if (thisObj.model.updateTimeoutId)
        {
            clearTimeout(thisObj.model.updateTimeoutId)
        }
        thisObj.model.updateTimeoutId = setTimeout(function () {
            thisObj.updateList(updated_ids)
        }, 5001)
    })
}

pmItems.stopUpdates = function ()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;
}

/**
 * Обновляемый список
 * @param {string} holder пареметры навигации из spajs
 * @param {object} menuInfo пареметры навигации из spajs
 * @param {object} data пареметры навигации из spajs
 * @param {string} functionName имя функции объекта для рендера страницы
 * @param {function} searchFunction функция поиска новых данных
 * @returns {$.Deferred}
 */
pmItems.showUpdatedList = function (holder, menuInfo, data, functionName)
{
    var thisObj = this;
    if (functionName == undefined)
    {
        functionName = "showList"
    }

    return $.when(this[functionName](holder, menuInfo, data)).always(function (updated_data)
    {
        var updated_ids = []
        if (updated_data.results)
        {
            for (var i in updated_data.results)
            {
                updated_ids.push(updated_data.results[i].id)
            }
        }

        thisObj.model.updateTimeoutId = setTimeout(function () {
            thisObj.updateList(updated_ids);
        }, 5001)
    }).promise();
}

////////////////////////////////////////////////
// pagination
////////////////////////////////////////////////

pmItems.paginationHtml = function (list)
{
    var totalPage = list.count / list.limit
    if (totalPage > Math.floor(totalPage))
    {
        totalPage = Math.floor(totalPage) + 1
    }

    var currentPage = 0;
    if (list.offset)
    {
        currentPage = Math.floor(list.offset / list.limit)
    }
    var url = window.location.href
    return  spajs.just.render('pagination', {
        totalPage: totalPage,
        currentPage: currentPage,
        url: url})
}

pmItems.getTotalPages = function (list)
{
    var totalPage = list.count / list.limit
    return  totalPage
}


pmItems.exportSelecedToFile = function () {

    var item_ids = []
    for (var i in this.model.selectedItems)
    {
        if (this.model.selectedItems[i])
        {
            item_ids.push(i)
        }
    }

    return this.exportToFile(item_ids)
}

/**
 * Добавление сущности
 * @return $.Deferred
 */
pmItems.addItem = function (parent_type, parent_item, opt)
{
    var def = new $.Deferred();
    var data = {}

    for (var i in this.model.page_new.fileds)
    {
        for (var j in this.model.page_new.fileds[i])
        {
            var val = this.model.page_new.fileds[i][j];

            data[val.name] = val.filed.getValue(this, val)
            if (val.validator !== undefined && !val.validator.apply(this, [data[val.name]]))
            {
                def.reject()
                return def.promise();
            }
        }
    }

    if (this.model.page_new.onBeforeSave)
    {
        data = this.model.page_new.onBeforeSave.apply(this, [data, opt]);
        if (data == undefined || data == false)
        {
            def.reject()
            return def.promise();
        }
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/",
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function ()
        {
            var agrs = []
            for (var i = 0; i < arguments.length; i++)
            {
                agrs.push(arguments[i])
            }

            agrs.push({
                parent_type: parent_type,
                parent_item: parent_item
            })
            $.when(thisObj.model.page_new.onCreate.apply(thisObj, agrs)).always(function () {
                def.resolve()
            })
        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    });

    return def.promise();
}

pmItems.updateItem = function (item_id, opt)
{
    var def = new $.Deferred();
    var data = {}

    for (var i in this.model.page_item.fileds)
    {
        for (var j in this.model.page_item.fileds[i])
        {
            var val = this.model.page_item.fileds[i][j];

            data[val.name] = val.filed.getValue(this, val)
            if (val.validator !== undefined && !val.validator.apply(this, [data[val.name]]))
            {
                def.reject()
                return def.promise();
            }
        }
    }

    if (this.model.page_item.onBeforeSave)
    {
        data = this.model.page_item.onBeforeSave.apply(this, [data, item_id, opt]);
        if (data == undefined || data == false)
        {
            def.reject()
            return def.promise();
        }
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (data)
        {
            thisObj.model.items[item_id] = data
            $.when(thisObj.model.page_item.onUpdate.apply(thisObj, arguments)).always(function () {
                $.notify("Changes in "+thisObj.model.name+" were successfully saved", "success");
                def.resolve()
            })
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
 *Функция сравнивает полученные данные из запроса(failed_list) с теми данными, что ввел пользователь.
 *Если нашлись соответствия, то данный subItem не будет добавлен на страницу.
 */
pmItems.checkSubItemsAndAdd=function(thisObj, ObjToAdd, data, itemId, itemType, itemType_ids)
{
    var failled_list=data.failed_list;
    console.log(failled_list);
    if(thisObj.model.items[itemId])
    {
        //pmInventories.model.items[item_id].hosts= []
        thisObj.model.items[itemId][itemType] = []
        for(var i in itemType_ids)
        {
            var failIdBool=false;
            for(var j=0; j<failled_list.length; j++)
            {
                if(itemType_ids[i]==failled_list[j]){failIdBool=true;}

            }
            if(failIdBool)
            {
                var itemType1=itemType.slice(0,-1).replace(/\b\w/g, l => l.toUpperCase());
                $.notify(itemType1+" with id="+itemType_ids[i]+" doesn't exist and wouldn't be added", "error");
            }
            else
            {
                thisObj.model.items[itemId][itemType].push(ObjToAdd.model.items[itemType_ids[i]]);
            }
        }
    }
}


/**
 *Функция добавляет subitem из списка существующих subitems родительскому элементы.
 *(select2 'Add existing subitem' на странице списка дочерних элементов родителя).
 */
pmItems.addExistingChildItemToParent = function(parent_type, parent_item)
{
    var childItem_id =+ $("#add_existing_item_to_parent").val();
    var childItem_type = $("#add_existing_item_to_parent").attr('data-child-type');
    var def = new $.Deferred();
    var thisObj = this;

    if(childItem_id == "")
    {
        $.notify("Please select on of the " + childItem_type + ".", "error");
        def.reject();
    }
    else
    {
        var childIds = [];
        var parentObj = thisObj.definePmObject(parent_type);
        for(var i in  parentObj.model.items[parent_item][childItem_type])
        {
            childIds.push(parentObj.model.items[parent_item][childItem_type][i].id);
        }
        childIds.push(childItem_id);
        spajs.ajax.Call({
            url: hostname + "/api/v1/" + parentObj.model.name + "/" + parent_item + "/" + childItem_type + "/",
            type: "PUT",
            contentType: 'application/json',
            data: JSON.stringify(childIds),
            success: function (data)
            {
                $.when(spajs.open({menuId: window.location.href.split(/[&?]/g)[1], reopen: true})).done(function ()
                {
                    $.notify(capitalizeString(thisObj.model.page_name) + " " + thisObj.model.items[childItem_id].name
                        + " was added to " + parentObj.model.page_name + " " + parentObj.model.items[parent_item].name+".", "success");
                    def.resolve();
                }).fail(function ()
                {
                    def.reject();
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
 *Функция удаляет элемент из списка дочерних элементов родительского элемента.
 */
pmItems.deleteChildFromParent = function (parent_type, parent_item, childItem_id, back_link)
{
    var def = new $.Deferred();
    var thisObj = this;
    delete thisObj.model.itemsForParent[childItem_id];
    var childrenItemsIds = [];
    for(var i in thisObj.model.itemsForParent)
    {
        childrenItemsIds.push(thisObj.model.itemsForParent[i].id)
    }
    var parentObj = thisObj.definePmObject(parent_type);
    parent_type = parentObj.model.page_name;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + parentObj.model.name + "/" + parent_item + "/" + thisObj.model.name + "/",
        type: "PUT",
        contentType: 'application/json',
        data: JSON.stringify(childrenItemsIds),
        success: function (data)
        {
            var menuStr = undefined;
            if(back_link != undefined)
            {
                menuStr = back_link;
            }
            else
            {
                menuStr = window.location.href.split(/[&?]/g)[1];
            }
            $.when(spajs.open({menuId: menuStr, reopen: true})).done(function ()
            {
                $.notify(capitalizeString(thisObj.model.page_name) + " " + thisObj.model.items[childItem_id].name
                    + " was deleted from " + parentObj.model.page_name + " " + parentObj.model.items[parent_item].name+".", "success");
                def.resolve();
            }).fail(function ()
            {
                def.reject();
            });

        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 *Функция удаляет выделенные элементы из списка дочерних элементов родительского элемента.
 */
pmItems.deleteChildrenFromParent = function (parent_type, parent_item)
{
    var def = new $.Deferred();
    var thisObj = this;
    for(var i in thisObj.model.selectedItems)
    {
        if (thisObj.model.selectedItems[i])
        {
            delete thisObj.model.itemsForParent[i];
        }
    }
    var childrenItemsIds = [];
    for(var i in thisObj.model.itemsForParent)
    {
        childrenItemsIds.push(thisObj.model.itemsForParent[i].id)
    }
    var parentObj = thisObj.definePmObject(parent_type);
    parent_type = parentObj.model.page_name;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + parentObj.model.name + "/" + parent_item + "/" + thisObj.model.name + "/",
        type: "PUT",
        contentType: 'application/json',
        data: JSON.stringify(childrenItemsIds),
        success: function (data)
        {

            $.when(spajs.open({menuId: window.location.href.split(/[&?]/g)[1], reopen: true})).done(function ()
            {
                for(var i in thisObj.model.selectedItems)
                {
                    thisObj.model.selectedItems[i] = undefined;
                }
                thisObj.model.selectedCount = 0;
                $.notify("Selected "+ thisObj.model.name + " were deleted from "
                    + parentObj.model.page_name + " " + parentObj.model.items[parent_item].name+".", "success");

                def.resolve();
            }).fail(function ()
            {
                def.reject();

            });

        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/*pmItems.getFiledByName = function(fileds, name)
 {
 for(var i in fileds)
 {
 for(var j in fileds[i])
 {
 if(fileds[i][j].name == name)
 {
 return fileds[i][j]
 }
 }
 }
 debugger;
 }*/
