/**
 * @author Trapenok Victor (Трапенок Виктор Викторович), Levhav@ya.ru, 89244269357
 * Буду рад новым заказам на разработку чего ни будь.
 *
 * Levhav@ya.ru
 * Skype:Levhav
 * 89244269357
 * @link http://comet-server.com
 *
 */

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

            text = text.replace(/%[0-9]{1,2}s/img, "");

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


/**
 * Класс приложения single page application
 * @returns {spajs}
 */
var spajs = function()
{
    return this;
}

spajs.version = "2.01";

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

    var root = {}
    var tplArray =  jQuery("script[data-just]")
    for(var i=0; i< tplArray.length; i++)
    {
        var val = jQuery(tplArray[i]);
        root[val.attr("data-just")] = val.html()
            }

    spajs.just = new JUST({
            root : root
    });
     
    /*
    // Фиксируем факт того что страница не активна http://javascript.ru/forum/events/2498-kak-opredelit-aktivnoe-okno-vkladku.html
    jQuery(window).blur(function() {
        // Здесь что угодно после ухода в другую вкладку
        spajs.isActiveTab = false;
    });

    // Фиксируем факт того что страница активна
    jQuery(window).focus(function() {
        // Здесь что угодно после возвращения во вкладку
        spajs.isActiveTab = true;

        // Уведомим всех о том что одна из вкладок чата активирована
        tabSignal.emitAll("onAnyTabActivated", { })
    });

    var lastOnlineStatus = undefined;
    setInterval(function()
    {
        var status = spajs.isOnline();
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
                }, 1000)
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
    */

    if(spajs.opt.useHistoryApi)
    {
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
 * @returns {boolean} вернёт false если ссылка открылась
 * 
 * @example <a href="/?spa=backup" onclick="return spajs.openURL(this.href);">Backup</a>
 */
spajs.openURL = function(url, title)
{
    history.pushState({url:url}, title, url);
    return !spajs.openMenuFromUrl(url)
}

/**
 * Открывает пункт меню на основе параметров из url ( window.location.href )
 * Ищет в адресе парамет spajs.opt.menu_url и на основе его значения открывает пункт меню.
 * @returns {boolean} Если параметр не найден или информации в нём содержится о не зарегистрированном menuId то вернёт false
 */
spajs.openMenuFromUrl = function(event_state)
{
    if(!spajs.opt.menu_url)
    {
        return false;
    }

    var menuId = spajs.getUrlParam(spajs.opt.menu_url, event_state)
    return spajs.open({
        menuId: menuId,
        addUrlParams: {},
        notAddToHistory: true
    })
}

spajs.setUrlParam = function(params, title)
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
            new_url = new_url.replace(new RegExp(name+"=([^&\/]+|)"), "");
        }
        else
        {
            if(!new_url.match(new RegExp(name+"=([^&\/]+|)")))
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
                new_url = new_url.replace(new RegExp(name+"=([^&\/]+|)"), name + "=" + value);
            }
        }
    }

    var url = new_url.replace(/&+/img, "&").replace(/&+$/img, "").replace(/\?+$/img, "").replace(/\?&+/img, "?")
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
            if(param.length == 2)
            {
                res[param[i][0]] = param[i][1].replace(/#$/, "");
            }
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
    if(targetBlock === undefined) targetBlock = $("#left_sidebar");
    var sortmenu = targetBlock.children();

    sortmenu.sort(function f(a, b)
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
        hideMenu:true,                  // Если задать false то меню не будет спрятано. (Имеет смысл только когда меню прячется по умолчанию. )
        /*
         *  callback вызываемый по открытии этого пункта меню
         *  @param object holder html элемент в списке меню
         *  @param object menuInfo Информация о том пункет меню на который совершён переход
         *  @param object data Объект с данными урла, { reg:{}, url:{} } где reg - совпадения в регулярке, url - данные всех параметров урла
         * /
        onOpen:function(holder, menuInfo, data)
        {
            jQuery(holder).insertTpl(jQuery("#terms_of_use").html())
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
        return;
    }

    var defMenu = {
        hideMenu:true
    }
    var targetBlock = $("#left_sidebar")

    for(var i in spajs.opt.menu)
    {
        if(spajs.opt.menu[i].id == menu.id)
        {
            // Такой пункт уже есть в меню
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
        targetBlock.append('<li data-index="'+menu.priority+'" id="spajs-menu-'+menu.id+'" >'+menu.menuHtml+'</li>');
    }
    else if(menu.type == "hidden")
    {
        // Невидимый пункт меню.
    }

    spajs.sortMenu()
    if(menu.onInsert)
    {
        menu.onInsert($("#spajs-menu-"+menu.id))
    }
}


spajs.currentOpenMenu = undefined

spajs.close = function()
{
    spajs.openURL("")
}

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

    var def = new $.Deferred();
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
        console.error("URL не зарегистрирован", opt.menuId, opt)
        def.reject()
        return def.promise();
    }

    if(spajs.currentOpenMenu && menuInfo.id == spajs.currentOpenMenu.id && !opt.reopen)
    {
        console.warn("Повторное открытие меню", menuInfo)
        def.reject()
        return def.promise();
    }


    if(opt.addUrlParams === undefined)
    {
        opt.addUrlParams = {}
    }

    opt.addUrlParams[spajs.opt.menu_url] = opt.menuId;
    if(!opt.notAddToHistory)
    {
        var url = spajs.setUrlParam(opt.addUrlParams, menuInfo.title || menuInfo.name)
        if(opt.event_state)
        {
            opt.event_state.url = url;
        }
    }

    if(spajs.currentOpenMenu)
    {
        $(spajs.opt.holder).removeClass("spajs-active-"+spajs.currentOpenMenu.id);
    }

    if(spajs.currentOpenMenu && spajs.currentOpenMenu.onClose)
    {
        console.log("onClose", spajs.currentOpenMenu)
        spajs.currentOpenMenu.onClose(menuInfo);
    }

    var data = {}
    data.url = spajs.getAllUrlParam(opt.event_state)
    data.reg = regExpRes

    if(menuInfo.hideMenu)
    {
        $(spajs.opt.holder).addClass("spajs-spa-show-page");
    }


    console.log("onOpen", menuInfo)
    if(spajs.currentOpenMenu && spajs.currentOpenMenu.id)
    {
        $("body").removeClass("spajs-active-"+spajs.currentOpenMenu.id)
    }
    else
    {
        console.error("Не удалён предыдущий класс меню", spajs.currentOpenMenu, menuInfo)
    }
    $(spajs.opt.holder).addClass("spajs-active-"+menuInfo.id);

    tabSignal.emit("spajsOpen", {menuInfo:menuInfo, data:data})
    var res = menuInfo.onOpen(jQuery('#spajs-right-area'), menuInfo, data);
    if(res)
    {
        // in-loading
        $("body").addClass("in-loading")

        console.time("Mopen")
        jQuery("#spajs-menu-"+menuInfo.id).addClass("menu-loading")
        setTimeout(function(){
            $.when(res).done(function()
            {
                console.timeEnd("Mopen")
                jQuery("#spajs-menu-"+menuInfo.id).removeClass("menu-loading")

                // in-loading
                $("body").removeClass("in-loading")
                def.resolve()
            }).fail(function()
            {
                console.timeEnd("Mopen")
                jQuery("#spajs-menu-"+menuInfo.id).removeClass("menu-loading")

                // in-loading
                $("body").removeClass("in-loading")

                def.reject()
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

spajs.reOpenMenu = function(menuId, addUrlParams, event_state)
{
    if(spajs.getUrlParam(spajs.opt.menu_url) == menuId)
    {
        return spajs.openMenu(menuId, addUrlParams, true, event_state);
    }
}

/**
 * Плагин для вставки шаблона в тело элемента
 * @param {string} tplText
 *
 * После вставки переданого хтимл кода выполняет js код который был в блоках <js=   =js>
 * Например строка "html  <js= console.log("test"); =js> html" будет вставлено "html html" и потом выполнено console.log("test");
 * 
 * @note При не достаточном контроле за валидацией данных может стать причиной xss так что надо использовать крайне аккуратно.
 */
jQuery.fn.insertTpl = function(tplText)
{
    if(!tplText)
    {
        this.each(function()
        {
            jQuery(this).html("")
        });

        return this;
    }

    if(typeof tplText !== "string")
    {
        tplText = ""+tplText
    }

    var html = tplText.replace(/<js=(.*?)=js>/g, "")
    var js = tplText.match(/<js=(.*?)=js>/g)

    this.each(function()
    {
        jQuery(this).html(html)
    });

    for(var i in js)
    {
        if(js[i] && js[i].length > 8);
        {
            var code = js[i].substr(4, js[i].length - 8)
            console.log(i, code)
            eval(code);
        }
    }

    return this;
};

jQuery.fn.appendTpl = function(tplText)
{
    if(!tplText)
    {
        return this;
    }

    if(typeof tplText !== "string")
    {
        tplText = ""+tplText
    }

    var html = tplText.replace(/<js=(.*?)=js>/g, "")
    var js = tplText.match(/<js=(.*?)=js>/g)

    this.each(function()
    {
        jQuery(this).append(html)
    });

    for(var i in js)
    {
        if(js[i] && js[i].length > 8);
        {
            var code = js[i].substr(4, js[i].length - 8)
            console.log(i, code)
            eval(code);
        }
    }

    return this;
};

jQuery.fn.prependTpl = function(tplText)
{
    if(!tplText)
    {
        return this;
    }

    if(typeof tplText !== "string")
    {
        tplText = ""+tplText
    }

    var html = tplText.replace(/<js=(.*?)=js>/g, "")
    var js = tplText.match(/<js=(.*?)=js>/g)

    this.each(function()
    {
        jQuery(this).prepend(html)
    });

    for(var i in js)
    {
        if(js[i] && js[i].length > 8);
        {
            var code = js[i].substr(4, js[i].length - 8)
            console.log(i, code)
            eval(code);
        }
    }

    return this;
};

/**
 * Вернёт статус сети Online=true
 * @returns {navigator.onLine|window.navigator.onLine|Boolean}
 */
spajs.isOnline = function()
{
    return navigator.onLine
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
        jQuery.notify(data, "error");
        return;
    }

    if(data.message)
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
            jQuery.notify(data[i], "error");
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
    if(data && data.status === 401)
    {
        spajs.open({ menuId:"auth", notAddToHistory:true})
        return true;
    }

    if(data && data.status === 500)
    {
        jQuery.notify("Ошибка 500", "error");
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
        jQuery.notify(data.error, "error");
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
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++)
    {
        hash = ((hash<<5)-hash)+str.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
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
    if(opt.key === undefined)
    {
        opt.key = opt.type+"_"+opt.url+"_"+spajs.ajax.gethashCode(JSON.stringify(opt.data))
    }
    if(!spajs.isOnline() && spajs.ajax.ajaxCache[opt.key])
    {
        opt.success(spajs.ajax.ajaxCache[opt.key])
        return {useCache:true, addToQueue:false, ignor:false, abort:function(){}};
    }

    if(!spajs.isOnline() && opt.reTryInOnline)
    {
        opt.abort = spajs.ajax.Abort;
        opt.useCache = false;
        opt.addToQueue = true;
        opt.ignor = false;

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


    var successCallBack = opt.success
    var errorCallBack = opt.error

    opt.success = function(data)
    {
        if(opt.useCache)
        {
            spajs.ajax.ajaxCache[opt.key] = data
        }
        successCallBack(data)
    }

    opt.error = function(data)
    {
        if(errorCallBack)
        {
            errorCallBack(data)
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

    return res
}

spajs.ajax.ajaxCallFromQueue = function()
{
    for(var i in spajs.ajax.ajaxQueue)
    {
        jQuery.ajax(spajs.ajax.ajaxQueue[i]);
    }
    spajs.ajax.ajaxQueue = []
}
