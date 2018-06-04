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
            title:'When',
            name: 'when',
            class:function(item){ return 'class="hidden-480"'},
            value:function(item){ return pmHooks.model.supportedWhens[item['when']]},
        },
        {
            title:'Recipients',
            name: 'recipients',
            class:function(item){ return 'class="hidden-xs recipients_list"'},
            value:function(item)
            {
                var recipient_list="<ul>";
                var recipients_arr = pmHooks.parseRecipientsFromStrToArr(item['recipients'])
                for (var i in recipients_arr)
                {
                    recipient_list+="<li>"+recipients_arr[i]+"</li>";
                }
                recipient_list+="</ul>";
                return recipient_list;
            },
        },
        {
            title:'Type',
            name:'type',
            style:function(item, opt){ return 'style="width: 80px"'},
            class:function(item){ return 'class="hidden-xs hidden-1100"'},
            value:function(item){ return item['type']},
        },
        {
            title:'Active',
            name:'enable',
            style:function(item, opt){ return 'style="width: 80px"'},
            class:function(item, opt)
            {
                if(!item || !item.id)
                {
                    return 'class="hidden-xs hidden-sm hidden-1000"';
                }

                return 'class="hidden-xs hidden-sm hidden-1000 hook-enable '+'hook-enable-'+item.id+ '"';
            },
            value:function(item, filed_name, opt){
                if(this.model.items[item.id].enable)
                {
                    return '<i class="fa fa-check" style="font-size:20px;"></i>'
                }
                else
                {
                    return '';
                }
            }
        }
    ],
    actions:[
        {
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+')); return false;'},
            title:'Delete',
            link:function(){ return '#'}
        },
        {
            class:function(item){return 'change-activation-'+item.id;},
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.changeItemActivation('+item.id+')); return false;'},
            title:function(item){
                if(this.model.items[item.id].enable==true)
                {
                    return "Deactivate";
                }
                else {
                    return "Activate";
                }
            },
            link:function(){ return '#'}
        },
    ],
    actionsOnSelected:[
        {
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.changeSelectedItemsActivation(true)); return false;'},
            title:'Activate all selected',
            link:function(){ return '#'}
        },
        {
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.changeSelectedItemsActivation(false)); return false;'},
            title:'Deactivate all selected',
            link:function(){ return '#'}
        },

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
            class:function(item_id){return 'btn btn-warning change-activation-'+item_id;},
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.changeItemActivation('+item_id+')); return false;'},
            title:function(item_id){
                if(this.model.items[item_id].enable==true)
                {
                    return "Deactivate";
                }
                else {
                    return "Activate";
                }
            },
            link:function(){ return '#'}
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
            return spajs.just.render("section_hook_recipients", {item_id:item_id})
        }
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        if(pmHooks.parseRecipientsFromStrToArr(pmHooks.model.items[item_id].recipients).length == 0)
        {
            $.notify("You should add at least one recipient", "error");
            return false;
        }
        data['type'] = $('#hook-'+item_id+'-type').val();
        data['when'] = $('#hook-'+item_id+'-when').val();
        if(data['when'] == "null")
        {
            data['when'] = null;
        }
        data['recipients'] = pmHooks.model.items[item_id].recipients;
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
            return spajs.just.render("section_hook_recipients", {item_id:"new"})
        }
    ],
    onBeforeSave:function(data)
    {
        if(pmHooks.parseRecipientsFromStrToArr(pmHooks.model.newItem.recipients).length == 0)
        {
            $.notify("You should add at least one recipient", "error");
            return false;
        }
        data['type'] = $('#new-hook-type').val();
        data['when'] = $('#new-hook-when').val();
        if(data['when'] == "null")
        {
            data['when'] = null;
        }
        data['recipients'] = pmHooks.model.newItem.recipients;

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
 * и сохраняет их в pmHooks.model.supportedTypes и pmHooks.model.supportedWhens
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
            pmHooks.model.supportedWhens = {};
            pmHooks.model.supportedWhens['null'] = 'Always';
            for (var i in data['when']) {
                pmHooks.model.supportedWhens[i] = data['when'][i];
            }
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
            pmHooks.model.newItem.recipients="";
        }
        pmHooks[functionName](holder, menuInfo, data);

    }).fail(function ()
    {
        $.notify("Error with opening this page");
    }).promise();
}


