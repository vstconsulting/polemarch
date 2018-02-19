
var pmGroups = inheritance(pmItems)
pmGroups.model.name = "groups"
pmGroups.model.page_name = "group"
pmGroups.model.bulk_name = "group"
pmGroups.model.className = "pmGroups"

pmGroups.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy-from-" + data.name
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

                    if(data.children)
                    {
                        var groups = []
                        for(var i in data.groups)
                        {
                            groups.push(data.groups[i].id)
                        }
                        $.when(thisObj.setSubGroups(newItem.id, groups)).always(function(){
                            def.resolve(newItem.id)
                        })
                    }
                    else
                    {
                        var hosts = []
                        for(var i in data.hosts)
                        {
                            hosts.push(data.hosts[i].id)
                        }

                        $.when(thisObj.setSubHosts(newItem.id, hosts)).always(function(){
                            def.resolve(newItem.id)
                        })
                    }
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


pmGroups.model.page_list = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'new-"+this.model.page_name+"'}); return false;"},
            title:'Create',
            link:function(){ return '/?new-'+this.model.page_name},
        },
    ],
    title: "Groups",
    short_title: "Groups",
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
            title:function(item)
            {
                if(item.children)
                {
                    return 'Create sub group'
                }

                return 'Create sub host'
            },
            link:function(item)
            {
                if(item.children)
                {
                    return '/?group/'+item.id+'/new-group'
                }

                return '/?group/'+item.id+'/new-host'
            },
        },
    ]
}

pmGroups.validator = function(value)
{
    if(value && !/[^A-z0-9_.\-]/.test(value))
    {
        return true;
    }
    $.notify("Invalid value in field name it mast be as [^A-z0-9_.\-]", "error");
    return false;
}

pmGroups.fast_validator = function(value)
{
    return /[^A-z0-9_.\-]/.test(value)
}

pmGroups.model.page_new = {
    title: "New group",
    short_title: "New group",
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter group name',
                validator:pmGroups.validator,
                fast_validator:pmGroups.fast_validator
            },
            {
                filed: new filedsLib.filed.boolean(),
                title:'Children',
                name:'children',
                help:'If turn, then allow adding sub groups to group'
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
        $.notify("Group created", "success");

        if(callOpt.parent_item)
        {
            if(callOpt.parent_type == 'group')
            {
                $.when(pmGroups.addSubGroups(callOpt.parent_item, [data.id])).always(function(){
                    $.when(spajs.open({ menuId:"group/"+callOpt.parent_item})).always(function(){
                        def.resolve()
                    })
                })
            }
            else if(callOpt.parent_type == 'inventory')
            {
                $.when(pmInventories.addSubGroups(callOpt.parent_item, [data.id])).always(function(){
                    $.when(spajs.open({ menuId:"inventory/"+callOpt.parent_item})).always(function(){
                        def.resolve()
                    })
                })
            }
            else if(callOpt.parent_type == 'project')
            {
                $.when(pmProjects.addSubGroups(callOpt.parent_item, [data.id])).always(function(){
                    $.when(spajs.open({ menuId:"project/"+callOpt.parent_item})).always(function(){
                        def.resolve()
                    })
                })
            }
            else
            {
                console.error("Не известный parent_type", callOpt.parent_type)
                $.when(spajs.open({ menuId:"group/"+data.id})).always(function(){
                    def.resolve()
                })
            }
        }
        else
        {
            $.when(spajs.open({ menuId:"group/"+data.id})).always(function(){
                def.resolve()
            })
        }
        return def.promise();
    }
}

