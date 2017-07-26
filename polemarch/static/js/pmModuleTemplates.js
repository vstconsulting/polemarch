
var pmModuleTemplates = Object.create(pmTasksTemplates);

pmModuleTemplates.model.name = "templates"
pmModuleTemplates.model.selectedInventory = 0

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmModuleTemplates.model.kind = "module"

pmModuleTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

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


pmModuleTemplates.selectInventory = function(inventory_id)
{
    var thisObj = this;
    inventory_id = inventory_id/1
    if(inventory_id)
    {
        $.when(pmInventories.loadItem(inventory_id)).done(function(){
            thisObj.model.selectedInventory = inventory_id;
        });
    }
    else
    {
        thisObj.model.selectedInventory = 0;
    }
}

/**
 * @return $.Deferred
 */
pmModuleTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#TasksTemplates-name").val()
    data.kind = pmModuleTemplates.model.kind
    data.data = {
        module:$("#module-autocomplete").val(),
        inventory:$("#inventories-autocomplete").val(),
        group:$("#group-autocomplete").val(),
        args:$("#module-args-string").val(),
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
