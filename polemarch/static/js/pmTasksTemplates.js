
var pmModuleTemplates = Object.create(pmTemplates);

var pmTasksTemplates = new pmItems()
pmTasksTemplates.model.name = "templates"  

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTasksTemplates.model.kind = "Task"
pmTemplates.model.kindObjects[pmTasksTemplates.model.kind] = pmTasksTemplates
  
pmTasksTemplates.showItem = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[1]
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_page', {item_id:item_id})) 
        $("#inventories-autocomplete").select2();
        $("#projects-autocomplete").select2();

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
                    if(val.name.toLowerCase().indexOf(term) != -1)
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
    
pmTasksTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this; 
    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_new_page', {}))
        
        $("#inventories-autocomplete").select2();
        $("#projects-autocomplete").select2();

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
                    if(val.name.toLowerCase().indexOf(term) != -1)
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
            $.when(spajs.open({ menuId:"template/"+data.id})).always(function(){
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
    data.kind = pmModuleTemplates.model.kind
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
        return;
    }

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
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
