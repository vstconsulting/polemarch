
var pmGroups = new pmItems()

pmGroups.showList = function(holder, menuInfo, data)
{
    return $.when(pmGroups.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render('groups_list', {}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmGroups.showItem = function(holder, menuInfo, data)
{
    console.log(menuInfo, data)

    return $.when(pmGroups.loadItem(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('group_page', {item_id:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmGroups.showNewItemPage = function(holder, menuInfo, data)
{
    $(holder).html(spajs.just.render('new_group_page', {}))
}

/**
 * Обновляет поле модел polemarch.model.groupslist и ложит туда список пользователей
 * Обновляет поле модел polemarch.model.groups и ложит туда список инфу о пользователях по их id
 */
pmGroups.loadAllItems = function()
{
    var def = new $.Deferred();
    jQuery.ajax({
        url: "/api/v1/groups/",
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
            console.log("updateGroups", data)
            polemarch.model.groupslist = data
            polemarch.model.groups = {}

            for(var i in data.results)
            {
                var val = data.results[i]
                polemarch.model.groups[val.id] = val
            }
            def.resolve()
        },
        error:function(e)
        {
            console.log(e)
            polemarch.showErrors(e)
            def.reject()
        }
    });
    return def.promise();
}

/**
 * Обновляет поле модел polemarch.model.users[item_id] и ложит туда пользователя
 */
pmGroups.loadItem = function(item_id)
{
    return jQuery.ajax({
        url: "/api/v1/groups/"+item_id+"/",
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
            console.log("loadGroup", data)
            polemarch.model.groups[item_id] = data
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
pmGroups.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_group_name").val()
    data.vars = pmGroups.jsonEditorGetValues()

    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }

    $.ajax({
        url: "/api/v1/groups/",
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
            console.log("group add", data);
            $.notify("Group created", "success");
            $.when(spajs.open({ menuId:"group-"+data.id})).always(function(){
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
pmGroups.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#group_"+item_id+"_name").val()
    data.vars = pmGroups.jsonEditorGetValues()

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }

    return $.ajax({
        url: "/api/v1/groups/"+item_id+"/",
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
pmGroups.addSubGroups = function(item_id, groups_ids)
{
    for(var i in polemarch.model.groups[item_id].groups)
    {
        groups_ids.push(polemarch.model.groups[item_id].groups[i].id)
    }
    
    return pmGroups.setSubGroups(item_id, groups_ids)
}

/**
 * @return $.Deferred
 */
pmGroups.setSubGroups = function(item_id, groups_ids)
{
    return $.ajax({
        url: "/api/v1/groups/"+item_id+"/groups/",
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
pmGroups.addSubHosts = function(item_id, hosts_ids)
{
    for(var i in polemarch.model.groups[item_id].hosts)
    {
        hosts_ids.push(polemarch.model.groups[item_id].hosts[i].id)
    }
    
    return pmGroups.setSubHosts(item_id, hosts_ids)
}

/**
 * @return $.Deferred
 */
pmGroups.setSubHosts = function(item_id, hosts_ids)
{
    return $.ajax({
        url: "/api/v1/groups/"+item_id+"/hosts/",
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
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmGroups.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_group").remove()
        $(".content").append(spajs.just.render('add_existing_groups_to_group', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmGroups.showAddSubHostsForm = function(item_id, holder)
{
    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_group").remove()
        $(".content").append(spajs.just.render('add_existing_hosts_to_group', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * @return $.Deferred
 */
pmGroups.deleteItem = function(item_id, force)
{
    var def = new $.Deferred();
    if(!force && !confirm("Are you sure?"))
    {
        def.reject()
        return def.promise();
    }

    $.ajax({
        url: "/api/v1/groups/"+item_id+"/",
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
            console.log("groups delete", data);
            $.when(spajs.open({ menuId:"groups"})).always(function(){
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
