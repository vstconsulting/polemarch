
var pmHistory = inheritance(pmItems)

pmHistory.model.name = "history"
pmHistory.model.bulk_name = "history"
pmHistory.model.linePerPage = 130;
pmHistory.justDeepWatch('model');
pmHistory.model.className = "pmHistory"

pmHistory.cancelTask = function(item_id)
{
    return spajs.ajax.Call({
        url: "/api/v1/history/"+item_id+"/cancel/",
        type: "POST",
        contentType:'application/json',
        success: function(data)
        {
            $.notify("Task canceled!", "warning");
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    })
}


pmHistory.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;

    var limit = this.pageSize;

    if(data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize*(data.reg[2] - 1);
    } else {
        offset=0;
    }

    var search = this.searchStringToObject(decodeURIComponent(data.reg[1]), 'mode')
    return $.when(this.sendSearchQuery(search,limit,offset)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.search = function(query, options)
{
    if(options.inventory_id)
    {
        if(this.isEmptySearchQuery(query))
        {
            return spajs.open({ menuId:'inventory/' + options.inventory_id +"/" + this.model.name, reopen:true});
        }

        return spajs.open({ menuId:'inventory/' + options.inventory_id +"/" + this.model.name+"/search/"+this.searchObjectToString(trim(query), 'mode'), reopen:true});
    }
    else if(options.project_id)
    {
        if(this.isEmptySearchQuery(query))
        {
            return spajs.open({ menuId:'project/' + options.project_id +"/" + this.model.name, reopen:true});
        }

        return spajs.open({ menuId:'project/' + options.project_id +"/" + this.model.name+"/search/"+this.searchObjectToString(trim(query), 'mode'), reopen:true});
    }
    else if(this.isEmptySearchQuery(query))
    {
        return spajs.open({ menuId:this.model.name, reopen:true});
    }

    return spajs.open({ menuId:this.model.name+"/search/"+this.searchObjectToString(trim(query)), reopen:true});
}


pmHistory.showListInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize*(data.reg[2] - 1);
    }
    var project_id = data.reg[1];

    return $.when(this.sendSearchQuery({project:project_id}, limit, offset), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_listInProjects', {query:"", project_id:project_id}))
        thisObj.model.selectedCount = $('.multiple-select .selected').length;
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.showListInInventory = function(holder, menuInfo, data)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize*(data.reg[2] - 1);
    }
    var inventory_id = data.reg[1];

    return $.when(this.sendSearchQuery({inventory:inventory_id}, limit, offset), pmInventories.loadItem(inventory_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_listInInventory', {query:"", inventory_id:inventory_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.showSearchResultsInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1];

    var search = this.searchStringToObject(decodeURIComponent(data.reg[2]), 'mode')
    search['project'] = project_id

    return $.when(this.sendSearchQuery(search), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_listInProjects', {query:decodeURIComponent(data.reg[2]), project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}


pmHistory.showItem = function(holder, menuInfo, data)
{
    var thisObj = this;
    //console.log(menuInfo, data)

    var item_id = data.reg[1];
    return $.when(this.loadItem(item_id)).done(function()
    {
        if(pmHistory.model.items[item_id].initiator > 0 )
        {
            pmUsers.loadItem(pmHistory.model.items[item_id].initiator);
        }


        if (pmHistory.model.items[item_id].inventory != null) {
            var promiss = pmInventories.loadItem(pmHistory.model.items[item_id].inventory);
            $.when(promiss).done(function () {
                $(holder).insertTpl(spajs.just.render(thisObj.model.name + '_page', {item_id: item_id, project_id: 0}))
                pmHistory.bindStdoutUpdates(item_id)
            }).fail(function () {
                $.notify("", "error");
            });
        } else {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name + '_page', {item_id: item_id, project_id: 0}))
            pmHistory.bindStdoutUpdates(item_id)
        }



    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.showItemInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    //console.log(menuInfo, data)
    var project_id = data.reg[1];
    var item_id = data.reg[2];
    return $.when(this.loadItem(item_id), pmProjects.loadItem(project_id)).done(function()
    {
        if(pmHistory.model.items[item_id].initiator > 0 )
        {
            pmUsers.loadItem(pmHistory.model.items[item_id].initiator);
        }

        if (pmHistory.model.items[item_id].inventory != null) {
            var promiss = pmInventories.loadItem(pmHistory.model.items[item_id].inventory);
            $.when(promiss).done(function () {
                $(holder).insertTpl(spajs.just.render(thisObj.model.name + '_page', {item_id: item_id, project_id: 0}))
                pmHistory.bindStdoutUpdates(item_id)
            }).fail(function () {
                $.notify("", "error");
            });
        } else {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name + '_page', {item_id: item_id, project_id: 0}))
            pmHistory.bindStdoutUpdates(item_id)
        }

        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_pageInProjects', {item_id:item_id, project_id:project_id}))
        pmHistory.bindStdoutUpdates(item_id)
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.bindStdoutUpdates = function(item_id)
{
    var thisObj = this;
    $.when(this.loadNewLines(item_id, 0)).always(function()
    {
        var content = $('#history-stdout')
        content.scroll(function()
        {
            // End of the document reached?
            if (content.scrollTop() < 150)
            {
                if(thisObj.stdout_minline <= 1)
                {
                    return;
                }

                if(thisObj.inLoadTopData)
                {
                    return;
                }

                //pmHistory.lastContentScrollHeight = $('#history-stdout').prop('scrollHeight') - content.scrollTop() + 100;

                var stdout_minline = thisObj.model.items[item_id].stdout_minline;
                if(stdout_minline <= 1)
                {
                    return;
                }

                thisObj.inLoadTopData = true;
                $.when(thisObj.loadLines(item_id, {before:stdout_minline, limit:thisObj.model.linePerPage})).always(function()
                {
                    var history_stdout = $("#history-stdout");
                    if(!history_stdout || !history_stdout.length)
                    {
                        return;
                    }

                    for(var i = stdout_minline-1; i > stdout_minline - thisObj.model.linePerPage; i = i -1)
                    {
                        if(thisObj.model.items[item_id].stdout[i] != undefined)
                        {
                            history_stdout.prepend(pmHistory.getLine(item_id, i))
                        }
                    }

                    thisObj.inLoadTopData = false;
                    if(content.scrollTop() < 10)
                    {
                        content.scrollTop(20)
                    }
                })
            }
        });
    });
}

/**
 * Обновляет поле модел this.model.items[item_id] и ложит туда пользователя
 */
pmHistory.loadItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "GET",
        contentType:'application/json',
        data: "",
        success: function(data)
        {
            if(!thisObj.model.items[item_id])
            {
                thisObj.model.items[item_id] = {}
            }

            for(var i in data)
            {
                thisObj.model.items[item_id][i] = data[i]
            }

            var promise = undefined;

            if(data.initiator_type == 'scheduler')
            {
                promise = pmPeriodicTasks.loadItemsByIds([data.initiator])
            }

            if(data.initiator_type == 'users')
            {
                promise = pmUsers.loadItemsByIds([data.initiator])
            }

            pmHistory.model.items.justWatch(item_id);

            $.when(pmProjects.loadItem(data.project), promise).always(function(){
                def.resolve(data)
            })
        },
        error:function(e)
        {
            console.warn("pmHistory.loadItem", e)
            polemarch.showErrors(e)
            def.reject(e)
        }
    });

    return def.promise();
}

pmHistory.sendSearchQuery = function(query, limit, offset)
{
    if(!limit)
    {
        limit = 999;
    }

    if(!offset)
    {
        offset = 0;
    }

    var q = [];
    for(var i in query)
    {
        q.push(encodeURIComponent(i)+"="+encodeURIComponent(query[i]))
    }

    var def = new $.Deferred();
    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/?"+q.join('&'),
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
        success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            var projects = [];
            var usersIds = [];
            var periodicTasks = [];

            for(var i in data.results)
            {
                var val = data.results[i]

                thisObj.model.items[val.id] = val

                if(val.project && !pmProjects.model.items[val.project] && $.inArray(val.project, projects) == -1)
                {
                    projects.push(val.project)
                }

                if(val.initiator > 0 && val.initiator_type == 'users' && $.inArray(val.initiator, usersIds) == -1)
                {
                    usersIds.push(val.initiator);
                }
                else if(val.initiator > 0 && val.initiator_type == 'scheduler' && $.inArray(val.initiator, periodicTasks) == -1)
                {
                    periodicTasks.push(val.initiator);
                }
            }

            var users_promise = undefined;
            var projects_promise = undefined;
            var periodicTasks_promise = undefined;

            if(periodicTasks.length)
            {
                periodicTasks_promise = pmPeriodicTasks.loadItemsByIds(periodicTasks)
            }

            if(usersIds.length)
            {
                users_promise = pmUsers.loadItemsByIds(usersIds)
            }

            if(projects.length)
            {
                projects_promise = pmProjects.sendSearchQuery({id:projects.join(',')})
            }

            $.when(users_promise, projects_promise, periodicTasks_promise).done(function(){
                def.resolve(data)
            })
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject(e)
        }
    });

    return def.promise();
}

