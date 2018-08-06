

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.owner", function(data)
{
    apiowner.view.defaultName = "username"
})

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.user", function(data)
{
    apiowner.view.defaultName = "username"
})

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.variables", function(data)
{
    apiowner.view.defaultName = "key"
})

tabSignal.connect("openapi.factory.history", function(data)
{
    apihistory.one.loadLines = function(item_id, opt)
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
            url: hostname + "/api/v2/history/"+item_id+"/lines/",
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
                    var line_number = data.results[i].line_gnumber

                    if(pmHistory.model.items[item_id].stdout_maxline < line_number)
                    {
                        pmHistory.model.items[item_id].stdout_maxline = line_number;
                    }

                    if(pmHistory.model.items[item_id].stdout_minline > line_number)
                    {
                        pmHistory.model.items[item_id].stdout_minline = line_number;
                    }

                    if(!pmHistory.model.items[item_id].stdout[line_number])
                    {
                        pmHistory.model.items[item_id].stdout[line_number] = {id:line_number, text:data.results[i].line}
                    }
                    else {
                        pmHistory.model.items[item_id].stdout[line_number].text = data.results[i].line + pmHistory.model.items[item_id].stdout[line_number].text
                    }
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
    
    apihistory.one.scrollBottom = function()
    {
        jQuery('#history-stdout').scrollTop(9999999);
    }
    
    apihistory.one.loadNewLines = function(item_id, last_stdout_maxline)
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
    

    apihistory.one.stopUpdates = function()
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
    apihistory.one.Syntax = function(code)
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
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    apihistory.one.getLine = function(item_id, line_id)
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
    
    
    apihistory.one.bindStdoutUpdates = function(item_id)
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
    
    apihistory.one.cancelTask = function(item_id)
    {
        return spajs.ajax.Call({
            url: hostname + "/api/v2/history/"+item_id+"/cancel/",
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

    apihistory.one.clearOutput = function(item_id)
    {
        return spajs.ajax.Call({
            url: hostname + "/api/v2/history/"+item_id+"/clear/",
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

    apihistory.one.renderAsPage = function ()
    {
        var thisObj = this;
        var tpl = thisObj.view.bulk_name + '_one'
        if (!spajs.just.isTplExists(tpl))
        {
            tpl = 'entity_one'
        }
        
        if (this.model.data.inventory != null) 
        {
            let inventory = new apiinventory.one()
            
            var promiss = inventory.load(this.model.data.inventory);
            
            $.when(promiss).done(function () {
                $(holder).insertTpl(spajs.just.render(thisObj.model.name + '_page', {item_id: item_id, project_id: 0}))
                pmHistory.bindStdoutUpdates(item_id)
            }).fail(function () {
                $.notify("", "error");
            });
            
            return;
        } 
        

        debugger; // ABD
        return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
    }
})
