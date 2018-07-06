
function getCookie(name)
{
    var cookieValue = null;
    if (document.cookie && document.cookie != '')
    {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++)
        {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '='))
            {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function loadTpl(name)
{
    return jQuery.ajax({
       url:  hostname + window.guiStaticPath+""+name+".html?v="+window.gui_version,
       type: "GET",
       success: function(res)
       {
            $("body").append(res)
       }
    })
}

function loadTplArray(templatesArray)
{
    var def = new $.Deferred();
    var promiseArr = []
    for(var i in templatesArray)
    {
        promiseArr.push(loadTpl(templatesArray[i]))
    }

    $.when.apply($, promiseArr).done(function()
    {
        def.resolve();
    }).fail(function(e){
        def.reject(e);
    })

    return def.promise()
}

var polemarch = {

}

if(window.moment && window.moment.tz)
{
    window.moment.tz.setDefault(window.timeZone);
}

polemarch.opt = {}
polemarch.opt.holder = undefined
polemarch.opt.host = "//"+window.location.host

polemarch.model = {}

polemarch.model.nowTime = 0;

polemarch.start = function(options)
{
    for(var i in options)
    {
        if(polemarch.opt[i] && typeof(polemarch.opt[i]) == "object")
        {
            for(var j in options[i])
            {
                polemarch.opt[i][j] = options[i][j]
            }
        }
        polemarch.opt[i] = options[i]
    }

    spajs.init({
        holder: polemarch.opt.holder,
        menu_url: undefined,
        useHistoryApi:true
    })

    //spajs.ajax.setHeader("Authorization", "");
    spajs.ajax.setHeader(window.csrf_data.csrfHeaderName, window.csrf_data.token);

    setInterval(function()
    {
        var t = new Date();
        polemarch.model.nowTime = t.getTime();
    }, 5001)


    $("body").touchwipe({
        wipingLeftEnd: function(e)
        {
            if(e.isFull && Math.abs(e.dx) >  Math.abs(e.dy))
            {
                $('body').removeClass('sidebar-open');
            }
        },
        wipingRightEnd:  function(e)
        {
            if(e.isFull && Math.abs(e.dx) >  Math.abs(e.dy))
            {
                $('body').addClass('sidebar-open');
            }
        },
        min_move_x: 120,
        min_move_y: 120,
        preventDefaultEvents: false
    });

    if(window.cordova || ( window.parent && window.parent.cordova))
    {
        $("body").addClass('platform-cordova')
    }
    else
    {
        $("body").addClass('platform-web')
    }

    tabSignal.emit("webGui.start")
    tabSignal.emit("polemarch.start")

    try{
        $.when(spajs.openMenuFromUrl(undefined, {withoutFailPage:window.location.pathname != "/"})).always(function(){
            hideLoadingProgress();
            tabSignal.emit("hideLoadingProgress")
        })

    }
    catch (exception)
    {
        if(exception.code == 404)
        {
            return;
        }

        console.error("spajs.openMenuFromUrl exception", exception.stack)
        hideLoadingProgress();
        tabSignal.emit("hideLoadingProgress")
        debugger;
        //spajs.openURL("");
    }
}

polemarch.showErrors = function(res)
{
    if(!res)
    {
        return true;
    }

    if(res.responseJSON)
    {
        res = res.responseJSON
    }

    if(res && res.info && res.info.message)
    {
        console.error('showErrors:' + res.info.message)
        $.notify(res.info.message, "error");
        return res.info.message;
    }
    else if(res && res.message)
    {
        console.error('showErrors:' + res.message)
        $.notify(res.message, "error");
        return res.message;
    }

    if(typeof res === "string")
    {
        console.error('showErrors:' + res)
        $.notify(res, "error");
        return res;
    }

    for(var i in res)
    {
        if(i == "error_type")
        {
            continue;
        }

        if(typeof res[i] === "string")
        {
            console.error('showErrors:' + res[i])
            $.notify(res[i], "error");
            return res[i];
        }
        else if(typeof res[i] === "object")
        {
            return polemarch.showErrors(res[i])
        }
    }
}

spajs.errorPage = function(holder, menuInfo, data, error_data)
{
    var error = {
        error_data:error_data
    }

    error.status = "520"
    if(error_data.status)
    {
        error.status = error_data.status
    }

    if(error_data.responseJSON)
    {
        error_data = error_data.responseJSON
    }

    error.text = "Unknown error";
    error.title = "Error"
    if(error_data == undefined){
        error.title = "Unknown error"
    }
    else
    {
        if(error_data.detail && error_data.detail.toString)
        {
            error.text = error_data.detail.toString()
        }
    }

    $(holder).insertTpl(spajs.just.render("errorPage", {error:error, data:data, menuInfo:menuInfo}))
}



tabSignal.connect("loading.completed", function()
{
    polemarch.start({
        is_superuser:window.is_superuser,
        holder:'#spajs-body'
    })

    window.api = new guiApi()
    $.when(window.api.init()).done(function(){

        // Создали фабрику для всего
        for(var key in window.api.openapi.definitions)
        {
            var val = window.api.openapi.definitions[key]

            window["api"+key] = ormItemFactory(window.api, {
                bulk_name:key.toLowerCase(),
                fileds:val.properties
            })
        }

        // Переопределили метод render
        window.apiHost.one.render = function(){ alert("?!")}

        // Создали хост
        window.host1 = new window.apiHost.one()

        host1.model.name = "abc"

        // Создали
        host1.create()

        // Вгрузили в него данные
        $.when(host1.load(1)).done(function(){
            // Изменили
            host1.model.name = "abc1"

            // Сохранили
            host1.save()
        })

        window.gui_pages = []
        for(var i in window.api.openapi.paths)
        {
            var val = window.api.openapi.paths[i]
            
            var page = new guiPage();
            
            // Настроили страницу 
            
            if(val.post)
            {
                page.blocks.push({
                    priority:1,
                    name:'post-btn',
                    render:function(menuInfo, data)
                    {
                        // Кнопка для перехода на создание нового хоста 
                    }
                })
                
            }
            
            if(val.get)
            {
                if(val.get.parameters)
                {
                    // Настройки формы поиска и фильтрации
                }
                
                page.blocks.push({
                    priority:1,
                    name:'post-btn',
                    render:function(menuInfo, data)
                    {
                        // Кнопка для перехода на создание нового хоста 
                    }
                })
            }
            
            page.blocks.push(function(menuInfo, data)
                {
                    // Создали список хостов
                    hosts = new window.apiHost.list()

                    // Определили фильтр
                    hosts.search("name=abc", 10, 5, 'desc')
                    return hosts.render();
                })




            
            window.gui_pages.push(page)
        }
        
        
        
        
        // Создали страницу 
        hostListPage = new guiPage();

        // Настроили страницу 
        hostListPage.blocks.push(function(menuInfo, data)
            {
                // Создали список хостов
                hosts = new window.apiHost.list()

                // Определили фильтр
                hosts.search("name=abc", 10, 5, 'desc')
                return hosts.render();
            })


        setTimeout(function(){
            
            // Отрисовали страницу
            hostListPage.render("#spajs-right-area") 
        }, 200)
        
    })



})


function guiBlock()
{
    this.render = function(menuInfo, data){
        
    }
}

/**
 * Класс страницы
 * @returns {guiPage}
 */
function guiPage()
{
    var thisObj = this;
    this.blocks = []

    /**
     * Отрисовывает сообщение о том что рендер блока вернул ошибку
     * @param {Object} block
     * @param {Object} error
     * @returns {undefined}
     */
    this.renderFail = function(block, error)
    {
        $(block.id).insertTpl("error"+JSON.stringify(error))
    }

    /**
     * Отрисовывает блок
     * @param {Object} block
     * @returns {undefined}
     */
    var renderOneBlock = function(block, menuInfo, data)
    {
        var res = block.item(menuInfo, data);
        if(typeof res == "string")
        {
            $(block.id).insertTpl(res)
            return;
        }

        if(!res)
        {
            thisObj.renderFail(block)
            return;
        }

        $.when(res).done(function(html)
        {
            $(block.id).insertTpl(html)
        }).fail(function(error)
        {
            thisObj.renderFail(block, error)
        })
    }

    this.render = function(holder, menuInfo, data)
    {  
        var blocks = []
        var blocksHtml = "";

        for(var i in thisObj.blocks)
        {
            var id = "block_"+i+"_"+Math.floor(Math.random()*10000000)
            
            var val = {
                item:thisObj.blocks[i],
                id:"#"+id
            }
            blocks.push(val)
            blocksHtml += "<div id="+id+"></div>"
        }

        $(holder).insertTpl(blocksHtml)

        for(var i in blocks)
        {
            renderOneBlock(blocks[i], menuInfo, data)
        }

        return true;
    }
    
    /**
     * Регистрирует урл страницы для показа её при заходе на конкретный урл.
     * @param {type} urlregexp
     * @returns {undefined}
     */
    this.registerURL = function(urlregexp)
    { 
        this.urlregexp = urlregexp; 
        spajs.addMenu({
            urlregexp:urlregexp,
            onOpen:function(holder, menuInfo, data)
            {
                return thisObj.render(holder, menuInfo, data);
            },
            /*onClose:function()
            {
            },*/
        })
    }
}

/**
 * Класс апи и запросов к нему
 * @returns {guiApi}
 */
function guiApi()
{
    var thisObj = this;
    this.init = function()
    {
        var def = new $.Deferred();

        spajs.ajax.Call({
            url: hostname + "/api/v1/openapi/?format=openapi",
            type: "GET",
            contentType:'application/json',
            data: "",
            success: function(data)
            {
                thisObj.openapi = data
                def.resolve();
            },
            error: function (){
                def.reject();
            }
        });
        return def.promise();
    }

    var query_data = {}
    var reinit_query_data = function()
    {
        query_data = {
            timeOutId:undefined,
            data:[],
            def:undefined,
            promise:[]
        }
    }
    reinit_query_data()

    var real_query = function(query_data)
    {
        var this_query_data = mergeDeep({}, query_data)
        reinit_query_data()

        var scheme = "http"
        if($.inArray("https", thisObj.openapi.schemes) != -1)
        {
            scheme = "https"
        }

        spajs.ajax.Call({
            url: scheme+"://"+thisObj.openapi.host + thisObj.openapi.basePath+"/_bulk/",
            type: "POST",
            contentType:'application/json',
            data: JSON.stringify(this_query_data.data),
            success: function(data)
            {
                this_query_data.def.resolve(data);
            },
            error: function (error){
                this_query_data.def.reject(error);
            }
        });
        return this_query_data.def.promise();
    }

    /**
     * Примеры запросов
     * https://git.vstconsulting.net/vst/vst-utils/blob/master/vstutils/unittests.py#L337
     *
     * Пример как ссылаться на предыдущий результат
     * https://git.vstconsulting.net/vst/vst-utils/blob/master/vstutils/unittests.py#L383
     *
     * @param {Object} data для балк запроса
     * @returns {promise}
     */
    this.query = function(data)
    {
        if(!query_data.def)
        {
            query_data.def = new $.Deferred();
        }

        if(query_data.timeOutId)
        {
            clearTimeout(query_data.timeOutId)
        }

        var data_index = query_data.data.length
        query_data.data.push(data)

        var promise = new $.Deferred();

        query_data.timeOutId = setTimeout(real_query, 100, query_data)

        $.when(query_data.def).done(function(data)
        {

            var val = data[data_index];


            if(val.status >= 200 && val.status < 400)
            {
                promise.resolve(val)
            }
            else
            {
                promise.reject(val)
            }

        }).fail(function(error)
        {
            promise.reject(error)
        })


        return promise.promise();
    }

    return this;
}

/**
 * Фабрика классов объектов
 * @returns {Object}
 */
function ormItemFactory(api, view)
{
    return {
        one:function(){

            /**
             * Описание полей из апи
             */
            this.view = view

            /**
             * @class guiApi
             */
            this.api = api

            this.model = {}

            this.load = function (item_id)
            {
                var thisObj = this;
                if (!item_id)
                {
                    throw "Error in pmItems.loadItem with item_id = `" + item_id + "`"
                }

                var def = api.query({
                    type: "get",
                    item: this.view.bulk_name,
                    pk:item_id
                })
                $.when(def).done(function(data){
                    thisObj.model = data
                })

                return def;
            }

            this.create = function (){ }
            this.update = function (){ }
            this.delete = function (){ }
            this.render = function (){ }
            this.copy   = function (){ }

            return this;
        },
        list:function()
        { 
            /**
             * Описание полей из апи
             */
            this.view = view

            this.state = {
                search_filters:undefined
            }

            this.model = {
                buttons:[],
                fileds:[],
                data:undefined, // Данные самого объекта
                selectedItems:{}
            }

            /**
             * @class guiApi
             */
            this.api = api

            /**
             * Функция поиска
             */
            this.real_search = function ()
            {
                var query    = this.state.search_filters.query;
                var limit    = this.state.search_filters.limit;
                var offset   = this.state.search_filters.offset;
                var ordering = this.state.search_filters.ordering;

                var thisObj = this;
                if (!limit)
                {
                    limit = 999;
                }

                if (!offset)
                {
                    offset = 0;
                }

                if (!ordering)
                {
                    ordering = "";
                }

                var q = [];

                q.push("limit=" + encodeURIComponent(limit))
                q.push("offset=" + encodeURIComponent(offset))
                q.push("ordering=" + encodeURIComponent(ordering))

                for (var i in query)
                {
                    if (Array.isArray(query[i]))
                    {
                        for (var j in query[i])
                        {
                            query[i][j] = encodeURIComponent(query[i][j])
                        }
                        q.push(encodeURIComponent(i) + "=" + query[i].join(","))
                        continue;
                    }
                    q.push(encodeURIComponent(i) + "=" + encodeURIComponent(query[i]))
                }

                var def = api.query({
                    type: "get",
                    item: this.view.bulk_name,
                    filters:q.join("&")
                })
                
                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                })

                return def;
            }

            /**
             * Функция поиска
             * @param {string|object} query запрос
             * @param {integer} limit
             * @param {integer} offset
             * @param {string} ordering - сортировка по какому-то свойству объекта(id, name и т.д). Для обратной сортировки передавать "-id"
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.search = function (query, limit, offset, ordering)
            {
                this.state.search_filters = {
                    query:query,
                    limit:limit,
                    offset:offset,
                    ordering:ordering
                }
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
             * @returns {string|promise}
             */
            this.render = function ()
            {
                var thisObj = this;
                var def = new $.Deferred();
                $.when(this.real_search()).done(function()
                {
                    var tpl = thisObj.view.bulk_name + '_list'
                    if (!spajs.just.isTplExists(tpl))
                    {
                        tpl = 'entity_list'
                    }

                    def.resolve(spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}}));
                }).fail(function(err)
                {
                    def.reject(err);
                })

                return def.promise();
            }

            this.delete = function (){ }

            ////////////////////////////////////////////////
            // pagination
            ////////////////////////////////////////////////

            this.paginationHtml = function ()
            {
                var list = this.model.data
                var totalPage = list.count / list.limit
                if (totalPage > Math.floor(totalPage))
                {
                    totalPage = Math.floor(totalPage) + 1
                }

                var currentPage = 0;
                if (list.offset)
                {
                    currentPage = Math.floor(list.offset / list.limit)
                }
                var url = window.location.href
                return  spajs.just.render('pagination', {
                    totalPage: totalPage,
                    currentPage: currentPage,
                    url: url})
            }

            this.getTotalPages = function ()
            {
                return this.model.data.count / this.model.data.limit
            }

            return this;
        }
    }
}

