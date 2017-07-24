
var pmHistory = new pmItems()

pmHistory.model.name = "history"
pmHistory.model.linePerPage = 130;
pmHistory.justDeepWatch('model');

pmHistory.cancelTask = function(item_id)
{
    return $.ajax({
        url: "/api/v1/history/"+item_id+"/cancel/",
        type: "POST",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            $.notify("Task cenceled!", "warning");
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
    return $.when(this.sendSearchQuery({playbook:decodeURIComponent(data.reg[1])})).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.search = function(project_id, query)
{
    if(!project_id)
    {
        if(!query || !trim(query))
        {
            return spajs.open({ menuId:this.model.name, reopen:true});
        }

        return spajs.open({ menuId:this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
    }

    if(!query || !trim(query))
    {
        return spajs.open({ menuId:'project/' + project_id +"/" + this.model.name, reopen:true});
    }

    return spajs.open({ menuId:'project/' + project_id +"/" + this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
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
        $(holder).html(spajs.just.render(thisObj.model.name+'_listInProjects', {query:"", project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.showSearchResultsInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1];
    return $.when(this.sendSearchQuery({playbook: decodeURIComponent(data.reg[2]), project:project_id}), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_listInProjects', {query:decodeURIComponent(data.reg[2]), project_id:project_id}))
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
        $(holder).html(spajs.just.render(thisObj.model.name+'_page', {item_id:item_id, project_id:0}))
        pmHistory.bindStdoutUpdates(item_id)
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
        $(holder).html(spajs.just.render(thisObj.model.name+'_pageInProjects', {item_id:item_id, project_id:project_id}))
        pmHistory.bindStdoutUpdates(item_id)
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.bindStdoutUpdates = function(item_id)
{
    var thisObj = this;
    $.when(this.loadNewLines(item_id)).always(function()
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
                    for(var i = stdout_minline-1; i > stdout_minline - thisObj.model.linePerPage; i = i -1)
                    {
                        if(thisObj.model.items[item_id].stdout[i] != undefined)
                        {
                            $("#history-stdout").prepend(pmHistory.getLine(item_id, i))
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

    jQuery.ajax({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "GET",
        contentType:'application/json',
        data: "",
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            data.test = Math.random();

            
            if(!thisObj.model.items[item_id])
            {
                thisObj.model.items[item_id] = {}
            }
            
            for(var i in data)
            {
                thisObj.model.items[item_id][i] = data[i]
            }
            
            pmHistory.model.items.justWatch(item_id); 

            $.when(pmProjects.loadItem(data.project)).done(function(){
                def.resolve()
            }).fail(function(){
                def.reject()
            })
        },
        error:function(e)
        {
            console.warn("pmHistory.loadItem", e)
            polemarch.showErrors(e)
            def.reject()
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
    jQuery.ajax({
        url: "/api/v1/"+this.model.name+"/?"+q.join('&'),
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            var projects = [];
            for(var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items[val.id] = val

                if(!pmProjects.model.items[val.project] && projects.indexOf(val.project) == -1)
                {
                    projects.push(val.project)
                }
            }

            $.when(pmProjects.sendSearchQuery({id:projects.join(',')})).done(function(){
                def.resolve()
            }).fail(function(){
                def.reject()
            })
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject()
        }
    });

    return def.promise();
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
    jQuery.ajax({
        url: "/api/v1/"+this.model.name+"/",
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            var projects = [];
            for(var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)

                if(!pmProjects.model.items[val.project] && projects.indexOf(val.project) == -1)
                {
                    projects.push(val.project)
                }
            }

            $.when(pmProjects.sendSearchQuery({id:projects.join(',')})).done(function(){
                def.resolve()
            }).fail(function(){
                def.reject()
            })
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject()
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

pmHistory.Syntax = function(code)
{
	var comments	= [];	// Тут собираем все каменты
	var strings		= [];	// Тут собираем все строки
	var res			= [];	// Тут собираем все RegExp
	var all			= { 'C': comments, 'S': strings, 'R': res };
	var safe		= { '<': '<', '>': '>', '&': '&' };

	return code
	// Маскируем HTML
		.replace(/[<>&]/g, function (m)
			{ return safe[m]; })
	// Убираем каменты
		.replace(/\/\*[\s\S]*\*\//g, function(m)
			{ var l=comments.length; comments.push(m); return '~~~C'+l+'~~~';   })
		.replace(/([^\\])\/\/[^\n]*\n/g, function(m, f)
			{ var l=comments.length; comments.push(m); return f+'~~~C'+l+'~~~'; })
	// Убираем regexp
		.replace(/\/(\\\/|[^\/\n])*\/[gim]{0,3}/g, function(m)
			{ var l=res.length; res.push(m); return '~~~R'+l+'~~~';   })
	// Убираем строки
		.replace(/([^\\])((?:'(?:\\'|[^'])*')|(?:"(?:\\"|[^"])*"))/g, function(m, f, s)
			{ var l=strings.length; strings.push(s); return f+'~~~S'+l+'~~~'; })
	// Выделяем ключевые слова
		.replace(/(var|function|typeof|new|return|if|for|in|while|break|do|continue|switch|case)([^a-z0-9\$_])/gi,
			'<span class="kwrd">$1</span>$2')
	// Выделяем скобки
		.replace(/(\{|\}|\]|\[|\|)/gi,
			'<span class="gly">$1</span>')
	// Выделяем имена функций
		.replace(/([a-z\_\$][a-z0-9_]*)[\s]*\(/gi,
			'<span class="func">$1</span>(')
	// Возвращаем на место каменты, строки, RegExp
		.replace(/~~~([CSR])(\d+)~~~/g, function(m, t, i)
			{ return '<span class="'+t+'">'+all[t][i]+'</span>'; })
	// Выставляем переводы строк
		.replace(/\n/g,
			'<br/>')
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

pmHistory.loadNewLines = function(item_id)
{
    var thisObj = this;
    var last_stdout_maxline = this.model.items[item_id].stdout_maxline;
    if(!last_stdout_maxline)
    {
        last_stdout_maxline = 0;
    }

    return $.when(this.loadItem(item_id), this.loadLines(item_id, {after:last_stdout_maxline, limit:pmHistory.model.linePerPage})).always(function()
    {
        var addData = false;
        var needScrollDowun = $('#history-stdout').prop('scrollHeight') - $('#history-stdout').scrollTop() -  $("#history-stdout").css('height').replace("px", "")/1 < 100

        if(last_stdout_maxline == 0)
        {
            for(var i in thisObj.model.items[item_id].stdout)
            {
                if(thisObj.model.items[item_id].stdout[i] != undefined)
                {
                    $("#history-stdout").append(pmHistory.getLine(item_id, i))
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
                    $("#history-stdout").append(pmHistory.getLine(item_id, i))
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
            }, 1000)
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
    jQuery.ajax({
        url: "/api/v1/history/"+item_id+"/lines/",
        type: "GET",
        contentType:'application/json',
        data: opt,
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
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
            def.reject()
        }
    });

    return def.promise();
}
