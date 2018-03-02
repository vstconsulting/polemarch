
var pmProjects = inheritance(pmItems)

pmProjects.model.name = "projects"
pmProjects.model.page_name = "project"
pmProjects.model.className = "pmProjects"
pmProjects.model.bulk_name = "project"

jsonEditor.options[pmProjects.model.name] = {};
pmProjects.model.selectedInventory = 0

jsonEditor.options[pmProjects.model.name]['repo_password'] = {
    type:'password',
    help:'Password from repository',
    helpcontent:'Password from repository required for GIT'
}

/**
 * Для ввода пароля
 * @type Object
 */
pmProjects.filed.selectRepositoryType = inheritance(filedsLib.filed.simpleText)
pmProjects.filed.selectRepositoryType.type = 'selectRepositoryType'
pmProjects.filed.selectRepositoryType.getValue = function(pmObj, filed){
    return '';
}


/**
 * Вызывается после загрузки информации об элементе но до его вставки в любые массивы.
 * Должна вернуть отредактированый или не изменный элемент
 * @param {object} item загруженный с сервера элемента
 * @returns {object} обработаный элемент
 */
pmProjects.afterItemLoad = function(item)
{
    if(item.status == "WAIT_SYNC" && item.revision == "ERROR")
    {
        item.revision = "WAIT SYNC"
    }
    return item;
}

pmProjects.inventoriesAutocompletefiled = new pmInventories.filed.inventoriesAutocomplete()

/**
 * Описывает как формировать страницу списка элементов
 * @type object
 */
pmProjects.model.page_list = {
    // Массив для описания кнопок в верху страницы
    buttons:[
        {
            class:'btn btn-primary',                                                                                // Класс
            //function:function(){ return "spajs.open({ menuId:'new-"+this.model.page_name+"'}); return false;"},   // То что подставится в шаблон на onclick
            onclick:function(){ spajs.open({ menuId:"new-"+this.model.page_name}); return false;},                  // Функция вызываемая на onclick
            title:'Create',                                                                                         // Текст на кнопке
            link:function(){ return '/?new-'+this.model.page_name},                                                 // То что попадёт в href
            help:''                                                                                                 // Текст для поля подсказки title
        },
    ],
    title: "Projects",          // Текст заголовка страницы
    short_title: "Projects",    // Короткий текст заголовка страницы
    // Описание полей в списке элементов
    fileds:[
        {
            title:'Name',   // Текст в заголовке
            name:'name',    // Имя поля в объекте из которого надо взять значение
        },
        {
            title:'Status',
            name:'status',
            /**
             * Стиль элемента td в таблице
             * @param {object} item объект для которого строится строка
             * @param {object} opt объект доп параметров переданных в шаблон
             * @returns {String} Стиль элемента td в таблице
             */
            style:function(item, opt){ return 'style="width: 110px"'},
            /**
             * Класс элемента td в таблице
             * @param {object} item объект для которого строится строка
             * @param {object} opt объект доп параметров переданных в шаблон
             * @returns {String} Класс элемента td в таблице
             */
            class:function(item, opt)
            {
                if(!item || !item.id)
                {
                    return 'class="hidden-xs hidden-sm"';
                }

                return 'class="hidden-xs hidden-sm project-status '
                    + this.model.items[item.id].justClassName('status', function(v){ return "project-status-"+v})+'"'
            },
            /**
             * Значение для ячейки в таблице
             * @param {object} item объект для которого строится строка
             * @param {String} filed_name имя поля
             * @param {object} opt объект доп параметров переданных в шаблон
             * @returns {String} Значение для ячейки в таблице
             */
            value:function(item, filed_name, opt){
                return this.model.items[item.id].justText(filed_name)
            },
        }
    ],
    // Список действий которые можно совершить из страницы просмотра списка
    actions:[
        {
            /**
             * Функция для onclick
             * @param {object} item объект для которого строится строка
             * @param {object} opt объект доп параметров переданных в шаблон
             * @returns {String} Функция для onclick
             */
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.syncRepo('+item.id+')); return false;'},
            /**
             * Текст заголовка кнопки
             */
            title:'Sync',
            /**
             * Функция для href
             * @param {object} item объект для которого строится строка
             * @param {object} opt объект доп параметров переданных в шаблон
             * @returns {String} Функция для href
             */
            link:function(){ return '#'}
        },
        {
            // separator
        },
        {
            function:function(item){ return "spajs.open({ menuId:'project/"+item.id+"/playbook/run'}); return false;"},
            title:'Run playbook',
            link:function(){ return '#'}
        },
        {
            function:function(item){ return "spajs.open({ menuId:'project/"+item.id+"/ansible-module/run'}); return false;"},
            title:'Run ansible module',
            link:function(){ return '#'}
        },
        {
            function:function(item){ return "spajs.open({ menuId:'project/"+item.id+"/periodic-tasks'}); return false;"},
            title:'Periodic tasks',
            link:function(){ return '#'}
        },
        {
            function:function(item){ return "spajs.open({ menuId:'project/"+item.id+"/history'}); return false;"},
            title:'History',
            link:function(){ return '#'}
        },
        {
            // separator
        },
        {
            class:'btn btn-danger',
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+')); return false;'},
            title:'Delete',
            link:function(){ return '#'}
        },
    ]
}

