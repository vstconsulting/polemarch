

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
        notes:"",
        type:type,
        all_only:false,
        matches:false,
        match_id_arr:[],
        match_arr:[],
        extern:false,
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
            notes:"",
            vars:{},
            groups:[],
            hosts:[],
            matches:false,
            match_id_arr:[],
            match_arr:[],
            extern:false,
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
        name:new Date().toString(),
        notes:""
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
    pmInventories.model.importedInventoriesIsReady=false;
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
                //просматриваем все хосты имеющиеся в импортируемом инвентории, включая те, что вложены в группы
                //если хост используется только в группе, все равно добавляем его к хостам, чтобы после импорта
                //было удобно смотреть наши сущности. отличить вложенный хост от невложенного можно по свойству all_only
                for(var i in pmInventories.model.importedInventories.inventory.groups)
                {
                    for(var j in pmInventories.model.importedInventories.inventory.groups[i].hosts)
                    {
                        var host_in_group=pmInventories.model.importedInventories.inventory.groups[i].hosts[j];
                        var bool=false;
                        for(var k in pmInventories.model.importedInventories.inventory.hosts)
                        {
                            var host_in_inventory=pmInventories.model.importedInventories.inventory.hosts[k];
                            if(host_in_group.name==host_in_inventory.name)
                            {
                                bool=true;
                                host_in_group=JSON.parse(JSON.stringify(host_in_inventory));
                            }
                        }
                        if(bool==false)
                        {
                            host_in_group.all_only=true;
                            pmInventories.model.importedInventories.inventory.hosts.push(host_in_group);
                        }
                    }
                }

                //ищем совпадения импортированных сущностей(хосты, группы) с уже имющимися в системе
                //ищем хосты
                for(var i in pmHosts.model.items)
                {
                    var exhisting_host=pmHosts.model.items[i];
                    for(var j in pmInventories.model.importedInventories.inventory.hosts)
                    {
                        var new_host=pmInventories.model.importedInventories.inventory.hosts[j];
                        if(exhisting_host.name==new_host.name)
                        {
                            new_host.matches=true;
                            new_host.match_id_arr.push(exhisting_host.id);
                        }
                    }
                }

                //ищем совпадения импортированных сущностей(хосты, группы) с уже имющимися в системе
                //ищем группы
                for(var i in pmGroups.model.items)
                {
                    var exhisting_group=pmGroups.model.items[i];
                    for(var j in pmInventories.model.importedInventories.inventory.groups)
                    {
                        var new_group=pmInventories.model.importedInventories.inventory.groups[j];
                        if(exhisting_group.name==j)
                        {
                            new_group.matches=true;
                            new_group.match_id_arr.push(exhisting_group.id);
                        }
                    }
                }

                pmInventories.model.importedInventoriesCopy=JSON.parse(JSON.stringify(pmInventories.model.importedInventories));

                //pmInventories.model.importedInventoriesIsReady - отвечает за готовность перезагрузки шаблона страницы импортированного инвентория
                //когда данное свойство изменится и станет равным true - шаблон "inventories_import_page" перерисуется
                pmInventories.model.importedInventoriesIsReady=true;

            };
        })(i);
        reader.readAsText(files_event.target.files[i]);

        // Нет поддержки загрузки более одного файла за раз.
        break;
    }
    return def.promise();
}

/**
 * Функция обновляет текст инвентория и инициализирует перерисовку страницу с импортированным инвенторием.
 */
pmInventories.updateImportedInventoryPage = function()
{
    pmInventories.model.importedInventories.text=pmInventories.getInventoryTextFromObjectCE(pmInventories.model.importedInventories.inventory);
    pmInventories.model.importedInventoriesIsReady=!pmInventories.model.importedInventoriesIsReady;
    pmInventories.model.importedInventoriesIsReady=!pmInventories.model.importedInventoriesIsReady;
}

/**
 * Функция рендерит модальное окно для редактирования нового subitem(host or group),
 * вложенного в импортируемый инвенторий.
 * В данном модальном окне пользователь может изменить/удалить/добавить vars у данной subitem.
 * Другие свойства subitem являются недоступными для редактирования.
 * @param {string} subItemType - типа subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.renderEditItemModal = function(subItemType, index)
{
    var imported_subitem=pmInventories.model.importedInventories.inventory[subItemType][index];
    pmInventories.model.importedSubItem=JSON.parse(JSON.stringify(imported_subitem));
    var html=spajs.just.render('edit_imported_subitem', {val:pmInventories.model.importedSubItem, subItemType:subItemType, index:index});
    return html;
}

/**
 * Функция открывает модальное окно для редактирования нового subitem(host or group),
 * вложенного в импортируемый инвенторий.
 * @param {string} subItemType - типа subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.openEditItemModal = function(subItemType, index)
{
    if($('div').is('#edit_imported_subitem'))
    {
        $('#edit_imported_subitem').empty();
        $('#edit_imported_subitem').insertTpl(pmInventories.renderEditItemModal(subItemType, index));
        $("#edit_imported_subitem").modal('show');
    }
    else
    {
        var t=$(".content")[0];
        $('<div>', { id: "edit_imported_subitem", class: "modal fade in"}).appendTo(t);
        $('#edit_imported_subitem').insertTpl(pmInventories.renderEditItemModal(subItemType, index));
        $("#edit_imported_subitem").modal('show');
    }
}

/**
 * Функция сохраняет изменения внесенные в модальном окне для редактирования нового subitem(host or group),
 * вложенного в импортируемый инвенторий.
 * @param {string} subItemType - типа subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.saveChangesFromEditItemModal = function(subItemType, index)
{
    pmInventories.model.importedSubItem.notes=$("#"+subItemType+"_notes").val();
    pmInventories.model.importedInventories.inventory[subItemType][index]=JSON.parse(JSON.stringify(pmInventories.model.importedSubItem));
    var html=spajs.just.render('change_imported_subitem_vars', {vars:pmInventories.model.importedInventories.inventory[subItemType][index].vars});
    $("#"+subItemType+"-"+index+"-vars").html(html);
    $("#edit_imported_subitem").modal('hide');
    pmInventories.updateImportedInventoryPage();
}

/**
 * Функция открывает модальное окно, в котором пользователь может выбрать
 * какой конкретно из subitems с одинаковым именем использовать в данном инвентории.
 * Так же данная функция посылает bulk запрос, который подгружает свойства созданных ранее
 * subitems с таким же именем.
 * @param {string} subItemType - типа subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.openChooseMatchingModal = function(subItemType, index)
{
    var def = new $.Deferred();
    var bulkHosts=[];
    var type1=subItemType.slice(0,-1);
    var imported_subitem=pmInventories.model.importedInventories.inventory[subItemType][index];
    imported_subitem=JSON.parse(JSON.stringify(imported_subitem));
    for(var i in imported_subitem.match_id_arr)
    {
        bulkHosts.push({
            type:"get",
            item: type1,
            pk: imported_subitem.match_id_arr[i]
        })
    }
    return $.when(
        spajs.ajax.Call({
            url: hostname + "/api/v1/_bulk/",
            type: "POST",
            contentType:'application/json',
            data:JSON.stringify(bulkHosts),
            success: function(data)
            {
                for(var i in data)
                {
                    imported_subitem.match_arr.push(data[i].data);
                }
                pmInventories.model.importedSubItem=JSON.parse(JSON.stringify(imported_subitem));
                if($('div').is('#choose_matching_modal'))
                {
                    $('#choose_matching_modal').empty();
                    $('#choose_matching_modal').insertTpl(pmInventories.renderChooseMatchingModal(subItemType, index));
                    $("#choose_matching_modal").modal('show');
                }
                else
                {
                    var t=$(".content")[0];
                    $('<div>', { id: "choose_matching_modal", class: "modal fade in"}).appendTo(t);
                    $('#choose_matching_modal').insertTpl(pmInventories.renderChooseMatchingModal(subItemType, index));
                    $("#choose_matching_modal").modal('show');
                }

            },
            error: function(e)
            {
                $.notify("Error with getting matching "+subItemType+"' data.", "error");
            }
        })).done(function(){def.promise();}).fail(function(){def.reject();}).promise();

}


/**
 * Функция рендерит модальное окно, в котором пользователь может выбрать
 * какой конкретно из subitems с одинаковым именем использовать в данном инвентории.
 * @param {string} subItemType - типа subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.renderChooseMatchingModal = function(subItemType, index)
{
    var html=spajs.just.render('choose_matching_modal', {val:pmInventories.model.importedSubItem, subItemType:subItemType, index:index});
    return html;
}

/**
 * Пользователь выбрал какой из subitems с одинаковым именем ему использовать.
 * Данная функция снимает выделение со всех других subitems,
 * и выделяет выбранный пользователем subitem.
 * @param {object} thisEl - конкретный элемент
 */
