
var pmProjects = inheritance(pmItems)
pmProjects.model.name = "projects"
jsonEditor.options[pmProjects.model.name] = jsonEditor.options['item'];

jsonEditor.options[pmProjects.model.name]['repo_password'] = {
    type:'password',
    help:'Password from repository',
    helpcontent:'Password from repository required for GIT'
}


pmProjects.openItem = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    $.when(pmProjects.supportedRepos()).always(function()
    {
        $.when(pmProjects.showItem(holder, menuInfo, data)) .always(function()
        {
            def.resolve();
        })
    }).promise();

    return def.promise();
}

pmProjects.openNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    $.when(pmProjects.supportedRepos()).always(function()
    {
        $.when(pmProjects.showNewItemPage(holder, menuInfo, data)) .always(function()
        {
            def.resolve();
        })
    })

    return def.promise();
}

pmProjects.openRunPlaybookPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = data.reg[1]
    $.when(pmTasks.searchItems(project_id, "project"), pmProjects.loadItem(project_id), pmInventories.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_run_playbook', {item_id:project_id, query:project_id}))

        $("#inventories-autocomplete").select2();

        new autoComplete({
            selector: '#playbook-autocomplete',
            minChars: 0,
            cache:false,
            showByClick:true,
            menuClass:'playbook-autocomplete',
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.playbook + '" >' + item.playbook + '</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#playbook-autocomplete").val($(item).text());
                //console.log('onSelect', term, item);
                //var value = $(item).attr('data-value'); 
            },
            source: function(term, response)
            {
                term = term.toLowerCase();

                var matches = []
                for(var i in pmTasks.model.items)
                {
                    var val = pmTasks.model.items[i]
                    if(val.name.toLowerCase().indexOf(term) != -1 && val.project == project_id)
                    {
                        matches.push(val)
                    }
                }
                if(matches.length)
                {
                    response(matches);
                }
            }
        });

        def.resolve();
    }).fail(function()
    {
        def.reject();
    })
}

/**
 * @return $.Deferred
 */
pmProjects.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_project_name").val()
    data.repository = $("#new_project_repository").val()
    data.vars = {
        repo_type:$("#new_project_type").val(),
        repo_password:$("#new_project_password").val(),
    }
    
    if(!data.repository)
    {
        if(data.vars.repo_type == "MANUAL")
        {
            data.repository = "MANUAL"
        }
        else
        {
            $.notify("Invalid value in filed `Repository URL`", "error");
            def.reject()
            return def.promise();
        }
    }

    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }

    $.ajax({
        url: "/api/v1/projects/",
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
            $.notify("project created", "success");
            $.when(spajs.open({ menuId:"project/"+data.id})).always(function(){
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
pmProjects.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#project_"+item_id+"_name").val()
    data.repository = $("#project_"+item_id+"_repository").val()

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }
    
    data.vars = {
        repo_type:$("#project_"+item_id+"_type").val(),
        repo_password:$("#project_"+item_id+"_password").val(),
    }
    
    if(!data.repository)
    {
        if(data.vars.repo_type == "MANUAL")
        {
            data.repository = "MANUAL"
        }
        else
        {
            $.notify("Invalid value in filed `Repository URL`", "error");
            def.reject()
            return def.promise();
        }
    }


    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/",
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
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmProjects.showAddSubInventoriesForm = function(item_id, holder)
{
    return $.when(pmInventories.loadAllItems()).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_inventories_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmProjects.showAddSubInventoriesForm = function(item_id, holder)
{
    return $.when(pmInventories.loadAllItems()).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_inventories_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmProjects.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_groups_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmProjects.showAddSubHostsForm = function(item_id, holder)
{
    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_hosts_to_project', {item_id:item_id}))
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
pmProjects.hasHosts = function(item_id, host_id)
{
    if(pmProjects.model.items[item_id])
    {
        for(var i in pmProjects.model.items[item_id].hosts)
        {
            if(pmProjects.model.items[item_id].hosts[i].id == host_id)
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
pmProjects.hasGroups = function(item_id, group_id)
{
    if(pmProjects.model.items[item_id])
    {
        for(var i in pmProjects.model.items[item_id].groups)
        {
            if(pmProjects.model.items[item_id].groups[i].id == group_id)
            {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет принадлежит ли Inventory_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} inventory_id
 * @returns {Boolean}
 */
pmProjects.hasInventories = function(item_id, inventory_id)
{
    if(pmProjects.model.items[item_id])
    {
        for(var i in pmProjects.model.items[item_id].inventories)
        {
            if(pmProjects.model.items[item_id].inventories[i].id == inventory_id)
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
pmProjects.setSubInventories = function(item_id, inventories_ids)
{
    if(!inventories_ids)
    {
        inventories_ids = []
    }

    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/inventories/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(inventories_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(pmProjects.model.items[item_id])
            {
                pmProjects.model.items[item_id].inventories = []
                for(var i in inventories_ids)
                {
                    pmProjects.model.items[item_id].inventories.push(pmInventories.model.items[inventories_ids[i]])
                }
            } 
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("inventories "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.setSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/groups/",
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
            if(pmProjects.model.items[item_id])
            {
                pmProjects.model.items[item_id].groups = []
                for(var i in groups_ids)
                {
                    pmProjects.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            } 
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
pmProjects.setSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }
    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/hosts/",
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
            if(pmProjects.model.items[item_id])
            {
                pmProjects.model.items[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    pmProjects.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.addSubInventories = function(item_id, inventories_ids)
{
    if(!inventories_ids)
    {
        inventories_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/projects/"+item_id+"/inventories/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(inventories_ids),
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
            
            if(pmProjects.model.items[item_id])
            { 
                for(var i in inventories_ids)
                {
                    pmProjects.model.items[item_id].inventories.push(pmInventories.model.items[inventories_ids[i]])
                }
            } 
            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("inventories "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}

/**
 * @return $.Deferred
 */
pmProjects.addSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/projects/"+item_id+"/groups/",
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
            
            if(pmProjects.model.items[item_id])
            { 
                for(var i in groups_ids)
                {
                    pmProjects.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
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
pmProjects.addSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }
    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/projects/"+item_id+"/hosts/",
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
            
            if(pmProjects.model.items[item_id])
            { 
                for(var i in hosts_ids)
                {
                    pmProjects.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}

/**
 * @return $.Deferred
 */
pmProjects.syncRepo = function(item_id)
{
    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/sync/",
        type: "POST",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            $.notify("Send sync query", "success");
        },
        error:function(e)
        {
            console.warn("project "+item_id+" sync error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.supportedRepos = function()
{
    return $.ajax({
        url: "/api/v1/projects/supported-repos/",
        type: "GET",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            pmProjects.model.supportedRepos = data;
            pmProjects.model.repository_type = data[0]
            jsonEditor.options['projects'].repo_type = {
                type:'select',
                options:pmProjects.model.supportedRepos,
                required:true,
            }
        },
        error:function(e)
        {
            console.warn("project "+item_id+" sync error - " + JSON.stringify(e));
        }
    });
}