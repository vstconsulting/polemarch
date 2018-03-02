

var pmInventories = inheritance(pmItems)
pmInventories.model.name = "inventories"
pmInventories.model.page_name = "inventory"
pmInventories.model.bulk_name = "inventory"
pmInventories.model.className = "pmInventories"

/**
 * Параметры из секции *:vars
 * Строка где после первого `=` всё остальное значение.
 */
pmInventories.parseMonoVarsLine = function(index, line)
{
    var vars = {}
    var param = /^([^=]+)="(.*)"$/.exec(line)

    if(param)
    {
        vars[param[1]] = param[2]
    }
    else
    {
        param = /^([^=]+)=(.*)$/.exec(line)
        if(param)
        {
            vars[param[1]] = param[2]
        }
        else
        {
            throw "Error in line "+index+" invalid varibles string ("+line+")"
        }
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

        var params = /^([^=]+)=["'](.*?)["'] +[^=]+=/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = stripslashes(params[2])
            line = trim(line.slice(params[1].length + params[2].length + 3))
            continue;
        }

        params = /^([^=]+)=([^ ]*) +[^=]+=/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = stripslashes(params[2])
            line = trim(line.slice(params[1].length + params[2].length + 1))
            continue;
        }

        params = /^([^=]+)=["'](.*?)["'] *$/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = stripslashes(params[2])
            break;
        }

        params = /^([^=]+)=([^ ]*) *$/.exec(line)
        if(params)
        {
            params[1] = trim(params[1])
            vars[params[1]] = stripslashes(params[2])
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
        pmInventories.addGroupIfNotExists(inventory, section)
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

        pmInventories.addGroupIfNotExists(inventory, section)
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

        pmInventories.addGroupIfNotExists(inventory, section)
        inventory.groups[section].children = true
        inventory.groups[section].groups.push(line)
        pmInventories.addGroupIfNotExists(inventory, line)
        return true;
    }

    pmInventories.parseHostLine(index, line, section, inventory)
    return false;
}

/**
 * Добавляет группу в инвенторий если её ещё нет
 * @param {Object} inventory
 * @param {string} group_name имя группы
 * @returns {Boolean} true если группа добавлена.
 */