pmInventories.toggleSelectMatchSubItem = function (thisEl)
{
    var mode=$(thisEl).parent().hasClass('selected');
    var match_subitem_arr=$(".match-subitem");
    for(var i=0; i<match_subitem_arr.length; i++){
        $(match_subitem_arr[i]).removeClass('selected');
    }
    $(thisEl).parent().toggleClass('selected', !mode);
}

/**
 * Функция рекурсивно вставляет в группу вложенные в нее группы и хосты из копии изначально имопртированного инвентория (pmInventories.model.importedInventoriesCopy.inventory)
 * Если какие-то из вложенных групп имеют свойство children:true, то используется рекурсивный вызов этой же функции.
 * @param {array} items_arr - массив с именами групп
 */
pmInventories.recursionInsertOfImportCopyGroups = function(items_arr)
{
    for(var i in items_arr)
    {
        var gName=items_arr[i];
        pmInventories.model.importedInventories.inventory.groups[gName]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory.groups[gName]));
        if(pmInventories.model.importedInventories.inventory.groups[gName].children!==undefined && pmInventories.model.importedInventories.inventory.groups[gName].children==true)
        {
            pmInventories.recursionInsertOfImportCopyGroups(pmInventories.model.importedInventories.inventory.groups[gName].children);
        }
        for(var j in pmInventories.model.importedInventories.inventory.groups[gName].hosts)
        {
            for(var k in pmInventories.model.importedInventoriesCopy.inventory.hosts)
            {
                if(pmInventories.model.importedInventories.inventory.groups[gName].hosts[j].name==pmInventories.model.importedInventoriesCopy.inventory.hosts[k].name)
                {
                    pmInventories.model.importedInventories.inventory.hosts[k]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory.hosts[k]));
                }
            }
        }

    }
}

