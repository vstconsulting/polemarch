
var pmGroups = inheritance(pmItems)
pmGroups.model.name = "groups"
pmGroups.model.page_name = "group"
jsonEditor.options[pmGroups.model.name] = jsonEditor.options['item'];
 
pmGroups.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy-from-" + data.name
        $.ajax({
            url: "/api/v1/"+thisObj.model.name+"/",
            type: "POST",
            contentType:'application/json',
            data: JSON.stringify(data),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(newItem)
            {
                thisObj.model.items[newItem.id] = newItem
                
                if(data.children)
                {
                    var groups = []
                    for(var i in data.groups)
                    {
                        groups.push(data.groups[i].id)
                    } 
                    $.when(thisObj.setSubGroups(newItem.id, groups)).always(function(){
                        def.resolve(newItem.id)
                    })
                }
                else
                {
                    var hosts = []
                    for(var i in data.hosts)
                    {
                        hosts.push(data.hosts[i].id)
                    } 

                    $.when(thisObj.setSubHosts(newItem.id, hosts)).always(function(){
                        def.resolve(newItem.id)
                    }) 
                }
            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    }).fail(function(e)
    {
        def.reject(e)
    })

    return def.promise();
} 

  
/**
 * @param {string} parent_type 
 * @param {integer} parent_item 
 * @return $.Deferred 
 */
pmGroups.addItem = function(parent_type, parent_item)
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_group_name").val()
    data.children = $("#new_group_children").hasClass('selected')
    data.vars = jsonEditor.jsonEditorGetValues()

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
            //console.log("group add", data);
            $.notify("Group created", "success");

            if(parent_item)
            {
                if(parent_type == 'group')
                {
                    $.when(pmGroups.addSubGroups(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"group/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
                else if(parent_type == 'inventory')
                {
                    $.when(pmInventories.addSubGroups(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"inventory/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
                else if(parent_type == 'project')
                {
                    $.when(pmProjects.addSubGroups(parent_item, [data.id])).always(function(){
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
    //data.children = $("#group_"+item_id+"_children").hasClass('selected')
    data.vars = jsonEditor.jsonEditorGetValues()

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
            //console.log("group update", data);
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
 
/**
 * @return $.Deferred
 */
pmGroups.setSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    return $.ajax({
        url: "/api/v1/groups/"+item_id+"/groups/",
        type: "PUT",
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
            if(pmGroups.model.items[item_id])
            {
                pmGroups.model.items[item_id].groups = []
                for(var i in groups_ids)
                {
                    pmGroups.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
            //console.log("group update", data); 
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
 
/**
 * @return $.Deferred
 */
pmGroups.setSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    return $.ajax({
        url: "/api/v1/groups/"+item_id+"/hosts/",
        type: "PUT",
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
            if(pmGroups.model.items[item_id])
            {
                pmGroups.model.items[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    pmGroups.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            //console.log("group update", data); 
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmGroups.addSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
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
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }
            
            if(pmGroups.model.items[item_id])
            { 
                if(!pmGroups.model.items[item_id].groups)
                {
                    pmGroups.model.items[item_id].groups = []
                }
                
                for(var i in groups_ids)
                {
                    pmGroups.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
            //console.log("group update", data);
            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}
 
/**
 * @return $.Deferred
 */
pmGroups.addSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
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
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }
            
            if(pmGroups.model.items[item_id])
            { 
                if(!pmGroups.model.items[item_id].hosts)
                {
                    pmGroups.model.items[item_id].hosts = []
                }
                
                for(var i in hosts_ids)
                {
                    pmGroups.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            //console.log("group update", data);
            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmGroups.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_group").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_groups_to_group', {item_id:item_id}))
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
        $(".content").appendTpl(spajs.just.render('add_existing_hosts_to_group', {item_id:item_id}))
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
    if(pmGroups.model.items[item_id])
    {
        for(var i in pmGroups.model.items[item_id].hosts)
        {
            if(pmGroups.model.items[item_id].hosts[i].id == host_id)
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
    if(pmGroups.model.items[item_id])
    {
        for(var i in pmGroups.model.items[item_id].groups)
        {
            if(pmGroups.model.items[item_id].groups[i].id == group_id)
            {
                return true;
            }
        }
    }
    return false;
}
 