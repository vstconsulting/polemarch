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
    if (this.isEmptySearchQuery(query))
    {       
        return spajs.open({menuId: this.model.name, reopen: true});

    }
   

    return spajs.open({menuId: this.model.name + "/search/" + this.searchObjectToString(trim(query)), reopen: true});
    //this.paginationHtml(this.model.itemslist);
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
                url: "/api/v1/" + thisObj.model.name + "/",
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
        url: "/api/v1/" + thisObj.model.name + "/",
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

pmItems.copyAndEdit = function (item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    return $.when(this.copyItem(item_id)).done(function (newItemId)
    {
        $.when(spajs.open({menuId: thisObj.model.page_name + "/" + newItemId})).done(function () {
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

pmItems.showNewItemPage = function (holder, menuInfo, data)
{
    var def = new $.Deferred();

    var tpl = this.model.name + '_new_page'
    if (!spajs.just.isTplExists(tpl))
    {
        tpl = 'items_new_page'
    }

    var text = spajs.just.render(tpl, {parent_item: data.reg[2], parent_type: data.reg[1], pmObj: this, opt: {}})
    $(holder).insertTpl(text)

    def.resolve()
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
        url: "/api/v1/" + this.model.name + "/",
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
        url: "/api/v1/" + this.model.name + "/?" + q.join("&"),
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
        url: "/api/v1/" + this.model.name + "/" + item_id + "/",
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
pmItems.deleteItem = function (item_id, force)
{
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

    var thisObj = this;
    $.when(this.deleteItemQuery(item_id)).done(function (data)
    {
        $.when(spajs.open({menuId: thisObj.model.name})).done(function ()
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
            url: "/api/v1/_bulk/",
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
    if ($.inArray(this.model.bulk_name, ['history', 'host', 'group', 'inventory', 'project', 'periodictask', 'template']) != -1)
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
            url: "/api/v1/_bulk/",
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
        url: "/api/v1/" + this.model.name + "/" + item_id + "/",
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
        url: "/api/v1/" + this.model.name + "/",
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
        url: "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (data)
        {
            thisObj.model.items[item_id] = data
            $.when(thisObj.model.page_item.onUpdate.apply(thisObj, arguments)).always(function () {
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