/**
 * После того, как пользователь поменял matching object, данная функция обновляет данные о данном объекте
 * во всех объектах, где он является вложенным.
 * @param {string} subItemType - тип subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.updateLinkedItemsAfterSaveSelected = function(subItemType, index)
{
    if(subItemType=="hosts")
    {
        var item_name=pmInventories.model.importedInventories.inventory[subItemType][index].name;
    }
    else
    {
        var item_name=index;
    }

    for(var i in pmInventories.model.importedInventories.inventory.groups)
    {
        if(subItemType=="hosts")
        {
            for(var j in pmInventories.model.importedInventories.inventory.groups[i].hosts)
            {
                if(pmInventories.model.importedInventories.inventory.groups[i].hosts[j].name==item_name)
                {
                    pmInventories.model.importedInventories.inventory.groups[i].hosts[j]=JSON.parse(JSON.stringify(pmInventories.model.importedInventories.inventory[subItemType][index]));
                }
            }
        }
        else
        {
            for(var j in pmInventories.model.importedInventories.inventory.groups[i].groups)
            {
                if(typeof(pmInventories.model.importedInventories.inventory.groups[i].groups[j])=="object")
                {
                    if(pmInventories.model.importedInventories.inventory.groups[i].groups[j].name==item_name)
                    {
                        pmInventories.model.importedInventories.inventory.groups[i].groups[j]=item_name;
                    }
                }
                else
                {
                    if(pmInventories.model.importedInventories.inventory.groups[i].groups[j]==item_name)
                    {
                        pmInventories.model.importedInventories.inventory.groups[i].groups[j]=JSON.parse(JSON.stringify(pmInventories.model.importedInventories.inventory[subItemType][index]));
                        pmInventories.model.importedInventories.inventory.groups[i].groups[j].name=item_name;
                    }
                }

            }
        }
    }
}


/**
 * Функция проверяет используется ли где-нибудь данный залинкованный объект.
 * То есть является ли он вложенным subitem в какую-нибудь залинованную группу из данного импортированного инвентория.
 * По результату проверки возвращает:
 * - false, если объект используется в залинкованной группе, следовательно, нельзя выбирать для него matching object.
 * - true, если объект не ипользуется в залинкованной группе, следовательно, его можно выбирать для него  matching object.
 * @param {string} subItemType - тип subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.checkAbilityToSelectMatching = function(subItemType, index)
{
    if(pmInventories.model.importedInventories.inventory[subItemType][index].id!==undefined)
    {
        if(subItemType=="hosts")
        {
            var item_name=pmInventories.model.importedInventories.inventory[subItemType][index].name;
        }
        else
        {
            var item_name=index;
        }

        for(var i in pmInventories.model.importedInventories.inventory.groups)
        {
            if(pmInventories.model.importedInventories.inventory.groups[i].id!==undefined)
            {
                for(var j in pmInventories.model.importedInventories.inventory.groups[i][subItemType])
                {
                    if(pmInventories.model.importedInventories.inventory.groups[i][subItemType][j].name==item_name)
                    {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

/**
 * Функция определяет какой из subitems с одинаковыми именами
 * пользователь выбрал для данного инвентория.
 * На основе данного выбора вносит изменения в модель : pmInventories.model.importedInventories.inventory[subItemType][index]
 * и инициализирует перерисовку страницы импортируемого инвентория (той части, где находятся subitems).
 * @param {string} subItemType - тип subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.saveSelectedMatchSubItem1 = function(subItemType, index)
{
    var def = new $.Deferred();
    if($(".match-subitem.selected").length==0)
    {
        $.notify("Please, select one of the "+subItemType+".", "error");
        return def.reject();
    }
    else
    {
        $("#choose_matching_modal").modal('hide');

        var subitem_id=$(".match-subitem.selected").attr("subitem-id");
        if(subitem_id!="new")
        {
            for(var i in pmInventories.model.importedSubItem.match_arr)
            {
                var subitem=pmInventories.model.importedSubItem.match_arr[i];
                if(subitem.id==subitem_id)
                {
                    pmInventories.model.importedSubItem.id=+subitem_id;
                    pmInventories.model.importedSubItem.notes=subitem.notes;
                    pmInventories.model.importedSubItem.type=subitem.type;
                    pmInventories.model.importedSubItem.vars=JSON.parse(JSON.stringify(subitem.vars));
                    if(subItemType=="groups")
                    {
                        pmInventories.model.importedSubItem.children=subitem.children;
                        if(subitem.children)
                        {
                            pmInventories.model.importedSubItem.groups=JSON.parse(JSON.stringify(subitem.groups));
                            pmInventories.model.importedSubItem.hosts=[];

                            $.when(pmInventories.getInnerDataForChildrenGroup()).done(function()
                            {
                                pmInventories.model.importedInventories.inventory[subItemType][index]=JSON.parse(JSON.stringify(pmInventories.model.importedSubItem));
                                pmInventories.model.importedInventories.inventory[subItemType][index].match_arr=[];
                                pmInventories.updateLinkedItemsAfterSaveSelected(subItemType, index);
                                pmInventories.deleteAllExternSubItems("groups");
                                pmInventories.deleteAllExternSubItems("hosts");
                                pmInventories.updateImportedInventoryPage();
                                $($(".item-"+index+"-hide-li")[0]).addClass("hide");
                                def.resolve();
                            });
                        }
                        else
                        {
                            pmInventories.model.importedSubItem.hosts=JSON.parse(JSON.stringify(subitem.hosts));
                            pmInventories.model.importedSubItem.groups=[];
                            $.when(pmInventories.getInnerDataForGroup()).done(function(){
                                pmInventories.model.importedInventories.inventory[subItemType][index]=JSON.parse(JSON.stringify(pmInventories.model.importedSubItem));
                                pmInventories.model.importedInventories.inventory[subItemType][index].match_arr=[];
                                pmInventories.updateLinkedItemsAfterSaveSelected(subItemType, index);
                                pmInventories.deleteAllExternSubItems("groups");
                                pmInventories.deleteAllExternSubItems("hosts");
                                pmInventories.updateImportedInventoryPage();
                                $($(".item-"+index+"-hide-li")[0]).addClass("hide");
                                def.resolve();
                            });
                        }
                    }
                    else
                    {
                        pmInventories.model.importedInventories.inventory[subItemType][index]=JSON.parse(JSON.stringify(pmInventories.model.importedSubItem));
                        pmInventories.model.importedInventories.inventory[subItemType][index].match_arr=[];
                        pmInventories.updateLinkedItemsAfterSaveSelected(subItemType, index);
                        pmInventories.updateImportedInventoryPage();
                        $($(".item-"+index+"-hide-li")[0]).addClass("hide");
                        def.resolve();
                    }
                }
            }
        }
        else //возвращаем изначально импортированные объекты и их параметры
        {

            pmInventories.model.importedInventories.inventory[subItemType][index]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory[subItemType][index]));

            if(subItemType=="groups")  //при обновлении группы, обновляем также и ее содержимое
            {
                if(pmInventories.model.importedInventories.inventory[subItemType][index].children==true) //для групп children:true обновлем вложенные подгруппы, а также хосты вложенные в данные подгруппы
                {
                    for(var i in pmInventories.model.importedInventories.inventory[subItemType][index].groups)
                    {
                        var gName=pmInventories.model.importedInventories.inventory[subItemType][index].groups[i];
                        pmInventories.model.importedInventories.inventory.groups[gName]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory.groups[gName]));
                        if(pmInventories.model.importedInventories.inventory.groups[gName].children)
                        {
                            pmInventories.recursionInsertOfImportCopyGroups(pmInventories.model.importedInventoriesCopy.inventory.groups[gName].groups);
                        }
                        for(var j in pmInventories.model.importedInventories.inventory.groups[gName].hosts)
                        {
                            for(var k in pmInventories.model.importedInventoriesCopy.inventory.hosts)
                            {
                                if(pmInventories.model.importedInventories.inventory.groups[gName].hosts[j].name==pmInventories.model.importedInventoriesCopy.inventory.hosts[k].name)
                                {
                                    pmInventories.model.importedInventories.inventory.hosts[k]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory.hosts[k]));
                                }
                            }
                        }
                    }
                }
                else //для групп children:false обновлем вложенные в них хосты
                {
                    for(var i in pmInventories.model.importedInventories.inventory[subItemType][index].hosts)
                    {
                        var subitem_host_name=pmInventories.model.importedInventories.inventory[subItemType][index].hosts[i].name;
                        for(var j in pmInventories.model.importedInventoriesCopy.inventory.hosts)
                        {
                            var host_copy_name=pmInventories.model.importedInventoriesCopy.inventory.hosts[j].name;
                            if(subitem_host_name==host_copy_name)
                            {
                                pmInventories.model.importedInventories.inventory.hosts[j]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory.hosts[j]));
                            }
                        }
                    }
                }
            }
            pmInventories.deleteAllExternSubItems("groups");
            pmInventories.deleteAllExternSubItems("hosts");
            pmInventories.updateLinkedItemsAfterSaveSelected(subItemType, index);
            pmInventories.updateImportedInventoryPage();
            $($(".item-"+index+"-hide-li")[0]).removeClass("hide");
            def.resolve();
        }
    }
    return def.promise();
}

/**
 * Функция вызывает функцию pmInventories.saveSelectedMatchSubItem1, которая сохраняет выбранный matching object,
 * и отслеживает ее выполнение.
 * @param {string} subItemType - тип subitem(group or host)
 * @param {integer/string} index - индекс данного subitem в массиве
 */
pmInventories.saveSelectedMatchSubItem = function(subItemType, index)
{
    return $.when(pmInventories.saveSelectedMatchSubItem1(subItemType, index)).done(function()
    {
        $.notify("You choice was saved", "success");
    }).promise();
}