/**
 *Функция проверяет, произошло ли изменение в количестве записей в истории.
 *Если изменения произошли, то она обновляет соответствующее свойство в объекте this.model
 */

pmHistory.ifIncreaseTotalCount = function()
{
    var def = new $.Deferred();
    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/history",
        type: "GET",
        contentType:'application/json',
        data: "limit=1&rand="+Math.random(),
        success: function(data)
        {
            var totalCount=data.count;
            //console.log("new totalCount="+totalCount, "old totalCount="+thisObj.model.totalCount);
            if(thisObj.model.totalCount!=totalCount)
            {
                thisObj.model.totalCount=totalCount;
                def.resolve();
            }
            else
            {
                def.reject();
            }

        },
        error: function (){
            def.reject();
        }
    });
    return def.promise();
}

/**
 *Функция обновляет список записей в истории каждые 5 секунд.
 *Если произошли изменения в количестве записей в списке,
 *то содержимое страницы обновляется.
 */

pmHistory.updateList = function (updated_ids)
{
    var thisObj = this;
    return $.when(this.loadItemsByIds(updated_ids)).always(function ()
    {
        if (thisObj.model.updateTimeoutId)
        {
            clearTimeout(thisObj.model.updateTimeoutId)
        }

        thisObj.model.updateTimeoutId = setTimeout(function () {
            thisObj.updateList(updated_ids)
        }, 5001)

        $.when(pmHistory.ifIncreaseTotalCount()).done(function() {
            spajs.openMenuFromUrl();
        })
    }).promise()
}