/**
 * Описывает как формировать страницу создания элемента
 * @type object
 */
pmProjects.model.page_new = {
    title: "New project",               // Текст заголовка страницы
    short_title: "New project",         // Короткий текст заголовка страницы   
    /**
     * Содержит массив с массивами описаний полей в списке элементов
     * Масиивы представляют собой блоки строк в которые вставляются поля ввода
     * @type Array
     */
    fileds:[
        [
            /**
             * Поле ввода
             * @todo В целом в следующем приступе неудержимого рефакторинга будет правильнее
             *  все параметры кроме filed перенести в конструктор поля filed
             *  и тогда массив fileds будет содержать только экземпляры filedsLib.filed.* или его наследников
             */
            {
                filed: new filedsLib.filed.text(),                              // Объект поля ввода
                title:'Name',                                                   // Заголовок
                name:'name',                                                    // Имя поля из которого брать значение
                placeholder:'Project name',                                     // Подсказка
                help:'',                                                        // Подсказка
                validator:function(value){                                      // Функция валидации должна вернуть true или false+вывод сообщения об ошибке
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}    // Функция быстрой валидации должна вернуть true или false
            },
            {
                filed: new pmProjects.filed.selectRepositoryType(),
                name:'repository',
            },
        ]
    ],
    /**
     * Список дополнительных блоков которые надо вставить в страницу
     * @type Array
     */
    sections:[
        /**
         * @returns {String} Текст шаблона для вставки дополнительных блоков в страницу
         */
        // function(){ return ''}
    ],
    /**
     * Функция вызываемая до сохранения объекта, должна вернуть объект
     * отправляемый на сохранение можно изменённый или вернуть false для того чтоб отменить сохранение.
     * @param {object} data объект отправляемый на сохранение
     * @returns {object|boolean}
     */
    onBeforeSave:function(data)
    {
        data.repository = $("#new_project_repository").val()
        data.vars = {
            repo_type:$("#new_project_type").val(),
            //repo_password:$("#new_project_password").val(),
        }

        if(data.vars.repo_type == "GIT")
        {
            if($("#new_project_branch").val().trim()!="")
            {
                data.vars.repo_branch=$("#new_project_branch").val().trim();
            }

            if($("#new_project_password").val().trim()!="")
            {
                data.vars.repo_password=$("#new_project_password").val().trim();
            }
        }


        if(!data.repository)
        {
            if(data.vars.repo_type == "MANUAL")
            {
                data.repository = "MANUAL"
            }
            else
            {
                $.notify("Invalid value in field `Repository URL`", "error");
                return false;
            }
        }

        return data;
    },
    /**
     * Функция вызываемая после сохранения объекта
     * @param {object} result
     * @returns {function|boolean}
     */
    onCreate:function(result)
    {
        var def = new $.Deferred();
        $.notify("Project created", "success");
        $.when(spajs.open({ menuId:this.model.page_name+"/"+result.id})).always(function(){
            def.resolve()
        })

        return def.promise();
    }
}


/**
 * Описывает как формировать страницу редактирования элемента
 * @type object
 */