/**
 * Функция формирует и посылает bulk запрос на получение полной информации по всем группам, имеющимся в системе.
 * Получив успешный ответ на запрос, записывает данные в pmInventories.model.allBulkGroup.
 */
pmInventories.getAllGroupDataBulk = function()
{
    var bulkArr=[];
    var def=new $.Deferred();
    for(var i in pmGroups.model.itemslist.results)
    {
        bulkArr.push({
            type:"get",
            item: "group",
            pk: pmGroups.model.itemslist.results[i].id
        })
    }
    spajs.ajax.Call({
        url: hostname + "/api/v1/_bulk/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(bulkArr),
        success: function(data)
        {
            pmInventories.model.allBulkGroup=data;
            def.resolve();
        },
        error: function(e)
        {
            $.notify("Error with getting group data.", "error");
            def.reject();
        }
    })
    return  def.promise();
}

/**
 * Функция формирует и посылает bulk запрос на получение полной информации по всем хостам, имеющимся в системе.
 * Получив успешный ответ на запрос, записывает данные в pmInventories.model.allBulkHost.
 */
pmInventories.getAllHostDataBulk = function()
{
    var bulkArr=[];
    var def=new $.Deferred();
    for(var i in pmHosts.model.itemslist.results)
    {
        bulkArr.push({
            type:"get",
            item: "host",
            pk: pmHosts.model.itemslist.results[i].id
        })
    }
    spajs.ajax.Call({
        url: hostname + "/api/v1/_bulk/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(bulkArr),
        success: function(data)
        {
            pmInventories.model.allBulkHost=data;
            def.resolve();
        },
        error: function(e)
        {
            $.notify("Error with getting hosts data.", "error");
            def.reject();
        }
    })
    return  def.promise();
}

/**
 * Функция рекурсивно вставляет в группу вложенные в нее группы и хосты из копии pmInventories.model.allBulkGroup (массив, хранящий в себе полную инфу о всех группах)
 * Если какие-то из вложенных групп имеют свойство children:true, то используется рекурсивный вызов этой же функции.
 * @param {object} val - объект (конкретная группа)
 * @param {array} data - массив с данными по группам, обновляемыми в текущий момент.
 */
pmInventories.recursionInsertOfInnerGroups=function(val, data)
{
    var data=data;
    for(var i in val.groups)
    {
        for(var j in pmInventories.model.allBulkGroup)
        {
            if(val.groups[i].id==pmInventories.model.allBulkGroup[j].data.id)
            {
                data.push(pmInventories.model.allBulkGroup[j]);
                if(val.groups[i].children)
                {
                    for(var l in pmInventories.model.allBulkGroup)
                    {
                        if(val.groups[i].id==pmInventories.model.allBulkGroup[l].data.id)
                        {
                            val.groups[i]=JSON.parse(JSON.stringify(pmInventories.model.allBulkGroup[l].data));
                        }
                    }
                    pmInventories.recursionInsertOfInnerGroups(val.groups[i], data);
                }
            }
        }
    }
    return data;
}

/**
 * Функция вставляет в залинкованную группу со свойством children:true вложенные в нее группы и хосты.
 */
pmInventories.getInnerDataForChildrenGroup = function() {
    return $.when(pmInventories.getAllGroupDataBulk(), pmInventories.getAllHostDataBulk()).done(function ()
    {
        var data=[];
        var data1=[];
        for(var i in pmInventories.model.allBulkGroup)
        {
            var val=pmInventories.model.allBulkGroup[i].data;
            for(var j in pmInventories.model.importedSubItem.groups)
            {
                var val1=pmInventories.model.importedSubItem.groups[j];
                if(val.id==val1.id)
                {
                    data.push(pmInventories.model.allBulkGroup[i]);
                    if(val.children)
                    {
                        data=pmInventories.recursionInsertOfInnerGroups(val, data);
                    }
                }
            }
        }

        for(var i in data)
        {
            for(var j in data[i].data.hosts)
            {
                var val=data[i].data.hosts[j];
                for(var k in pmInventories.model.allBulkHost)
                {
                    var val1=pmInventories.model.allBulkHost[k].data;
                    if(val.id==val1.id)
                    {
                        var bool=false;
                        for(var l in data1)
                        {
                            if(data1[l].id==val.id)
                            {
                                bool=true;
                            }
                        }
                        if(!bool)
                        {
                            data1.push(pmInventories.model.allBulkHost[k]);
                        }
                    }

                }
            }
        }

        for (var k in data)
        {
            if (pmInventories.model.importedInventories.inventory.groups[data[k].data.name] !== undefined)
            {
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name].id = data[k].data.id;
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name].notes = data[k].data.notes;
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name].children = data[k].data.children;
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name].groups = JSON.parse(JSON.stringify(data[k].data.groups));
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name].hosts = JSON.parse(JSON.stringify(data[k].data.hosts));
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name].vars = JSON.parse(JSON.stringify(data[k].data.vars));
            }
            else
            {
                pmInventories.model.importedInventories.inventory.groups[data[k].data.name] = {
                    id: data[k].data.id,
                    notes: data[k].data.notes,
                    children: data[k].data.children,
                    vars: JSON.parse(JSON.stringify(data[k].data.vars)),
                    groups: JSON.parse(JSON.stringify(data[k].data.groups)),
                    hosts: JSON.parse(JSON.stringify(data[k].data.hosts)),
                    matches: false,
                    match_id_arr: [],
                    match_arr: [],
                    extern: true
                };
            }
        }

        pmInventories.insertHostsFromBulk(data1);

    }).fail(function(){
        $.notify("Error in bulk request", "error");
    }).promise();
}

/**
 * Функция вставляет в залинкованную группу со свойством children:false вложенные в нее хосты.
 */
pmInventories.getInnerDataForGroup = function()
{
    return $.when(pmInventories.getAllHostDataBulk()).done(function ()
    {
        var data1=[];
        for(var i in pmInventories.model.importedSubItem.hosts)        {

            var val = pmInventories.model.importedSubItem.hosts[i];
            for (var j in pmInventories.model.allBulkHost)
            {
                var val1=pmInventories.model.allBulkHost[j].data;
                if(val.id==val1.id)
                {
                    data1.push(pmInventories.model.allBulkHost[j]);
                }
            }

        }
        pmInventories.insertHostsFromBulk(data1);
    }).fail(function(){
        $.notify("Error in bulk request", "error");
    }).promise();
}


/**
 * Функция вставляет в модель актуальнные данные по хостам, взятые из bulk запроса.
 * @param {array} data - массив с данными по хостам, обновляемыми в текущий момент.
 */
