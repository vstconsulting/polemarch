
var pmHosts = new pmItems()

pmHosts.showList = function(holder, menuInfo, data)
{
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[1] > 0)
    {
        offset = this.pageSize*(data.reg[1] - 1);
    }

    return $.when(this.loadItems(limit, offset)).done(function()
    {
        $(holder).html(spajs.just.render('hosts_list', {query:""}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHosts.search = function(query)
{
    if(!query || !trim(query))
    {
        return spajs.open({ menuId:"hosts", reopen:true});
    }

    return spajs.open({ menuId:"hosts/search/"+encodeURIComponent(trim(query)), reopen:true});
}

pmHosts.showSearchResults = function(holder, menuInfo, data)
{
    return $.when(this.searchItems(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('hosts_list', {query:decodeURIComponent(data.reg[1])}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHosts.showItem = function(holder, menuInfo, data)
{
    console.log(menuInfo, data)

    return $.when(this.loadItem(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('host_page', {item_id:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHosts.showNewItemPage = function(holder, menuInfo, data)
{
    $(holder).html(spajs.just.render('new_host_page', {parent_item:data.reg[2], parent_type:data.reg[1]}))
}

/**
 * Обновляет поле модел polemarch.model.hostslist и ложит туда список пользователей
 * Обновляет поле модел polemarch.model.hosts и ложит туда список инфу о пользователях по их id
 */
pmHosts.loadItems = function(limit, offset)
{
    if(!limit)
    {
        limit = 30;
    }

    if(!offset)
    {
        offset = 0;
    }

    return jQuery.ajax({
        url: "/api/v1/hosts/",
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
            polemarch.model.hostslist = data
            polemarch.model.hostslist.limit = limit
            polemarch.model.hostslist.offset = offset
            //polemarch.model.hosts = {}

            for(var i in data.results)
            {
                var val = data.results[i]
                polemarch.model.hosts[val.id] = val
            }
        },
        error:function(e)
        {
            console.log(e)
            polemarch.showErrors(e)
        }
    });
}

pmHosts.searchItems = function(query)
{
    return jQuery.ajax({
        url: "/api/v1/hosts/?name="+encodeURIComponent(query),
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
            polemarch.model.hostslist = data
            //polemarch.model.hosts = {}

            for(var i in data.results)
            {
                var val = data.results[i]
                polemarch.model.hosts[val.id] = val
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
 * Обновляет поле модел polemarch.model.hosts[item_id] и ложит туда пользователя
 */
pmHosts.loadItem = function(item_id)
{
    return jQuery.ajax({
        url: "/api/v1/hosts/"+item_id+"/",
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
            polemarch.model.hosts[item_id] = data
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
pmHosts.addItem = function(parent_type, parent_item)
{
    var def = new $.Deferred();

    var data = {}

    data.name = $("#new_host_name").val()
    data.type = $("#new_host_type").val()
    data.vars = this.jsonEditorGetValues()

    if(data.type == "HOST"  && (!data.name || !this.validateHostName(data.name)))
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }
    else if(data.type == "RANGE"  && (!data.name || !this.validateRangeName(data.name)))
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }

    $.ajax({
        url: "/api/v1/hosts/",
        type: "POST",
        contentType:'application/json',
        data: JSON.stringify(data),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            console.log("addItem", data);
            $.notify("Host created", "success");

            if(parent_item)
            {
                if(parent_type == 'group')
                {
                    $.when(pmGroups.setSubGroups(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"group/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
                else if(parent_type == 'inventory')
                {
                    $.when(pmInventories.setSubGroups(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"inventory/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
                else if(parent_type == 'project')
                {
                    $.when(pmProjects.setSubGroups(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"project/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
                else
                {
                    console.error("Не известный parent_type", parent_type)
                    $.when(spajs.open({ menuId:"host/"+data.id})).always(function(){
                        def.resolve()
                    })
                }
            }
            else
            {
                $.when(spajs.open({ menuId:"host/"+data.id})).always(function(){
                    def.resolve()
                })
            }

        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}

/**
 * @return $.Deferred
 */
pmHosts.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#host_"+item_id+"_name").val()
    data.type = $("#host_"+item_id+"_type").val()
    data.vars = this.jsonEditorGetValues()

    // @todo Добавить валидацию диапазонов "127.0.1.[5:6]" и 127.0.1.1, 127.0.1.2
    if(!data.name || !this.validateHostName(data.name))
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }

    return $.ajax({
        url: "/api/v1/hosts/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data:JSON.stringify(data),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            console.log("updateItem", data);
            $.notify("Save", "success");
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmHosts.deleteItem = function(item_id, force)
{
    if(!force && !confirm("Are you sure?"))
    { 
        return;
    }

    return $.when(this.deleteItemQuery(item_id)).done(function(data){
        console.log("deleteItem", data);
        spajs.open({ menuId:"hosts"})
    }).fail(function(e){
        polemarch.showErrors(e.responseJSON)
    }).promise()
}

pmHosts.deleteRows = function(elements)
{
    var item_ids = []
    for(var i=0; i< elements.length; i++)
    {
        item_ids.push($(elements[i]).attr('data-id'))
    }
    
    $.when(pmHosts.deleteItems(item_ids)).always(function(){
        spajs.openURL(window.location.href);
    })
}

pmHosts.deleteItems = function(item_ids, force, def)
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
     
    $.when(pmHosts.deleteItemQuery(item_ids[0])).always(function(){
        item_ids.splice(0, 1)
        pmHosts.deleteItems(item_ids, true, def);
    })
    
    return def.promise();
}

/**
 * @return $.Deferred
 */
pmHosts.deleteItemQuery = function(item_id)
{
    $(".item-"+item_id).remove();
    this.toggleSelect(item_id, false);
    
    return $.ajax({
        url: "/api/v1/hosts/"+item_id+"/",
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

/*
 * 
detail:"database is locked"
error_type:"OperationalError"
 * 
for(var i =0; i< 1000; i++)
{
    name = Math.random()+"-"+Math.random()
    name = name.replace(/\./g, "")
    $.ajax({
            url: "/api/v1/hosts/",
            type: "POST",
            contentType:'application/json',
            data: JSON.stringify({name:name, type:"HOST"}),
            beforeSend: function(xhr, settings) {
                if (!(/^http:/.test(settings.url) || /^https:/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            }
    })
}
 */ 