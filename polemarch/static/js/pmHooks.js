var pmHooks = inheritance(pmItems)
pmHooks.model.name = "hooks"
pmHooks.model.page_name = "hook"
pmHooks.model.bulk_name = "hook"
pmHooks.model.className = "pmHooks"


pmHooks.filed.selectHookType = inheritance(filedsLib.filed.simpleText)
pmHooks.filed.selectHookType.type = 'selectHookType'
pmHooks.filed.selectHookType.getValue = function(pmObj, filed){
    return '';
}

pmHooks.filed.selectHookWhen = inheritance(filedsLib.filed.simpleText)
pmHooks.filed.selectHookWhen.type = 'selectHookWhen'
pmHooks.filed.selectHookWhen.getValue = function(pmObj, filed){
    return '';
}

pmHooks.model.page_list = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'new-"+this.model.page_name+"'}); return false;"},
            title:'Create',
            link:function(){ return '/?new-'+this.model.page_name},
        },
    ],
    title: "Hooks",
    short_title: "Hooks",
    fileds:[
        {
            title:'Name',
            name:'name',
        },
        {
            title:'Type',
            name:'type',
            class:function(item){ return 'class="hidden-xs"'},
            value:function(item){ return item['type']},
        },
        {
            title:'When',
            name: 'when',
            class:function(item){ return 'class="hidden-480"'},
            value:function(item){ return pmHooks.model.supportedWhens[item['when']]},
        },
        {
            title:'Recipients',
            name: 'recipients',
            class:function(item){ return 'class="hidden-xs"'},
            value:function(item){ return item['recipients']},
        }
    ],
    actions:[
        {
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+')); return false;'},
            title:'Delete',
            link:function(){ return '#'}
        }
    ]
}

pmHooks.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader($.when('+this.model.className+'.updateItem('+item_id+')).done(function() {return spajs.openURL("'+window.location.href+'");}));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    title: function(item_id){
        return "Hook "+this.model.items[item_id].justText('name')
    },
    short_title: function(item_id){
        return "Hook "+this.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter hook name',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new pmHooks.filed.selectHookType(),
                name:'type',
            },
            {
                filed: new pmHooks.filed.selectHookWhen(),
                name:'when',
            },
        ]
    ],
    sections:[
        function(section, item_id){
            return spajs.just.render("new_hook_recipients", {item_id:item_id})
        }
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        if(pmHooks.model.items[item_id].recipients.length == 0)
        {
            $.notify("You should add at least one recipient", "error");
            return false;
        }
        data['type'] = $('#hook-'+item_id+'-type').val();
        data['when'] = $('#hook-'+item_id+'-when').val();
        data['recipients'] = pmHooks.model.items[item_id].recipients.join(' | ');
        return data
    },
}


pmHooks.model.page_new = {
    title: "New hook",
    short_title: "New hook",
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Hook name',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new pmHooks.filed.selectHookType(),
                name:'type',
            },
            {
                filed: new pmHooks.filed.selectHookWhen(),
                name:'when',
            },
        ]
    ],
    sections:[
        function(section){
            return spajs.just.render("new_hook_recipients", {item_id:"new"})
        }
    ],
    onBeforeSave:function(data)
    {
        if(pmHooks.model.newItem.recipients.length == 0)
        {
            $.notify("You should add at least one recipient", "error");
            return false;
        }
        data['type'] = $('#new-hook-type').val();
        data['when'] = $('#new-hook-when').val();
        data['recipients'] = pmHooks.model.newItem.recipients.join(' | ');

        return data
    },
    onCreate:function(result)
    {
        var def = new $.Deferred();
        $.notify("Hook created", "success");
        $.when(spajs.open({ menuId:this.model.page_name+"/"+result.id})).always(function(){
            def.resolve()
        })

        return def.promise();
    }
}

/**
 * Функция получает доступные types и when для хуков
 * и сохраняет их в pmHooks.model.supportedTypes и pmHooks.model.supportedTypes
 */
