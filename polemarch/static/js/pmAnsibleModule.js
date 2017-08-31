
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
 
jsonEditor.options[pmAnsibleModule.model.name] = jsonEditor.options['item'];
  
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
        
        $("#inventories-autocomplete").select2(); 
        
        $.when(pmAnsibleModule.loadAllModule()).done(function()
        { 
            new autoComplete({
                selector: '#module-autocomplete',
                minChars: 0,
                cache:false,
                showByClick:true,
                menuClass:'module-autocomplete',
                renderItem: function(item, search)
                {
                    var name = item.replace(/^.*\.(.*?)$/, "$1")
                    return '<div class="autocomplete-suggestion" data-value="' + name + '" >' + name + " <i style='color:#777'>" + item + '</i></div>';
                },
                onSelect: function(event, term, item)
                {
                    $("#module-autocomplete").val($(item).attr('data-value'));
                    //console.log('onSelect', term, item);
                    //var value = $(item).attr('data-value'); 
                },
                source: function(term, response)
                {
                    term = term.toLowerCase();

                    var matches = []
                    for(var i in pmAnsibleModule.model.ansible_modules)
                    {
                        var val = pmAnsibleModule.model.ansible_modules[i]
                        if(val.toLowerCase().indexOf(term) != -1)
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

        }) 
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
        $("#projects-autocomplete").select2(); 
        $("#inventories-autocomplete").select2(); 
        
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmAnsibleModule.loadAllModule = function()
{
    var def = new $.Deferred();
    var thisObj = this;
    jQuery.ajax({
        url: "/api/v1/ansible/modules/",
        type: "GET",
        contentType:'application/json', 
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        { 
            thisObj.model.ansible_modules = data 
            def.resolve();
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject();
        }
    });
    return def.promise();
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

    if(!(inventory_id/1))
    {
        $.notify("Invalid filed `inventory` ", "error");
        def.reject();
        return def.promise();
    }
    
    if(!(project_id/1))
    {
        $.notify("Invalid filed `project` ", "error");
        def.reject();
        return def.promise();
    }

    if(!module)
    {
        $.notify("Invalid filed `module` ", "error");
        def.reject();
        return def.promise();
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
    
    if(module == 'shell' && !data_args)
    {
        $.notify("Invalid filed `Shell command` ", "error");
        def.reject();
        return def.promise();
    }

    debugger;
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