pmInventories.insertHostsFromBulk = function(data)
{
    for(var p in data)
    {
        var bool=false;
        for(var f in pmInventories.model.importedInventoriesCopy.inventory.hosts)
        {
            if(data[p].data.name==pmInventories.model.importedInventoriesCopy.inventory.hosts[f].name) //проверяем является ли данный хост частью изначально импортированного инвентория
            {
                bool=true;
                pmInventories.model.importedInventories.inventory.hosts[f]=JSON.parse(JSON.stringify(pmInventories.model.importedInventoriesCopy.inventory.hosts[f]));
                pmInventories.model.importedInventories.inventory.hosts[f].id=data[p].data.id;
                pmInventories.model.importedInventories.inventory.hosts[f].notes=data[p].data.notes;
                pmInventories.model.importedInventories.inventory.hosts[f].vars=JSON.parse(JSON.stringify(data[p].data.vars));
            }
        }

        if(!bool) //если данный хост не является частью изначально импортированного инвентория, то
        {
            var bool1=false;
            for(var t in pmInventories.model.importedInventories.inventory.hosts) //проверяем был ли он уже добавлен на страницу из какой-либо другой группы
            {
                var host_id=pmInventories.model.importedInventories.inventory.hosts[t].id;
                if(host_id==data[p].data.id )
                {
                    bool1=true;
                }

            }

            if(!bool1) //если данного хоста нет на странице и в нашей модели, то добавляем его.
            {
                data[p].data.all_only=true;
                data[p].data.matches=false;
                data[p].data.match_id_arr=[];
                data[p].data.match_arr=[];
                data[p].data.extern=true;
                pmInventories.model.importedInventories.inventory.hosts.push(data[p].data);
            }
        }
    }
}


/**
 * Функция иницилизирует удаление всех внешних хостов/групп из модели импортированного инвентория.
 * Внешний хост/группа (extern=true) - его/её нет в изначально импортированном инвентории, но он/она есть в какой-то из existing matching групп.
 */
pmInventories.deleteAllExternSubItems = function(subItemType)
{
    for(var i in pmInventories.model.importedInventories.inventory[subItemType])
    {
        if(pmInventories.model.importedInventories.inventory[subItemType][i].extern==true)
        {
            pmInventories.deleteExternSubItem(subItemType, pmInventories.model.importedInventories.inventory[subItemType][i].id);
        }
    }
}

/**
 * Функция проверяет в скольких группах используется данный внешний хост/группа.
 * Если используется хотя бы в одной, то оставлем его/её.
 * Если не используется нигде, то удаляем его/её.
 * Внешний хост/группа (extern=true) - его/её нет в изначально импортированном инвентории, но он/она есть в какой-то из existing matching групп.
 * @param {number} group_id - id внешнего хоста/внешней группы.
 */
pmInventories.deleteExternSubItem = function(subItemType, subItem_id)
{
    var countInGroup=0; //countInGroup - количество вхождений данного subitem в группы
    for(var i in pmInventories.model.importedInventories.inventory.groups)
    {
        var val=pmInventories.model.importedInventories.inventory.groups[i];
        if(val.id!==undefined)
        {
            for(var j in val[subItemType])
            {
                if(val[subItemType][j].id==subItem_id)
                {
                    countInGroup+=1;
                }

            }
        }
    }
    if(countInGroup==0)
    {
        for(var i in pmInventories.model.importedInventories.inventory[subItemType])
        {
            if(pmInventories.model.importedInventories.inventory[subItemType][i].id==subItem_id)
            {
                delete pmInventories.model.importedInventories.inventory[subItemType][i];
            }
        }
    }

}

/**
 * Функция выделяет/снимает выделение со всех доступных для выделения элементов в определенной таблице subitems(hosts/groups).
 * @param {array} elements - массив выделенных элементов
 * @param {boolean} mode - true - добавить выделение, false - снять выделение
 * @param {string} div_id - id блока, в котором находятся данные элементы
 */
pmInventories.toggleSelectAllImportedSubItems = function (elements, mode, div_id)
{
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row') && !($(elements[i]).hasClass('unselectable')))
        {
            $(elements[i]).toggleClass('selected', mode);
        }
    }
    pmInventories.countSelectedSubItems(div_id);
}

/**
 * Функция выделяет/снимает выделение с одного конкретного элемента в определенной таблице subitems(hosts/groups).
 * @param {object} thisEl - конкретный элемент
 * @param {string} div_id - id блока, в котором находится данный элемент
 */
pmInventories.toggleSelectImportedSubItem = function (thisEl, div_id)
{
    if(!$(thisEl).parent().hasClass('unselectable'))
    {
        $(thisEl).parent().toggleClass('selected');
        pmInventories.countSelectedSubItems(div_id);
    }

}

/**
 * Функция подсчитывает количество выделенных элементов в определенной таблице subitems(hosts/groups).
 * И запоминает данное число в pmInventories.model.selectedImportedSubItems.
 * В зависимости от нового значения pmInventories.model.selectedImportedSubItems часть кнопок отображается либо скрывается.
 * @param {string} div_id - id блока, в котором находятся данные элементы
 */
pmInventories.countSelectedSubItems = function (div_id)
{
    var elements=$("#"+div_id+"_table tr");
    var count=0;
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row') && $(elements[i]).hasClass('selected'))
        {
            count+=1;
        }
    }

    if(count==0)
    {
        $($("#"+div_id+" .actions_button")[0]).addClass("hide");
        $($("#"+div_id+" .unselect_all")[0]).addClass("hide");
    }
    else
    {
        $($("#"+div_id+" .actions_button")[0]).removeClass("hide");
        $($("#"+div_id+" .unselect_all")[0]).removeClass("hide");
    }
    pmInventories.model.selectedImportedSubItems=count;
}

/**
 * Функция удаляет все выделенные subitems из импортируемого инвентория.
 * @param {string} div_id - id блока, в котором находятся данные элементы
 * @param {string} subitem_type - тип subitem(group or host)
 */