pmProjects.model.page_item = {
    // Массив для описания кнопок в верху страницы
    buttons:[
        {
            class:'btn btn-primary',
            /**
             * @param {Integer} item_id Идентификатор редактируемого элемента
             * @returns {String} То что подставится в шаблон на onclick
             */
            function:function(item_id){ return 'spajs.showLoader($.when('+this.model.className+'.updateItem('+item_id+')).done(function() {return spajs.openURL("'+window.location.href+'");}));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-warning',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.syncRepoFromProjectPage('+item_id+'));  return false;'},
            title:'<i class="fa fa-refresh hidden-sm hidden-xs" aria-hidden="true"></i> Sync',
            link:function(){ return '#'},
            help:'Sync'
        },
        {
            class:'btn btn-info',
            function:function(item_id){ return 'return spajs.openURL(this.href);'},
            title:'<i class="fa fa-play hidden-sm hidden-xs" aria-hidden="true"></i> Run playbook',
            link:function(item_id){ return polemarch.opt.host +'/?project/'+ item_id + '/playbook/run'},
            help:'Run playbook'
        },
        {
            class:'btn btn-info',
            function:function(item_id){ return 'return spajs.openURL(this.href);'},
            title:'<i class="fa fa-terminal hidden-sm hidden-xs" aria-hidden="true"></i> Run module',
            link:function(item_id){ return polemarch.opt.host +'/?project/'+ item_id + '/ansible-module/run'},
            help:'Run module'
        },
        {
            class:'btn btn-info',
            function:function(item_id){ return 'return spajs.openURL(this.href);'},
            title:'<i class="fa fa-clock-o hidden-sm hidden-xs" aria-hidden="true"></i> Periodic tasks',
            link:function(item_id){ return polemarch.opt.host +'/?project/'+ item_id + '/periodic-tasks'},
            help:'Periodic tasks'
        },
        {
            class:'btn btn-info',
            function:function(item_id){ return 'return spajs.openURL(this.href);'},
            title:'<i class="fa fa-history hidden-sm hidden-xs" aria-hidden="true"></i> History',
            link:function(item_id){ return polemarch.opt.host +'/?project/'+ item_id + '/history'},
            help:'history'
        },
        {
            tpl:function(item_id){
                return spajs.just.render('pmTasksTemplates_btn_importFromFile', {item_id:item_id})
            },
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    sections:[],
    /**
     * @param {Integer} item_id Идентификатор редактируемого элемента
     * @returns {String} То что подставится в шаблон на title
     */
    title: function(item_id){
        return "Project "+this.model.items[item_id].justText('name')
    },
    /**
     * @param {Integer} item_id Идентификатор редактируемого элемента
     * @returns {String} То что подставится в шаблон на short_title
     */
    short_title: function(item_id){
        return "Project "+this.model.items[item_id].justText('name', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'Name',
                name:'name',
                placeholder:'Enter project name',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new pmProjects.filed.selectRepositoryType(),
                name:'repository',
            },
            {
                filed: new filedsLib.filed.disabled(),
                name:'revision',
                title:'Revision',
            },
            {
                filed: new filedsLib.filed.disabled(),
                name:'status',
                title:'Status',
            },
        ]
    ],
    /**
     * Функция вызываемая после сохранения объекта
     * @param {object} result
     * @returns {function|boolean}
     */
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        data.repository = $("#project_"+item_id+"_repository").val()

        data.vars = {
            repo_type:$("#project_"+item_id+"_type").val(),
            //repo_password:$("#project_"+item_id+"_password").val(),
        }

        if(data.vars.repo_type=="GIT")
        {
            if($("#project_"+item_id+"_branch").val().trim()!="")
            {

                data.vars.repo_branch=$("#project_"+item_id+"_branch").val().trim();
            }
            else
            {
                $.notify("Branch name is empty", "error");
                return false;
            }

            if($("#project_"+item_id+"_password").val().trim()!="")
            {
                data.vars.repo_password=$("#project_"+item_id+"_password").val().trim();
            }
        }

        if(!data.repository)
        {
            if(data.vars.repo_type == "MANUAL")
            {
                data.repository = "MANUAL"
            }
            else
            {
                $.notify("Invalid value in field `Repository URL`", "error");
                return false;
            }
        }

        delete data.revision
        delete data.repository
        return data;
    },
}

pmProjects.startUpdateProjectItem = function(item_id)
{
    var thisObj = this;

    if(thisObj.model.items[item_id].status == "WAIT_SYNC" || thisObj.model.items[item_id].status == "SYNC")
    {
        thisObj.model.updateTimeoutId = setTimeout(function()
        {
            $.when(thisObj.loadItem(item_id)).always(function()
            {
                thisObj.startUpdateProjectItem(item_id)
            })
        }, 5000)
    }

    if(thisObj.model.items[item_id].status != "WAIT_SYNC" || thisObj.model.items[item_id].status != "SYNC")
    {
        $("#branch_block").empty();
        $("#branch_block").html(pmProjects.renderBranchInput(item_id));
    }

}

pmProjects.openItem = function(holder, menuInfo, data)
{
    var item_id = data.reg[1]
    var def = new $.Deferred();
    $.when(pmProjects.supportedRepos()).always(function()
    {
        $.when(pmProjects.showItem(holder, menuInfo, data)) .always(function()
        {
            pmProjects.startUpdateProjectItem(item_id)
            def.resolve();
        })
    }).promise();

    return def.promise();
}

pmProjects.openNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    $.when(pmProjects.supportedRepos()).always(function()
    {
        $.when(pmProjects.showNewItemPage(holder, menuInfo, data)) .always(function()
        {
            def.resolve();
        })
    })

    return def.promise();
}

/**
 * Берёт данные со страницы  "run playbook options"  ( /?project/1/playbook/run ) для проекта и запускает выполнение Playbook
 * @returns {$.Deferred}
 */