pmHooks.getSupportedTypes = function()
{
    return spajs.ajax.Call({
        url: hostname + "/api/v1/hooks/types/",
        type: "GET",
        contentType:'application/json',
        success: function(data)
        {
            pmHooks.model.supportedTypes = data['types'];
            pmHooks.model.supportedWhens = data['when'];
        },
        error:function(e)
        {
            console.warn("getSupportedTypes error - " + JSON.stringify(e));
        }
    });
}

/**
 * Функция вызывается при открытии какого либо из меню(url) предназначенного для хуков.
 * После того, как фукнция pmHooks.getSupportedTypes успешно выполнится,
 * Данная функция откроет необходимую для нашего меню страницу.
 * @param {String} functionName - имя функции которая будет вызвана после успешного
 * вызова pmHooks.getSupportedTypes
 */
pmHooks.openSomeHookPage = function (holder, menuInfo, data, functionName)
{
    return $.when(pmHooks.getSupportedTypes()).done(function()
    {
        if(functionName=="showNewItemPage")
        {
            pmHooks.model.newItem={};
            pmHooks.model.newItem.recipients=[];
        }
        pmHooks[functionName](holder, menuInfo, data);

    }).fail(function ()
    {
        $.notify("Error with opening this page");
    }).promise();
}

pmHooks.loadItem = function (item_id)
{
    if (!item_id)
    {
        throw "Error in pmItems.loadItem with item_id = `" + item_id + "`"
    }

    var def = new $.Deferred();
    var thisObj = this;

    if (thisObj.model.items[item_id] === undefined)
    {
        thisObj.model.items[item_id] = {}
    }

    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "GET",
        contentType: 'application/json',
        data: "",
        success: function (data)
        {
            //console.log("loadUser", data)
            thisObj.model.items.justWatch(item_id)
            thisObj.model.items[item_id] = thisObj.afterItemLoad(data)
            thisObj.model.items[item_id].recipients = thisObj.model.items[item_id].recipients.split(" | ");
            def.resolve(data)
        },
        error: function (e)
        {
            console.warn(e)
            //polemarch.showErrors(e)
            def.reject(e)
        }
    });

    return def.promise();
}