/**
 * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
 * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
 */
pmHistory.loadItems = function(limit, offset)
{
    if(!limit)
    {
        limit = 30;
    }

    if(!offset)
    {
        offset = 0;
    }

    var def = new $.Deferred();
    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/",
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
        success: function(data)
        {

            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}
            //////
            thisObj.model.totalCount=data.count;
            //console.log(thisObj.model);
            ////////
            var projects = [];
            var usersIds = [];
            var periodicTasks = [];

            for(var i in data.results)
            {
                var val = data.results[i]

                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)

                if(val.project && !pmProjects.model.items[val.project] && $.inArray(val.project, projects) == -1)
                {
                    projects.push(val.project)
                }

                if(val.initiator > 0 && val.initiator_type == 'users' && $.inArray(val.initiator, usersIds) == -1)
                {
                    usersIds.push(val.initiator);
                }
                else if(val.initiator > 0 && val.initiator_type == 'scheduler' && $.inArray(val.initiator, periodicTasks) == -1)
                {
                    periodicTasks.push(val.initiator);
                }
            }

            var users_promise = undefined;
            var projects_promise = undefined;
            var periodicTasks_promise = undefined;

            if(periodicTasks.length)
            {
                periodicTasks_promise = pmPeriodicTasks.loadItemsByIds(periodicTasks)
            }

            if(usersIds.length)
            {
                users_promise = pmUsers.loadItemsByIds(usersIds)
            }

            if(projects.length)
            {
                projects_promise = pmProjects.sendSearchQuery({id:projects.join(',')})
            }

            $.when(users_promise, projects_promise, periodicTasks_promise).always(function(){
                def.resolve(data)
            })
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject(e)
        }
    });

    return def.promise();
}