pmInventories.deleteSubItemsFromImportedInventory = function(div_id, subitem_type)
{
    var elements=$("#"+div_id+"_table tr");
    for (var i = 0; i < elements.length; i++)
    {
        if($(elements[i]).hasClass('item-row') && $(elements[i]).hasClass('selected'))
        {
            if(pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].id===undefined)
            {
                if(subitem_type=="hosts")
                {
                    var subitemName=$(elements[i]).attr("data-name");
                    for(var j in pmInventories.model.importedInventories.inventory.groups)
                    {
                        for(var k in pmInventories.model.importedInventories.inventory.groups[j].hosts)
                        {
                            if(pmInventories.model.importedInventories.inventory.groups[j].hosts[k].name==subitemName && pmInventories.model.importedInventories.inventory.groups[j].id===undefined)
                            {
                                delete pmInventories.model.importedInventories.inventory.groups[j].hosts[k];
                            }
                        }
                    }
                }
                else
                {
                    if(pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].children==true) //для групп children:true
                    {
                        for(var j in pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].groups)
                        {
                            if(typeof(pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].groups[j])=="string")
                            {
                                var gName=pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].groups[j];
                            }
                            else
                            {
                                var gName=pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].groups[j].name;
                            }
                            if(pmInventories.model.importedInventories.inventory.groups[gName]!==undefined)
                            {
                                if(pmInventories.model.importedInventories.inventory.groups[gName].children)
                                {
                                    pmInventories.recursionDeleteOfGroup(gName);
                                }
                                else
                                {
                                    for(var k in pmInventories.model.importedInventories.inventory.groups[gName].hosts)
                                    {
                                        var h_name1=pmInventories.model.importedInventories.inventory.groups[gName].hosts[k].name;
                                        pmInventories.deleteImportedHost(h_name1);
                                    }
                                }
                            }
                            pmInventories.deleteThisGroupFromAllGroups(gName);
                            delete pmInventories.model.importedInventories.inventory.groups[gName];
                        }

                    }
                    else //для групп children:false обновлем вложенные в них хосты
                    {
                        for(var j in pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].hosts)
                        {
                            var h_name=pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")].hosts[j].name;
                            pmInventories.deleteImportedHost(h_name);
                        }
                    }
                }
                pmInventories.deleteThisGroupFromAllGroups($(elements[i]).attr("data-id"));
                delete pmInventories.model.importedInventories.inventory[subitem_type][$(elements[i]).attr("data-id")];
                $(elements[i]).remove();
            }
            else
            {
                $.notify("Linked subitem could not be deleted.", "error");
            }

            pmInventories.countSelectedSubItems(div_id);
        }
    }
    pmInventories.deleteAllExternSubItems("groups");
    pmInventories.deleteAllExternSubItems("hosts");
    pmInventories.updateImportedInventoryPage();
}


/**
 * Функция удаляет данную группу из всех групп, где она является вложенной.
 * @param {string} item_name - имя группы
 */
pmInventories.deleteThisGroupFromAllGroups = function(item_name)
{
    for(var i in pmInventories.model.importedInventories.inventory.groups)
    {
        if(pmInventories.model.importedInventories.inventory.groups[i].children)
        {
            for(var j in pmInventories.model.importedInventories.inventory.groups[i].groups)
            {
                if(pmInventories.model.importedInventories.inventory.groups[i].groups[j]==item_name)
                {
                    delete pmInventories.model.importedInventories.inventory.groups[i].groups[j];
                }
            }
        }
    }
}

/**
 * Функция используется для удаления групп с большой вложенностью групп.
 * @param {string} item_name - имя группы
 */
pmInventories.recursionDeleteOfGroup = function(item_name)
{
    var val=pmInventories.model.importedInventories.inventory.groups[item_name];
    if(val.children)
    {
        for(var i in val.groups)
        {
            pmInventories.recursionDeleteOfGroup(val.groups[i]);
        }

    }
    else
    {
        for(var k in val.hosts)
        {
            var h_name1=val.hosts[k].name;
            pmInventories.deleteImportedHost(h_name1);
        }
    }
    pmInventories.deleteThisGroupFromAllGroups(item_name);
    delete pmInventories.model.importedInventories.inventory.groups[item_name];
}

/**
 * Функция проверяет в скольких группах используется данный хост.
 * Если используется хотя бы в одной, то оставлем его.
 * Если не используется нигде, то удаляем его.
 * @param {string} host_name - имя хоста.
 */
pmInventories.deleteImportedHost = function(host_name)
{
    var countInGroup=0; //countInGroup - количество вхождений данной группы в подгруппы других групп
    for(var i in pmInventories.model.importedInventories.inventory.groups)
    {
        var val=pmInventories.model.importedInventories.inventory.groups[i];

        for(var j in val.hosts)
        {
            if(val.hosts[j].name==host_name)
            {
                countInGroup+=1;
            }
        }
    }

    for(var i in pmInventories.model.importedInventories.inventory.hosts)
    {
        if(pmInventories.model.importedInventories.inventory.hosts[i].name==host_name)
        {
            var host_1=pmInventories.model.importedInventories.inventory.hosts[i];
        }
    }

    if(countInGroup==1 && host_1.all_only==true)
    {
        for(var i in pmInventories.model.importedInventories.inventory.hosts)
        {
            if(pmInventories.model.importedInventories.inventory.hosts[i].name==host_name)
            {
                delete pmInventories.model.importedInventories.inventory.hosts[i];
            }
        }
    }
}

/**
 * Из объекта inventory делает текст inventory для анзибля.
 * @param {Object} inventory
 * @returns {String}
 */
pmInventories.getInventoryTextFromObjectCE = function(inventory)
{
    var result = "";
    if(inventory.name)
    {
        result += "# inventory name: "+inventory.name+"\n\n"
    }

    result += this.renderHostsCE("all", inventory.hosts, true)
    result += this.renderVarsCE("all", inventory.vars)

    if(inventory.groups)
    {
        for(var i in inventory.groups)
        {
            var val = inventory.groups[i]

            result += this.renderHostsCE(i, val.hosts, false)
            result += this.renderVarsCE(i, val.vars)

            if(!val.groups || val.groups.length != 0)
            {
                result += "\n[" + i + ":children]\n"
                for(var j in val.groups)
                {
                    result += val.groups[j] + "\n";
                }
                result +=  "\n";
            }
        }
    }
    return result;
}

pmInventories.renderHostsCE = function(group, hosts, mode)
{
    var result = "";

    if(!hosts || Object.keys(hosts).length == 0)
    {
        return result
    }

    if(mode===undefined)
    {
        mode=false;
    }

    if(group != 'all')
    {
        result += "["+group+"]\n";
    }

    if(mode)
    {
        result += "\n";
    }

    for(var i in hosts)
    {
        if(mode)
        {
            var val = hosts[i]
            if(val.all_only==false)
            {
                var line = val.name + this.renderHostVars(val.vars);
                result += line + "\n";
            }
        }
        else
        {
            var val = hosts[i]
            var line = val.name + this.renderHostVars(val.vars);
            result += line + "\n";
        }

    }

    return result + "\n";
}

pmInventories.renderHostVars = function(vars)
{
    if(!vars || Object.keys(vars).length == 0)
    {
        return "";
    }

    var result = []
    for(var i in vars)
    {
        result.push(i +"=\""+addslashes(vars[i])+"\"")
    }

    return " "+result.join(" ");
}

pmInventories.renderVarsCE = function(group, vars)
{
    if(!vars || Object.keys(vars).length == 0)
    {
        // return "["+group+":vars]\n";
        return "";
    }

    var result = "";
    if(group)
    {
        result += "\n["+group+":vars]\n";
    }

    for(var i in vars)
    {
        var val = vars[i]

        var line = i + "=\""+addslashes(val)+"\""
        result += line + "\n";
    }

    return " "+result;
}


