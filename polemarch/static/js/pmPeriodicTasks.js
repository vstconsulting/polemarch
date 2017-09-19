
var pmPeriodicTasks = inheritance(pmItems)

pmPeriodicTasks.model.page_name = "periodic-task"
pmPeriodicTasks.model.name = "periodic-tasks"  
pmPeriodicTasks.model.selectedInventory = 0;

pmPeriodicTasks.copyAndEdit = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    return $.when(this.copyItem(item_id)).done(function(newItemId)
    {
        $.when(spajs.open({ menuId:"project/"+thisObj.model.items[item_id].project+"/"+thisObj.model.page_name + "/"+newItemId})).done(function(){
            $.notify("Item was duplicate", "success");
            def.resolve()
        }).fail(function(e){
            $.notify("Error in duplicate item", "error");
            polemarch.showErrors(e)
            def.reject()
        })
    }).fail(function(){
        def.reject()
    })

    return def.promise();
}
   
pmPeriodicTasks.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name
        data.vars.group = data.group
        data.vars.args = data.args
        
        delete data.group;
        delete data.args;
        
        spajs.ajax.Call({
            url: "/api/v1/"+thisObj.model.name+"/",
            type: "POST",
            contentType:'application/json',
            data: JSON.stringify(data),
                        success: function(data)
            {
                thisObj.model.items[data.id] = data
                def.resolve(data.id)
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


pmPeriodicTasks.selectInventory = function(inventory_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    inventory_id = inventory_id/1
    if(inventory_id)
    {
        $.when(pmInventories.loadItem(inventory_id)).done(function(){
            thisObj.model.selectedInventory = inventory_id;
            def.resolve();
        }).fail(function(){
            def.reject();
        });
    }
    else
    {
        thisObj.model.selectedInventory = 0;
        def.resolve();
    }
    return def.promise()
}

pmPeriodicTasks.deleteItem = function(item_id, force)
{
    if(!force && !confirm("Are you sure?"))
    {
        return;
    }
    
    var def = new $.Deferred();
    var thisObj = this;
    $.when(this.loadItem(item_id)).done(function()
    {
        var project_id = pmPeriodicTasks.model.items[item_id].project;
        $.when(thisObj.deleteItemQuery(item_id)).done(function(data)
        {
            def.resolve()
            spajs.open({ menuId: "project/"+project_id+"/periodic-tasks"})
        }).fail(function(e){
            def.reject();
            polemarch.showErrors(e.responseJSON)
        })
    }).fail(function(e){
        def.reject();
        polemarch.showErrors(e.responseJSON)
    })

    return def.promise();
}
    
pmPeriodicTasks.execute = function(project_id, item_id)
{
    var def = new $.Deferred();

    var kind_type = $("#periodic-tasks_"+item_id+"_kind").val();

    var data = jsonEditor.jsonEditorGetValues(kind_type);
    data.inventory = $("#periodic-tasks_"+item_id+"_inventory").val()

    var kind = 'execute-playbook'
    if(kind_type == 'MODULE')
    {
        kind = 'execute-module'
        data.module = $("#periodic-tasks_"+item_id+"_module").val()
        if(!data.module)
        {
            $.notify("Module name is empty", "error");
            def.reject();
            return def.promise();
        }
        data.group = $("#group-autocomplete").val()
        data.args = $("#module-args-string").val()
    }
    else
    {
        data.playbook = $("#periodic-tasks_"+item_id+"_playbook").val()
        if(!data.playbook)
        {
            $.notify("Playbook name is empty", "error");
            def.reject();
            return def.promise();
        }
    }
 
    spajs.ajax.Call({
        url: "/api/v1/projects/"+project_id+"/"+kind+"/",
        type: "POST",
        data:JSON.stringify(data),
        contentType:'application/json',
                success: function(data)
        {
            $.notify("Started", "success");
            if(data && data.history_id)
            {
                $.when(spajs.open({ menuId:"project/"+project_id+"/history/"+data.history_id}) ).done(function(){
                    def.resolve()
                }).fail(function(){
                    def.reject()
                })
            }
            else
            {
                def.reject()
            }
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    })

    return def.promise();
}

pmPeriodicTasks.showList = function(holder, menuInfo, data)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize*(data.reg[2] - 1);
    }
    var project_id = data.reg[1];

    return $.when(this.searchItems(project_id, 'project'), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:"", project_id:project_id}))  
    }).fail(function()
    {
        $.notify("", "error");
    }).promise();
}

pmPeriodicTasks.search = function(project_id, query)
{
    if(!query || !trim(query))
    {
        return spajs.open({ menuId:'project/' + project_id +"/" + this.model.name, reopen:true});
    }

    return spajs.open({ menuId:'project/' + project_id +"/" + this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
}

pmPeriodicTasks.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1];
    return $.when(this.sendSearchQuery({playbook: decodeURIComponent(data.reg[2]), project:project_id}), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[2]), project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    }).promise();
}

pmPeriodicTasks.showNewItemPage = function(holder, menuInfo, data)
{
    var project_id = data.reg[1];
    var thisObj = this;
    return $.when(pmTasks.searchItems(project_id, "project"), pmProjects.loadItem(project_id), pmInventories.loadAllItems()).done(function()
    {
        thisObj.model.newitem = {type:'INTERVAL', kind:'PLAYBOOK'}
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {project_id:project_id}))

        $('#new_periodic-tasks_inventory').select2();

        new autoComplete({
            selector: '#new_periodic-tasks_playbook',
            minChars: 0,
            cache:false,
            showByClick:true,
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.playbook + '">' + item.playbook + '</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#new_periodic-tasks_playbook").val($(item).text());
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
                response(matches);
            }
        });
    }).fail(function()
    {
        $.notify("", "error");
    }).promise();
}