/**
 * Фукнция преобраузет строку с со списком recipients в массив.
 * @param {String} recipients_str - строка содержащая список recipients, которые разделены
 * между собой группой символов: " | ".
 */
pmHooks.parseRecipientsFromStrToArr = function(recipients_str)
{
    if(recipients_str == "")
    {
        return [];
    }
    else
    {
        return recipients_str.split(" | ");
    }
}


/**
 * Фукнция преобраузет массив recipients в строку с разделителем: " | ".
 * @param {Array} recipients_arr - массив содержащий список recipients
 */
pmHooks.parseRecipientsFromArrToStr = function(recipients_arr)
{
    if(recipients_arr.length == 0)
    {
        return "";
    }
    else
    {
        return recipients_arr.join(" | ");
    }
}


/**
 * Фукнция открывает модальное окно для создание нового recipient'a.
 * @param {String/Number} item_id - "new" для нового хука либо id для существующего хука.
 */
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


/**
 * Фукнция рендерит модальное окно для создание нового recipient'a.
 * @param {String/Number} item_id - "new" для нового хука либо id для существующего хука.
 */
pmHooks.renderNewRecipientModal = function (item_id)
{
    var html=spajs.just.render('new-recipient-modal', {item_id:item_id});
    return html;
}


/**
 * Фукнция добавляет нового recipient'a к списку других recipient'ов.
 * @param {String/Number} item_id - "new" для нового хука либо id для существующего хука.
 */
pmHooks.addNewRecipient = function (item_id)
{
    if($("#new_recipient").val().trim() == "")
    {
        $.notify("Recipient field should not be empty.", "error");
        return false;
    }

    if(item_id == "new")
    {
        var recipients_arr = pmHooks.parseRecipientsFromStrToArr(pmHooks.model.newItem.recipients);
        recipients_arr.push($('#new_recipient').val().trim());
        pmHooks.model.newItem.recipients = pmHooks.parseRecipientsFromArrToStr(recipients_arr);
    }
    else
    {
        var recipients_arr = pmHooks.parseRecipientsFromStrToArr(pmHooks.model.items[item_id].recipients);
        recipients_arr.push($('#new_recipient').val().trim());
        pmHooks.model.items[item_id].recipients = pmHooks.parseRecipientsFromArrToStr(recipients_arr);
    }
    $("#modal-new-recipient").modal('hide');
}


/**
 * Фукнция отрисовывает форму для редактирования списка recipient'ов.
 * @param {String/Number} item_id - "new" для нового хука либо id для существующего хука.
 */
pmHooks.showEditRecipientsForm = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmHooks.showEditRecipientsForm with item_id = `" + item_id + "`"
    }

    $("#edit_hook_recipients").remove()
    $(".content").appendTpl(spajs.just.render('edit_hook_recipients', {item_id:item_id}))
    var scroll_el = "#edit_hook_recipients";
    if ($(scroll_el).length != 0)  {
        $('html, body').animate({ scrollTop: $(scroll_el).offset().top }, 1000);
    }
    $("#polemarch-model-recipients-select").select2({ width: '100%' });
}


/**
 * Фукнция запоминает изменения в списке recipient'ов.
 * @param {String/Number} item_id - "new" для нового хука либо id для существующего хука.
 * @param {Array} recipients - массив с новым списком recipient'ов.
 */
