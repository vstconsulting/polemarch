
var pmPeriodicTasks = new pmItems()

pmPeriodicTasks.model.name = "periodic-tasks"

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
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:"", project_id:project_id}))

        thisObj.model.selectedCount = $('.multiple-select .selected').length;

    }).fail(function()
    {
        $.notify("", "error");
    })
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
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[2]), project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmPeriodicTasks.showNewItemPage = function(holder, menuInfo, data)
{
    var project_id = data.reg[1];
    var thisObj = this;
    return $.when(pmTasks.searchItems(project_id, "project"), pmProjects.loadItem(project_id), pmInventories.loadAllItems()).done(function()
    {
        thisObj.model.newitem = {type:'INTERVAL'}
        $(holder).html(spajs.just.render(thisObj.model.name+'_new_page', {project_id:project_id}))

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
    })
}

pmPeriodicTasks.showItem = function(holder, menuInfo, data)
{
    var thisObj = this; 
    var item_id = data.reg[2];
    var project_id = data.reg[1];

    return $.when(pmPeriodicTasks.loadItem(item_id), pmTasks.loadAllItems(), pmInventories.loadAllItems(), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_page', {item_id:item_id, project_id:project_id}))

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
    }).fail(function()
    {
        $.notify("", "error");
    })
}


/**
 * @return $.Deferred
 */
pmPeriodicTasks.addItem = function(project_id)
{
    var def = new $.Deferred();

    var data = {}

    data.project = project_id
    data.playbook = $("#new_periodic-tasks_playbook").val()
    data.name = $("#new_periodic-tasks_name").val()
    data.type = $("#new_periodic-tasks_type").val()
    data.inventory = $("#new_periodic-tasks_inventory").val()

    if(data.type == "CRONTAB")
    {
        data.schedule = crontabEditor.getCronString()
    }
    else
    {
        data.schedule = $("#new_periodic-tasks_schedule_INTERVAL").val()
    }

    data.vars = jsonEditor.jsonEditorGetValues()


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

/**
 * @return $.Deferred
 */
pmPeriodicTasks.updateItem = function(item_id)
{
    var data = {}

    data.playbook = $("#periodic-tasks_"+item_id+"_playbook").val()
    data.type = $("#periodic-tasks_"+item_id+"_type").val()
    data.inventory = $("#periodic-tasks_"+item_id+"_inventory").val()
    data.name = $("#periodic-tasks_"+item_id+"_name").val()

    if(data.type == "CRONTAB")
    {
        data.schedule = crontabEditor.getCronString()
    }
    else
    {
        data.schedule = $("#periodic-tasks_"+item_id+"_schedule_INTERVAL").val()
    }

    data.vars = jsonEditor.jsonEditorGetValues()

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
            $.notify("Save", "success");
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
}