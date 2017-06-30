
var pmPeriodicTasks = new pmItems()

pmPeriodicTasks.model.name = "periodic-tasks"

 
pmPeriodicTasks.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;
    return $.when(this.searchItems(data.reg[1], 'playbook')).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}


/**
 * @return $.Deferred
 */
pmPeriodicTasks.addItem = function(parent_type, parent_item)
{
    var def = new $.Deferred();

    var data = {}

    data.name = $("#new_host_name").val()
    data.type = $("#new_host_type").val()
    data.vars = jsonEditor.jsonEditorGetValues()

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
        url: "/api/v1/"+this.model.name+"/",
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
pmPeriodicTasks.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#host_"+item_id+"_name").val()
    data.type = $("#host_"+item_id+"_type").val()
    data.vars = jsonEditor.jsonEditorGetValues()

    // @todo Добавить валидацию диапазонов "127.0.1.[5:6]" и 127.0.1.1, 127.0.1.2
    if(!data.name || !this.validateHostName(data.name))
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }

    return $.ajax({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
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