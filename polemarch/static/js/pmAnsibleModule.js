 
var pmAnsibleModule = { 
    pageSize:20,
    model:{
        name:"module",
        selectedInventory:0
    }
}
 
jsonEditor.options[pmAnsibleModule.model.name] = jsonEditor.options['item'];
  
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

pmAnsibleModule.showInProject = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1]  
    
    return $.when(pmProjects.loadItem(project_id), pmInventories.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_run_page', {item_id:project_id}))
        
        $("#inventories-autocomplete").select2(); 

    }).fail(function()
    {
        $.notify("", "error");
    })
}
 
pmAnsibleModule.execute = function(project_id, inventory_id, group, module, data_args, data_vars)
{
    var def = new $.Deferred();
    if(!group)
    {
        $.notify("Group name is empty", "error");
        def.reject();
        return def.promise();
    }

    if(!inventory_id)
    {
        $.notify("Invalid filed `inventory` ", "error");
        def.reject();
        return;
    }

    if(!module)
    {
        $.notify("Invalid filed `module` ", "error");
        def.reject();
        return;
    }
    
    if(!data_args)
    {  
        data_args = $("#module-args-string").val();
    }
 
    var data = data_vars
    if(!data_vars)
    {  
        data = jsonEditor.jsonEditorGetValues();
    }
    
    data.inventory = inventory_id/1
    data.module = module
    data.group = group
    data.args = data_args

    $.ajax({
        url: "/api/v1/projects/"+project_id+"/execute-module/",
        type: "POST",
        data:JSON.stringify(data),
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data) 
        {
            if(data && data.history_id)
            { 
                $.notify("Started", "success"); 
                $.when(spajs.open({ menuId:"history/"+data.history_id}) ).done(function(){
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
