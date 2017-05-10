
var pmHosts = new pmItems()  

pmHosts.showList = function(holder, menuInfo, data)
{
    return $.when(pmHosts.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render('hosts_list', {}))
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
    $(holder).html(spajs.just.render('new_host_page', {}))
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
            polemarch.model.hosts = {}
            
            for(var i in polemarch.model.hosts.results)
            {
                var val = polemarch.model.hosts.results[i]
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
pmHosts.addItem = function()
{
    var data = {}

    data.name = $("#new_host_name").val()
    data.type = $("#new_host_type").val()
    data.vars = $("#new_host_vars").val() 

    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }
 
    return $.ajax({
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
            spajs.open({ menuId:"host-"+data.id})
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
pmHosts.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#host_"+item_id+"_name").val()
    data.type = $("#host_"+item_id+"_type").val()
    data.vars = $("#host_"+item_id+"_vars").val() 

    if(!data.name)
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
pmHosts.deleteItem = function(item_id)
{
    if(!confirm("Are you sure?"))
    {
        return;
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
