

var pmInventories = inheritance(pmItems)
pmInventories.model.name = "inventories"
pmInventories.model.page_name = "inventory"
jsonEditor.options[pmInventories.model.name] = jsonEditor.options['item'];

/**
 * Параметры из секции *:vars
 * Строка где после первого `=` всё остальное значение.
 */
pmInventories.parseMonoVarsLine = function(index, line)
{
    var vars = {}
    var param = /^([^=]+)=(.*)$/.exec(line)

    if(param)
    {
        vars[param[1]] = param[2]
    }
    else
    {
        throw "Error in line "+index+" invalid varibles string ("+line+")"
    }
    return vars;
}

/**
 * Параметры хоста
 * Строка где может быть несколько параметров ключ=значение через пробел
 */
pmInventories.parseVarsLine = function(index, line)
{
    var vars = {}
    do{
        if(line.length == 0)
        {
            break;
        }

        var params = /^([^=]+)=["'](.*?)["'] [^=]+=/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = params[2]
            line = trim(line.slice(params[1].length + params[2].length + 3))
            continue;
        }

        params = /^([^=]+)=["'](.*?)["']$/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = params[2]
            break;
        }

        params = /^([^=]+)=(.*?) [^=]+=/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = params[2]
            line = trim(line.slice(params[1].length + params[2].length + 1))
            continue;
        }

        params = /^([^=]+)=(.*?)$/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = params[2]
            line = trim(line.slice(params[1].length + params[2].length + 1))
            continue;
        }
        else
        {
            throw "Error in line "+index+" invalid varibles string ("+line+")"
        }
    }while(true)
    return vars;
}

/**
 * Хост и параметры
 * Строка где идёт сначала имя хоста а потом его параметры в `parseVarsLine`
 */
pmInventories.parseHostLine = function(index, line, section, inventory)
{
    var params = /^([^ ]+)/.exec(line)
    if(!params)
    {
        throw "Error in line "+index+" ("+line+")"
    }

    var name = ""
    var type = ""
    if(pmItems.validateHostName(params[1]))
    {
        name = params[1]
        type = "HOST"
    }
    else if(pmItems.validateRangeName(params[1]))
    {
        name = params[1]
        type = "RANGE"
    }
    else
    {
        throw "Error in line "+index+" invalid host or range name ("+params[1]+")"
    }

    line = trim(line.slice(name.length))

    var host = {
        name:name,
        type:type,
        vars:pmInventories.parseVarsLine(index, line)
    }

    if(section !== "_hosts")
    {
        if(!inventory.groups[section])
        {
            inventory.groups[section] = {
                vars:{},
                groups:[],
                hosts:[]
            }
        }

        inventory.groups[section].hosts.push(host)
    }
    else
    {
        inventory.hosts.push(host)
    }
}

/**
 * Парсит строку файла инвентория
 * @param {integer} index
 * @param {string} line
 * @param {string} section
 * @param {Object} inventory
 * @returns {Boolean}
 */
pmInventories.parseLine = function(index, line, section, inventory)
{
    line = trim(line);

    if(section == "_hosts")
    {
        pmInventories.parseHostLine(index, line, section, inventory)
        return true;
    }

    if(section == "all:vars")
    {
        var vars = pmInventories.parseMonoVarsLine(index, line)
        inventory.vars = Object.assign(inventory.vars, vars)
        return true;
    }

    if(/:vars$/.test(section))
    {
        section = section.substring(0, section.length - ":vars".length)

        if(!inventory.groups[section])
        {
            inventory.groups[section] = {
                vars:{},
                groups:[],
                hosts:[]
            }
        }

        inventory.groups[section].vars = Object.assign(inventory.groups[section].vars, pmInventories.parseMonoVarsLine(index, line))
        return true;
    }

    if(/:children$/.test(section))
    {
        /**
         * Параметры из секции *:children
         * Строка где просто имя группы
         */
        section = section.substring(0, section.length - ":children".length)

        if(!inventory.groups[section])
        {
            inventory.groups[section] = {
                vars:{},
                groups:[],
                hosts:[],
            }
        }

        inventory.groups[section].children = true
        inventory.groups[section].groups.push(line)
        return true;
    }

    pmInventories.parseHostLine(index, line, section, inventory)
    return false;
}