pmGroups.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
            title:'Save',
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
        },
        function(section, item_id){
            return spajs.just.render("groups_sub_items", {item_id:item_id})
        }
    ],
    title: function(item_id){
        return "Group "+pmGroups.model.items[item_id].justText('name')
    },
    short_title: function(item_id){
        return ""+pmGroups.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter group name',
                validator:pmGroups.validator,
                fast_validator:pmGroups.fast_validator
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
 * @return $.Deferred
 */
pmGroups.setSubGroups = function(item_id, groups_ids)
{
    var thisObj=this;
    if(!item_id)
    {
        throw "Error in pmGroups.setSubGroups with item_id = `" + item_id + "`"
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
        url: "/api/v1/groups/"+item_id+"/groups/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        success: function(data)
        {
            pmItems.checkSubItemsAndAdd(thisObj, pmGroups, data, item_id, "groups", groups_ids);
            //console.log("group update", data);
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
pmGroups.setSubHosts = function(item_id, hosts_ids)
{
    var thisObj=this;
    if(!item_id)
    {
        throw "Error in pmGroups.setSubHosts with item_id = `" + item_id + "`"
    }

    if(!hosts_ids)
    {
        hosts_ids = []
    }
    else
    {
        for(var i in hosts_ids)
        {
            hosts_ids[i]=+hosts_ids[i];
        }
    }

    return spajs.ajax.Call({
        url: "/api/v1/groups/"+item_id+"/hosts/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        success: function(data)
        {
            pmItems.checkSubItemsAndAdd(thisObj, pmHosts, data, item_id, "hosts", hosts_ids);
            //console.log("group update", data);
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
pmGroups.addSubGroups = function(item_id, groups_ids)
{
    if(!item_id)
    {
        throw "Error in pmGroups.addSubGroups with item_id = `" + item_id + "`"
    }

    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    spajs.ajax.Call({
        url: "/api/v1/groups/"+item_id+"/groups/",
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

            if(pmGroups.model.items[item_id])
            {
                if(!pmGroups.model.items[item_id].groups)
                {
                    pmGroups.model.items[item_id].groups = []
                }

                for(var i in groups_ids)
                {
                    pmGroups.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
            //console.log("group update", data);
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
pmGroups.addSubHosts = function(item_id, hosts_ids)
{
    if(!item_id)
    {
        throw "Error in pmGroups.addSubHosts with item_id = `" + item_id + "`"
    }

    if(!hosts_ids)
    {
        hosts_ids = []
    }

    var def = new $.Deferred();
    spajs.ajax.Call({
        url: "/api/v1/groups/"+item_id+"/hosts/",
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

            if(pmGroups.model.items[item_id])
            {
                if(!pmGroups.model.items[item_id].hosts)
                {
                    pmGroups.model.items[item_id].hosts = []
                }

                for(var i in hosts_ids)
                {
                    pmGroups.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            //console.log("group update", data);
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
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmGroups.showAddSubGroupsForm = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmGroups.showAddSubGroupsForm with item_id = `" + item_id + "`"
    }

    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_group").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_groups_to_group', {item_id:item_id}))
        var  scroll_el = "#add_existing_item_to_group";
        if ($(scroll_el).length != 0) {
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
pmGroups.showAddSubHostsForm = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmGroups.showAddSubHostsForm with item_id = `" + item_id + "`"
    }

    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_group").remove()
        $(".content").appendTpl(spajs.just.render('add_existing_hosts_to_group', {item_id:item_id}))
        var scroll_el = "#add_existing_item_to_group";
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
pmGroups.hasHosts = function(item_id, host_id)
{
    if(!item_id)
    {
        throw "Error in pmGroups.hasHosts with item_id = `" + item_id + "`"
    }

    if(pmGroups.model.items[item_id])
    {
        for(var i in pmGroups.model.items[item_id].hosts)
        {
            if(pmGroups.model.items[item_id].hosts[i].id == host_id)
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
pmGroups.hasGroups = function(item_id, group_id)
{
    if(!item_id)
    {
        throw "Error in pmGroups.hasGroups with item_id = `" + item_id + "`"
    }

    if(pmGroups.model.items[item_id])
    {
        for(var i in pmGroups.model.items[item_id].groups)
        {
            if(pmGroups.model.items[item_id].groups[i].id == group_id)
            {
                return true;
            }
        }
    }
    return false;
}



/**
 * Значение поля автокоплита для строки групп
 * @see https://ansible-tips-and-tricks.readthedocs.io/en/latest/ansible/commands/#limit-to-one-or-more-hosts
 * @param {string} prefix
 * @returns {string} Значение поля автокоплита для строки групп
 */
pmGroups.getGroupsAutocompleteValue = function(prefix)
{
    if(!prefix)
    {
        prefix = "prefix"
    }
    return $('#groups_autocomplete_filed'+prefix).val()
    debugger;
}

/**
 * Поле автокоплита для строки групп
 * @see https://ansible-tips-and-tricks.readthedocs.io/en/latest/ansible/commands/#limit-to-one-or-more-hosts
 * @param {integer} inventory_id
 * @param {string} value
 * @param {string} prefix
 * @returns {string} HTML шаблон
 */
pmGroups.groupsAutocompleteTemplate = function(inventory_id, value, prefix)
{
    if(value === undefined)
    {
        value = "all"
    }

    if(!prefix)
    {
        prefix = "prefix"
    }

    if(inventory_id)
    {
        $.when(pmInventories.loadItem(inventory_id)).done(function()
        {
            new autoComplete({
                selector: '#groups_autocomplete_filed'+prefix,
                minChars: 0,
                cache:false,
                showByClick:true,
                menuClass:'groups_autocomplete_filed'+prefix,
                renderItem: function(item, search)
                {
                    var text = item.name
                    if(item.isHost)
                    {
                        text += ' <i style="color:#ccc;">(Host)</i>'
                    }
                    else
                    {
                        text += ' <i style="color:#ccc;">(Group)</i>'
                    }

                    return '<div class="autocomplete-suggestion" data-value="' + item.value + '" >' + text + '</div>';
                },
                onSelect: function(event, term, item)
                {
                    //console.log('onSelect', term, item);
                    var value = $(item).attr('data-value');
                    $("#groups_autocomplete_filed"+prefix).val(value);
                    $("#groups_autocomplete_filed"+prefix).attr({'data-hide':'hide'});

                },
                source: function(original_term, response)
                {
                    var isHide = $("#groups_autocomplete_filed"+prefix).attr('data-hide')
                    if(isHide == "hide")
                    {
                        $("#groups_autocomplete_filed"+prefix).attr({'data-hide':'show'})
                        return;
                    }

                    pmGroups.groupsAutocompleteMatcher(original_term, response, inventory_id)
                }
            });
        })
    }

    return spajs.just.render('groups_autocomplete_filed', {selectedInventory:inventory_id, value:value, prefix:prefix})
}

pmGroups.groupsAutocompleteMatcher = function(original_term, response, inventory_id)
{
    var addTermToMatches = false
    var term = original_term
    var baseTerm = ""
    if(original_term.indexOf(':') >= 0)
    {
        addTermToMatches = true
        term = original_term.replace(/^(.*):([^:]*)$/gim, "$2")
        baseTerm = original_term.replace(/^(.*):([^:]*)$/gim, "$1:")
    }

    if(term[0] == '!')
    {
        term = term.substring(1)
        baseTerm = baseTerm + "!"
    }

    var arrUsedItems = original_term.toLowerCase().replace(/!/gmi, "").split(/:/g)

    term = term.toLowerCase();

    var matches = []
    var matchesAll = []

    for(var i in pmInventories.model.items[inventory_id].groups)
    {
        var val = pmInventories.model.items[inventory_id].groups[i]

        if($.inArray(val.name.toLowerCase(), arrUsedItems) != -1)
        {
            continue;
        }

        var text = val.name
        if(addTermToMatches)
        {
            text = baseTerm+text
        }

        if(val.name.toLowerCase().indexOf(term) == 0 )
        {
            matches.push({
                value:text,
                isHost:false,
                name:val.name,
            })
        }

        matchesAll.push({
            value:text,
            isHost:false,
            name:val.name,
        })
    }

    for(var i in pmInventories.model.items[inventory_id].hosts)
    {
        var val = pmInventories.model.items[inventory_id].hosts[i]
        if($.inArray(val.name.toLowerCase(), arrUsedItems) != -1)
        {
            continue;
        }

        if(val.name.indexOf(":") != -1)
        {
            continue;
        }

        var text = val.name
        if(addTermToMatches)
        {
            text = baseTerm+text
        }

        if(val.name.toLowerCase().indexOf(term) == 0 )
        {
            matches.push({
                value:text,
                isHost:true,
                name:val.name,
            })
        }

        matchesAll.push({
            value:text,
            isHost:true,
            name:val.name,
        })
    }

    if(!addTermToMatches && "All".toLowerCase().indexOf(term) != -1 )
    {
        matches.push({
            value:"all",
            isHost:false,
            name:"all",
        })

        matchesAll.push({
            value:"all",
            isHost:false,
            name:"all",
        })
    }

    if(matches.length > 1 || addTermToMatches)
    {
        response(matches);
    }
    else
    {
        response(matchesAll)
    }
}

tabSignal.connect("polemarch.start", function()
{
    // groups
    spajs.addMenu({
        id:"groups",
        urlregexp:[/^groups$/, /^group$/, /^groups\/search\/?$/, /^groups\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"groups-search",
        urlregexp:[/^groups\/search\/([A-z0-9 %\-.:,=]+)$/, /^groups\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"group",
        urlregexp:[/^group\/([0-9]+)$/, /^groups\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newGroup",
        urlregexp:[/^new-group$/, /^([A-z0-9_]+)\/([0-9]+)\/new-group$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showNewItemPage(holder, menuInfo, data);}
    })

})