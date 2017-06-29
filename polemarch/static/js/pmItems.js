
function pmItems()
{
    this.pageSize = 20;
    this.model = {};
    this.model.selectedItems = {};

    this.model.itemslist = []
    this.model.items = {}
    this.model.name = "based"

    this.toggleSelect = function(item_id, mode)
    {
        if(mode === undefined)
        {
            this.model.selectedItems[item_id] = !this.model.selectedItems[item_id]
        }
        else
        {
            this.model.selectedItems[item_id] = mode
        }

        this.model.selectedCount = $('.multiple-select .item-row.selected').length;
        return this.model.selectedItems[item_id];
    }

    this.toggleSelectAll = function(elements, mode)
    {
        for(var i=0; i< elements.length; i++)
        {
            this.toggleSelect($(elements[i]).attr('data-id'), mode)
        }
    }

    this.validateHostName = function(name)
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

        if(regexp.ipTest.test(name))
        {
            return true;
        }

        if(regexp.ip6Test.test(name))
        {
            return true;
        }

        if(regexp.domenTest.test(name))
        {
            return true;
        }

        return false;
    }

    this.validateRangeName = function(name)
    {
        if(!name)
        {
            return false;
        }

        return name.replace(/\[([0-9A-z]+):([0-9A-z]+)\]/g, "$1") && name.replace(/\[([0-9A-z]+):([0-9A-z]+)\]/g, "$2")
    }


    this.showList = function(holder, menuInfo, data)
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
            $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:""}))

            thisObj.model.selectedCount = $('.multiple-select .selected').length;

        }).fail(function()
        {
            $.notify("", "error");
        })
    }

    this.search = function(query)
    {
        if(!query || !trim(query))
        {
            return spajs.open({ menuId:this.model.name, reopen:true});
        }

        return spajs.open({ menuId:this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
    }

    this.showSearchResults = function(holder, menuInfo, data)
    {
        var thisObj = this;
        return $.when(this.searchItems(data.reg[1])).done(function()
        {
            $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
        }).fail(function()
        {
            $.notify("", "error");
        })
    }

    this.showItem = function(holder, menuInfo, data)
    {
        var thisObj = this;
        console.log(menuInfo, data)

        return $.when(this.loadItem(data.reg[1])).done(function()
        {
            $(holder).html(spajs.just.render(thisObj.model.name+'_page', {item_id:data.reg[1]}))
        }).fail(function()
        {
            $.notify("", "error");
        })
    }

    this.showNewItemPage = function(holder, menuInfo, data)
    {
        $(holder).html(spajs.just.render(this.model.name+'_new_page', {parent_item:data.reg[2], parent_type:data.reg[1]}))
    }

    /**
     * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
     * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
     */
    this.loadItems = function(limit, offset)
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
        return jQuery.ajax({
            url: "/api/v1/"+this.model.name+"/",
            type: "GET",
            contentType:'application/json',
            data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(data)
            {
                console.log("update Items", data)
                thisObj.model.itemslist = data
                thisObj.model.itemslist.limit = limit
                thisObj.model.itemslist.offset = offset
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
                console.log(e)
                polemarch.showErrors(e)
            }
        });
    }

    this.searchItems = function(query)
    {
        var thisObj = this;
        return jQuery.ajax({
            url: "/api/v1/"+this.model.name+"/?name="+encodeURIComponent(query),
            type: "GET",
            contentType:'application/json',
            data: "",
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(data)
            {
                console.log("update Items", data)
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
                console.log(e)
                polemarch.showErrors(e)
            }
        });
    }

    /**
     * Обновляет поле модел this.model.items[item_id] и ложит туда пользователя
     */
    this.loadItem = function(item_id)
    {
        var thisObj = this;
        return jQuery.ajax({
            url: "/api/v1/"+this.model.name+"/"+item_id+"/",
            type: "GET",
            contentType:'application/json',
            data: "",
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(data)
            {
                console.log("loadUser", data)
                thisObj.model.items[item_id] = data
            },
            error:function(e)
            {
                console.log(e)
                polemarch.showErrors(e)
            }
        });
    }

    /**
     * @return $.Deferred
     */
    this.deleteItem = function(item_id, force)
    {
        if(!force && !confirm("Are you sure?"))
        {
            return;
        }
        var thisObj = this;
        return $.when(this.deleteItemQuery(item_id)).done(function(data){
            console.log("deleteItem", data);
            spajs.open({ menuId:thisObj.model.name})
        }).fail(function(e){
            polemarch.showErrors(e.responseJSON)
        }).promise()
    }

    this.multiOperationsOnEachRow = function(elements, operation)
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

    this.deleteRows = function(elements)
    {
        $.when(this.multiOperationsOnEachRow(elements, 'deleteItemQuery')).always(function(){
            spajs.openURL(window.location.href);
        })
    }

    this.multiOperationsOnItems = function(operation, item_ids, force, def)
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
    this.deleteItemQuery = function(item_id)
    {
        $(".item-"+item_id).remove();
        this.toggleSelect(item_id, false);

        return $.ajax({
            url: "/api/v1/"+this.model.name+"/"+item_id+"/",
            type: "DELETE",
            contentType:'application/json',
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            }
        });
    }

    this.updateList = function(limit, offset)
    {
        var thisObj = this;
        $.when(this.loadItems(limit, offset)).always(function(){
            thisObj.model.updateTimeoutId = setTimeout(
                    function(limit, offset){
                        thisObj.updateList(limit, offset)
                    }, 1000, limit, offset)
        })
    }

    this.stopUpdates = function()
    {
        clearTimeout(this.model.updateTimeoutId)
        this.model.updateTimeoutId = undefined;
    }
    
    this.showUpdatedList = function(holder, menuInfo, data)
    {
        var thisObj = this;
        return $.when(this.showList(holder, menuInfo, data)).always(function()
        {
            var offset = 0
            var limit = this.pageSize;
            if(data.reg && data.reg[1] > 0)
            {
                offset = this.pageSize*(data.reg[1] - 1);
            }
            thisObj.model.updateTimeoutId = setTimeout(function(limit, offset){
                thisObj.updateList(limit, offset);
            }, 1000, limit, offset) 
        }).promise();
    }

    ////////////////////////////////////////////////
    // pagination
    ////////////////////////////////////////////////

    this.paginationHtml = function(list)
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

    this.getTotalPages = function(list)
    {
        var totalPage = list.count / list.limit
        return  totalPage
    }
}


/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}

