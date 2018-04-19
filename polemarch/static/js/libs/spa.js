/**
 * Модуль перевода
 * @param {String} text
 * @returns {window.gettext.data|Window.gettext.data}
 */
if(window.gettext === undefined)
{

    var gettext = function(text)
    {
        if(window.gettext.data && window.gettext.data[window.gettext.locale] && window.gettext.data[window.gettext.locale][text])
        {
            text = window.gettext.data[window.gettext.locale][text];
            for(var i=1; i<arguments.length; i++)
            {
                text = text.replace("%"+i+"s" ,arguments[i])
            }

            return text
        }

        for(var i=1; i<arguments.length; i++)
        {
            text = text.replace("%"+i+"s" ,arguments[i])
        }

        return text;
    }

    window.gettext.data = {};
    window.gettext.locale = 'en'
    if(navigator.language)
    {
        window.gettext.locale = navigator.language
    }

    gettext.setTranslate = function(lang, arr)
    {
        window.gettext.data[lang] = arr
    }

    gettext.setLocale = function(lang)
    {
        window.gettext.locale = lang
    }

    gettext.getLocale = function()
    {
        return window.gettext.locale
    }
}

if(!window.spajs)
{

    /**
     * Класс приложения single page application
     * @returns {spajs}
     */
    var spajs = function()
    {
        return this;
    }

    spajs.version = "2.2";

    /**
     * Указывает на то как прошла иницитализация
     * @type Boolean
     * @private
     */
    spajs.initSuccess = false;

    /**
     * Указывает на то что иницитализация была уже запущена
     * @type Boolean
     * @private
     */
    spajs.initProgress = false;

    spajs.opt = {};

    spajs.opt.holder = "body"

    // Использовать HistoryApi
    spajs.opt.useHistoryApi = true
    spajs.opt.useJust = true

    /**
     * Путь к папке с аватарками пользователей
     * @type String
     */
    spajs.opt.avatar_prefix = "";

    spajs.opt.menu_url = "spa"

    /**
     * Указывает добавлять или не добавлять пареметры урла
     * @type Boolean
     */
    spajs.opt.addParamsToUrl = true

    /**
     * Масив с описанием пунктов меню
     * @type Array
     */
    spajs.opt.menu = []

    /**
     * @param {object} options
     *
     * Генерирует события
     * onOffline
     * onOnline
     * onAnyTabActivated
     *
     */
    spajs.init = function(options)
    {
        if(spajs.initProgress === true)
        {
            return;
        }

        spajs.initProgress = true;

        for(var i in options)
        {
            if(spajs.opt[i] && typeof(spajs.opt[i]) == "object")
            {
                for(var j in options[i])
                {
                    spajs.opt[i][j] = options[i][j]
                }
            }
            spajs.opt[i] = options[i]
        }

        if(spajs.opt.useJust)
        {
            var root = {}
            var tplArray =  $("script[data-just]")
            for(var i=0; i< tplArray.length; i++)
            {
                var val = $(tplArray[i]);
                root[val.attr("data-just")] = val.html()
            }

            spajs.just = new JUST({
                    root : root
            });

            /*var html = spajs.just.renderSync('spajs_holder');

            $(".spa").remove()
            $("body").append(html);*/
        }

        // Фиксируем факт того что страница не активна http://javascript.ru/forum/events/2498-kak-opredelit-aktivnoe-okno-vkladku.html
        $(window).blur(function() {
            // Здесь что угодно после ухода в другую вкладку
            spajs.isActiveTab = false;
        });

        // Фиксируем факт того что страница активна
        $(window).focus(function() {
            // Здесь что угодно после возвращения во вкладку
            spajs.isActiveTab = true;

            // Уведомим всех о том что одна из вкладок чата активирована
            tabSignal.emitAll("onAnyTabActivated", { })
        });

        var lastOnlineStatus = undefined;
        setInterval(function()
        {
            var status = spajs.isOnline();
            //console.warn("offline event", status, lastOnlineStatus, status !== lastOnlineStatus && lastOnlineStatus !== undefined)
            if(status !== lastOnlineStatus && lastOnlineStatus !== undefined)
            {
                if(status)
                {
                    // Переход в online
                    console.warn("online event");
                    setTimeout(function ()
                    {
                        if(!spajs.isOnline())
                        {
                            return;
                        }

                        tabSignal.emitAll("onOnline", {})
                    }, 5000)
                }
                else
                {
                    // Переход в offline
                    console.warn("offline event")
                    tabSignal.emitAll("onOffline", { })
                }
            }
            lastOnlineStatus = status;
        }, 500)


        if(spajs.opt.useHistoryApi)
        {
            // Код обработки popstate перенесён сюда из spajs чтоб кнопка назад возвращала на список контактов и не дальше
            // и даже если истории раньше небыло то всё равно кнопка назад ВСЕПГДА возвращала на список контактов
            // по этому опция spajs.opt.useHistoryApi взята из spajs а не paradiseChat хоть это архетектурно не красиво

            //console.log("bind for popstate event")
            //$(window).bind('popstate', function(event)

            window.addEventListener('popstate', function(event)
            {
                spajs.openMenuFromUrl(event.state || {url:window.location.href})
            });
        }
        else
        {
            //console.log("not bind for popstate event")
        }
    }

    /**
     * Для обработки клика на ссылки
     * @param {string} url
     * @param {string} title
     * @returns {boolean}
     *
     * @example spajs.openURL("https://app.chat-server.comet-server.com/dev-18/t-chatterbox/") (Надо передавать полный урл)
     */
    spajs.openURL = function(url, title)
    {
        history.pushState({url:url}, title, url);
        var res = spajs.openMenuFromUrl(url)
        var state = res.state()
        return  state == "rejected"
    }

    /**
     * Открывает пункт меню на основе параметров из url ( window.location.href )
     * Ищет в адресе парамет spajs.opt.menu_url и на основе его значения открывает пункт меню.
     * @returns {boolean} Если параметр не найден или информации в нём содержится о не зарегистрированном menuId то вернёт false
     */
    spajs.openMenuFromUrl = function(event_state)
    {
        var menuId;
        
        // Если menu_url не задан то используем первый знак вопроса в строке адреса
        if(window.location.href.indexOf("?") != -1)
        {
            menuId = window.location.href.slice(window.location.href.indexOf("?")+1)
        } 
        else
        {
            // Если menu_url не задан то используем window.location.hash
            menuId = window.location.hash.slice(1)
        }
        
        if(spajs.opt.menu_url)
        {
            menuId = spajs.getUrlParam(spajs.opt.menu_url, event_state)
        } 
 
        return spajs.openMenu(menuId, {}, true, event_state);
    }

    spajs.setUrlParam = function(params, title)
    {
        var url = window.location.pathname + "?" + params.toString(); 
        if(typeof params === "object")
        {
            var new_url = window.location.href;
            for(var i in params)
            {
                if(!params.hasOwnProperty(i))
                {
                    continue;
                }

                var name = i;
                var value = params[i];

                if(value == undefined)
                {
                    // Если параметр равен undefined то его надо удалить из строки урла
                    new_url = new_url.replace(new RegExp(name+"=[^&\/]+"), "");
                }
                else
                {
                    if(!new_url.match(new RegExp(name+"=[^&\/]+")))
                    {
                        if(new_url.indexOf("?") != -1)
                        {
                            new_url += "&"+ name + "=" + value;
                        }
                        else
                        {
                            new_url += "?"+ name + "=" + value;
                        }
                    }
                    else
                    {
                        new_url = new_url.replace(new RegExp(name+"=[^&\/]+"), name + "=" + value);
                    }
                }
            }

            url = new_url.replace(/&+/img, "&").replace(/&+$/img, "").replace(/\?+$/img, "").replace(/\?&+/img, "?")
        }
        
        if(!spajs.opt.addParamsToUrl)
        {
            url = window.location.href;
        }

        if(spajs.opt.useHistoryApi)
        {
            history.pushState({url:new_url}, title, url)
        }
        return new_url;
    }

    spajs.getUrlParam = function(name, event_state)
    {
        var url_param = window.location.href.replace(/^.*?[#?](.*)$/, "$1");
        if(event_state !== undefined && event_state.url)
        {
            url_param = event_state.url.replace(/^.*?[#?](.*)$/, "$1");
        }

        var param = url_param.match(new RegExp(name+"=[^&\/]+"), "g")
        if(!param || !param.length)
        {
            return false;
        }

        return param[0].replace(name+"=", "").replace(/#$/, "")
    }

    spajs.getAllUrlParam = function(event_state)
    {
        var url_param = window.location.href.replace(/^.*?[#?](.*)$/, "$1");
        if(event_state !== undefined && event_state.url)
        {
            url_param = event_state.url.replace(/^.*?[#?](.*)$/, "$1");
        }

        var param = url_param.split(/[&?]/g)

        var res = {}

        if(param && param.length)
        {
            for(var i=0; i< param.length; i++)
            {
                param[i] = param[i].split("=")
                res[param[i][0]] = param[i][1];
            }
        }

        return res
    }

    /**
     * Сортирует меню.
     * @param element targetBlock блок содержащий сортеруемые элементы (так как меню несколько)
     * @private
     */
    spajs.sortMenu = function(targetBlock)
    {
        var sortmenu = targetBlock.children();

        sortmenu.sort(function(a, b)
        {
            a = parseInt($(a).attr("data-index"));
            if(isNaN(a))
            {
                return 1;
            }

            b = parseInt($(b).attr("data-index"));
            if(isNaN(b))
            {
                return -1;
            }

            return b-a;
        });

        sortmenu.detach().appendTo(targetBlock);
    }

    /**
     * Добавляет произвольный пункт меню
     * @param {object} menu Описание пункта меню
     * @public
     *
     *
     * Пример добавления произвольного пункта меню.
        spajs.addMenu({
            id:"terms_of_use",              // id комнаты должен соответсвовать регулярному выражению  [A-z9-0_]{ 4,64} или быть объектом класса RegExp
            name:"Условия использования",   // Имя кнопки
            urlregexp:[/^param;[0-9]+$/]    // Массив регулярных выражений урла которым соответсует данный пункт меню
            url: "#",                       // url ссылки
            type:"bottom",                  // Тип пункта меню (false|bottom|custom)
            menuHtml: "html code",          // Если тип меню custom то из этого поля берётся код на вставку его в левую колонку
            priority:1,                     // Приоритет для сортировки порядка блоков

            /*
             *  callback вызываемый по открытии этого пункта меню
             *  @param object holder html элемент в списке меню
             *  @param object menuInfo Информация о том пункет меню на который совершён переход
             *  @param object data Объект с данными урла, { reg:{}, url:{} } где reg - совпадения в регулярке, url - данные всех параметров урла
             * /
            onOpen:function(holder, menuInfo, data)
            {
                $(holder).insertTpl($("#terms_of_use").html())
            },
            /*
             *  callback вызываемый по открытии другого пункта меню и закрытии этого пункта меню
             *  @param object menuInfo Информация о том пункет меню на который совершён переход
             * /
            onClose:function(menuInfo)
            {

            },

            /*
             *  callback вызываемый по завершению вставки пункта меню в меню
             *  @param object holder html элемент в списке меню
             * /
            onInsert:function(holder)
            {

            },
        })

     *
     * Примечание:
     * Если тип меню type=custom то в коде этого эемента меню надо самостоятельно разместить вызов функции spajs.openMenu('menu_id'); для клика и открытия.
     * @note выполняется синхронно
     */
    spajs.addMenu = function(menu)
    {
        if(!menu.id)
        {
            console.error("Не задан menu.id", menu)
            return;
        }
        
        if(!menu.type)
        {
            menu.type = "custom"
        }

        var targetBlock = $("#left_sidebar")
 
        for(var i in spajs.opt.menu)
        {
            if(spajs.opt.menu[i].id == menu.id)
            {
                // Такой пункт уже есть в меню
                console.error("Такой пункт уже есть в меню", menu)
                return;
            }
        }

        if(!menu.priority)
        {
            menu.priority = 0;
        }

        spajs.opt.menu.push(menu)

        if(menu.type == "custom")
        {
            targetBlock.append('<div data-index="'+menu.priority+'" >'+menu.menuHtml+'</div>');
        }
        else if(menu.type == "hidden")
        {
            // Невидимый пункт меню.
        }
        
        spajs.sortMenu(targetBlock)
        if(menu.onInsert)
        {
            menu.onInsert($("#spajs-menu-"+menu.id))
        }
    }
  
    spajs.currentOpenMenu = undefined

    /**
     * Открывает окно с произвольным содержимым
     * @param string menuId
     * @param array addUrlParams Дополнительная информация которая будет передана в .onOpen для обработчика пункта меню
     * @param boolean notAddToHistory не добавлять переход в историю браузера
     * @param object event_state
     * @public
     *
     * @return  $.Deferred обещание полученое от функции open или обещание созданое в нутри функции
     * @note выполняется синхронно но вот событие onOpen у пункта меню может работать не синхронно и зависит от реализыции колбека навешаного на onOpen
     */
    spajs.open = function(opt)
    {
        if(!opt.menuId)
        {
            opt.menuId = "";
        }
        
        if(opt.reopen === undefined)
        {
            opt.reopen = true;
        }
        
        var def = new $.Deferred();
        
        $.when(def).fail(function(e)
        {
            if(spajs.errorPage)
            {
                spajs.errorPage(jQuery('#spajs-right-area'), menuInfo, data, e)
            }
        })
        
        if(!spajs.opt.addParamsToUrl && opt.event_state == undefined)
        {
            opt.event_state = {}
            opt.event_state.url = window.location.href;
        }

        var regExpRes = []
        var menuInfo = undefined;
        for(var i in spajs.opt.menu)
        {
            if(!spajs.opt.menu[i].urlregexp && spajs.opt.menu[i].id == opt.menuId)
            {
                menuInfo = spajs.opt.menu[i]
                break;
            }
            else if(spajs.opt.menu[i].urlregexp)
            {
                for(var j in spajs.opt.menu[i].urlregexp)
                {
                    if(spajs.opt.menu[i].urlregexp[j].test(opt.menuId))
                    {
                        regExpRes = spajs.opt.menu[i].urlregexp[j].exec(opt.menuId)
                        menuInfo = spajs.opt.menu[i]
                        break;
                    }
                }
            }
        }

        //console.log("openMenu", menuId, menuInfo)
        if(!menuInfo || !menuInfo.onOpen)
        {
            console.error("URL not registered", opt.menuId, opt)
            def.reject({detail:"Error URL not registered", status:404})
            throw "URL not registered " + opt.menuId;
            return def.promise();
        }

        if(spajs.currentOpenMenu && menuInfo.id == spajs.currentOpenMenu.id && !opt.reopen)
        {
            console.warn("Re-opening the menu", menuInfo)
            def.resolve()
            return def.promise();
        }


        if(opt.addUrlParams === undefined)
        {
            opt.addUrlParams = {}
        }

        if(spajs.opt.menu_url)
        {
            opt.addUrlParams[spajs.opt.menu_url] = opt.menuId;
            if(!opt.notAddToHistory)
            {
                var url = spajs.setUrlParam(opt.addUrlParams, menuInfo.title || menuInfo.name)
                if(opt.event_state)
                {
                    opt.event_state.url = url;
                }
            }
        }
        else if(!opt.notAddToHistory)
        {
            var url = spajs.setUrlParam(opt.menuId, menuInfo.title || menuInfo.name)
            if(opt.event_state)
            {
                opt.event_state.url = url;
            }
        }

        if(spajs.currentOpenMenu && spajs.currentOpenMenu.onClose)
        {
            //console.log("onClose", spajs.currentOpenMenu)
            spajs.currentOpenMenu.onClose(menuInfo);
        }

        var data = {}
        data.url = spajs.getAllUrlParam(opt.event_state)
        data.reg = regExpRes

        if(menuInfo.hideMenu)
        {
            $(spajs.opt.holder).addClass("spajs-spa-show-page");
        }


        //console.log("onOpen", menuInfo)
        if(spajs.currentOpenMenu && spajs.currentOpenMenu.id)
        {
            $("body").removeClass("spajs-active-"+spajs.currentOpenMenu.id)
        }
        else
        {
            //error("Не удалён предыдущий класс меню", spajs.currentOpenMenu, menuInfo)
        }
        $(spajs.opt.holder).addClass("spajs-active-"+menuInfo.id);

        tabSignal.emit("spajsOpen", {menuInfo:menuInfo, data:data})
        var res = menuInfo.onOpen(jQuery('#spajs-right-area'), menuInfo, data);
        if(res)
        {
            // in-loading
            $("body").addClass("in-loading")

            //console.time("Mopen")
            jQuery("#spajs-menu-"+menuInfo.id).addClass("menu-loading")
            setTimeout(function(){
                $.when(res).done(function()
                {
                    //console.timeEnd("Mopen")
                    jQuery("#spajs-menu-"+menuInfo.id).removeClass("menu-loading")

                    // in-loading
                    $("body").removeClass("in-loading")
                    def.resolve()
                }).fail(function(e)
                {
                    //console.timeEnd("Mopen")
                    jQuery("#spajs-menu-"+menuInfo.id).removeClass("menu-loading")

                    // in-loading
                    $("body").removeClass("in-loading")

                    def.reject(e)
                })
            }, 0)
        }
        else
        {
            $("body").removeClass("in-loading")
            def.resolve()
            res = def
        }

        // Выделяем нашу комнату как активную в меню с лева
        jQuery("#left_sidebar li").removeClass("active")
        jQuery("#spajs-menu-"+menuInfo.id).addClass("active")

        spajs.currentOpenMenu = menuInfo;

        if(opt.callback)
        {
            opt.callback();
        }

        return res.promise();
    }

    /**
     * Показывает анимацию загрузки на экране.
     * @param {promise} promise
     * @returns {undefined}
     */
    spajs.showLoader = function(promise)
    {
        if(!promise)
        {
           var def = new $.Deferred();
           def.resolve()
           return def.promise();
        }

        // in-loading
        $("body").addClass("in-loading")
        $.when(promise).then(function()
        {
            $("body").removeClass("in-loading")
        }).fail(function()
        {
            // in-loading
            $("body").removeClass("in-loading")
        })

        return promise
    }

    /**
     * Открывает окно с произвольным содержимым
     * @param string menuId
     * @param array addUrlParams Дополнительная информация которая будет передана в .onOpen для обработчика пункта меню
     * @param boolean notAddToHistory не добавлять переход в историю браузера
     * @param object event_state
     * @public
     *
     * @note выполняется синхронно но вот событие onOpen у пункта меню может работать не синхронно и зависит от реализыции колбека навешаного на onOpen
     * @deprecated Заменён методом spajs.open
     */
    spajs.openMenu = function(menuId, addUrlParams, notAddToHistory, event_state)
    {
        return spajs.open({
            menuId: menuId,
            addUrlParams: addUrlParams,
            notAddToHistory: notAddToHistory,
            event_state: event_state
        })
    }

    //******************************************************************************
    //* Функции для работы с ajax запросами
    //******************************************************************************

    spajs.ajax = function(){
        return this;
    }

    spajs.opt.ajax = {}

    spajs.ajax.headers = {}
    spajs.ajax.setHeader = function(header, data)
    {
        spajs.ajax.headers[header] = data
    }


    spajs.ajax.showErrors = function(data)
    {
        if(typeof data === "string")
        {
            $.notify(data, "error");
            return;
        }

        if(data && data.responseJSON)
        {
            return spajs.ajax.showErrors(data.responseJSON)
        }
        
        if(data && data.message)
        {
            return spajs.ajax.showErrors(data.message)
        }

        for(var i in data)
        {
            if(i == "error_type" || i == "result")
            {
                continue;
            }

            if(typeof data[i] === "string")
            {
                $.notify(data[i], "error");
            }
            else if(typeof data[i] === "object")
            {
                spajs.ajax.showErrors(data[i])
            }
        }
    }

    /**
     * Обрабатывает ошибки присланные аяксом
     * @param {array} data
     * @returns Boolean
     * @private
     */
    spajs.ajax.ErrorTest = function(data)
    {
        if(data && (data.status === 401 /*|| data.status === 403*/ ))
        {
            window.location.reload()
            return true;
        }

        if(data && data.status === 500)
        {
            $.notify("Ошибка 500", "error");
            return true;
        }

        if(data && data.status === 422 && data.responseJSON)
        {
            spajs.ajax.showErrors(data.responseJSON)
            return true;
        }

        if(data && data.result === false)
        {
            spajs.ajax.showErrors(data)
            return true;
        }

        if(data && data.error)
        {
            $.notify(data.error, "error");
            return true;
        }
        return false;
    }

    /**
     * Вернёт строку из переменных и их значений для добавления к запросу.
     * @returns {String}
     * @private
     */
    spajs.ajax.getPostVars = function()
    {
        var url = []
        for(var i in spajs.opt.ajax.post)
        {
            url.push(i+"=" + spajs.opt.ajax.post[i])
        }

        return url.join("&")
    }


    /**
     * Вернёт хеш для переданной строки
     * @param {String} str
     * @returns {Number}
     * @private
     */
    spajs.ajax.gethashCode = function(str)
    {
        var hash = 0;
        if (!str || str.length == 0) return hash;
        for (var i = 0; i < str.length; i++)
        {
            hash = ((hash<<5)-hash)+str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }


    /**
     * Вернёт статус сети Online=true
     * @returns {navigator.onLine|window.navigator.onLine|Boolean}
     */
    spajs.isOnline = function()
    {
        return navigator.onLine
    }

    /**
     * Массив для накопления кеша запросов с ключём useCache
     * @type array
     */
    spajs.ajax.ajaxCache = {}

    /**
     * Массив для накопления очереди запросов на случай если мы ушли в офлайн
     * @type array
     */
    spajs.ajax.ajaxQueue = []

    /**
     * Вспомагательная функция для удаления запроса из очереди запросов
     * @private
     */
    spajs.ajax.Abort = function()
    {
        spajs.ajax.ajaxQueue[this.IndexInQueue] = undefined
    }

    /**
     * Ключ useCache - включает кеширование запросов для использование если отвалится интернет
     * Ключ reTryInOnline - включает помещение запросов в очередь если нет интернета до тех пор пока интернет не появится.
     * @param {type} opt
     * @returns {Boolean|undefined|jQuery.ajax}
     */
    spajs.ajax.Call = function(opt)
    {
         /*
          * @note
          * Во первых кеш должен протухать с какой то переодичностью
          * Во вторых он должен учитывать данные авторизации
          */
       
        if(opt.key === undefined)
        {
            opt.key = opt.type+"_"+opt.url+"_"+spajs.ajax.gethashCode(JSON.stringify(opt.data))
        }
        if(!spajs.isOnline() && spajs.ajax.ajaxCache[opt.key])
        {
            if(opt.error) // Отключил кеширование
            {
                opt.error();
            }
            //opt.success(spajs.ajax.ajaxCache[opt.key])
            return {useCache:false, addToQueue:false, ignor:false, abort:function(){}};
        }

        if(!spajs.isOnline() && opt.reTryInOnline)
        {
            opt.abort = spajs.ajax.Abort;
            opt.useCache = false;
            opt.addToQueue = false;
            opt.ignor = true;

            spajs.ajax.ajaxQueue.push(opt)
            return opt;
        }

        if(!spajs.isOnline())
        {
            if(opt.error)
            {
                opt.error();
            }
            return {useCache:false, addToQueue:false, ignor:true, abort:function(){}};
        }


        var def = new $.Deferred();
        var defpromise = def.promise()

        var successCallBack = opt.success
        var errorCallBack = opt.error

        opt.success = function(data, status, xhr)
        {
            if(opt.useCache)
            {
                //spajs.ajax.ajaxCache[opt.key] = data  // Отключил кеширование
            } 
            if(successCallBack) successCallBack(data, status, xhr)
            def.resolve(data, status, xhr)
        }

        opt.error = function(data, status, xhr)
        {
            var headers = data.getAllResponseHeaders()
            if( data.status == 401 || ( data.status == 403 && headers.indexOf("x-anonymous:") != -1 ) )
            {
                window.location.reload() 
            }
            else if(errorCallBack)
            {
                errorCallBack(data, status, xhr) 
                def.reject(data, status, xhr)
            }
            else
            { 
                def.reject(data, status, xhr)
            }
        }

        if(!opt.beforeSend)
        {
            opt.beforeSend = function(xhr)
            {
                for(var i in spajs.ajax.headers)
                {
                    xhr.setRequestHeader (i, spajs.ajax.headers[i]);
                }
            }
        }

        var res = jQuery.ajax(opt);
        res.useCache = false;
        res.addToQueue = false;
        res.ignor = false;
        
        defpromise.abort = function()
        {
            res.abort()
        }

        return defpromise
    }

    spajs.ajax.ajaxCallFromQueue = function()
    {
        for(var i in spajs.ajax.ajaxQueue)
        {
            jQuery.ajax(spajs.ajax.ajaxQueue[i]);
        }
        spajs.ajax.ajaxQueue = []
    } 
}
