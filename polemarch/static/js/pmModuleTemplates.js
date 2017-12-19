
var pmModuleTemplates =  inheritance(pmTemplates)  

pmModuleTemplates.model.name = "templates"
pmModuleTemplates.model.page_name = "template"
pmModuleTemplates.model.bulk_name = "template"
pmModuleTemplates.model.selectedInventory = 0
pmModuleTemplates.model.className = "pmModuleTemplates"

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmModuleTemplates.model.kind = "Module"

pmModuleTemplates.inventoriesAutocompletefiled = new pmInventories.filed.inventoriesAutocomplete() 

pmTemplates.model.kindObjects[pmModuleTemplates.model.kind] = pmModuleTemplates
  

/**
 * Для ввода пароля
 * @type Object
 */
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule = inheritance(filedsLib.filed.simpleText)
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule.type = 'selectProjectInventoryGroupAndModule'
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule.getValue = function(pmObj, filed){
    return '';
}


/**
 * Функция для рендера текстового поля
 * @type Object
 */
pmModuleTemplates.filed.selectProjectInventoryGroupAndModule.render = function(pmObj, filed, item_id){ 
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()
    { 
        $("#inventories-autocomplete").select2({ width: '100%' });
        $("#projects-autocomplete").select2({ width: '100%' }); 
    })
}


pmModuleTemplates.model.page_list = {
    short_title: 'Module template',
}

pmModuleTemplates.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            function:function(item_id){ 
                return "spajs.showLoader("+this.model.className+".saveAndExecute("+item_id+")); return false;"
            },
            title:'Save and execute',
            link:function(){ return '#'},
            help:'Save and execute'
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
            return jsonEditor.editor(pmModuleTemplates.model.items[item_id].data.vars, {block:'module', title1:'Arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return "Module template "+this.model.items[item_id].justText('name')
    },
    short_title: function(item_id){
        return this.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter template name', 
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
        ],[
            {
                filed: new pmModuleTemplates.filed.selectProjectInventoryGroupAndModule(),
                name:'inventory',
            }, 
        ]
    ],
    onUpdate:function(result)
    { 
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        data.kind = this.model.kind
        data.data = {
            module:moduleArgsEditor.getSelectedModuleName(),
            inventory:pmModuleTemplates.inventoriesAutocompletefiled.getValue(),
            project:$("#projects-autocomplete").val(),
            group:pmGroups.getGroupsAutocompleteValue(),
            args:moduleArgsEditor.getModuleArgs(),
            vars:jsonEditor.jsonEditorGetValues(),
        }
        
        return data;
    },
}


pmModuleTemplates.saveAndExecute = function(item_id)
{
    var def = new $.Deferred();
    $.when(this.updateItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.execute(item_id)).always(function(){
            def.resolve();
        })
    }).fail(function(){
        def.reject();
    })
    return def.promise()
}


pmModuleTemplates.showItem = function(holder, menuInfo, data)
{ 
    var item_id = data.reg[1]

    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).always(function()
        {
            var tpl = thisObj.model.name+'_module_page'
            if(!spajs.just.isTplExists(tpl))
            {
                tpl = 'items_page'
            }

            $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}})) 
            def.resolve();
        });
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}

pmModuleTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

        $("#inventories-autocomplete").select2({ width: '100%' });
        $("#projects-autocomplete").select2({ width: '100%' });
 
        def.resolve();
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}


pmModuleTemplates.selectInventory = function(inventory_id)
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
 * @return $.Deferred
 */
pmModuleTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        module:moduleArgsEditor.getSelectedModuleName(),
        inventory:pmModuleTemplates.inventoriesAutocompletefiled.getValue(),
        project:$("#projects-autocomplete").val(),
        group:pmGroups.getGroupsAutocompleteValue(),
        args:moduleArgsEditor.getModuleArgs(),
        vars:jsonEditor.jsonEditorGetValues(),
    }

    if(!data.name)
    {
        console.warn("Invalid value in field name")
        $.notify("Invalid value in field name", "error");
        def.reject()
        return;
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/templates/",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(data),
                success: function(data)
        {
            $.notify("template created", "success");
            $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });

    return def.promise();
}
  
tabSignal.connect("polemarch.start", function()
{ 
    spajs.addMenu({
        id:"Module-item", 
        urlregexp:[/^template\/Module\/([0-9]+)$/, /^templates\/Module\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showItem(holder, menuInfo, data);}, 
    })
    
    spajs.addMenu({
        id:"module-new", 
        urlregexp:[/^template\/new-module$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewItemPage(holder, menuInfo, data);}
    })
    
})