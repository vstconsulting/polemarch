

var pmTasksTemplates = inheritance(pmTemplates)


pmTasksTemplates.model.name = "templates"
pmTasksTemplates.model.page_name = "template"
pmTasksTemplates.model.bulk_name = "template"
pmTasksTemplates.model.className = "pmTasksTemplates"

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTasksTemplates.model.kind = "Task"
pmTemplates.model.kindObjects[pmTasksTemplates.model.kind] = pmTasksTemplates

/**
 * Для ввода пароля
 * @type Object
 */
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook = inheritance(filedsLib.filed.simpleText)
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook.type = 'selectProjectInventoryAndPlaybook'
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook.getValue = function(pmObj, filed){
    return '';
}


/**
 * Функция для рендера текстового поля
 * @type Object
 */
pmTasksTemplates.filed.selectProjectInventoryAndPlaybook.render = function(pmObj, filed, item_id){ 
    var html = spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
    return spajs.just.onInsert(html, function()
    { 
        $("#inventories-autocomplete").select2({ width: '100%' });
        $("#projects-autocomplete").select2({ width: '100%' });
 
        new autoComplete({
            selector: '#playbook-autocomplete',
            minChars: 0,
            cache:false,
            showByClick:false,
            menuClass:'playbook-autocomplete',
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.playbook + '" >' + item.playbook + '</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#playbook-autocomplete").val($(item).text());
                //console.log('onSelect', term, item);
                //var value = $(item).attr('data-value');
            },
            source: function(term, response)
            {
                term = term.toLowerCase();

                var matches = []
                for(var i in pmTasks.model.items)
                {
                    var val = pmTasks.model.items[i]
                    if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
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
}

   // <a href="#" onclick="pmTasksTemplates.exportSelecedToFile(); return false;" >Export all selected templates</a>

pmTasksTemplates.model.page_list = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'template/new-task'}); return false;"},
            title:'Create task template',
            link:function(){ return '/?template/new-task'},
        },
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'template/new-module'}); return false;"},
            title:'Create module template',
            link:function(){ return '/?template/new-module'},
        },
    ],
    actionsOnSelected:[ 
        {},
        {
            class:'btn btn-primary',
            function:function(){ return "pmTasksTemplates.exportSelecedToFile(); return false;"},
            title:'Export all selected templates',
            link:function(){ return '#'},
        },
    ],
    title: "Templates",
    short_title: "Templates",
    fileds:[
        {
            title:'Name',
            name:'name',
            value:function(item)
            { 
                return '<a href="/?'+this.model.page_name+'/'+item.kind+'/'+item.id+'" class="item-name" onclick="return spajs.openURL(this.href);" >'+item.name+'</a>'; 
            }
        },
        {
            title:'Kind',
            name:'kind',
            style:function(item){ return 'style="width: 110px"'},
            class:function(item)
            { 
                return 'class="hidden-xs hidden-sm"'; 
            },
            value:function(item)
            { 
                return item.kind; 
            }
        }
    ],
    actions:[
        {
            class:'btn btn-warning',
            function:function(item){ return "spajs.showLoader(pmTemplates.model.kindObjects['"+item.kind+"'].execute("+item.id+")); return false;"},
            title:'Execute',
            link:function(){ return '#'}
        }, 
    ]
}

pmTasksTemplates.model.page_item = {
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
            return jsonEditor.editor(pmTasksTemplates.model.items[item_id].data.vars, {block:'playbook', title1:'Arguments', title2:'Adding new argument', select2:true});
        }
    ],
    title: function(item_id){
        return "Task template "+this.model.items[item_id].justText('name')
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
            // @todo дорефакторить поля ввода
        ],[
            {
                filed: new pmTasksTemplates.filed.selectProjectInventoryAndPlaybook(),
                name:'project',
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
            inventory:pmTasksTemplates.inventoriesAutocompletefiled.getValue(),
            vars:jsonEditor.jsonEditorGetValues()
        }

        data.data.playbook = $("#playbook-autocomplete").val()
        data.data.project = $("#projects-autocomplete").val()/1

        return data;
    },
}

