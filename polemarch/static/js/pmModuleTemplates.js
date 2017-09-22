
var pmModuleTemplates =  inheritance(pmTemplates)  

pmModuleTemplates.model.name = "templates"
pmModuleTemplates.model.page_name = "template"
pmModuleTemplates.model.selectedInventory = 0

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmModuleTemplates.model.kind = "Module"

pmTemplates.model.kindObjects[pmModuleTemplates.model.kind] = pmModuleTemplates
 
pmModuleTemplates.execute = function(item_id)
{
    var thisObj = this;
    var def = new $.Deferred();
    $.when(this.loadItem(item_id)).done(function()
    {
        var val = thisObj.model.items[item_id]
        $.when(pmAnsibleModule.execute(val.data.project, val.data.inventory, val.data.group, val.data.module, val.data.args, val.data.vars)).done(function()
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


pmModuleTemplates.showItem = function(holder, menuInfo, data)
{ 
    var item_id = data.reg[1]

    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
        {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_module_page', {item_id:item_id})) 
            $("#inventories-autocomplete").select2();
            $("#projects-autocomplete").select2();
 
            def.resolve();
        });
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}

pmModuleTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

        $("#inventories-autocomplete").select2();
        $("#projects-autocomplete").select2();
 
        def.resolve();
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}


pmModuleTemplates.selectInventory = function(inventory_id)
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

/**
 * @return $.Deferred
 */
pmModuleTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        module:$("#module-autocomplete").val(),
        inventory:$("#inventories-autocomplete").val(),
        project:$("#projects-autocomplete").val(),
        group:pmGroups.getGroupsAutocompleteValue(),
        args:$("#module-args-string").val(),
        vars:jsonEditor.jsonEditorGetValues(),
    }

    if(!data.name)
    {
        console.warn("Invalid value in field name")
        $.notify("Invalid value in field name", "error");
        def.reject()
        return;
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/templates/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(data),
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
pmModuleTemplates.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        module:$("#module-autocomplete").val(),
        inventory:$("#inventories-autocomplete").val(),
        project:$("#projects-autocomplete").val(),
        group:pmGroups.getGroupsAutocompleteValue(),
        args:$("#module-args-string").val(),
        vars:jsonEditor.jsonEditorGetValues(),
    }

    if(!data.name)
    {
        console.warn("Invalid value in field name")
        $.notify("Invalid value in field name", "error");
        return;
    }
     
    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/templates/"+item_id+"/",
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
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
