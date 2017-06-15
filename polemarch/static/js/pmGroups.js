
var pmGroups = new pmItems()

pmGroups.showList = function(holder, menuInfo, data)
{
    return $.when(pmGroups.loadItems()).done(function()
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
    $(holder).html(spajs.just.render('new_group_page', {parent_item:data.reg[2], parent_type:data.reg[1]}))
}

/**
 * Обновляет поле модел polemarch.model.groupslist и ложит туда список пользователей
 * Обновляет поле модел polemarch.model.groups и ложит туда список инфу о пользователях по их id
 */
pmGroups.loadItems = function()
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
pmGroups.addItem = function(parent_type, parent_item)
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
                    $.when(spajs.open({ menuId:"group/"+data.id})).always(function(){
                        def.resolve()
                    })
                }
            }
            else
            {
                $.when(spajs.open({ menuId:"group/"+data.id})).always(function(){
                    def.resolve()
                })
            }
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
            if(polemarch.model.groups[item_id])
            {
                polemarch.model.groups[item_id].groups = []
                for(var i in groups_ids)
                {
                    polemarch.model.groups[item_id].groups.push(polemarch.model.groups[groups_ids[i]])
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
            if(polemarch.model.groups[item_id])
            {
                polemarch.model.groups[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    polemarch.model.groups[item_id].hosts.push(polemarch.model.hosts[hosts_ids[i]])
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
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmGroups.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadItems()).done(function(){
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
    return $.when(pmHosts.loadItems()).done(function(){
        $("#add_existing_item_to_group").remove()
        $(".content").append(spajs.just.render('add_existing_hosts_to_group', {item_id:item_id}))
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
pmGroups.hasHosts = function(item_id, host_id)
{
    if(polemarch.model.groups[item_id])
    {
        for(var i in polemarch.model.groups[item_id].hosts)
        {
            if(polemarch.model.groups[item_id].hosts[i].id == host_id)
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
pmGroups.hasGroups = function(item_id, group_id)
{
    if(polemarch.model.groups[item_id])
    {
        for(var i in polemarch.model.groups[item_id].groups)
        {
            if(polemarch.model.groups[item_id].groups[i].id == group_id)
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