pmProjects.executePlaybook = function(project_id)
{
    var data_vars = jsonEditor.jsonEditorGetValues();
    data_vars.limit = pmGroups.getGroupsAutocompleteValue();
    return pmTasks.execute(project_id, pmProjects.inventoriesAutocompletefiled.getValue(), $('#playbook-autocomplete').val(), $('#groups_autocomplete_filedprefix').val(), data_vars);
}

/**
 * Строит страницу "run playbook options"  ( /?project/1/playbook/run ) для проекта
 * @returns {$.Deferred}
 */
pmProjects.openRunPlaybookPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    var project_id = data.reg[1]
    $.when(pmTasks.searchItems(project_id, "project"), pmProjects.loadItem(project_id), pmInventories.loadAllItems()).done(function(results)
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_run_playbook', {item_id:project_id, query:project_id}))

        //$("#inventories-autocomplete").select2({ width: '100%' });

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
                for(var i in results[0].results)
                {
                    var val = pmTasks.model.itemslist.results[i]
                    if(val.name.toLowerCase().indexOf(term) != -1 && val.project == project_id && val.name.toLowerCase() != term)
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
    }).fail(function(e)
    {
        def.reject(e);
    })

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmProjects.syncRepo = function(item_id)
{
    return spajs.ajax.Call({
        url: "/api/v1/projects/"+item_id+"/sync/",
        type: "POST",
        contentType:'application/json',
        success: function(data)
        {
            $.notify("Send sync query", "success");
        },
        error:function(e)
        {
            console.warn("project "+item_id+" sync error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });

}

pmProjects.syncRepoFromProjectPage = function(item_id)
{
    var thisObj = this;
    thisObj.model.items[item_id].status = "WAIT_SYNC";
    pmProjects.startUpdateProjectItem(item_id);

    return spajs.ajax.Call({
        url: "/api/v1/projects/"+item_id+"/sync/",
        type: "POST",
        contentType:'application/json',
        success: function(data)
        {
            $.notify("Send sync query", "success");
        },
        error:function(e)
        {
            console.warn("project "+item_id+" sync error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });

}

/**
 * @return $.Deferred
 */
pmProjects.supportedRepos = function()
{
    return spajs.ajax.Call({
        url: "/api/v1/projects/supported-repos/",
        type: "GET",
        contentType:'application/json',
        success: function(data)
        {
            pmProjects.model.supportedRepos = data;
            pmProjects.model.repository_type = data[0]
            jsonEditor.options['projects'].repo_type = {
                type:'select',
                options:pmProjects.model.supportedRepos,
                required:true,
            }
        },
        error:function(e)
        {
            console.warn("supportedRepos error - " + JSON.stringify(e));
        }
    });
}


pmProjects.clearAndPasteBranchInput = function(item_id, thisInput)
{
    $(thisInput).empty();
    $(thisInput).val(pmProjects.model.items[item_id].branch);
    pmProjects.checkBranchInput(item_id);
}

pmProjects.checkBranchInput = function(item_id)
{
    var branchInputValue=$("#project_"+pmProjects.model.items[item_id].id+"_branch").val().trim();
    if(branchInputValue!=pmProjects.model.items[item_id].vars.repo_branch)
    {
        pmProjects.model.items[item_id].vars.repo_branch=branchInputValue;
        $("#branch_block").empty();
        var html=pmProjects.renderBranchInput(item_id);
        $("#branch_block").html(html);
    }
}

pmProjects.renderBranchInput = function(item_id)
{
    var html=spajs.just.render('branch_input', {item_id:item_id, pmObj:pmProjects});
    return html;
}

tabSignal.connect("polemarch.start", function()
{
    // projects
    spajs.addMenu({
        id:"projects",
        urlregexp:[/^projects$/, /^projects\/search\/?$/, /^project$/, /^projects\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.showUpdatedList(holder, menuInfo, data);},
        onClose:function(){return pmProjects.stopUpdates();},
    })

    spajs.addMenu({
        id:"projects-search",
        urlregexp:[/^projects\/search\/([A-z0-9 %\-.:,=]+)$/, /^projects\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"project",
        urlregexp:[/^project\/([0-9]+)$/, /^projects\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openItem(holder, menuInfo, data);},
        onClose:function(){return pmHistory.stopUpdates();},
    })

    spajs.addMenu({
        id:"newProject",
        urlregexp:[/^new-project$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openNewItemPage(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"project-run-playbook",
        urlregexp:[/^project\/([0-9]+)\/playbook\/run$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openRunPlaybookPage(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"project-ansible-module-run",
        urlregexp:[/^project\/([0-9]+)\/ansible-module\/run$/],
        onOpen:function(holder, menuInfo, data){return pmAnsibleModule.showInProject(holder, menuInfo, data);}
    })
})