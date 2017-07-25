 
var pmAnsibleModule = { 
    pageSize:20,
    model:{
        name:"module"
    }
}
 
jsonEditor.options[pmAnsibleModule.model.name] = jsonEditor.options['item'];
  
pmAnsibleModule.showInInventory = function(holder, menuInfo, data)
{
    var thisObj = this;
    var inventory_id = data.reg[1]  
    
    return $.when(pmInventories.loadItem(inventory_id)).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_run_page', {item_id:inventory_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmAnsibleModule.getDataVars = function(){
    return $("#module-args-string").val();
}

pmAnsibleModule.execute = function(inventory_id, group, module, data_vars)
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
    
    if(!data_vars)
    {  
        data_vars = this.getDataVars();
    }
 
    var data = {}
    data.inventory = inventory_id
    data.module = module
    data.group = group
    data.args = data_vars

    $.ajax({
        url: "/api/v1/execute_module/",
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
            $.notify("Started", "success"); 
            if(data && data.history_id)
            { 
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
