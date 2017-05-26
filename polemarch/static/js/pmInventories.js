 
var pmInventories = new pmItems()  

pmInventories.showList = function(holder, menuInfo, data)
{
    return $.when(pmInventories.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render('inventories_list', {}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmInventories.showItem = function(holder, menuInfo, data)
{
    console.log(menuInfo, data)
    
    return $.when(pmInventories.loadItem(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('inventory_page', {item_id:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmInventories.showNewItemPage = function(holder, menuInfo, data)
{ 
    $(holder).html(spajs.just.render('new_inventory_page', {}))
}

/**
 * Обновляет поле модел polemarch.model.userslist и ложит туда список пользователей 
 * Обновляет поле модел polemarch.model.users и ложит туда список инфу о пользователях по их id
 */
pmInventories.loadAllItems = function()
{
    return jQuery.ajax({
        url: "/api/v1/inventories/",
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
            console.log("update inventories", data)
            polemarch.model.inventorieslist = data
            polemarch.model.inventories = {}
            
            for(var i in data.results)
            {
                var val = data.results[i]
                polemarch.model.inventories[val.id] = val
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
 * Обновляет поле модел polemarch.model.users[item_id] и ложит туда пользователя
 */
pmInventories.loadItem = function(item_id)
{
    return jQuery.ajax({
        url: "/api/v1/inventories/"+item_id+"/",
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
            console.log("load inventory", data)
            polemarch.model.inventories[item_id] = data
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
pmInventories.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_inventory_name").val()
    data.vars = pmInventories.jsonEditorGetValues()
     
    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }
 
    $.ajax({
        url: "/api/v1/inventories/",
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
            console.log("inventory add", data); 
            $.notify("inventory created", "success");
            $.when(spajs.open({ menuId:"inventory-"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    }); 
    
    return def.promise();
}

/** 
 * @return $.Deferred
 */
pmInventories.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#inventory_"+item_id+"_name").val()
    data.vars = pmInventories.jsonEditorGetValues()
    
    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }
 
    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/",
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
            console.log("user inventory", data); 
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("inventory "+item_id+" update error - " + JSON.stringify(e)); 
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/** 
 * @return $.Deferred
 */
pmInventories.deleteItem = function(item_id, force)
{
    var def = new $.Deferred();
    if(!force && !confirm("Are you sure?"))
    {
        def.reject()
        return def.promise();
    }

    $.ajax({
        url: "/api/v1/inventories/"+item_id+"/",
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
            console.log("inventory delete", data);  
            $.when(spajs.open({ menuId:"inventories"})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    });
    
    return def.promise();
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmInventories.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").append(spajs.just.render('add_existing_groups_to_inventory', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmInventories.showAddSubHostsForm = function(item_id, holder)
{
    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").append(spajs.just.render('add_existing_hosts_to_inventory', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Проверяет принадлежит ли host_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} host_id
 * @returns {Boolean}
 */
pmInventories.hasHosts = function(item_id, host_id)
{
    if(polemarch.model.inventories[item_id])
    {
        for(var i in polemarch.model.inventories[item_id].hosts)
        {
            if(polemarch.model.inventories[item_id].hosts[i].id == host_id)
            {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет принадлежит ли host_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} host_id
 * @returns {Boolean}
 */
pmInventories.hasGroups = function(item_id, group_id)
{
    if(polemarch.model.inventories[item_id])
    {
        for(var i in polemarch.model.inventories[item_id].groups)
        {
            if(polemarch.model.inventories[item_id].groups[i].id == group_id)
            {
                return true;
            }
        }
    }
    return false;
}

 
/**
 * @return $.Deferred
 */
pmInventories.setSubGroups = function(item_id, groups_ids)
{
    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/groups/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        { 
            if(polemarch.model.inventories[item_id])
            {
                polemarch.model.inventories[item_id].groups = []
                for(var i in groups_ids)
                {
                    polemarch.model.inventories[item_id].groups.push(polemarch.model.groups[groups_ids[i]])
                }
            }
            console.log("group update", data);
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
 
/**
 * @return $.Deferred
 */
pmInventories.setSubHosts = function(item_id, hosts_ids)
{
    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(polemarch.model.inventories[item_id])
            {
                polemarch.model.inventories[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    polemarch.model.inventories[item_id].hosts.push(polemarch.model.hosts[hosts_ids[i]])
                }
            }
            console.log("inventories update", data);
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}