pmHistory.stopUpdates = function()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;

    clearTimeout(this.model.loadNewLines_timeoutId)
    this.model.loadNewLines_timeoutId = undefined;
}

/**
 * Подсветка синтаксиса
 * @link https://habrahabr.ru/post/43030/
 *
 * @param {String} code
 * @returns {String}
 */
pmHistory.Syntax = function(code)
{
    var comments	= [];	// Тут собираем все каменты
    var strings		= [];	// Тут собираем все строки
    var res			= [];	// Тут собираем все RegExp
    var all			= { 'C': comments, 'S': strings, 'R': res };
    var safe		= { '<': '<', '>': '>', '&': '&' };

    var ansi_up = new AnsiUp;
    ansi_up.use_classes = true;
    var html = ansi_up.ansi_to_html(code);
    return html
    // Табуляцию заменяем неразрывными пробелами
        .replace(/\t/g,
            '&nbsp;&nbsp;&nbsp;&nbsp;');
}

pmHistory.getLine = function(item_id, line_id)
{
    var line = this.model.items[item_id].stdout[line_id]
    if(/^fatal:/.test(line.text))
    {
        line.fatal = 'fatal';
    }
    else
    {
        line.fatal = '';
    }

    return spajs.just.render(this.model.name+'_stdout_line', {line:line})
}

pmHistory.loadNewLines = function(item_id, last_stdout_maxline)
{
    var thisObj = this;

    if(last_stdout_maxline === undefined)
    {
        last_stdout_maxline = this.model.items[item_id].stdout_maxline;
    }

    if(!last_stdout_maxline)
    {
        last_stdout_maxline = 0;
    }

    return $.when(this.loadItem(item_id), this.loadLines(item_id, {after:last_stdout_maxline, limit:pmHistory.model.linePerPage})).always(function()
    {
        var addData = false;
        var history_stdout = $("#history-stdout");
        if(!history_stdout || !history_stdout.length)
        {
            return;
        }

        var needScrollDowun = $('#history-stdout').prop('scrollHeight') - $('#history-stdout').scrollTop() -  history_stdout.css('height').replace("px", "")/1 < 100

        if(last_stdout_maxline == 0)
        {
            for(var i in thisObj.model.items[item_id].stdout)
            {
                if(thisObj.model.items[item_id].stdout[i] != undefined)
                {
                    history_stdout.append(pmHistory.getLine(item_id, i))
                    addData = true;
                }
            }
        }
        else
        {
            for(var i = last_stdout_maxline+1; i <= thisObj.model.items[item_id].stdout_maxline; i++)
            {
                if(thisObj.model.items[item_id].stdout[i] != undefined)
                {
                    history_stdout.append(pmHistory.getLine(item_id, i))
                    addData = true;
                }
            }
        }


        if( addData && needScrollDowun)
        {
            // Прокручиваем в низ только если и так скрол был не сильно приподнят
            thisObj.scrollBottom()
        }

        if(thisObj.model.items[item_id].status == 'RUN' || thisObj.model.items[item_id].status == 'DELAY')
        {
            thisObj.loadNewLines_timeoutId = setTimeout(function(){
                thisObj.loadNewLines(item_id)
            }, 5001)
        }
    }).promise()
}