pmTasksTemplates.saveAndExecute = function(item_id)
{
    var def = new $.Deferred();
    $.when(this.updateItem(item_id)).done(function()
    {
        $.when(pmTasksTemplates.execute(item_id)).always(function(){
            def.resolve();
        })
    }).fail(function(){
        def.reject();
    })
    return def.promise()
}


pmTasksTemplates.inventoriesAutocompletefiled = new pmInventories.filed.inventoriesAutocomplete() 
pmTasksTemplates.showWidget = function(holder, kind)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    return $.when(this.sendSearchQuery({kind:kind}, limit, offset)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_widget', {query:"", kind:kind}))
    }).fail(function()
    {
        $.notify("", "error");
    }).promise()
}

pmTasksTemplates.showTaskWidget = function(holder)
{
    return pmTasksTemplates.showWidget(holder, "Task")
}

pmTasksTemplates.showModuleWidget = function(holder)
{
    return pmTasksTemplates.showWidget(holder, "Module")
}

pmTasksTemplates.showItem = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var item_id = data.reg[1]
    $.when(pmProjects.loadAllItems(), pmTasksTemplates.loadItem(item_id), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        thisObj.model.selectedProject == pmTasksTemplates.model.items[item_id].project

        var tpl = thisObj.model.name+'_page'
        if(!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }
        
        $(holder).insertTpl(spajs.just.render(tpl, {item_id:item_id, pmObj:thisObj, opt:{}}))
        
        def.resolve();
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}

pmTasksTemplates.selectProject = function(project_id){
    console.log("select project", project_id)
    $(".autocomplete-suggestion").hide()
    $(".playbook-project-"+project_id).show()
    pmTasksTemplates.model.selectedProject = project_id
}

pmTasksTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmProjects.loadAllItems(), pmInventories.loadAllItems(), pmTasks.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_page', {}))

        $("#inventories-autocomplete").select2({ width: '100%' });
        //$("#projects-autocomplete").select2({ width: '100%' });

        new autoComplete({
            selector: '#playbook-autocomplete',
            minChars: 0,
            cache:false,
            showByClick:false,
            menuClass:'playbook-autocomplete',
            renderItem: function(item, search)
            {
                var style = "";
                if(thisObj.model.selectedProject != item.project)
                {
                    style = "style='disolay:none'"
                }
                return '<div class="autocomplete-suggestion playbook-project-' + item.project + ' " '+style+' data-value="' + item.playbook + '" >' + item.playbook + '</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#playbook-autocomplete").val($(item).text());
                //console.log('onSelect', term, item);
                //var value = $(item).attr('data-value');
            },
            source: function(term, response)
            {
                term = term.toLowerCase();

                var matches = []
                for(var i in pmTasks.model.items)
                {
                    var val = pmTasks.model.items[i]
                    if(val.name.toLowerCase().indexOf(term) != -1 && thisObj.model.selectedProject == val.project)
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

        def.resolve();
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}
 
/**
 * @return $.Deferred
 * @todo дорефакторить форму создания Task template
 */
pmTasksTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    var inventory = pmTasksTemplates.inventoriesAutocompletefiled.getValue()
    
    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        playbook:$("#playbook-autocomplete").val(),
        inventory:inventory,
        project:$("#projects-autocomplete").val(),
        vars:jsonEditor.jsonEditorGetValues()
    }
    

    if(!data.name)
    {
        console.warn("Invalid value in field name")
        $.notify("Invalid value in field name", "error");
        def.reject()
        return def.promise();
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
    // Tasks Templates
    spajs.addMenu({
        id:"tasks", 
        urlregexp:[/^templates$/, /^templates\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"tasks-search", 
        urlregexp:[/^templates\/search\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showSearchResults(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"Task-item", 
        urlregexp:[/^template\/Task\/([0-9]+)$/, /^templates\/Task\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showItem(holder, menuInfo, data);}, 
    })
    
    spajs.addMenu({
        id:"task-new", 
        urlregexp:[/^template\/new-task$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showNewItemPage(holder, menuInfo, data);}
    })
     
})