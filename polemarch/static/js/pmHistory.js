
gui_history = {

    loadLines : function(item_id, opt)
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

        let query = {
            method: "get",
            data_type: ["history", item_id, "lines"],
            filters:"limit="+opt.limit+"&offset="+opt.offset
        }

        if(opt.before !== undefined)
        {
            query.filters += "&before="+opt.before;
        }
        else if(!opt.after !== undefined)
        {
            query.filters += "&after="+opt.after;
        }

        let def = new $.Deferred();
        $.when(api.query(query)).done(function(data)
        {
            data = data.data
            if(!thisObj.model.lines_data)
            {
                thisObj.model.lines_data = {}
            }
            if(!thisObj.model.lines_data.stdout)
            {
                thisObj.model.lines_data.stdout = {}
                thisObj.model.lines_data.stdout_count = 0
                thisObj.model.lines_data.stdout_maxline = 0
                thisObj.model.lines_data.stdout_minline = 999999999
            }

            thisObj.model.lines_data.stdout_count = data.count;
            for(var i in data.results)
            {
                var line_number = data.results[i].line_gnumber

                if(thisObj.model.lines_data.stdout_maxline < line_number)
                {
                    thisObj.model.lines_data.stdout_maxline = line_number;
                }

                if(thisObj.model.lines_data.stdout_minline > line_number)
                {
                    thisObj.model.lines_data.stdout_minline = line_number;
                }

                if(!thisObj.model.lines_data.stdout[line_number])
                {
                    thisObj.model.lines_data.stdout[line_number] = {id:line_number, text:data.results[i].line}
                }
                else {
                    thisObj.model.lines_data.stdout[line_number].text = data.results[i].line + thisObj.model.lines_data.stdout[line_number].text
                }
            }

            def.resolve()
        }).fail(function(e){
            console.warn(e)
            webGui.showErrors(e)
            def.reject(e)
        })

        return def.promise();
    },

    scrollBottom : function()
    {
        jQuery('#history-stdout').scrollTop(9999999);
    },

    linePerPage:1000,
    loadNewLines : function(item_id, last_stdout_maxline)
    {
        var thisObj = this;

        if(last_stdout_maxline === undefined)
        {
            last_stdout_maxline = thisObj.model.lines_data.stdout_maxline;
        }

        if(!last_stdout_maxline)
        {
            last_stdout_maxline = 0;
        }

        return $.when(this.load(item_id), this.loadLines(item_id, {after:last_stdout_maxline, limit:this.linePerPage})).always(function()
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
                for(var i in thisObj.model.lines_data.stdout)
                {
                    if(thisObj.model.lines_data.stdout[i] != undefined)
                    {
                        history_stdout.append(thisObj.getLine(item_id, i))
                        addData = true;
                    }
                }
            }
            else
            {
                for(var i = last_stdout_maxline+1; i <= thisObj.model.lines_data.stdout_maxline; i++)
                {
                    if(thisObj.model.lines_data.stdout[i] != undefined)
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
                }, guiLocalSettings.get('page_update_interval'))
            }
        }).promise()
    },

    /**
     * Подсветка синтаксиса
     * @link https://habrahabr.ru/post/43030/
     *
     * @param {String} code
     * @returns {String}
     */
    Syntax : function(code)
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
    },

    getLine : function(item_id, line_id)
    {
        var line = this.model.lines_data.stdout[line_id]
        if(/^fatal:/.test(line.text))
        {
            line.fatal = 'fatal';
        }
        else
        {
            line.fatal = '';
        }

        return spajs.just.render(this.api.bulk_name+'_stdout_line', {line:line, guiObj:this})
    },


    bindStdoutUpdates : function(item_id)
    {
        var thisObj = this;
        tabSignal.once("spajs.open", () => {
            clearTimeout(this.model.loadNewLines_timeoutId)
            this.model.loadNewLines_timeoutId = undefined;
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

                    var stdout_minline = thisObj.model.lines_data.stdout_minline;
                    if(stdout_minline <= 1)
                    {
                        return;
                    }

                    thisObj.inLoadTopData = true;
                    $.when(thisObj.loadLines(item_id, {before:stdout_minline, limit:thisObj.linePerPage})).always(function()
                    {
                        var history_stdout = $("#history-stdout");
                        if(!history_stdout || !history_stdout.length)
                        {
                            return;
                        }

                        for(var i = stdout_minline-1; i > stdout_minline - thisObj.linePerPage; i = i -1)
                        {
                            if(thisObj.model.lines_data.stdout[i] != undefined)
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
    },

    onUpdateFromServer : function ()
    {
        if(this.model.data.status == 'DELAY' || this.model.data.status == 'RUN')
        {
            if(this.api.actions['cancel'])
            {
                this.api.actions['cancel'].hidden = false;
                $('.btn_cancel').addClass('hidden-false').removeClass('hidden-true');
            }
        }
        else
        {
            if(this.api.actions['cancel'])
            {
                this.api.actions['cancel'].hidden = true;
                $('.btn_cancel').addClass('hidden-true').removeClass('hidden-false');
            }
        }

        if(this.model.data.status == 'OK' && this.model.data.kind == 'MODULE' && this.model.data.mode == "setup")
        {
            this.api.sublinks['facts'].hidden = false;
            $('.sublink-btn-facts').addClass('hidden-false').removeClass('hidden-true');
        }
        else
        {
            this.api.sublinks['facts'].hidden = true
            $('.sublink-btn-facts').addClass('hidden-true').removeClass('hidden-false');
        }
    },
}

gui_project_history = gui_history

tabSignal.connect("guiList.renderPage.history", function(params){
    params.guiObj.bindStdoutUpdates(params.guiObj.model.data.id);
});


function format_history_time(opt)
{
    if(opt.value)
    {
        return moment(opt.value).tz(window.timeZone).format("YYYY-MM-DD HH:mm:ss");
    }

    return "";
}

function format_executor(opt)
{
    if(opt.value)
    {
        return opt.value;
    }

    return 'system';
}

function format_revision(opt)
{
    if(opt.value)
    {
        return opt.value.substr(0, 8);
    }

    return "";
}

function get_prefetch_history_executor_path(data_obj)
{
    return "/user/"
}

function get_prefetch_history_initiator_path_1(data_obj)
{
    if (data_obj.initiator_type == 'project') {
        return "/project/";
    }
    else if (data_obj.initiator_type == 'template') {
        return "/project/" + data_obj["project"] + "/template/";
    }
    else if (data_obj.initiator_type == 'scheduler') {
        return "/project/" + data_obj["project"] + "/periodic_task/";
    }
    else {
        return false;
    }
}

function get_prefetch_history_initiator_path_2(data_obj)
{
    if (data_obj.initiator_type == 'project') {
        return "/project/";
    }
    else if (data_obj.initiator_type == 'template') {
        let project_id = spajs.urlInfo.data.reg.parent_id;
        return "/project/" + project_id + "/template/";
    }
    else if (data_obj.initiator_type == 'scheduler') {
        let project_id = spajs.urlInfo.data.reg.parent_id;
        return "/project/" + project_id + "/periodic_task/";
    }
    else {
        return false;
    }
}

function addHistoryPrefetchBase(obj){
    let properties = obj.definition.properties

    if(properties['executor'])
    {
        properties['executor']['prefetch'] = {
            __func__path: "get_prefetch_history_executor_path",
            field_name: "email",
        }
    }

    if(properties['inventory'])
    {
        properties['inventory']['prefetch'] = true
    }

    if(properties['project'])
    {
        properties['project']['prefetch'] = true
    }
}

function addHistoryPrefetchCommon(obj)
{
    addHistoryPrefetchBase(obj);

    let properties = obj.definition.properties;

    if(properties['initiator'])
    {
        properties['initiator']['prefetch'] = {
            __func__path: "get_prefetch_history_initiator_path_1",
        };
    }
}

function addHistoryPrefetchProjectHistory(obj)
{
    addHistoryPrefetchBase(obj);

    let properties = obj.definition.properties;

    if (properties['initiator']) {
        properties['initiator']['prefetch'] = {
            __func__path: "get_prefetch_history_initiator_path_2",
        };
    }
}

function addSettingsToHistoryListsFields(obj)
{
    let properties = obj.definition.properties;
    properties['options'].hidden = true;
    properties['initiator_type'].hidden = true;
    properties['start_time'].__func__value = 'format_history_time';
    properties['stop_time'].__func__value = 'format_history_time';
    properties['executor'].__func__value = 'format_executor';
    if(properties['revision'])
    {
        properties['revision'].__func__value = 'format_revision';
    }
}

function addSettingsToOneHistoryFields(obj)
{
    let properties = obj.definition.properties;
    properties['execute_args'].format = 'json';
}

tabSignal.connect("openapi.schema.definition.History", addHistoryPrefetchCommon);
tabSignal.connect("openapi.schema.definition.OneHistory", addHistoryPrefetchCommon);
tabSignal.connect("openapi.schema.definition.ProjectHistory", addHistoryPrefetchProjectHistory);

tabSignal.connect("openapi.schema.definition.History", addSettingsToHistoryListsFields);
tabSignal.connect("openapi.schema.definition.ProjectHistory", addSettingsToHistoryListsFields);
tabSignal.connect("openapi.schema.definition.OneHistory", addSettingsToOneHistoryFields);

//tabSignal.connect("openapi.schema.definition.History", hideFields);

function hideFields(obj){

    let properties = obj.definition.properties;

    if(properties['options']) properties['options'].type = 'hidden';
    if(properties['raw_args']) properties['raw_args'].type = 'hidden';
    if(properties['raw_stdout']) properties['raw_stdout'].type = 'hidden';
    if(properties['raw_inventory']) properties['raw_inventory'].type = 'hidden';
    if(properties['initiator_type']) properties['initiator_type'].type = 'hidden';

}

tabSignal.connect("openapi.schema.definition.ProjectHistory", hideFields);
tabSignal.connect("openapi.schema.definition.OneHistory", hideFields);



tabSignal.connect("guiList.renderLine.history", function(obj){

    if(!(obj.dataLine.line.status == 'RUN' || obj.dataLine.line.status == 'DELAY'))
    {
        if(obj.dataLine.sublinks_l2['cancel'])
        {
            obj.dataLine.sublinks_l2['cancel'].hidden = true
        }

        if(obj.dataLine.sublinks_l2['clear'])
        {
            obj.dataLine.sublinks_l2['clear'].hidden = false
        }
    }
    else
    {
        if(obj.dataLine.sublinks_l2['cancel'])
        {
            obj.dataLine.sublinks_l2['cancel'].hidden = false
        }

        if(obj.dataLine.sublinks_l2['clear'])
        {
            obj.dataLine.sublinks_l2['clear'].hidden = true
        }
    }

    if(obj.dataLine.line.status == 'OK' && obj.dataLine.line.kind == 'MODULE' && obj.dataLine.line.mode == "setup")
    {
        if(obj.dataLine.sublinks_l2['facts'])
        {
            obj.dataLine.sublinks_l2['facts'].hidden = false
        }
    }
    else
    {
        if(obj.dataLine.sublinks_l2['facts'])
        {
            obj.dataLine.sublinks_l2['facts'].hidden = true
        }
    }
})

tabSignal.connect("guiList.renderPage.history", function(obj){

    if(obj.data.status == 'OK' && obj.data.kind == 'MODULE' && obj.data.mode == "setup")
    {
        if(obj.options.links['facts'])
        {
            obj.options.links['facts'].hidden = false
        }
    }
    else
    {
        if(obj.options.links['facts'])
        {
            obj.options.links['facts'].hidden = true
        }
    }

    obj.options.actions['clear'].hidden = true

    if(obj.data.status == 'DELAY' || obj.data.status == 'RUN')
    {
        if(obj.options.actions['cancel'])
        {
            obj.options.actions['cancel'].hidden = false
        }
    }
    else
    {
        if(obj.options.actions['cancel'])
        {
            obj.options.actions['cancel'].hidden = true
        }
    }
})

/**
 * Function calls action, that cleans history Stdout.
 * @param action_info(object) - action object
 * @param obj(object) - object of history detail page
 */
function clearHistoryStdOut(action_info, obj)
{
    return $.when(emptyAction(action_info, obj)()).done(d => {
        $('#history-stdout').html(d.data.detail);
    })
}

