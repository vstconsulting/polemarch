

var pmTasksTemplates = inheritance(pmTemplates) 


pmTasksTemplates.model.name = "templates"  
pmTasksTemplates.model.page_name = "template"

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTasksTemplates.model.kind = "Task"
pmTemplates.model.kindObjects[pmTasksTemplates.model.kind] = pmTasksTemplates
   
pmTasksTemplates.showWidget = function(holder, kind)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize; 
    return $.when(this.sendSearchQuery({kind:kind}, limit, offset)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_widget', {query:"", kind:kind})) 
    }).fail(function()
    {
        $.notify("", "error");
    }).promise()
}

pmTasksTemplates.showTaskWidget = function(holder)
{
    return pmTasksTemplates.showWidget(holder, "Task")
}

pmTasksTemplates.showModuleWidget = function(holder)
{
    return pmTasksTemplates.showWidget(holder, "Module")
}

pmTasksTemplates.execute = function(item_id)
{
    var thisObj = this;
    var def = new $.Deferred();
    $.when(this.loadItem(item_id)).done(function()
    { 
        var val = thisObj.model.items[item_id]
        $.when(pmTasks.execute(val.data.project, val.data.inventory/1, val.data.playbook, val.data.vars)).done(function()
        {  
            def.resolve();
        }).fail(function()
        {
            def.reject();
        })
         
    }).fail(function()
    {
        def.reject();
    })
    
    return def.promise()
}

pmTasksTemplates.showItem = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[1]
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        thisObj.model.selectedProject == pmTasksTemplates.model.items[item_id].project
        
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_page', {item_id:item_id})) 
        $("#inventories-autocomplete").select2();
        //$("#projects-autocomplete").select2();

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
                    if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
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
    
    return def.promise()
}
    
pmTasksTemplates.selectProject = function(project_id){
    console.log("select project", project_id)
    $(".autocomplete-suggestion").hide()
    $(".playbook-project-"+project_id).show()
    pmTasksTemplates.model.selectedProject = project_id
}

pmTasksTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this; 
    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {}))
        
        $("#inventories-autocomplete").select2();
        //$("#projects-autocomplete").select2();

        new autoComplete({
            selector: '#playbook-autocomplete',
            minChars: 0,
            cache:false,
            showByClick:true,
            menuClass:'playbook-autocomplete',
            renderItem: function(item, search)
            {
                var style = "";
                if(thisObj.model.selectedProject != item.project)
                {
                    style = "style='disolay:none'"
                }
                return '<div class="autocomplete-suggestion playbook-project-' + item.project + ' " '+style+' data-value="' + item.playbook + '" >' + item.playbook + '</div>';
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
                    if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
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
    
    return def.promise()
}
 
/**
 * @return $.Deferred
 */
pmTasksTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        playbook:$("#playbook-autocomplete").val(),
        inventory:$("#inventories-autocomplete").val(),
        project:$("#projects-autocomplete").val(),
        vars:jsonEditor.jsonEditorGetValues() 
    } 
     
    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return;
    }

    var thisObj = this;
    $.ajax({
        url: "/api/v1/templates/",
        type: "POST",
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
            $.notify("template created", "success");
            $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id})).always(function(){
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
pmTasksTemplates.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        inventory:$("#inventories-autocomplete").val()/1,
        vars:jsonEditor.jsonEditorGetValues() 
    } 
     
    data.data.playbook = $("#playbook-autocomplete").val()
    data.data.project = $("#projects-autocomplete").val()/1

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }
 
    var thisObj = this;
    return $.ajax({
        url: "/api/v1/templates/"+item_id+"/",
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
            thisObj.model.items[item_id] = data
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
