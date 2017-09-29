
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
                $('#inventories-autocomplete').val(),
                pmGroups.getGroupsAutocompleteValue(),
                'shell',
                $('#module-args-string').val(),
                {}
            )
}

pmAnsibleModule.loadAllModule = function()
{
    var def = new $.Deferred();
    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/ansible/modules/",
        type: "GET",
        contentType:'application/json',
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
        $.notify("Invalid field `inventory` ", "error");
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


/**
 * Вернёт код для поля автокомплита модулей
 * @param {String} id
 * @returns HTML templte
 * @private
 */
pmAnsibleModule.moduleAutocompleteFiled = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
    
    if(!opt.id)
    {
        opt.id = "module-autocomplete"
    }
    
    if(!opt.value)
    {
        opt.value = ""
    }
     
    var html = spajs.just.render('moduleAutocompleteFiled_template', opt)
    
    html = spajs.just.onInsert(html, function()
    {
        $.when(pmAnsibleModule.loadAllModule()).done(function()
        {
            new autoComplete({
                selector: '#'+opt.id,
                minChars: 0,
                cache:false,
                showByClick:false,
                menuClass:opt.id,
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
    })
    
    return html;
}

/**
 * Вернёт код для поля ввода аргументов к запуску модуля
 * @param {String} id
 * @returns HTML templte
 * @private
 */
pmAnsibleModule.argsAutocompleteFiled = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
    
    if(!opt.id)
    {
        opt.id = "module-autocomplete"
    }
    
    if(!opt.value)
    {
        opt.value = ""
    }
     
    var html = spajs.just.render('moduleArgsFiled_template', opt) 
    return html;
}

/**
 * Вернёт код для полей для выбора модуля и аргументов к запуску модуля
 * @param {String} id
 * @returns HTML templte
 */
pmAnsibleModule.moduleFileds = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
    
    if(!opt.module)
    {
        opt.module = {}
    }
    
    if(!opt.args)
    {
        opt.args = {}
    } 
    
    var html = spajs.just.render('moduleFileds_template', opt) 
    return html;
}