pmInventories.openImportPageAndImportFiles = function(files_event)
{
    pmHosts.model.items = {};
    pmHosts.model.itemslist = {};
    pmGroups.model.items = {};
    pmGroups.model.itemslist = {};
    return spajs.showLoader(
        $.when(pmHosts.loadAllItems(), pmGroups.loadAllItems()).done(function()
        {
            $.when(spajs.open({ menuId:"inventories/import"})).done(function()
            {
                pmInventories.importFromFile(files_event);

            })
        })
    )
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

pmInventories.showGroupVarsModal = function(item_index)
{
    // var scroll_el = "#imported_groups";
    // if ($(scroll_el).length != 0)  {
    //     $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 700);
    // }
    pmInventories.openEditItemModal('groups', item_index)
}

pmInventories.showHostVarsModal = function(item_index)
{
    // var scroll_el = "#imported_hosts";
    // if ($(scroll_el).length != 0)  {
    //     $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 700);
    // }
    pmInventories.openEditItemModal('hosts', item_index);
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
        if(val.id===undefined)
        {
            if (val.vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(val.vars.ansible_ssh_private_key_file)) {
                // <!--Вставка файла -->
                $.notify("Error in field ansible_ssh_private_key_file invalid value", "error");
                pmInventories.showHostVarsModal(i);
                def2.reject()
                return def2.promise();
            }
        }
    }

    for(var i in inventory.groups)
    {
        var val = inventory.groups[i]
        if(val.id===undefined)
        {
            if(val.vars.ansible_ssh_private_key_file !== undefined && !/-----BEGIN RSA PRIVATE KEY-----/.test(val.vars.ansible_ssh_private_key_file))
            {
                // <!--Вставка файла -->
                $.notify("Error in field ansible_ssh_private_key_file invalid value", "error");
                pmInventories.showGroupVarsModal(i);
                def2.reject()
                return def2.promise();
            }

        }
        //проверяем, что пользователь не пытается создать инвенторий с уже существующей ранее группой с children==true
        //которая так же включает в себя группы, название которых идентично тем, что пользователь хочет создать сейчас заново
        if(inventory.groups[i].children!==undefined && inventory.groups[i].children==true && inventory.groups[i].id!==undefined)
        {
            for(var j in inventory.groups[i].groups)
            {
                if(inventory.groups[inventory.groups[i].groups[j].name]!==undefined && inventory.groups[inventory.groups[i].groups[j].name].id==undefined)
                {
                    $.notify('It is impossible to replace subitem "'+inventory.groups[i].groups[j].name+'" in existing group "'+i+'" with new one.', "error");
                    var scroll_el = "#imported_groups";
                    if ($(scroll_el).length != 0)  {
                        $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 700);
                    }
                    def2.reject()
                    return def2.promise();

                }

                if(inventory.groups[inventory.groups[i].groups[j].name]!==undefined && inventory.groups[inventory.groups[i].groups[j].name].id!=inventory.groups[i].groups[j].id)
                {
                    $.notify('It is impossible to replace subitem "'+inventory.groups[i].groups[j].name+'" in existing group "'+i+'" with another existing subitem.', "error");
                    var scroll_el = "#imported_groups";
                    if ($(scroll_el).length != 0)  {
                        $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 700);
                    }
                    def2.reject()
                    return def2.promise();

                }

            }
        }

    }

    var def = new $.Deferred();

    if($("#inventory_name").val() != "" && $("#inventory_name").val()!==undefined)
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
        vars:inventory.vars,
        notes:$("#filed_notes").val()
    }

    var deleteBulk = []
    $.when(pmInventories.importItem(inventoryObject)).done(function(inventory_id)
    {
        deleteBulk.push({
            type:"del",
            item:'inventory',
            pk:inventory_id
        })


        // Сбор хостов вложенных к инвенторию
        var bulkHosts = [];
        for(var i in inventory.hosts)
        {
            var val = inventory.hosts[i]
            if(val.id===undefined)
            {
                bulkHosts.push({
                    type:"add",
                    item:'host',
                    data:{
                        name:val.name,
                        notes:val.notes,
                        type:val.type,
                        vars:val.vars
                    }
                })
            }
        }


        // Добавление новых хостов вложенных к инвенторию
        spajs.ajax.Call({
            url: hostname + "/api/v1/_bulk/",
            type: "POST",
            contentType:'application/json',
            data:JSON.stringify(bulkHosts),
            success: function(data)
            {
                var hasError = false;
                var hosts_ids = []
                var just_added_hosts = [];
                for(var i in data)
                {
                    var val = data[i]
                    if(val.status != 201)
                    {
                        $.notify("Error "+val.status, "error");
                        hasError = true;
                        continue;
                    }
                    for(var j in inventory.hosts)
                    {
                        if(inventory.hosts[j].name==val.data.name)
                        {
                            if(just_added_hosts[val.data.name]===undefined)
                            {
                                just_added_hosts[val.data.name]=val.data;
                                deleteBulk.push({
                                    type:"del",
                                    item:'host',
                                    pk:val.data.id
                                })
                                if(inventory.hosts[j].all_only==false)
                                {
                                    hosts_ids.push(val.data.id);

                                }
                            }
                        }
                    }
                }
                //добавление существующих ранее хостов
                for(var i in pmInventories.model.importedInventories.inventory.hosts)
                {
                    if(pmInventories.model.importedInventories.inventory.hosts[i].id)
                    {
                        var hostName=pmInventories.model.importedInventories.inventory.hosts[i].name;
                        just_added_hosts[hostName]=pmInventories.model.importedInventories.inventory.hosts[i];

                        //добавление существующих ранее хостов, вложенных непосредственно к инвенторию
                        if(pmInventories.model.importedInventories.inventory.hosts[i].all_only==false)
                        {
                            hosts_ids.push(+pmInventories.model.importedInventories.inventory.hosts[i].id);
                        }
                    }
                }

                if(hasError)
                {
                    // По меньшей мере в одной операции была ошибка вставки.
                    // Инвенторий импортирован не полностью
                    def.reject(deleteBulk);
                    return;
                }

                var bulkdata = [];
                var groups_with_just_added_hosts=[];
                // Сбор групп и вложенных в них хостов
                for(var i in inventory.groups)
                {
                    var val = inventory.groups[i]
                    //если нужно создать новую группу(id===undefined, следовательно, она не была создана ранее)
                    //то доавляем ее в bulk запрос
                    if(val.id===undefined)
                    {
                        bulkdata.push({
                            type: "add",
                            item: 'group',
                            data: {
                                name: i,
                                notes: val.notes,
                                children: val.children,
                                vars: val.vars
                            }
                        })

                        //собираем хосты в нужные группы
                        for(var j in val.hosts)
                        {
                            var hval = val.hosts[j];
                            if(just_added_hosts[hval.name])
                            {
                                if(!groups_with_just_added_hosts[i])
                                {
                                    groups_with_just_added_hosts[i]=[];
                                }
                                groups_with_just_added_hosts[i].push(just_added_hosts[hval.name].id);
                            }
                            else
                            {
                                bulkdata.push({
                                    type:"add",
                                    item:'host',
                                    data:{
                                        name:hval.name,
                                        notes:hval.notes,
                                        type:hval.type,
                                        vars:hval.vars
                                    }
                                })
                            }
                        }
                    }
                }

                $.when(pmInventories.addSubHosts(inventory_id, hosts_ids)).done(function()
                {
                    // Добавление групп и вложенных в них хостов
                    spajs.ajax.Call({
                        url: hostname + "/api/v1/_bulk/",
                        type: "POST",
                        contentType:'application/json',
                        data:JSON.stringify(bulkdata),
                        success: function(data)
                        {
                            var igroups_ids = []
                            var bulk_update = []
                            var hasError = false;
                            for(var i in pmInventories.model.importedInventories.inventory.groups)
                            {
                                //собираем в igroups_ids группы, которые существовали в системе ранее
                                if(pmInventories.model.importedInventories.inventory.groups[i].id)
                                {
                                    //igroups_ids - массив с id групп, которые будут добавлены в инвенторий в качестве subitems
                                    igroups_ids.push(+pmInventories.model.importedInventories.inventory.groups[i].id);
                                }
                            }
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

                                                //добавляем подгруппы, которые являются созданными ранее группами
                                                for(var l in pmInventories.model.importedInventories.inventory.groups)
                                                {
                                                    if(l==inventory.groups[val.data.name].groups[j] && pmInventories.model.importedInventories.inventory.groups[l].id)
                                                    {
                                                        groups_ids.push(pmInventories.model.importedInventories.inventory.groups[l].id);
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
                                        // Это хост
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

                                            for(var z in groups_with_just_added_hosts)
                                            {
                                                if(z==val.data.name){
                                                    for(var y in groups_with_just_added_hosts[z])
                                                    {
                                                        hosts_ids.push(groups_with_just_added_hosts[z][y]);
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
                                        url: hostname + "/api/v1/_bulk/",
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
            url: hostname + "/api/v1/_bulk/",
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
                url: hostname + "/api/v1/"+thisObj.model.name+"/",
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


pmInventories.importedHostsIsEmpty = function(hosts_arr)
{
    for (var i in hosts_arr)
    {
        if(hosts_arr[i] !== undefined)
        {
            return false;
        }
    }
    return true;
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
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+'));  return false;'},
            title:'Delete',
            link:function(){ return '#'}
        },
        {
            function:function(item){ return '';},
            title:'Create sub group',
            link:function(item)
            {
                return '/?inventory/'+item.id+'/new-group'
            },
        },
        {
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
        ],
        [
            {
                filed: new filedsLib.filed.textarea(),
                title:'Notes',
                name:'notes',
                placeholder:'Not required field, just for your notes'
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
            var link = window.location.href.split(/[&?]/g)[1];
            var pattern = /([A-z0-9_]+)\/([0-9]+)/g;
            var link_parts = link.match(pattern);
            var link_with_parents = "";
            for(var i in link_parts)
            {
                link_with_parents += link_parts[i] +"/";
            }
            link_with_parents += this.model.name;

            if(callOpt.parent_type == 'project')
            {
                $.when(pmProjects.addSubInventories(callOpt.parent_item, [data.id])).always(function(){
                    $.when(spajs.open({ menuId:link_with_parents})).always(function(){
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
            class:'btn btn-info',
            function:function(item_id)
            {
                return "spajs.open({ menuId:'" + this.model.page_name + "/" + item_id + "/groups'}); return false";
            },
            title: "Groups",
            link:function(){ return '#'},
        },
        {
            class:'btn btn-info',
            function:function(item_id)
            {
                return "spajs.open({ menuId:'" + this.model.page_name + "/" + item_id + "/hosts'}); return false";
            },
            title: "Hosts",
            link:function(){ return '#'},
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
        }
    ],
    title: function(item_id){
        return "Inventory "+this.model.items[item_id].justText('name')
    },
    short_title: function(item_id){
        return ""+this.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
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
        ],
        [
            {
                filed: new filedsLib.filed.textarea(),
                title:'Notes',
                name:'notes',
                placeholder:'Not required field, just for your notes'
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

// /**
//  * Показывает форму со списком всех групп.
//  * @return $.Deferred
//  */
// pmInventories.showAddSubGroupsForm = function(item_id, holder)
// {
//     if(!item_id)
//     {
//         throw "Error in pmInventories.showAddSubGroupsForm with item_id = `" + item_id + "`"
//     }
//
//     return $.when(pmGroups.loadAllItems()).done(function(){
//         $("#add_existing_item_to_inventory").remove()
//         $(".content").appendTpl(spajs.just.render('add_existing_groups_to_inventory', {item_id:item_id}))
//         var scroll_el = "#add_existing_item_to_inventory";
//         if ($(scroll_el).length != 0)  {
//             $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 1000);
//         }
//         $("#polemarch-model-items-select").select2({ width: '100%' });
//     }).fail(function(){
//
//     }).promise()
// }

// /**
//  * Показывает форму со списком всех хостов.
//  * @return $.Deferred
//  */
// pmInventories.showAddSubHostsForm = function(item_id, holder)
// {
//     if(!item_id)
//     {
//         throw "Error in pmInventories.showAddSubHostsForm with item_id = `" + item_id + "`"
//     }
//
//     return $.when(pmHosts.loadAllItems()).done(function(){
//         $("#add_existing_item_to_inventory").remove()
//         $(".content").appendTpl(spajs.just.render('add_existing_hosts_to_inventory', {item_id:item_id}))
//         var scroll_el = "#add_existing_item_to_inventory";
//         if ($(scroll_el).length != 0) {
//             $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 1000);
//         }
//         $("#polemarch-model-items-select").select2({ width: '100%' });
//     }).fail(function(){
//
//     }).promise()
// }

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
        url: hostname + "/api/v1/inventories/"+item_id+"/groups/",
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
        url: hostname + "/api/v1/inventories/"+item_id+"/hosts/",
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
        url: hostname + "/api/v1/inventories/"+item_id+"/groups/",
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
        url: hostname + "/api/v1/inventories/"+item_id+"/hosts/",
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
        inventory =  $("#inventories-file").val();
        inventory = trim(inventory);
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
        id:"newInventory",
        urlregexp:[/^new-inventory$/, /^([A-z0-9_]+)\/([0-9]+)\/new-inventory$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showNewItemPage(holder, menuInfo, data);}
    })
})