pmHooks.loadItems = function (limit, offset)
{
    if (!limit)
    {
        limit = 30;
    }

    if (!offset)
    {
        offset = 0;
    }

    var thisObj = this;
    return spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/",
        type: "GET",
        contentType: 'application/json',
        data: "limit=" + encodeURIComponent(limit) + "&offset=" + encodeURIComponent(offset),
        success: function (data)
        {
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data

            for (var i in thisObj.model.itemslist.results)
            {
                thisObj.model.itemslist.results[i].recipients = thisObj.model.itemslist.results[i].recipients.split(" | ");
            }

            for (var i in data.results)
            {
                var val = thisObj.afterItemLoad(data.results[i])
                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val);
            }
        },
        error: function (e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

pmHooks.updateItem = function (item_id, opt)
{
    var def = new $.Deferred();
    var data = {}

    for (var i in this.model.page_item.fileds)
    {
        for (var j in this.model.page_item.fileds[i])
        {
            var val = this.model.page_item.fileds[i][j];

            data[val.name] = val.filed.getValue(this, val)
            if (val.validator !== undefined && !val.validator.apply(this, [data[val.name]]))
            {
                def.reject()
                return def.promise();
            }
        }
    }

    if (this.model.page_item.onBeforeSave)
    {
        data = this.model.page_item.onBeforeSave.apply(this, [data, item_id, opt]);
        if (data == undefined || data == false)
        {
            def.reject()
            return def.promise();
        }
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: hostname + "/api/v1/" + this.model.name + "/" + item_id + "/",
        type: "PATCH",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (data)
        {
            thisObj.model.items[item_id] = data
            thisObj.model.items[item_id].recipients = thisObj.model.items[item_id].recipients.split(" | ");
            $.when(thisObj.model.page_item.onUpdate.apply(thisObj, arguments)).always(function () {
                $.notify("Changes in "+thisObj.model.name+" were successfully saved", "success");
                def.resolve()
            })
        },
        error: function (e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    });

    return def.promise();
}


pmHooks.openNewRecipientModal = function (item_id)
{
    if($('div').is('#modal-new-recipient'))
    {
        $('#modal-new-recipient').empty();
        $('#modal-new-recipient').insertTpl(pmHooks.renderNewRecipientModal(item_id));
        $("#modal-new-recipient").modal('show');
    }
    else
    {
        var t=$(".content")[0];
        $('<div>', { id: "modal-new-recipient", class: "modal fade in"}).appendTo(t);
        $('#modal-new-recipient').insertTpl(pmHooks.renderNewRecipientModal(item_id));
        $("#modal-new-recipient").modal('show');
    }
}

pmHooks.renderNewRecipientModal = function (item_id)
{
    var html=spajs.just.render('new-recipient-modal', {item_id:item_id});
    return html;
}

pmHooks.addNewRecipient = function (item_id)
{
    if(item_id == "new")
    {
        pmHooks.model.newItem.recipients.push($('#new_recipient').val().trim());
    }
    else
    {
        var rec = pmHooks.model.items[item_id].recipients;
        rec.push($('#new_recipient').val().trim());
        pmHooks.model.items[item_id].recipients = rec;

    }
    $("#modal-new-recipient").modal('hide');
}

pmHooks.showEditRecipientsForm = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmInventories.showAddSubGroupsForm with item_id = `" + item_id + "`"
    }

    $("#edit_hook_recipients").remove()
    $(".content").appendTpl(spajs.just.render('edit_hook_recipients', {item_id:item_id}))
    var scroll_el = "#edit_hook_recipients";
    if ($(scroll_el).length != 0)  {
        $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 1000);
    }
    $("#polemarch-model-recipients-select").select2({ width: '100%' });
}

pmHooks.setRecipients = function(item_id, recipients)
{
    if(!item_id)
    {
        throw "Error in pmHooks.setRecipients with item_id = `" + item_id + "`"
    }

    if(!recipients)
    {
        recipients = [];
    }


    if(item_id == "new")
    {
        pmHooks.model.newItem.recipients = recipients;
    }
    else
    {
        return spajs.ajax.Call({
            url: hostname + "/api/v1/hooks/"+item_id+"/",
            type: "PATCH",
            contentType:'application/json',
            data:JSON.stringify({recipients:recipients.join(' | ')}),
            success: function(data)
            {
                pmHooks.model.items[item_id].recipients = data.recipients.split(' | ');
            },
            error:function(e)
            {
                console.warn("Hook "+item_id+" update error - " + JSON.stringify(e));
                polemarch.showErrors(e.responseJSON)
            }
        });
    }
}

tabSignal.connect("polemarch.start", function()
{
    spajs.addMenu({
        id:"hooks",
        urlregexp:[/^hooks/, /^hooks\/search\/?$/, /^hooks\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHooks.openSomeHookPage(holder, menuInfo, data, 'showList');}
    })

    spajs.addMenu({
        id:"hooks-item",
        urlregexp:[/^hook\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHooks.openSomeHookPage(holder, menuInfo, data, 'showItem');}
    })

    spajs.addMenu({
        id:"newHook",
        urlregexp:[/^new-hook/, /^([A-z0-9_]+)\/([0-9]+)\/new-hook/],
        onOpen:function(holder, menuInfo, data){return pmHooks.openSomeHookPage(holder, menuInfo, data, 'showNewItemPage');}
    })

    spajs.addMenu({
        id:"hooks-search",
        urlregexp:[/^hooks\/search\/([A-z0-9 %\-.:,=]+)$/, /^hooks\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHooks.openSomeHookPage(holder, menuInfo, data, 'showSearchResults');}
    })
})