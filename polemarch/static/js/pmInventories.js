 
var pmInventories = new pmItems()  
pmInventories.model.name = "inventories"
pmInventories.model.page_name = "inventory"
jsonEditor.options[pmInventories.model.name] = jsonEditor.options['item'];
 
pmInventories.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name
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
                 
                    var groups = []
                    for(var i in data.groups)
                    {
                        groups.push(data.groups[i].id)
                    }
                    
                    var hosts = []
                    for(var i in data.hosts)
                    {
                        hosts.push(data.hosts[i].id)
                    } 

                    $.when(thisObj.setSubGroups(newItem.id, groups), thisObj.setSubHosts(newItem.id, hosts)).always(function(){
                        def.resolve(newItem.id)
                    })
            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    })

    return def.promise();
} 

  
/** 
 * @return $.Deferred
 */
pmInventories.addItem = function(parent_type, parent_item)
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_inventory_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()
     
    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }
 
    var thisObj = this;
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
            $.notify("inventory created", "success");
            
            if(parent_item)
            {
                if(parent_type == 'project')
                {
                    $.when(pmProjects.addSubInventories(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"project/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
            }
            else
            { 
                $.when(spajs.open({ menuId: thisObj.model.page_name + "/"+data.id})).always(function(){
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
pmInventories.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#inventory_"+item_id+"_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()
    
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
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("inventory "+item_id+" update error - " + JSON.stringify(e)); 
            polemarch.showErrors(e.responseJSON)
        }
    });
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
    if(pmInventories.model.items[item_id])
    {
        for(var i in pmInventories.model.items[item_id].hosts)
        {
            if(pmInventories.model.items[item_id].hosts[i].id == host_id)
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
    if(pmInventories.model.items[item_id])
    {
        for(var i in pmInventories.model.items[item_id].groups)
        {
            if(pmInventories.model.items[item_id].groups[i].id == group_id)
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
    if(!groups_ids)
    {
        groups_ids = []
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/groups/",
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
            if(pmInventories.model.items[item_id])
            {
                pmInventories.model.items[item_id].groups = []
                for(var i in groups_ids)
                {
                    pmInventories.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }  
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
pmInventories.setSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
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
            if(pmInventories.model.items[item_id])
            {
                pmInventories.model.items[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    pmInventories.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }  
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
pmInventories.addSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
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
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }
            
            if(pmInventories.model.items[item_id])
            { 
                if(!pmInventories.model.items[item_id].groups)
                {
                    pmInventories.model.items[item_id].groups = []
                }
                
                for(var i in groups_ids)
                {
                    pmInventories.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
            
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
pmInventories.addSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
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
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }
            
            if(pmInventories.model.items[item_id])
            { 
                if(!pmInventories.model.items[item_id].hosts)
                {
                    pmInventories.model.items[item_id].hosts = []
                }
                
                for(var i in hosts_ids)
                {
                    pmInventories.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            
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