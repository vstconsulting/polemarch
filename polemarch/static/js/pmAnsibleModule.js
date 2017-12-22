
/**
 * Класс для запуска модулей Ansible.
 *
 */
var pmAnsibleModule = {
    pageSize:20,
    model:{
        name:"module",
        selectedInventory:0
    }
}

pmAnsibleModule.model.className = "pmAnsibleModule"

pmAnsibleModule.selectInventory = function(inventory_id)
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
 * Страница /?project/1/ansible-module/run (Execute ansible module) в проекте
 */
pmAnsibleModule.showInProject = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1]

    return $.when(pmProjects.loadItem(project_id), pmInventories.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_run_page', {item_id:project_id})) 
        $("#inventories-autocomplete").select2({ width: '100%' }); 
    }).fail(function()
    {
        $.notify("", "error");
    })
}

/**
 * Widget быстрого запуска для Dashboard
 */
pmAnsibleModule.fastCommandWidget = function(holder)
{
    return $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render('fastcommand_widget', {}))
        $("#projects-autocomplete").select2({ width: '100%' });
        $("#inventories-autocomplete").select2({ width: '100%' });

    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmAnsibleModule.fastCommandWidget_RunBtn = function()
{
    return pmAnsibleModule.execute(
                $('#projects-autocomplete').val(),
                pmModuleTemplates.inventoriesAutocompletefiled.getValue(),
                pmGroups.getGroupsAutocompleteValue(),
                'shell',
                moduleArgsEditor.getModuleArgs(),
                {}
            )
}

/**
 * @param {Integer} project_id
 * @param {Integer} inventory_id
 * @param {String} group
 * @param {String} module
 * @param {Object} data_args
 * @param {Object} data_vars
 */
pmAnsibleModule.execute = function(project_id, inventory_id, group, module, data_args, data_vars)
{
    var def = new $.Deferred();
    if(!group)
    {
        $.notify("Group name is empty", "error");
        def.reject();
        return def.promise();
    }
 
    if(!(project_id/1))
    {
        $.notify("Invalid field `project` ", "error");
        def.reject();
        return def.promise();
    }

    if(!module)
    {
        $.notify("Invalid field `module` ", "error");
        def.reject();
        return def.promise();
    }


    if(!data_args)
    {
        data_args = moduleArgsEditor.getModuleArgs();
    }

    var data = data_vars
    if(!data_vars)
    {
        data = jsonEditor.jsonEditorGetValues();
    }

    data.inventory = inventory_id
    data.module = module
    data.group = group
    data.args = data_args

    if(module == 'shell' && !data_args)
    {
        $.notify("Invalid field `Shell command` ", "error");
        def.reject();
        return def.promise();
    }

    spajs.ajax.Call({
        url: "/api/v1/projects/"+project_id+"/execute-module/",
        type: "POST",
        data:JSON.stringify(data),
        contentType:'application/json',
                success: function(data)
        {
            if(data && data.history_id)
            {
                $.notify("Started", "success");
                $.when(spajs.open({ menuId:"history/"+data.history_id}) ).done(function(){
                    def.resolve()
                }).fail(function(e){
                    def.reject(e)
                })
            }
            else
            {
                def.reject()
            }
        },
        error:function(e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    })

    return def.promise();
}