pmHistory.scrollBottom = function()
{
    jQuery('#history-stdout').scrollTop(9999999);
}
/**
 * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
 * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
 */
pmHistory.loadLines = function(item_id, opt)
{
    if(!opt.limit)
    {
        opt.limit = 30;
    }

    if(!opt.offset)
    {
        opt.offset = 0;
    }

    opt.format = 'json';

    var def = new $.Deferred();
    spajs.ajax.Call({
        url: "/api/v1/history/"+item_id+"/lines/",
        type: "GET",
        contentType:'application/json',
        data: opt,
        success: function(data)
        {
            if(!pmHistory.model.items[item_id].stdout)
            {
                pmHistory.model.items[item_id].stdout = {}
                pmHistory.model.items[item_id].stdout_count = 0
                pmHistory.model.items[item_id].stdout_maxline = 0
                pmHistory.model.items[item_id].stdout_minline = 999999999
            }

            pmHistory.model.items[item_id].stdout_count = data.count;
            for(var i in data.results)
            {
                var line_number = data.results[i].line_number

                if(pmHistory.model.items[item_id].stdout_maxline < line_number)
                {
                    pmHistory.model.items[item_id].stdout_maxline = line_number;
                }

                if(pmHistory.model.items[item_id].stdout_minline > line_number)
                {
                    pmHistory.model.items[item_id].stdout_minline = line_number;
                }

                pmHistory.model.items[item_id].stdout[line_number] = {id:line_number, text:data.results[i].line}
            }

            def.resolve()

        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject(e)
        }
    });

    return def.promise();
}

/////////////////////////////////
pmHistory.clearLogs=function(item_id)
{
    return spajs.ajax.Call({
        url: "/api/v1/history/"+item_id+"/clear/",
        type: "DELETE",
        contentType:'application/json',
        success: function(data)
        {
            $.notify("Output trancated", "success");
            pmHistory.model.items[item_id].stdout={};
            spajs.openURL(window.location.href);
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
}

pmHistory.hideClearLogsButton=function()
{
    if($('button').is('#clear_logs'))
    {
        $("#clear_logs").slideToggle();
    }
}
/////////////////////////////////
tabSignal.connect("polemarch.start", function()
{
    // history
    spajs.addMenu({
        id:"history",
        urlregexp:[/^history$/, /^history\/search\/?$/, /^history\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showUpdatedList(holder, menuInfo, data);},
        onClose:function(){return pmHistory.stopUpdates();},
    })

    spajs.addMenu({
        id:"history-search",
        urlregexp:[/^history\/search\/([A-z0-9 %\-.:,=]+)$/, /^history\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"history-item",
        urlregexp:[/^history\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showItem(holder, menuInfo, data);},
        onClose:function(){return pmHistory.stopUpdates();}
    })

    spajs.addMenu({
        id:"history-item-in-project",
        urlregexp:[/^project\/([0-9]+)\/history\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showItemInProjects(holder, menuInfo, data);},
        onClose:function(){return pmHistory.stopUpdates();}
    })

    spajs.addMenu({
        id:"project-history",
        urlregexp:[/^project\/([0-9]+)\/history$/, /^project\/([0-9]+)\/history\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){
            return pmHistory.showUpdatedList(holder, menuInfo, data, "showListInProjects", function(menuInfo, data)
            {
                var offset = 0
                var limit = pmHistory.pageSize;
                if(data.reg && data.reg[2] > 0)
                {
                    offset = pmHistory.pageSize*(data.reg[2] - 1);
                }
                var project_id = data.reg[1];

                return pmHistory.sendSearchQuery({project:project_id}, limit, offset)
            });
        },
        onClose:function(){return pmHistory.stopUpdates();},
    })

    spajs.addMenu({
        id:"project-history-search",
        urlregexp:[/^project\/([0-9]+)\/history\/search\/([A-z0-9 %\-.:,=]+)$/,/^project\/([0-9]+)\/history\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showSearchResultsInProjects(holder, menuInfo, data);}
    })

})