/**
 * Парсит файла инвентория
 * @param {string} text текст файла инвентория
 * @returns {Object}
 */
pmInventories.parseFromText = function(text)
{
    var lines = text.split(/\n/g)

    var cSection = "_hosts";
    var  inventory = {
        hosts:[],
        groups:{},
        vars:{}
    }

    for(var i in lines)
    {
        var line = lines[i]
        if(/^\s*$/ig.test(line))
        {
            continue;
        }
        if(/^\s*[#;]/ig.test(line))
        {
            continue;
        }

        console.log(i+":\t" + line)

        if(/^\[([A-z0-9\.:\-]+:vars)\]/ig.test(line))
        {
            var res = /^\[([A-z0-9\.:\-]+)\]/ig.exec(line)
            cSection = res[1]
            console.info("setSection:vars ", cSection)
            continue;
        }
        if(/^\[([A-z0-9\.:\-]+:children)\]/ig.test(line))
        {
            var res = /^\[([A-z0-9\.:\-]+)\]/ig.exec(line)
            cSection = res[1]
            console.info("setSection:children ", cSection)
            continue;
        }
        if(/^\[([A-z0-9\.:\-]+)\]/ig.test(line))
        {
            var res = /^\[([A-z0-9\.:\-]+)\]/ig.exec(line)
            cSection = res[1]
            console.info("setSection ", cSection)
            continue;
        }

        pmInventories.parseLine(i, line, cSection, inventory)
    }

    console.log("\n\ninventory", inventory)
    return inventory;
}

// ansible_ssh_private_key_file - запрашивать значение этого параметра.

pmInventories.importFromFile = function(files_event)
{
    var def = new $.Deferred();
    this.model.files = files_event
    this.model.importedInventories = []
    var thisObj = this;
    for(var i=0; i<files_event.target.files.length; i++)
    {
        var reader = new FileReader();
        reader.onload = (function(index_in_files_array)
        {
            return function(e)
            {
                console.log(e)
                thisObj.model.importedInventories = []
                thisObj.model.importedInventories.push({
                    inventory:pmInventories.parseFromText(e.target.result),
                    text:e.target.result
                })
            };
        })(i);
        reader.readAsText(files_event.target.files[i]);

        // Нет поддержки загрузки более одного файла за раз.
        // break;
    }
    return def.promise();
}

pmInventories.openImportPageAndImportFiles = function(files_event)
{
    $.when(spajs.open({ menuId:"inventories/import"})).done(function()
    {
       pmInventories.importFromFile(files_event)
    })
}

pmInventories.importInventories = function()
{
    for(var i in pmInventories.model.importedInventories)
    {
        return pmInventories.importInventory(pmInventories.model.importedInventories[i].inventory)
    }
}

pmInventories.importInventoriesAndOpen = function(inventory)
{
    return $.when(pmInventories.importInventories()).done(function(inventory_id){
        spajs.open({ menuId:"inventory/"+inventory_id})
    }).fail(function(e){
        console.warn(e)
        polemarch.showErrors(e) 
    }).promise()
}

pmInventories.importInventory = function(inventory)
{
    var def2 = new $.Deferred();
    
    var vars = jsonEditor.jsonEditorGetValues('inventory')
    if(vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(vars.ansible_ssh_private_key_file))
    {
        // <!--Вставка файла -->
        $.notify("Error in filed ansible_ssh_private_key_file invalid value", "error");
        jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "inventory")
        def2.reject()
        return def2.promise();
    }

    for(var i in inventory.hosts)
    {
        var val = inventory.hosts[i]
        var vars = jsonEditor.jsonEditorGetValues('host'+val.name)
        if(vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(vars.ansible_ssh_private_key_file))
        {
            // <!--Вставка файла -->
            $.notify("Error in filed ansible_ssh_private_key_file invalid value", "error"); 
            jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "host"+val.name)
            def2.reject()
            return def2.promise();
        }
    }

    for(var i in inventory.groups)
    {
        var val = inventory.groups[i]

        var vars = jsonEditor.jsonEditorGetValues('group'+i)
        if(vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(vars.ansible_ssh_private_key_file))
        {
            // <!--Вставка файла -->
            $.notify("Error in filed ansible_ssh_private_key_file invalid value", "error"); 
            jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "group"+i)
            def2.reject()
            return def2.promise();
        }

        for(var j in val.hosts)
        {
            var hval = val.hosts[j]
            var vars = jsonEditor.jsonEditorGetValues('host'+hval.name)
            if(vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(vars.ansible_ssh_private_key_file))
            {
                // <!--Вставка файла -->
                $.notify("Error in filed ansible_ssh_private_key_file invalid value", "error");
                jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "host"+hval.name)
                def2.reject()
                return def2.promise();
            }
        }
    }
 
    var def = new $.Deferred();
    inventory.name = new Date().toString();

    var inventoryObject = {
        name:inventory.name,
        vars:jsonEditor.jsonEditorGetValues('inventory')
    }

    var deleteBulk = []
    $.when(pmInventories.importItem(inventoryObject)).done(function(inventory_id)
    {
        deleteBulk.push({ 
            type:"del",
            item:'inventory',
            pk:inventory_id
        })
        
        var bulkdata = []
        // Сбор групп и вложенных в них хостов
        for(var i in inventory.groups)
        {
            var val = inventory.groups[i]

            bulkdata.push({
                type:"add",
                item:'group',
                data:{
                    name:i,
                    children:val.children,
                    vars:jsonEditor.jsonEditorGetValues('group'+i)
                }
            })

            for(var j in val.hosts)
            {
                var hval = val.hosts[j]
                bulkdata.push({
                    type:"add",
                    item:'host',
                    data:{
                        name:hval.name,
                        type:hval.type,
                        vars:jsonEditor.jsonEditorGetValues('host'+hval.name)
                    }
                })
            }
        }

        // Сбор хостов вложенных к инвенторию
        var bulkHosts = []
        for(var i in inventory.hosts)
        {
            var val = inventory.hosts[i]
            bulkHosts.push({
                type:"add",
                item:'host',
                data:{
                    name:val.name,
                    type:val.type,
                    vars:jsonEditor.jsonEditorGetValues('host'+val.name)
                }
            })
        }

        // Добавление хостов вложенных к инвенторию
        $.ajax({
            url: "/api/v1/_bulk/",
            type: "POST",
            contentType:'application/json',
            data:JSON.stringify(bulkHosts),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(data)
            {
                var hasError = false;
                var hosts_ids = []
                for(var i in data)
                {
                    var val = data[i]
                    if(val.status != 201)
                    {
                        $.notify("Error "+val.status, "error");
                        hasError = true;
                        continue;
                    }
                    hosts_ids.push(val.data.id)
                    deleteBulk.push({ 
                        type:"del",
                        item:'host',
                        pk:val.data.id
                    })
                }

                if(hasError)
                {
                    // По меньшей мере в одной операции была ошибка вставки.
                    // Инвенторий импортирован не полностью
                    def.reject(deleteBulk);
                    return;
                }

                $.when(pmInventories.addSubHosts(inventory_id, hosts_ids)).done(function()
                {
                    // Добавление групп и вложенных в них хостов
                    $.ajax({
                        url: "/api/v1/_bulk/",
                        type: "POST",
                        contentType:'application/json',
                        data:JSON.stringify(bulkdata),
                        beforeSend: function(xhr, settings) {
                            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                                // Only send the token to relative URLs i.e. locally.
                                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                            }
                        },
                        success: function(data)
                        {
                            var igroups_ids = []
                            var bulk_update = []
                            var hasError = false;
                            for(var i in data)
                            { 
                                deleteBulk.push({ 
                                    type:"del",
                                    item:data.item,
                                    pk:data[i].data.id
                                })

                                var val = data[i]
                                if(val.status != 201)
                                {
                                    $.notify("Error "+val.status, "error");
                                    hasError = true;
                                }

                                if(val.data.children !== undefined )
                                {
                                    igroups_ids.push(val.data.id)
 
                                    // Это группа
                                    if(val.data.children)
                                    {
                                        if(inventory.groups[val.data.name].groups.length)
                                        {
                                            // Добавление подгрупп 
                                            var groups_ids = []
                                            for(var j in inventory.groups[val.data.name].groups)
                                            {
                                                // найти id группы и прекрепить.
                                                for(var k in data)
                                                {
                                                    if(data[k].data.children !== undefined && data[k].data.name == inventory.groups[val.data.name].groups[j])
                                                    {
                                                        groups_ids.push(data[k].data.id)
                                                        break;
                                                    }
                                                }
                                            }
                                            bulk_update.push({
                                                type: "mod", 
                                                item:'group',
                                                method: "PUT",
                                                data_type: 'groups',
                                                pk:val.data.id,
                                                data:groups_ids
                                            }) 
                                        }
                                    }
                                    else
                                    {
                                        if(inventory.groups[val.data.name].groups.length)
                                        {
                                            // Добавление хостов
                                            var hosts_ids = []
                                            for(var j in inventory.groups[val.data.name].hosts)
                                            {
                                                // найти id группы и прекрепить.
                                                for(var k in data)
                                                {
                                                    if(data[k].data.children === undefined && data[k].data.name == inventory.groups[val.data.name].hosts[j])
                                                    {
                                                        hosts_ids.push(data[k].data.id)
                                                        break;
                                                    }
                                                }
                                            }
                                            bulk_update.push({
                                                type: "mod", 
                                                item:'group',
                                                method: "PUT",
                                                data_type: 'hosts',
                                                pk:val.data.id,
                                                data:hosts_ids
                                            }) 
                                        }
                                    }
                                }
                                else
                                {
                                    // Это хост
                                }
                            }
                            
                            if(hasError)
                            {
                                // По меньшей мере в одной операции была ошибка вставки.
                                // Инвенторий импортирован не полностью
                                def.reject(deleteBulk);
                                return;
                            }
                            
                            $.when(pmInventories.addSubGroups(inventory_id, igroups_ids)).done(function()
                            {
                                if(bulk_update.length)
                                {
                                    $.ajax({
                                        url: "/api/v1/_bulk/",
                                        type: "POST",
                                        contentType:'application/json',
                                        data:JSON.stringify(bulk_update),
                                        beforeSend: function(xhr, settings) {
                                            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                                                // Only send the token to relative URLs i.e. locally.
                                                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                                            }
                                        },
                                        success: function(data)
                                        {
                                            var hasError = false;
                                            for(var i in data)
                                            {
                                                var val = data[i]
                                                if(val.status != 200)
                                                {
                                                    $.notify("Error "+val.status, "error");
                                                    hasError = true;
                                                    continue;
                                                }
                                            }

                                            if(hasError)
                                            {
                                                // По меньшей мере в одной операции была ошибка обновления.
                                                // Инвенторий импортирован не полностью
                                                def.reject(deleteBulk);
                                                return;
                                            }

                                            def.resolve(inventory_id);
                                        },
                                        error:function(e)
                                        {
                                            console.warn(e)
                                            polemarch.showErrors(e)
                                            def.reject(deleteBulk);
                                        }
                                    }) 
                                }
                                else
                                {
                                    def.resolve(inventory_id);
                                }
                            }).fail(function(e){
                                console.warn(e)
                                polemarch.showErrors(e)
                                def.reject(deleteBulk);
                            }) 
                        },
                        error:function(e)
                        {
                            console.warn(e)
                            polemarch.showErrors(e)
                            def.reject(deleteBulk);
                        }
                    });
                }).fail(function(e){
                    console.warn(e)
                    polemarch.showErrors(e)
                    def.reject(deleteBulk);
                })
            },
            error:function(e)
            {
                console.warn(e)
                polemarch.showErrors(e)
                def.reject(deleteBulk);
            }
        })
    }).fail(function(e)
    {
        console.warn(e)
        polemarch.showErrors(e)
        def.reject(deleteBulk);
    })
    
    
    var def2 = new $.Deferred();
    
    $.when(def).done(function(inventory_id)
    {
        def2.resolve(inventory_id)
    }).fail(function(delete_bulk)
    {
        $.when($.ajax({
            url: "/api/v1/_bulk/",
            type: "POST",
            contentType:'application/json',
            data:JSON.stringify(delete_bulk),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            }
        })).always(function(){
            def2.reject()
        })
    })
    
    return def2.promise();
}


