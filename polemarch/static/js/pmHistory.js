
tabSignal.connect("openapi.factory.history", function(data)
{
    //apihistory.view.defaultName = ''

    apihistory.one.loadLines = function(item_id, opt)
    {
        var thisObj = this;
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
                if(!thisObj.model.data.stdout)
                {
                    thisObj.model.data.stdout = {}
                    thisObj.model.data.stdout_count = 0
                    thisObj.model.data.stdout_maxline = 0
                    thisObj.model.data.stdout_minline = 999999999
                }

                thisObj.model.data.stdout_count = data.count;
                for(var i in data.results)
                {
                    var line_number = data.results[i].line_gnumber

                    if(thisObj.model.data.stdout_maxline < line_number)
                    {
                        thisObj.model.data.stdout_maxline = line_number;
                    }

                    if(thisObj.model.data.stdout_minline > line_number)
                    {
                        thisObj.model.data.stdout_minline = line_number;
                    }

                    if(!thisObj.model.data.stdout[line_number])
                    {
                        thisObj.model.data.stdout[line_number] = {id:line_number, text:data.results[i].line}
                    }
                    else {
                        thisObj.model.data.stdout[line_number].text = data.results[i].line + thisObj.model.data.stdout[line_number].text
                    }
                }

                def.resolve()

            },
            error:function(e)
            {
                console.warn(e)
                webGui.showErrors(e)
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
            last_stdout_maxline = thisObj.model.data.stdout_maxline;
        }

        if(!last_stdout_maxline)
        {
            last_stdout_maxline = 0;
        }

        return $.when(this.load(item_id), this.loadLines(item_id, {after:last_stdout_maxline, limit:30})).always(function()
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
                for(var i in thisObj.model.data.stdout)
                {
                    if(thisObj.model.data.stdout[i] != undefined)
                    {
                        history_stdout.append(thisObj.getLine(item_id, i))
                        addData = true;
                    }
                }
            }
            else
            {
                for(var i = last_stdout_maxline+1; i <= thisObj.model.data.stdout_maxline; i++)
                {
                    if(thisObj.model.data.stdout[i] != undefined)
                    {
                        history_stdout.append(thisObj.getLine(item_id, i))
                        addData = true;
                    }
                }
            }


            if( addData && needScrollDowun)
            {
                // Прокручиваем в низ только если и так скрол был не сильно приподнят
                thisObj.scrollBottom()
            }

            if(thisObj.model.data.status == 'RUN' || thisObj.model.data.status == 'DELAY')
            {
                thisObj.loadNewLines_timeoutId = setTimeout(function(){
                    thisObj.loadNewLines(item_id)
                }, 5001)
            }
        }).promise()
    }


    apihistory.one.stopUpdates = function()
    {
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
        var line = thisObj.model.data.stdout[line_id]
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
        tabSignal.once("spajs.open", function(){
            thisObj.stopUpdates()
        })

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

                    //thisObj.lastContentScrollHeight = $('#history-stdout').prop('scrollHeight') - content.scrollTop() + 100;

                    var stdout_minline = thisObj.model.data.stdout_minline;
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
                            if(thisObj.model.data.stdout[i] != undefined)
                            {
                                history_stdout.prepend(thisObj.getLine(item_id, i))
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
        var thisObj = this;
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
                webGui.showErrors(e.responseJSON)
            }
        })
    }

    apihistory.one.clearOutput = function(item_id)
    {
        var thisObj = this;
        return spajs.ajax.Call({
            url: hostname + "/api/v2/history/"+item_id+"/clear/",
            type: "DELETE",
            contentType:'application/json',
            success: function(data)
            {
                $.notify("Output trancated", "success");
                thisObj.model.data.stdout={};
                spajs.openURL(window.location.href);
            },
            error:function(e)
            {
                webGui.showErrors(e.responseJSON)
            }
        });
    }

    apihistory.one.renderAsPage = function ()
    {
        var tpl = this.view.bulk_name + '_one';
        if (!spajs.just.isTplExists(tpl))
        {
            tpl = 'entity_one'
        }

        this.bindStdoutUpdates(this.model.data.id);
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: {}});
    }

    // Переопределяет список полей которые будут показаны в списке истории
    apihistory.list.getFieldsFor_renderAsPage = function()
    {
        let fields = []
        for(let i in this.model.fields)
        {
            let val = this.model.fields[i]

            if($.inArray(val.name, ['id', 'mode', 'kind', 'status']) != -1)
            {
                fields.push(val)
            }
        }

        return fields;
    }
})


tabSignal.connect("openapi.loaded", function()
{
    let definitions = window.api.openapi.definitions;
    var executor_prefetch = {
        path: function (obj) {
            return "/user/";
        }
    };
    var inventory_prefetch = {
        path: function (obj) {
            return "/inventory/";
        }
    };
    var project_prefetch = {
        path: function (obj) {
            return "/project/";
        }
    };
    var initiator_prefetch = {
        path: function (obj) {
            if (obj.initiator_type == 'project') {
                return "/project/";
            }
            else if (obj.initiator_type == 'template') {
                return "/project/" + obj["project"] + "/template";

            }
            else {
                return false;
                return "/project/";
            }
        }
    };

    var initiator_prefetch = {
        path: function (obj) {
            if(obj.initiator_type == 'project')
            {
                return "/project/";
            }
            else if(obj.initiator_type == 'template')
            {
                return "/project/"+obj["project"]+"/template/";
            }
            else
            {
                return false;
            }
        }
    };
    var prefetch_definitions = ['History', 'OneHistory', 'ProjectHistory'];
    prefetch_definitions.forEach(function (value) {
        if (definitions[value] && definitions[value].properties['executor']) {
            definitions[value].properties['executor']['prefetch'] = executor_prefetch
        }
        if (definitions[value] && definitions[value].properties['initiator']) {
            definitions[value].properties['initiator']['prefetch'] = initiator_prefetch
        }
        if (definitions[value] && definitions[value].properties['inventory']) {
            definitions[value].properties['inventory']['prefetch'] = inventory_prefetch
        }
        if (definitions[value] && definitions[value].properties['project']) {
            definitions[value].properties['project']['prefetch'] = project_prefetch
        }
    });

    if (definitions['ProjectHistory'] && definitions['ProjectHistory'].properties['initiator']) {
        definitions['ProjectHistory'].properties['initiator']['prefetch'] =  {
            path: function (obj) {
                if(obj.initiator_type == 'project')
                {
                    return "/project/";
                }
                else if(obj.initiator_type == 'template')
                {
                    var project_id = spajs.urlInfo.data.reg.parent_id;
                    return "/project/"+project_id+"/template/";
                }
                else
                {
                    return false;
                }
            }
        };
    }

    definitions['OneHistory'].properties['execute_args'].format = 'json';
});