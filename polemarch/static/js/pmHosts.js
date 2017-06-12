
var pmHosts = new pmItems()  

pmHosts.showList = function(holder, menuInfo, data)
{
    return $.when(pmHosts.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render('hosts_list', {query:""}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}
  
pmHosts.search = function(query)
{
    return spajs.open({ menuId:"hosts/search/"+query, reopen:true});
}

pmHosts.showSearchResults = function(holder, menuInfo, data)
{
    return $.when(pmHosts.searchItems(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('hosts_list', {query:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHosts.showItem = function(holder, menuInfo, data)
{
    console.log(menuInfo, data)
    
    return $.when(pmHosts.loadItem(data.reg[1])).done(function()
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
pmHosts.loadAllItems = function()
{
    return jQuery.ajax({
        url: "/api/v1/hosts/",
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
    data.vars = pmHosts.jsonEditorGetValues()
     
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
    data.vars = pmHosts.jsonEditorGetValues()

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
        def.reject()
        return def.promise();
    }

    return $.ajax({
        url: "/api/v1/hosts/"+item_id+"/",
        type: "DELETE",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            console.log("deleteItem", data);
            spajs.open({ menuId:"hosts"})
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
} 