pmInventories.showImportPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();

    var text = spajs.just.render(this.model.name+'_import_page', {})
    console.log(text)
    $(holder).insertTpl(text)

    def.resolve()
    return def.promise();
}

pmInventories.renderImportedInventory = function(imported)
{
    var text = spajs.just.render(this.model.name+'_imported_inventory', {inventory:imported.inventory, text:imported.text})
    return text;
}

pmInventories.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name
        $.ajax({
            url: "/api/v1/"+thisObj.model.name+"/",
            type: "POST",
            contentType:'application/json',
            data: JSON.stringify(data),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(newItem)
            {
                thisObj.model.items[newItem.id] = newItem

                    var groups = []
                    for(var i in data.groups)
                    {
                        groups.push(data.groups[i].id)
                    }

                    var hosts = []
                    for(var i in data.hosts)
                    {
                        hosts.push(data.hosts[i].id)
                    }

                    $.when(thisObj.setSubGroups(newItem.id, groups), thisObj.setSubHosts(newItem.id, hosts)).always(function(){
                        def.resolve(newItem.id)
                    })
            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    }).fail(function(e)
    {
        def.reject(e)
    })


    return def.promise();
}

/**
 * @return $.Deferred
 */
pmInventories.addItem = function(parent_type, parent_item)
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_inventory_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()

    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }

    var thisObj = this;
    $.ajax({
        url: "/api/v1/inventories/",
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
            $.notify("inventory created", "success");

            if(parent_item)
            {
                if(parent_type == 'project')
                {
                    $.when(pmProjects.addSubInventories(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"project/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
            }
            else
            {
                $.when(spajs.open({ menuId: thisObj.model.page_name + "/"+data.id})).always(function(){
                    def.resolve()
                })
            }

        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    });

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmInventories.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#inventory_"+item_id+"_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/",
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
            console.warn("inventory "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmInventories.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_groups_to_inventory', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmInventories.showAddSubHostsForm = function(item_id, holder)
{
    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_hosts_to_inventory', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Проверяет принадлежит ли host_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} host_id
 * @returns {Boolean}
 */
pmInventories.hasHosts = function(item_id, host_id)
{
    if(pmInventories.model.items[item_id])
    {
        for(var i in pmInventories.model.items[item_id].hosts)
        {
            if(pmInventories.model.items[item_id].hosts[i].id == host_id)
            {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет принадлежит ли host_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} host_id
 * @returns {Boolean}
 */
pmInventories.hasGroups = function(item_id, group_id)
{
    if(pmInventories.model.items[item_id])
    {
        for(var i in pmInventories.model.items[item_id].groups)
        {
            if(pmInventories.model.items[item_id].groups[i].id == group_id)
            {
                return true;
            }
        }
    }
    return false;
}


/**
 * @return $.Deferred
 */
pmInventories.setSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/groups/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(pmInventories.model.items[item_id])
            {
                pmInventories.model.items[item_id].groups = []
                for(var i in groups_ids)
                {
                    pmInventories.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmInventories.setSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(pmInventories.model.items[item_id])
            {
                pmInventories.model.items[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    pmInventories.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmInventories.addSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/inventories/"+item_id+"/groups/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }

            if(pmInventories.model.items[item_id])
            {
                if(!pmInventories.model.items[item_id].groups)
                {
                    pmInventories.model.items[item_id].groups = []
                }

                for(var i in groups_ids)
                {
                    pmInventories.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }

            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}

/**
 * @return $.Deferred
 */
pmInventories.addSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }

            if(pmInventories.model.items[item_id])
            {
                if(!pmInventories.model.items[item_id].hosts)
                {
                    pmInventories.model.items[item_id].hosts = []
                }

                for(var i in hosts_ids)
                {
                    pmInventories.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }

            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}