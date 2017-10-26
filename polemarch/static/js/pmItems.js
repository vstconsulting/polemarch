
function inheritance(obj)
{
    var item = jQuery.extend(true, {}, obj)
    return item
}

function pmItems()
{

}

pmItems.pageSize = 20;
pmItems.model = {};
pmItems.model.selectedItems = {};

pmItems.model.itemslist = []
pmItems.model.items = {}
pmItems.model.name = "based"
pmItems.model.page_name = "based"
pmItems.model.selectedCount = 0;
pmItems.model.className = "pmItems"

pmItems.toggleSelect = function(item_id, mode)
{
    if(!item_id)
    {
        return;
    }

    console.log(item_id, mode)
    if(mode === undefined)
    {
        this.model.selectedItems[item_id] = !this.model.selectedItems[item_id]
        if(this.model.selectedItems[item_id])
        {
            this.model.selectedCount++
        }
        else
        {
            this.model.selectedCount--
        }
    }
    else
    {
        if(this.model.selectedItems[item_id] != mode)
        {
            if(mode)
            {
                this.model.selectedCount++
            }
            else
            {
                this.model.selectedCount--
            }
        }
        this.model.selectedItems[item_id] = mode
    }

    if(this.model.selectedCount < 0)
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
pmItems.toggleSelectEachItem = function(mode)
{
    var thisObj = this;
    return $.when(this.loadAllItems()).done(function()
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

pmItems.toggleSelectAll = function(elements, mode)
{
    for(var i=0; i< elements.length; i++)
    {
        this.toggleSelect($(elements[i]).attr('data-id'), mode)
    }
}

pmItems.validateHostName = function(name)
{
    if(!name)
    {
        return false;
    }

    var regexp = {
        ipTest : /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
        ip6Test : /((^|:)([0-9a-fA-F]{0,4})){1,8}$/,
        domenTest : /^((\.{0,1}[a-z0-9][a-z0-9-]{0,62}[a-z0-9]\.{0,1})*)$/
    }

    if(regexp.ipTest.test(name.toLowerCase()))
    {
        return true;
    }

    if(regexp.ip6Test.test(name.toLowerCase()))
    {
        return true;
    }

    if(regexp.domenTest.test(name.toLowerCase()))
    {
        return true;
    }

    return false;
}

pmItems.validateRangeName = function(name)
{
    if(!name)
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
pmItems.showList = function(holder, menuInfo, data)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[1] > 0)
    {
        offset = this.pageSize*(data.reg[1] - 1);
    }

    return $.when(this.loadItems(limit, offset)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:""}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

/** 
 * @param {string} query 
 * @returns {HTML} Шаблон формы поиска
 */
pmItems.searchFiled = function(options)
{
    options.className = this.model.className;
    this.model.searchAdditionalData = options
    return spajs.just.render('searchFiled', {opt:options});
}

/**
 * Выполняет переход на страницу с результатами поиска
 * @param {string} query 
 * @returns {$.Deferred}
 */
pmItems.search = function(query, options)
{
    if(this.isEmptySearchQuery(query))
    {
        return spajs.open({ menuId:this.model.name, reopen:true});
    }
 
    return spajs.open({ menuId:this.model.name+"/search/"+this.searchObjectToString(trim(query)), reopen:true});
}

/**
 * Если поисковый запрос пуст то вернёт true
 * @param {type} query
 * @returns {Boolean}
 */
pmItems.isEmptySearchQuery = function(query)
{
    if(!query || !trim(query))
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
pmItems.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;
    return $.when(this.sendSearchQuery(this.searchStringToObject(decodeURIComponent(data.reg[1])))).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmItems.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name
        spajs.ajax.Call({
            url: "/api/v1/"+thisObj.model.name+"/",
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
    }).fail(function(){
        def.reject(e)
    })

    return def.promise();
}

pmItems.importItem = function(data)
{
    var def = new $.Deferred();
    var thisObj = this;

    spajs.ajax.Call({
        url: "/api/v1/"+thisObj.model.name+"/",
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
            $.notify("Error in import item", "error");
            polemarch.showErrors(e)
            def.reject(e)
        }
    });
    return def.promise();
}

pmItems.copyAndEdit = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    return $.when(this.copyItem(item_id)).done(function(newItemId)
    {
        $.when(spajs.open({ menuId:thisObj.model.page_name + "/"+newItemId})).done(function(){
            $.notify("Item was duplicate", "success");
            def.resolve()
        }).fail(function(e){
            $.notify("Error in duplicate item", "error");
            polemarch.showErrors(e)
            def.reject()
        })
    }).fail(function(){
        def.reject()
    })

    return def.promise();
}

pmItems.showItem = function(holder, menuInfo, data)
{
    var thisObj = this;
    //console.log(menuInfo, data)

    return $.when(this.loadItem(data.reg[1])).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_page', {item_id:data.reg[1], project_id:0}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmItems.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();

    var text = spajs.just.render(this.model.name+'_new_page', {parent_item:data.reg[2], parent_type:data.reg[1]})
    console.log(text)
    $(holder).insertTpl(text)

    def.resolve()
    return def.promise();
}

pmItems.loadAllItems = function()
{
    return this.loadItems(999999);
}
/**
 * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
 * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
 */
pmItems.loadItems = function(limit, offset)
{
    if(!limit)
    {
        limit = 30;
    }

    if(!offset)
    {
        offset = 0;
    }

    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/",
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
                success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            for(var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)
            }
        },
        error:function(e)
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
pmItems.searchStringToObject = function(query, defaultName)
{
    var search = {}
    if(query == "")
    {
        return search;
    }
    
    if(!defaultName)
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
pmItems.searchObjectToString = function(query, defaultName)
{
    return encodeURIComponent(query);
}

/**
 * Функция поиска
 * @param {string|object} query запрос
 * @param {integer} limit
 * @param {integer} offset
 * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
 */
pmItems.sendSearchQuery = function(query, limit, offset)
{
    if(!limit)
    {
        limit = 999; 
    }

    if(!offset)
    {
        offset = 0; 
    }

    var q = [];
    
    q.push("limit="+encodeURIComponent(limit))
    q.push("offset="+encodeURIComponent(offset))
    
    for(var i in query)
    {
        if(Array.isArray(query[i]))
        {
            for(var j in query[i])
            {
                query[i][j] = encodeURIComponent(query[i][j])
            }
            q.push(encodeURIComponent(i)+"="+query[i].join(","))
            continue;
        }
        q.push(encodeURIComponent(i)+"="+encodeURIComponent(query[i]))
    }
    

    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/?"+q.join("&"),
        type: "GET",
        contentType:'application/json', 
        success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            for(var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items[val.id] = val
            }
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

pmItems.searchItems = function(query, attrName, limit, offset)
{
    if(!attrName)
    {
        attrName = "name";
    }

    var q = {}
    q[attrName] = query
    return this.sendSearchQuery(q, limit, offset);
}

pmItems.loadItemsByIds = function(ids)
{ 
    var q = {id_in:ids} 
    for(var i in ids)
    { 
        if(this.model.items[ids[i]] === undefined)
        {
            this.model.items[ids[i]] = {}
        } 
    }
    return this.sendSearchQuery(q);
}
/**
 * Обновляет поле модел this.model.items[item_id] и ложит туда пользователя
 */
pmItems.loadItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    
    if(thisObj.model.items[item_id] === undefined)
    {
        thisObj.model.items[item_id] = {}
    }
  
    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "GET",
        contentType:'application/json',
        data: "",
        success: function(data)
        {
            //console.log("loadUser", data)
            thisObj.model.items.justWatch(item_id)
            thisObj.model.items[item_id] = data
            def.resolve(data)
        },
        error:function(e)
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
pmItems.deleteItem = function(item_id, force)
{
    if(!force && !confirm("Are you sure?"))
    {
        return;
    }
    var thisObj = this;
    return $.when(this.deleteItemQuery(item_id)).done(function(data){
        //console.log("deleteItem", data);
        spajs.open({ menuId:thisObj.model.name})
    }).fail(function(e){
        polemarch.showErrors(e.responseJSON)
    }).promise()
}

pmItems.multiOperationsOnEachRow = function(elements, operation)
{
    var def = new $.Deferred();
    var item_ids = []
    for(var i=0; i< elements.length; i++)
    {
        item_ids.push($(elements[i]).attr('data-id'))
    }

    $.when(this.multiOperationsOnItems(operation, item_ids)).always(function(){
        def.resolve()
    })

    return def.promise();
}

pmItems.deleteRows = function(elements)
{
    $.when(this.multiOperationsOnEachRow(elements, 'deleteItemQuery')).always(function(){
        spajs.openURL(window.location.href);
    })
}

pmItems.deleteSelected = function()
{
    var item_ids = []
    for(var i in this.model.selectedItems)
    {
        if(this.model.selectedItems[i])
        {
            item_ids.push(i)
        }
    }

    return $.when(this.multiOperationsOnItems('deleteItemQuery', item_ids)).always(function(){
        spajs.openURL(window.location.href);
    }).promise();
}

pmItems.multiOperationsOnItems = function(operation, item_ids, force, def)
{
    if(!force && !confirm("Are you sure?"))
    {
        return;
    }

    if(def === undefined)
    {
        def = new $.Deferred();
    }

    if(!item_ids || !item_ids.length)
    {
        def.resolve()
        return def.promise();
    }

    var thisObj = this;
    $.when(this[operation](item_ids[0])).always(function(){
        item_ids.splice(0, 1)
        thisObj.multiOperationsOnItems(operation, item_ids, true, def);
    })

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmItems.deleteItemQuery = function(item_id)
{
    $(".item-"+item_id).hide();
    this.toggleSelect(item_id, false);

    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "DELETE",
        contentType:'application/json',
        success: function(data)
        {
            $(".item-"+item_id).remove();
        },
        error:function(e)
        {
            $(".item-"+item_id).show();
        }
    });
}

pmItems.updateList = function(menuInfo, data, searchFunction)
{
    var thisObj = this;
    $.when(searchFunction(menuInfo, data)).always(function()
    {
        if(thisObj.model.updateTimeoutId)
        {
            clearTimeout(thisObj.model.updateTimeoutId)
        }
        thisObj.model.updateTimeoutId = setTimeout(function(){
            thisObj.updateList(menuInfo, data, searchFunction)
        }, 5001)
    })
}

pmItems.stopUpdates = function()
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
pmItems.showUpdatedList = function(holder, menuInfo, data, functionName, searchFunction)
{
    var thisObj = this;
    if(functionName == undefined)
    {
        functionName = "showList"
    }

    if(searchFunction == undefined)
    {
        searchFunction = function(menuInfo, data)
        {
            var offset = 0
            var limit = thisObj.pageSize;
            if(data.reg && data.reg[1] > 0)
            {
                offset = thisObj.pageSize*(data.reg[1] - 1);
            }

            return thisObj.loadItems(limit, offset)
        }
    }

    return $.when(this[functionName](holder, menuInfo, data)).always(function()
    {
        thisObj.model.updateTimeoutId = setTimeout(function(){
            thisObj.updateList(menuInfo, data, searchFunction);
        }, 5001)
    }).promise();
}

////////////////////////////////////////////////
// pagination
////////////////////////////////////////////////

pmItems.paginationHtml = function(list)
{
    var totalPage = list.count / list.limit
    if(totalPage > Math.floor(totalPage))
    {
        totalPage = Math.floor(totalPage) + 1
    }

    var currentPage = 0;
    if(list.offset)
    {
        currentPage = Math.floor(list.offset / list.limit)
    }
    var url = window.location.href
    return  spajs.just.render('pagination', {
        totalPage:totalPage,
        currentPage:currentPage,
        url:url})
}

pmItems.getTotalPages = function(list)
{
    var totalPage = list.count / list.limit
    return  totalPage
}


pmItems.exportSelecedToFile = function(){

    var item_ids = []
    for(var i in this.model.selectedItems)
    {
        if(this.model.selectedItems[i])
        {
            item_ids.push(i)
        }
    }

    return this.exportToFile(item_ids)
}
