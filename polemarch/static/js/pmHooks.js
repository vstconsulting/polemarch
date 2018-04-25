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
        ],
        [
            {
                filed: new pmHooks.filed.selectHookWhen(),
                name:'when',
            },
            {
                filed: new filedsLib.filed.text(),
                name:'recipients',
                title:'Recipients',
            },
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        data['type'] = $('#hook-'+item_id+'-type').val();
        data['when'] = $('#hook-'+item_id+'-when').val();
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
                help:'',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new pmHooks.filed.selectHookType(),
                name:'type',
            }
        ],
        [
            {
                filed: new pmHooks.filed.selectHookWhen(),
                name:'when',
            },
            {
                filed: new filedsLib.filed.text(),
                name:'recipients',
                title:'Recipients',
                placeholder:'Hook recipients',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Recipients')
                },
                fast_validator:function(value){ return value != '' && value}
            },

        ]
    ],
    onBeforeSave:function(data)
    {
        data['type'] = $('#new-hook-type').val();
        data['when'] = $('#new-hook-when').val();
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
pmHooks.openSomeHookPage = function (holder, menuInfo, data, functionName) {
    return $.when(pmHooks.getSupportedTypes()).done(function()
    {
        pmHooks[functionName](holder, menuInfo, data);

    }).fail(function ()
    {
        $.notify("Error with opening this page");
    }).promise();
}


tabSignal.connect("polemarch.start", function()
{
    spajs.addMenu({
        id:"hooks",
        urlregexp:[/^hooks/, /^hooks\/search\/?$/, /^hooks\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHooks.openSomeHookPage(holder, menuInfo, data, 'showUpdatedList');}
    })

    spajs.addMenu({
        id:"hooks-item",
        urlregexp:[/^hook\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHooks.openSomeHookPage(holder, menuInfo, data, 'showItem');},
        onClose:function(){return pmHooks.stopUpdates();}
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