pmPeriodicTasks.showItem = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[2];
    var project_id = data.reg[1];

    $.when(pmPeriodicTasks.loadItem(item_id), pmTasks.loadAllItems(), pmInventories.loadAllItems(), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_page', {item_id:item_id, project_id:project_id}))
        pmPeriodicTasks.selectInventory(pmPeriodicTasks.model.items[item_id].inventory)
        
        $('#periodic-tasks_'+item_id+'_inventory').select2();

        new autoComplete({
            selector: '#periodic-tasks_'+item_id+'_playbook',
            minChars: 0,
            cache:false,
            showByClick:true,
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.id + '.yaml">' + item.name + '.yaml</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#periodic-tasks_"+item_id+"_playbook").val($(item).text());
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
                response(matches);
            }
        });
        
        def.resolve();
        
    }).fail(function()
    {
        $.notify("", "error");
        def.reject();
    })
            
    return def.promise()
}


/**
 * @return $.Deferred
 */
pmPeriodicTasks.addItem = function(project_id)
{
    var def = new $.Deferred();

    var data = {}

    data.project = project_id

    data.name = $("#new_periodic-tasks_name").val()
    data.type = $("#new_periodic-tasks_type").val()
    data.inventory = $("#new_periodic-tasks_inventory").val() 

    if(!data.name)
    {
        $.notify("Invalid field `name` ", "error");
        def.reject();
        return def.promise();
    }
    
    if(!data.inventory)
    {
        $.notify("Invalid field `inventory` ", "error");
        def.reject();
        return def.promise();
    }
    
    
    data.kind = $("#new_periodic-tasks_kind").val()

    if(data.kind == "MODULE")
    {
        data.mode = $("#new_periodic-tasks_module").val()
        if(!data.mode)
        {
            $.notify("Module name is empty", "error");
            def.reject();
            return def.promise();
        }
    }
    else
    {
        data.mode = $("#new_periodic-tasks_playbook").val()
        if(!data.mode)
        {
            $.notify("Playbook name is empty", "error");
            def.reject();
            return def.promise();
        }
    }

    if(data.type == "CRONTAB")
    {
        data.schedule = crontabEditor.getCronString()
    }
    else
    {
        data.schedule = $("#new_periodic-tasks_schedule_INTERVAL").val()
        if(!data.schedule)
        {
            $.notify("Invalid field `Interval schedule` ", "error");
            def.reject();
            return def.promise();
        }
    }

    data.vars = jsonEditor.jsonEditorGetValues(data.kind)

    if(data.kind == "MODULE")
    {
        data.vars.group = $("#group-autocomplete").val()
        data.vars.args =  $("#module-args-string").val();
    }
    
    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/",
        type: "POST",
        contentType:'application/json',
        data: JSON.stringify(data),
                success: function(data)
        {
            $.notify("periodic task created", "success");

            $.when(spajs.open({ menuId:"project/"+project_id+"/periodic-task/"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}

pmPeriodicTasks.loadItem = function(item_id)
{
    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "GET",
        contentType:'application/json',
        data: "",
                success: function(data)
        { 
            if(data.kind == "MODULE")
            {
                if(data && data.vars && data.vars.group !== undefined)
                {
                    data.group = data.vars.group
                    delete data.vars.group
                }

                if(data && data.vars && data.vars.args !== undefined)
                {
                    data.args = data.vars.args
                    delete data.vars.args
                }
            }
            thisObj.model.items.justWatch(item_id)
            thisObj.model.items[item_id] = data
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

/**
 * @param {integer} item_id идентификатор PeriodicTask
 * @return $.Deferred
 */
pmPeriodicTasks.updateItem = function(item_id)
{
    var data = {}
    
    data.type = $("#periodic-tasks_"+item_id+"_type").val()
    data.inventory = $("#periodic-tasks_"+item_id+"_inventory").val()
    data.name = $("#periodic-tasks_"+item_id+"_name").val()

    data.kind = $("#periodic-tasks_"+item_id+"_kind").val()

    if(!data.name)
    {
        $.notify("Invalid field `name` ", "error");
        def.reject();
        return;
    }
    
    if(!data.inventory)
    {
        $.notify("Invalid field `inventory` ", "error");
        def.reject();
        return;
    }
    
    
    if(data.kind == "MODULE")
    {
        data.mode = $("#periodic-tasks_"+item_id+"_module").val()
        if(!data.mode)
        {
            $.notify("Module name is empty", "error");
            def.reject();
            return def.promise();
        }
    }
    else
    {
        data.mode = $("#periodic-tasks_"+item_id+"_playbook").val()
        if(!data.mode)
        {
            $.notify("Playbook name is empty", "error");
            def.reject();
            return def.promise();
        }
    }

    if(data.type == "CRONTAB")
    {
        data.schedule = crontabEditor.getCronString()
    }
    else
    {
        data.schedule = $("#periodic-tasks_"+item_id+"_schedule_INTERVAL").val()
        if(!data.schedule)
        {
            $.notify("Invalid field `Interval schedule` ", "error");
            def.reject();
            return;
        }
    }

    data.vars = jsonEditor.jsonEditorGetValues(data.kind)
    
    if(data.kind == "MODULE")
    {
        data.vars.group = $("#group-autocomplete").val()
        data.vars.args =  $("#module-args-string").val();
    }
    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data:JSON.stringify(data),
                success: function(data)
        {
            thisObj.model.items[item_id] = data
            $.notify("Save", "success");
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
}