pmHooks.setRecipients = function(item_id, recipients)
{
    if(!item_id)
    {
        throw "Error in pmHooks.setRecipients with item_id = `" + item_id + "`"
    }

    if(!recipients)
    {
        recipients = "";
    }


    if(item_id == "new")
    {
        pmHooks.model.newItem.recipients = pmHooks.parseRecipientsFromArrToStr(recipients);
    }
    else
    {
        return spajs.ajax.Call({
            url: hostname + "/api/v1/hooks/"+item_id+"/",
            type: "PATCH",
            contentType:'application/json',
            data:JSON.stringify({recipients:pmHooks.parseRecipientsFromArrToStr(recipients)}),
            success: function(data)
            {
                pmHooks.model.items[item_id].recipients = data.recipients;
            },
            error:function(e)
            {
                console.warn("Hook "+item_id+" update error - " + JSON.stringify(e));
                polemarch.showErrors(e.responseJSON)
            }
        });
    }
}

/**
 *Функция меняет значение свойства enable на противоположное.
 */
pmHooks.changeItemActivation = function(item_id)
{
    var thisObj = this;
    var new_enable = !thisObj.model.items[item_id].enable;
    var dataToPatch = {enable: new_enable};
    return spajs.ajax.Call({
        url: hostname + "/api/v1/hooks/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data:JSON.stringify(dataToPatch),
        success: function(data)
        {
            thisObj.model.items[item_id].enable = new_enable;
            if(new_enable)
            {
                $.notify('Hook "'+thisObj.model.items[item_id].name+'" was activated.', 'success');
                $($('.change-activation-'+item_id)[0]).html('Deactivate');
                $($(".hook-enable-"+item_id)[0]).html('<i class="fa fa-check" style="font-size:20px;"></i>');
            }
            else
            {
                $.notify('Hook "'+thisObj.model.items[item_id].name+'" was deactivated.', 'success');
                $($('.change-activation-'+item_id)[0]).html('Activate');
                $($(".hook-enable-"+item_id)[0]).html('');
            }
        },
        error:function(e)
        {
            console.warn("Hook "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 *Функция меняет значение свойства enable на установленное(mode).
 */
pmHooks.changeSelectedItemsActivation = function(mode)
{
    var thisObj = this;
    var bulkUpdate = [];
    for (var i in thisObj.model.selectedItems)
    {
        if (thisObj.model.selectedItems[i])
        {
            bulkUpdate.push({
                type: 'mod',
                item: thisObj.model.bulk_name,
                pk: i,
                method: 'patch',
                data: {
                    enable: mode
                }
            })
        }
    }

    return spajs.ajax.Call({
        url: hostname + "/api/v1/_bulk/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(bulkUpdate),
        success: function(data)
        {
            for(var i in data)
            {
                if(data[i].status == 200)
                {
                    thisObj.model.items[data[i].data.id].enable = data[i].data.enable;
                    if(data[i].data.enable)
                    {
                        $.notify('Hook "'+thisObj.model.items[data[i].data.id].name+'" was activated.', 'success');
                        $($('.change-activation-'+data[i].data.id)[0]).html('Deactivate');
                        $($(".hook-enable-"+data[i].data.id)[0]).html('<i class="fa fa-check" style="font-size:20px;"></i>');
                    }
                    else
                    {
                        $.notify('Hook "'+thisObj.model.items[data[i].data.id].name+'" was deactivated.', 'success');
                        $($('.change-activation-'+data[i].data.id)[0]).html('Activate');
                        $($(".hook-enable-"+data[i].data.id)[0]).html('');
                    }
                }
                else
                {
                    $.notify('Error ' + data[i].status, 'error');
                }
            }

            for (var i in bulkUpdate)
            {
                $(".item-" + bulkUpdate[i].pk).removeClass("selected");
                thisObj.toggleSelect(bulkUpdate[i].pk, false);
            }

            $($(".global-select")[0]).parent().removeClass('selected');

        },
        error:function(e)
        {
            console.warn("Hook "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
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