pmInventories.addGroupIfNotExists = function(inventory, group_name)
{
    if(!inventory.groups[group_name])
    {
        inventory.groups[group_name] = {
            vars:{},
            groups:[],
            hosts:[],
        }

        return true;
    }

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
        vars:{},
        name:new Date().toString()
    }

    for(var i in lines)
    {
        var line = lines[i].replace(/^ */g, "")

        if(/^\s*[#;]\s+inventory name: (.*)/ig.test(line))
        {
            var name = /^\s*[#;]\s+inventory name: (.*)/ig.exec(line)
            inventory.name = name[1]
            continue;
        }

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

            var group_name = cSection.substring(0, cSection.length - ":vars".length)
            if(group_name != "all")
            {
                pmInventories.addGroupIfNotExists(inventory, group_name)
            }
            console.info("setSection:vars ", cSection)
            continue;
        }
        if(/^\[([A-z0-9\.:\-]+:children)\]/ig.test(line))
        {
            var res = /^\[([A-z0-9\.:\-]+)\]/ig.exec(line)
            cSection = res[1]
            pmInventories.addGroupIfNotExists(inventory, cSection.substring(0, cSection.length - ":children".length))
            console.info("setSection:children ", cSection)
            continue;
        }
        if(/^\[([A-z0-9\.:\-]+)\]/ig.test(line))
        {
            var res = /^\[([A-z0-9\.:\-]+)\]/ig.exec(line)
            cSection = res[1]
            pmInventories.addGroupIfNotExists(inventory, cSection)
            console.info("setSection ", cSection)
            continue;
        }

        pmInventories.parseLine(i, line, cSection, inventory)
    }

    pmInventories.addHierarchyDataToInventoryGroups(inventory)
    console.log("\n\ninventory", inventory)
    return inventory;
}



/**
 * Формирует вспомагательную информацию в объекте инвентория о вложенности групп друг в друга.
 * @param {Object} inventory Инвенторий (Обязательный)
 * @param {string} group_name (не обязательный)
 * @param {integer} level (не обязательный)
 * @param {Array} parents (не обязательный)
 */
pmInventories.addHierarchyDataToInventoryGroups = function(inventory, group_name, level, parents)
{
    if(!level)
    {
        level = 0
    }

    if(parents === undefined)
    {
        parents = []
    }

    if(group_name === undefined || group_name == 'all')
    {
        for(var i in inventory.groups)
        {
            delete inventory.groups[i]['dataLevel']
        }

        for(var i in inventory.groups)
        {
            pmInventories.addHierarchyDataToInventoryGroups(inventory, i, 1, ['all'])
        }

        return;
    }


    if(inventory.groups[group_name].dataLevel && inventory.groups[group_name].dataLevel.level >= level )
    {
        return;
    }

    parents.push(group_name)
    inventory.groups[group_name].dataLevel = {
        level:level,
        parents:parents,
    }

    for(var i in inventory.groups[group_name].groups)
    {
        var hasError = false;
        for(var j in inventory.groups[group_name].dataLevel.parents)
        {
            var val = inventory.groups[group_name].dataLevel.parents[j]
            if(val == inventory.groups[group_name].groups[i])
            {
                inventory.groups[group_name].dataLevel.error = "Group `"+val+"` is recursive include into group `"+inventory.groups[group_name].groups[i]+"`";
                console.warn(inventory.groups[group_name].dataLevel.error)
                hasError = true
                break;
            }
        }

        if(hasError)
        {
            continue;
        }

        pmInventories.addHierarchyDataToInventoryGroups(inventory, inventory.groups[group_name].groups[i], level+1, parents.slice())
    }

    return;
}

// ansible_ssh_private_key_file - запрашивать значение этого параметра.

pmInventories.importFromFile = function(files_event)
{
    var def = new $.Deferred();
    this.model.files = files_event
    this.model.importedInventories = {}
    var thisObj = this;
    for(var i=0; i<files_event.target.files.length; i++)
    {
        var reader = new FileReader();
        reader.onload = (function(index_in_files_array)
        {
            return function(e)
            {
                console.log(e)
                thisObj.model.importedInventories = {
                    inventory:pmInventories.parseFromText(e.target.result),
                    text:e.target.result
                }
            };
        })(i);
        reader.readAsText(files_event.target.files[i]);

        // Нет поддержки загрузки более одного файла за раз.
        break;
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
    return pmInventories.importInventory(pmInventories.model.importedInventories.inventory)
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

pmInventories.showGroupVarsModal = function(opt)
{
    return jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "group"+opt.name)
}

pmInventories.showHostVarsModal = function(opt)
{
    return jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "host"+opt.name)
}

pmInventories.showInventoryVarsModal = function(opt)
{
    return jsonEditor.jsonEditorScrollTo("ansible_ssh_private_key_file", "inventory")
}

pmInventories.importInventory = function(inventory)
{
    var def2 = new $.Deferred();
    if(inventory.vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(inventory.vars.ansible_ssh_private_key_file))
    {
        // <!--Вставка файла -->
        $.notify("Error in field ansible_ssh_private_key_file invalid value", "error");
        pmInventories.showInventoryVarsModal();
        def2.reject()
        return def2.promise();
    }

    for(var i in inventory.hosts)
    {
        var val = inventory.hosts[i]
        if(val.vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(val.vars.ansible_ssh_private_key_file))
        {
            // <!--Вставка файла -->
            $.notify("Error in field ansible_ssh_private_key_file invalid value", "error");
            pmInventories.showHostVarsModal({group:'all', name:val.name});
            def2.reject()
            return def2.promise();
        }
    }

    for(var i in inventory.groups)
    {
        var val = inventory.groups[i]
        if(val.vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(val.vars.ansible_ssh_private_key_file))
        {
            // <!--Вставка файла -->
            $.notify("Error in field ansible_ssh_private_key_file invalid value", "error");
            pmInventories.showGroupVarsModal({name:i});
            def2.reject()
            return def2.promise();
        }

        for(var j in val.hosts)
        {
            var hval = val.hosts[j]
            if(hval.vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(hval.vars.ansible_ssh_private_key_file))
            {
                // <!--Вставка файла -->
                $.notify("Error in field ansible_ssh_private_key_file invalid value", "error");
                pmInventories.showHostVarsModal({group:i, name:hval.name});
                def2.reject()
                return def2.promise();
            }
        }
    }

    var def = new $.Deferred();

    if($("#inventory_name").val() != "")
    {
        inventory.name = $("#inventory_name").val();
    }

    if(!inventory.name)
    {
        // inventory.name = "new imported inventory"

        $.notify("Error in field inventory name", "error");
        def2.reject({text:"Error in field inventory name"})
        return def2.promise();
    }

    var inventoryObject = {
        name:inventory.name,
        vars:inventory.vars
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
                    vars:val.vars
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
                        vars:hval.vars
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
                    vars:val.vars
                }
            })
        }

        // Добавление хостов вложенных к инвенторию
        spajs.ajax.Call({
            url: "/api/v1/_bulk/",
            type: "POST",
            contentType:'application/json',
            data:JSON.stringify(bulkHosts),
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
                    spajs.ajax.Call({
                        url: "/api/v1/_bulk/",
                        type: "POST",
                        contentType:'application/json',
                        data:JSON.stringify(bulkdata),
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
                                        if(inventory.groups[val.data.name].hosts.length)
                                        {
                                            // Добавление хостов
                                            var hosts_ids = []
                                            for(var j in inventory.groups[val.data.name].hosts)
                                            {
                                                // найти id группы и прекрепить.
                                                for(var k in data)
                                                {
                                                    if(data[k].data.children === undefined && data[k].data.name == inventory.groups[val.data.name].hosts[j].name)
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
                                    spajs.ajax.Call({
                                        url: "/api/v1/_bulk/",
                                        type: "POST",
                                        contentType:'application/json',
                                        data:JSON.stringify(bulk_update),
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

    $.when(def).done(function(inventory_id)
    {
        def2.resolve(inventory_id)
    }).fail(function(delete_bulk)
    {
        $.when(spajs.ajax.Call({
            url: "/api/v1/_bulk/",
            type: "POST",
            contentType:'application/json',
            data:JSON.stringify(delete_bulk),
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
    $(holder).insertTpl(text)

    def.resolve()
    return def.promise();
}

pmInventories.renderImportedInventory = function(imported)
{
    if(!imported || !imported.inventory)
    {
        return ""
    }

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

        $.when(encryptedCopyModal.replace(data)).done(function(data)
        {
            spajs.ajax.Call({
                url: "/api/v1/"+thisObj.model.name+"/",
                type: "POST",
                contentType:'application/json',
                data: JSON.stringify(data),
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
    }).fail(function(e)
    {
        def.reject(e)
    })


    return def.promise();
}




pmInventories.model.page_list = {
    title: "Inventories",
    short_title: "Inventories",
    buttons:[
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'new-"+this.model.page_name+"'}); return false;"},
            title:'Create',
            link:function(){ return '/?new-'+this.model.page_name},
        },
        {
            tpl:function(){
                return spajs.just.render('inventories_btn_openImportPageAndImportFiles', {})
            },
        },
    ],
    fileds:[
        {
            title:'Name',
            name:'name',
        },
    ],
    actions:[
        {
            class:'btn btn-danger',
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+'));  return false;'},
            title:'Delete',
            link:function(){ return '#'}
        },
        {
            class:'btn btn-default',
            function:function(item){ return '';},
            title:'Create sub group',
            link:function(item)
            {
                return '/?inventory/'+item.id+'/new-group'
            },
        },
        {
            class:'btn btn-default',
            function:function(item){ return '';},
            title:'Create sub host',
            link:function(item)
            {
                return '/?inventory/'+item.id+'/new-host'
            },
        }
    ]
}

pmInventories.model.page_new = {
    title: "New inventory",
    short_title: "New inventory",
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter inventory name',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:filedsLib.validator.notEmpty
            },
        ]
    ],
    sections:[
        function(section){
            return jsonEditor.editor({}, {block:this.model.name});
        }
    ],
    onBeforeSave:function(data)
    {
        data.vars = jsonEditor.jsonEditorGetValues()
        return data;
    },
    onCreate:function(data, status, xhr, callOpt)
    {
        var def = new $.Deferred();
        $.notify("Inventory created", "success");

        if(callOpt.parent_item)
        {
            if(callOpt.parent_type == 'project')
            {
                $.when(pmProjects.addSubInventories(callOpt.parent_item, [data.id])).always(function(){
                    $.when(spajs.open({ menuId:"project/"+callOpt.parent_item})).always(function(){
                        def.resolve()
                    })
                })
            }
        }
        else
        {
            $.when(spajs.open({ menuId: this.model.page_name + "/"+data.id})).always(function(){
                def.resolve()
            })
        }
        return def.promise();
    }
}

pmInventories.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'return spajs.openURL(this.href);'},
            title:'History',
            link:function(item_id){ return polemarch.opt.host + '/?inventory/' + item_id + '/history'},
        },
        {
            class:'btn btn-default copy-btn',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.copyAndEdit('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-duplicate" ></span>',
            link:function(){ return '#'},
            help:'Copy'
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    sections:[
        function(section, item_id){
            return jsonEditor.editor(this.model.items[item_id].vars, {block:this.model.name});
        },
        function(section, item_id){
            return spajs.just.render("inventories_sub_items", {item_id:item_id})
        }
    ],
    title: function(item_id){
        return "Inventory "+this.model.items[item_id].justText('name')
    },
    short_title: function(item_id){
        return "Inventory "+this.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter inventory name',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        data.vars = jsonEditor.jsonEditorGetValues()
        return data;
    },
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmInventories.showAddSubGroupsForm = function(item_id, holder)
{
    if(!item_id)
    {
        throw "Error in pmInventories.showAddSubGroupsForm with item_id = `" + item_id + "`"
    }

    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_groups_to_inventory', {item_id:item_id}))
        var scroll_el = "#add_existing_item_to_inventory";
        if ($(scroll_el).length != 0)  {
            $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 1000);
        }
        $("#polemarch-model-items-select").select2({ width: '100%' });
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmInventories.showAddSubHostsForm = function(item_id, holder)
{
    if(!item_id)
    {
        throw "Error in pmInventories.showAddSubHostsForm with item_id = `" + item_id + "`"
    }

    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_hosts_to_inventory', {item_id:item_id}))
        var scroll_el = "#add_existing_item_to_inventory";
        if ($(scroll_el).length != 0) {
            $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 1000);
        }
        $("#polemarch-model-items-select").select2({ width: '100%' });
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
    if(!item_id)
    {
        throw "Error in pmInventories.hasHosts with item_id = `" + item_id + "`"
    }

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
    if(!item_id)
    {
        throw "Error in pmInventories.hasGroups with item_id = `" + item_id + "`"
    }

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
    var thisObj=this;
    if(!item_id)
    {
        throw "Error in pmInventories.setSubGroups with item_id = `" + item_id + "`"
    }

    if(!groups_ids)
    {
        groups_ids = []
    }
    else
    {
        for(var i in groups_ids)
        {
            groups_ids[i]=+groups_ids[i];
        }
    }

    return spajs.ajax.Call({
        url: "/api/v1/inventories/"+item_id+"/groups/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        success: function(data)
        {
            pmItems.checkSubItemsAndAdd(thisObj, pmGroups, data, item_id, "groups", groups_ids);
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
    var thisObj=this;
    if(!hosts_ids)
    {
        hosts_ids = []
    }
    else {
        for(var i in hosts_ids)
        {
            hosts_ids[i]=+hosts_ids[i];
        }
    }

    if(!item_id)
    {
        throw "Error in pmInventories.setSubHosts with item_id = `" + item_id + "`"
    }

    return spajs.ajax.Call({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        success: function(data)
        {
            pmItems.checkSubItemsAndAdd(thisObj, pmHosts, data, item_id, "hosts", hosts_ids);
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
    if(!item_id)
    {
        throw "Error in pmInventories.addSubGroups with item_id = `" + item_id + "`"
    }

    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    spajs.ajax.Call({
        url: "/api/v1/inventories/"+item_id+"/groups/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        success: function(data)
        {
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject({text:"Item not found", status:404})
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
            def.reject(e)
        }
    });
    return def.promise();
}

/**
 * @return $.Deferred
 */
pmInventories.addSubHosts = function(item_id, hosts_ids)
{
    if(!item_id)
    {
        throw "Error in pmInventories.addSubHosts with item_id = `" + item_id + "`"
    }

    var def = new $.Deferred();
    if(!hosts_ids || hosts_ids.length == 0)
    {
        def.resolve()
        return def.promise();
    }

    spajs.ajax.Call({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        success: function(data)
        {
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject({text:"Item not found", status:404})
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
            def.reject(e)
        }
    });
    return def.promise();
}

/**pmInventories.validateGroupName = function(name)
 {
     if(!name)
     {
         return false;
     }

     if(/^[a-zA-Z0-9\-\._]*$/.test(name.toLowerCase()))
     {
         return true;
     }

     return false;
 }*/




/**
 * Для ввода инвентория
 * @type Object
 */
pmInventories.filed.inventoriesAutocomplete = inheritance(filedsLib.filed.simpleText)
pmInventories.filed.inventoriesAutocomplete.type = 'inventoriesAutocomplete'
pmInventories.filed.inventoriesAutocomplete.getValue = function(pmObj, filed)
{
    var inventory = $("#inventories-autocomplete").val()
    if($("#inventory-source").val() != 'db')
    {
        inventory =  $("#inventories-file").val()
        if(!/^\.\//.test(inventory))
        {
            inventory = trim("./"+inventory)
        }
    }


    return inventory;
}

/**
 * Функция для рендера поля
 * @type Object
 */
pmInventories.filed.inventoriesAutocomplete.render = function(pmObj, filed, item_id, opt)
{
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id, filedObj:this, opt:opt})
    return spajs.just.onInsert(html, function()
    {
        // @FixMe требует чтоб были загружены все инвентории pmInventories.loadAllItems()
        $("#inventories-autocomplete").select2({ width: '100%' });

        if(filed.onchange && item_id)
        {
            filed.onchange({value:filed.getFiledValue.apply(pmObj, [item_id])})
        }
        else if(filed.onchange)
        {
            if(pmInventories.model.itemslist.results[0])
            {
                filed.onchange({value:pmInventories.model.itemslist.results[0].id})
            }
            else
            {
                filed.onchange({value:""})
            }
        }
    });
}


tabSignal.connect("polemarch.start", function()
{
    // inventories
    spajs.addMenu({
        id:"inventories",
        urlregexp:[/^inventories$/, /^inventory$/, /^inventories\/search\/?$/, /^inventories\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"inventories-import",
        urlregexp:[/^inventories\/import$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showImportPage(holder, menuInfo, data);}
    })


    spajs.addMenu({
        id:"inventories-search",
        urlregexp:[/^inventories\/search\/([A-z0-9 %\-.:,=]+)$/, /^inventories\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"inventory",
        urlregexp:[/^inventory\/([0-9]+)$/, /^inventories\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"inventory-history",
        urlregexp:[/^inventory\/([0-9]+)\/history$/, /^inventory\/([0-9]+)\/history\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showListInInventory(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newInventory",
        urlregexp:[/^new-inventory$/, /^([A-z0-9_]+)\/([0-9]+)\/new-inventory$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showNewItemPage(holder, menuInfo, data);}
    })
})
