var widget_sort={};

guiDashboard.model.className = "guiDashboard"

guiDashboard.model.count = {
    projects:'-',
    inventories:'-',
    hosts:'-',
    groups:'-',
    users:'-',
    history:'-',
}

guiDashboard.statsData={
    projects:'-',
    inventories:'-',
    hosts:'-',
    groups:'-',
    users:'-',
    templates:'-'
}

guiDashboard.tpl_name = 'pmDashboard'

guiDashboard.statsDataLast=14;
guiDashboard.statsDataLastQuery=14;
guiDashboard.statsDataMomentType='day';


/**
 * Двумерный массив с описанием списка отображаемых виджетов в каждой строке
 *
 * @example
 * [
 *  [{
        name:'pmwTemplatesCounter',  // Имя класса виджета
        opt:{},                      // Опции для виджета
    }]
 ]
 *
 * @type Array
 */
guiDashboard.model.widgets = [
    [

    ],
]

/*
*Двумерный массив, хранящий в себе настройки виджетов по умолчанию.
 */
guiDashboard.model.defaultWidgets = [
    [
        /**/{
        name:'pmwTemplatesCounter',
        title:'Templates Counter',
        sort:1,
        active:true,
        opt:{},
        type:1,
        collapse:false,
    },
        {
            name:'pmwProjectsCounter',
            title:'Projects Counter',
            sort:2,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwInventoriesCounter',
            title:'Inventories Counter',
            sort:3,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwHostsCounter',
            title:'Hosts Counter',
            sort:4,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwGroupsCounter',
            title:'Groups Counter',
            sort:5,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwUsersCounter',
            title:'Users Counter',
            sort:6,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwAnsibleModuleWidget',
            title:'Run shell command',
            sort:7,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },
        {
            name:'pmwChartWidget',
            title:'Tasks history',
            sort:8,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },
        /*{
            name:'pmwTasksTemplatesWidget',
            title:'Templates Task',
            sort:8,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },
        {
            name:'pmwModulesTemplatesWidget',
            title:'Templates Module',
            sort:9,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },*//**/
    ],
]

/*
 * Массив, хранящий в себе настройки линий графика на странице Dashboard'а.
 */
guiDashboard.model.ChartLineSettings = [

]

/*
 * Массив, хранящий в себе настройки по умолчанию линий графика на странице Dashboard'а.
 */
guiDashboard.model.defaultChartLineSettings = [
    {
        name: "all_tasks",
        title: "All tasks",
        color: "#1f77b4",
        active: true
    },
    {
        name: "ok",
        title: "OK",
        color: "#276900",
        active: true
    },
    {
        name: "error",
        title: "ERROR",
        color: "#333333",
        active: true
    },
    {
        name: "interrupted",
        title: "INTERRUPTED",
        color: "#9b97e4",
        active: true
    },
    {
        name: "delay",
        title: "DELAY",
        color: "#808419",
        active: true
    },
    {
        name: "offline",
        title: "OFFLINE",
        color: "#9e9e9e",
        active: true
    }
]

guiDashboard.model.autoupdateInterval = 15000;

/**
 * Функция полностью копирует настройки для линий графика.
 * Подразумевается, что данная функция вызывается, когда пришел из API пустой JSON.
 */
guiDashboard.cloneChartLineSettingsTotally = function(){
    guiDashboard.model.ChartLineSettings = JSON.parse(JSON.stringify(guiDashboard.model.defaultChartLineSettings));
    return guiDashboard.model.ChartLineSettings;
}

/**
 * Функция обновляет часть настроек линий графика, данные по которым пришли из API.
 * Подразумевается, что данная функция вызывается, когда пришел из API непустой JSON.
 */
guiDashboard.cloneChartLineSettingsFromApi = function(data){
    guiDashboard.model.ChartLineSettings = JSON.parse(JSON.stringify(guiDashboard.model.defaultChartLineSettings));
    for(var i in guiDashboard.model.ChartLineSettings)
    {
        for(var j in data)
        {
            if(guiDashboard.model.ChartLineSettings[i].name == j)
            {
                for(var k in data[j])
                {
                    if(guiDashboard.model.ChartLineSettings[i].hasOwnProperty(k))
                    {
                        guiDashboard.model.ChartLineSettings[i][k] = data[j][k];
                    }
                }
            }
        }
    }
    return guiDashboard.model.ChartLineSettings;
}

/**
 * Функция полностью копирует настройки по умолчанию для виджетов.
 * Подразумевается, что данная функция вызывается, когда пришел из API пустой JSON.
 */
guiDashboard.cloneDefaultWidgetsTotally = function(){
    for(var i in guiDashboard.model.defaultWidgets[0])
    {
        guiDashboard.model.widgets[0][i]={};
        for (var j in guiDashboard.model.defaultWidgets[0][i])
        {
            guiDashboard.model.widgets[0][i][j]=guiDashboard.model.defaultWidgets[0][i][j];
        }
    }
    console.log(guiDashboard.model.widgets[0]);
    return guiDashboard.model.widgets[0];
}

/**
 * Функция копирует "статичные" настройки по умолчанию для виджетов.
 * Под "статичными" понимается name, title, opt, type.
 * Данные настройки не меняются в ходе работы пользователя с интерфейсом.
 * Подразумевается, что данная функция вызывается, когда пришел из API непустой JSON.
 */
guiDashboard.cloneDefaultWidgetsStaticSettingsOnly = function(){
    for(var i in guiDashboard.model.defaultWidgets[0])
    {
        guiDashboard.model.widgets[0][i]={};
        guiDashboard.model.widgets[0][i].name=guiDashboard.model.defaultWidgets[0][i].name;
        guiDashboard.model.widgets[0][i].title=guiDashboard.model.defaultWidgets[0][i].title;
        guiDashboard.model.widgets[0][i].opt=guiDashboard.model.defaultWidgets[0][i].opt;
        guiDashboard.model.widgets[0][i].type=guiDashboard.model.defaultWidgets[0][i].type;
    }
    return guiDashboard.model.widgets[0];
}

/**
 * Функция добавляет виджету оставшиеся(не "статичные") настройки.
 * Функция проверяет есть ли соответсвуют ли пришедшие настройки для виджетов из API тем,
 * что хранятся в массиве с настройками по умолчанию.
 * Если данное свойство соответсвует, то его значение присваивается настройкам виджета.
 * В противном случае ему присваивается настройка по умолчанию.
 */
guiDashboard.clonetWidgetsSettingsFromApiAndVerify = function(data){
    guiDashboard.cloneDefaultWidgetsStaticSettingsOnly();
    for(var i in guiDashboard.model.defaultWidgets[0])
    {
        for(var j in data)
        {
            if(guiDashboard.model.defaultWidgets[0][i].name==j)
            {
                for (var k in guiDashboard.model.defaultWidgets[0][i])
                {
                    if(k in data[j]){
                        guiDashboard.model.widgets[0][i][k]=data[j][k];
                    }
                    else
                    {
                        guiDashboard.model.widgets[0][i][k]=guiDashboard.model.defaultWidgets[0][i][k];
                    }
                }
            }
        }
    }
    return guiDashboard.model.widgets[0];
}

/**
 * Функция проверяет необходимо ли посылать запрос к API для загрузки
 * пользовательских настроек Dashboard'a (настройки виджетов, настройки линий графика).
 * Например, если в модели отсутствует какой-либо виджет,
 * либо у виджета отсутсвует какое-нибудь свойство,
 * то запрос к API будет отправлен.
 * @param {Object} defaultObj - объект с настройками по умолчанию
 * @param {Object} currentObj - объект с текущими настройками
 *
 */
guiDashboard.checkNecessityToLoadDashboardSettingsFromApi = function(defaultObj, currentObj)
{
    var bool1 = false, bool2 = false;
    for (var i in defaultObj){
        for (var j in currentObj)
        {
            if(defaultObj[i].name == currentObj[j].name)
            {
                for(var k in defaultObj[i])
                {
                    if(!(k in currentObj[j])){
                        bool1 = true;
                    }

                }
            }
        }
    }

    if(defaultObj.length != currentObj.length)
    {
        bool2 = true;
    }

    if(bool1 || bool2)
    {
        //нужно послать запрос к api
        return true;
    }
    else
    {
        //не нужно посылать запрос к api
        return false;
    }
}

/**
 *Функция создает объект, в который вносит актуальные настройки виджета,
 *на основе изменений, внесенных в guiDashboard.model.widgets[0][i].
 *localObj- guiDashboard.model.widgets[0][i]
 * @type Object
 */
guiDashboard.getNewWidgetSettings = function(localObj)
{
    var obj={};
    obj.sort=localObj.sort;
    obj.active=localObj.active;
    obj.collapse=localObj.collapse;
    return obj;
}

/**
 *Функция заправшивает у API пользовательские настройки
 *(настройки виджетов, настройки линий графика, интервал автообновлений).
 *Если они есть(пришел не пустой объект), то данные настройки добавляются в guiDashboard.model.
 */
guiDashboard.getUserSettingsFromAPI = function()
{
    var userId=window.my_user_id;
    if(guiDashboard.checkNecessityToLoadDashboardSettingsFromApi(guiDashboard.model.defaultWidgets[0], guiDashboard.model.widgets[0]) ||
        guiDashboard.checkNecessityToLoadDashboardSettingsFromApi(guiDashboard.model.defaultChartLineSettings, guiDashboard.model.ChartLineSettings))
    {
        let query = {
            method: "get",
            data_type: ["user", userId, "settings"],
        }

        let def = new $.Deferred();
        $.when(api.query(query, true)).done(function(answer)
        {
            let data = answer.data
            guiDashboard.setUserSettingsFromApiAnswer(data);
            def.resolve()
        }).fail(e => {
            console.warn(e)
            webGui.showErrors(e)
            def.reject()
        })

        return def.promise()
    }
    else
    {
        return false;
    }
}

/*
* Function sets users settings from API to guiDashboard object.
* @param - object - data - data from API
* */
guiDashboard.setUserSettingsFromApiAnswer = function(data)
{
    if ($.isEmptyObject(data.widgetSettings))
    {
        guiDashboard.cloneDefaultWidgetsTotally();
    }
    else
    {
        guiDashboard.clonetWidgetsSettingsFromApiAndVerify(data.widgetSettings);
        guiDashboard.model.widgets[0].sort(guiDashboard.sortCountWidget);
    }

    if ($.isEmptyObject(data.chartLineSettings))
    {
        guiDashboard.cloneChartLineSettingsTotally();
    }
    else
    {
        guiDashboard.cloneChartLineSettingsFromApi(data.chartLineSettings);
    }

    if(data.autoupdateInterval)
    {
        guiDashboard.cloneAutoupdateIntervalFromApi(data.autoupdateInterval);
    }
    else
    {
        guiDashboard.cloneDefaultAutoupdateInterval()
    }
}

/*
 * Function saves autoupdate interval from API into guiDashboard and into local storage.
 * @param (number) - interval - autoupdate interval
 */
guiDashboard.cloneAutoupdateIntervalFromApi = function(interval)
{
    guiDashboard.model.autoupdateInterval = interval;
    guiLocalSettings.set('page_update_interval', guiDashboard.model.autoupdateInterval)
}

/*
 * Function sets default autoupdate interval.
 */
guiDashboard.cloneDefaultAutoupdateInterval = function()
{
    guiLocalSettings.setIfNotExists('page_update_interval', guiDashboard.model.autoupdateInterval)
}

/**
 *Функция сохраняет в API пользовательские настройки Dashboard'a
 *(настройки виджетов, настройки линий графика).
 */
guiDashboard.putUserDashboardSettingsToAPI = function()
{
    var userId=window.my_user_id;
    var widgetSettings= {};
    for(var i in  guiDashboard.model.widgets[0]){
        var objName=guiDashboard.model.widgets[0][i].name;
        widgetSettings[objName]=guiDashboard.getNewWidgetSettings(guiDashboard.model.widgets[0][i]);
    }
    var chartLineSettings = {};
    for(var i in guiDashboard.model.ChartLineSettings){
        var objName=guiDashboard.model.ChartLineSettings[i].name;
        chartLineSettings[objName]={active: guiDashboard.model.ChartLineSettings[i].active};
    }

    let query = {
        method: "post",
        data_type: ["user", userId, "settings"],
        data:{widgetSettings:widgetSettings, chartLineSettings:chartLineSettings}
    }

    let def = new $.Deferred();

    $.when(api.query(query, true)).fail(e => {
        console.warn(e)
        webGui.showErrors(e)
        def.reject()
    })

    return def.promise()
}

/**
 *Функция, сортирующая массив объектов.
 */
guiDashboard.sortCountWidget=function(Obj1, Obj2)
{
    return Obj1.sort-Obj2.sort;
}

/**
 *Функция, меняющая свойство виджета active на false.
 */
guiDashboard.setNewWidgetActiveValue = function(thisButton)
{
    var widgetName=thisButton.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("id");
    for(var i in guiDashboard.model.widgets[0])
    {
        if(guiDashboard.model.widgets[0][i].name==widgetName)
        {
            guiDashboard.model.widgets[0][i].active=false;
        }
    }
    guiDashboard.putUserDashboardSettingsToAPI();
}

/**
 *Функция, меняющая свойство виджета collapse на противоположное (true-false).
 */
guiDashboard.setNewWidgetCollapseValue = function(thisButton)
{
    var widgetName=thisButton.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("id");
    for(var i in guiDashboard.model.widgets[0])
    {
        if(guiDashboard.model.widgets[0][i].name==widgetName)
        {
            guiDashboard.model.widgets[0][i].collapse=!guiDashboard.model.widgets[0][i].collapse;

            //скрываем селект с выбором периода на виджете-графике при его сворачивании
            if(widgetName=="pmwChartWidget")
            {
                if(guiDashboard.model.widgets[0][i].collapse==false)
                {
                    $("#period-list").slideDown(400);
                }
                else
                {
                    $("#period-list").slideUp(400);
                }
            }
        }
    }
    guiDashboard.putUserDashboardSettingsToAPI();
}

/**
 *Функция, сохраняющая настройки виджетов/линий графика,
 *внесенные в таблицу редактирования настроек Dashboard'a.
 */
guiDashboard.getOptionsFromTable = function(table_id, guiDashboard_obj)
{
    var modalTable=document.getElementById(table_id);
    var modalTableTr=modalTable.getElementsByTagName("tr");
    for(var i=1; i<modalTableTr.length; i++)
    {
        var guiDashboard_obj_name=modalTableTr[i].getAttribute("rowname");
        var modalTableTrTds=modalTableTr[i].children;
        for(var j=0; j<modalTableTrTds.length; j++)
        {
            var valueName=modalTableTrTds[j].getAttribute("valuename");

            if(valueName)
            {
                var classList1=modalTableTrTds[j].children[0].classList;
                var selected=false;
                for(var k in classList1)
                {
                    if(classList1[k]=="selected")
                    {
                        selected=true;
                    }
                }
                for(var z in  guiDashboard_obj)
                {
                    if(guiDashboard_obj[z].name==guiDashboard_obj_name)
                    {
                        guiDashboard_obj[z][valueName]=selected;
                    }
                }
            }
        }
    }
}

/**
 *Функция, сохраняющая настройки виджетов, внесенные в форму настроек виджетов Dashboard'a.
 */
guiDashboard.saveWigdetsOptions = function()
{
    guiDashboard.getOptionsFromTable("modal-table",guiDashboard.model.widgets[0]);
    guiDashboard.putUserDashboardSettingsToAPI();
}

/**
 *Функция, сохраняющая настройки виджетов, внесенные в форму настроек виджетов Dashboard'a,
 *из модального окна на странице Dashboard'a.
 */
guiDashboard.saveWigdetsOptionsFromModal = function()
{
    return $.when(guiDashboard.saveWigdetsOptions()).done(function(){
        return $.when(hidemodal(), guiDashboard.HideAfterSaveModalWindow()).done(function(){
            return spajs.openURL("/");
        }).promise();
    }).promise();

}

/**
 *Функция, сохраняющая настройки виджетов, внесенные в форму настроек виджетов Dashboard'a,
 *из секции на странице профиля пользователя.
 */
guiDashboard.saveWigdetsOptionsFromProfile = function()
{
    return $.when(guiDashboard.saveWigdetsOptions()).done(function(){
        return guiPopUp.success("Dashboard widget options were successfully saved");
    }).fail(function(){
        return guiPopUp.error("Dashboard widget options were not saved");
    }).promise();
}

/**
 *Функция, сохраняющая настройки линий графика Dashboard'a.
 */
guiDashboard.saveChartLineSettings = function()
{
    guiDashboard.getOptionsFromTable("chart_line_settings_table", guiDashboard.model.ChartLineSettings);
    guiDashboard.putUserDashboardSettingsToAPI();
}

/**
 *Функция, сохраняющая настройки линий графика, внесенных в форму настроек виджетов Dashboard'a,
 *из секции на странице профиля пользователя.
 */
guiDashboard.saveChartLineSettingsFromProfile = function()
{
    return $.when(guiDashboard.saveChartLineSettings()).done(function(){
        return guiPopUp.success("Dashboard chart lines settings were successfully saved");
    }).fail(function(){
        return guiPopUp.error("Dashboard chart lines settings were not saved");
    }).promise();
}

/**
 *Функция, сохраняющая все настройки, касающиеся Dashboard'a, со страницы профиля пользователя.
 */
guiDashboard.saveAllDashboardSettingsFromProfile = function(){
    guiDashboard.getOptionsFromTable("modal-table",guiDashboard.model.widgets[0]);
    guiDashboard.getOptionsFromTable("chart_line_settings_table", guiDashboard.model.ChartLineSettings);
    return $.when(guiDashboard.putUserDashboardSettingsToAPI()).done(function(){
        return guiPopUp.success("Dashboard settings were successfully saved");
    }).fail(function(){
        return guiPopUp.error("Dashboard settings were not saved");
    }).promise();
}

/**
 * Функция, которая формирует массив данных для кривых графика по отдельному статусу
 */
guiDashboard.getDataForStatusChart = function(tasks_data, tasks_data_t, status)
{
    for(var i in tasks_data) {
        tasks_data[i]=0;
    }

    for(var i in guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType])
    {
        var val = guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType][i];
        var time =+ moment(val[guiDashboard.statsDataMomentType]).tz(window.timeZone).format("x");

        if(val.status==status){
            tasks_data[time] = val.sum;
            tasks_data_t.push(time)
        }
    }

    var chart_tasks_data1 = [status];

    for(var j in tasks_data_t)
    {
        var time = tasks_data_t[j]
        chart_tasks_data1.push(tasks_data[time]/1);
    }
    return chart_tasks_data1;

}

/**
 * Функция, отправляющая запрос /api/v2/stats/,
 * который дает нам информацию для виджетов класса pmwItemsCounter,
 * а также для графика на странице Dashboard.
 */
guiDashboard.loadStats=function()
{
    var thisObj = this;

    /*var limit=1;
    return spajs.ajax.Call({
        url: hostname + "/api/v2/stats/?last="+guiDashboard.statsDataLastQuery,
        type: "GET",
        contentType: 'application/json',
        data: "limit=" + encodeURIComponent(limit)+"&rand="+Math.random(),
        success: function (data)
        {
            thisObj.statsData=data;
        },
        error: function (e)
        {
            console.warn(e)
            webGui.showErrors(e)
        }
    });*/

    let query = {
        type: "get",
        item: "stats",
        filter:"last="+guiDashboard.statsDataLastQuery
    }

    let def = new $.Deferred();
    $.when(api.query(query, true)).done(function(answer)
    {
        thisObj.statsData=answer.data;
        def.resolve()
    }).fail(function(e){

        def.reject(e)
    })

    return def.promise();  /**/
}

/**
 *Функция вызывается, когда происходит изменение периода на графике(пользователь выбрал другой option в select).
 *Функция обновляет значения переменных, которые в дальнейшем используются для запроса к api/v2/stats и отрисовки графика.
 */
guiDashboard.updateStatsDataLast=function(thisEl)
{
    var newLast=thisEl.value;
    switch(newLast) {
        case '1095':
            guiDashboard.statsDataLast=3;
            guiDashboard.statsDataMomentType="year";
            break;
        case '365':
            guiDashboard.statsDataLast=13;
            guiDashboard.statsDataMomentType="month";
            break;
        case '90':
            guiDashboard.statsDataLast=3;
            guiDashboard.statsDataMomentType="month";
            break;
        default:
            guiDashboard.statsDataLast=+newLast;
            guiDashboard.statsDataMomentType="day";
            break;
    }
    guiDashboard.statsDataLastQuery=+newLast;
    guiDashboard.updateData();
}

/**
 * Ниже представлены 3 функции для работы с модальным окном - Set widget options
 * guiDashboard.showModalWindow - открывает модальное окно, предварительно обновляя данные
 * guiDashboard.HideAfterSaveModalWindow - скрывает модальное окно
 * guiDashboard.renderModalWindow - отрисовывает модальное окно
 */
guiDashboard.showModalWindow = function()
{
    if($('div').is('#modal-widgets-settings'))
    {
        guiDashboard.model.widgets[0].sort(guiDashboard.sortCountWidget);
        $('#modal-widgets-settings').empty();
        $('#modal-widgets-settings').html(guiDashboard.renderModalWindow());
        $("#modal-widgets-settings").modal('show');
    }
}

guiDashboard.HideAfterSaveModalWindow = function()
{
    if($('div').is('#modal-widgets-settings'))
    {
        return $("#modal-widgets-settings").modal('hide');
    }

}

guiDashboard.renderModalWindow = function()
{
    var html=spajs.just.render('modalWidgetsSettings');
    return html;
}



guiDashboard.stopUpdates = function()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;
}

/**
 * Для перетаскивания виджетов и изменения их порядка
 */
guiDashboard.toggleSortable = function(thisButton)
{
    var state = widget_sort.option("disabled");
    widget_sort.option("disabled", !state);
    if(thisButton.children[0].getAttribute("class")=="fa fa-lock")
    {
        thisButton.children[0].setAttribute("class", "fa fa-unlock");
        var sortableArr=$('.cursor-move1');
        for (var i=0; i<sortableArr.length; i++)
        {
            $(sortableArr[i]).addClass('cursor-move');
            $(sortableArr[i]).removeClass('cursor-move1');
        }
    }
    else
    {
        thisButton.children[0].setAttribute("class", "fa fa-lock");
        var sortableArr=$('.cursor-move');
        for (var i=0; i<sortableArr.length; i++)
        {
            $(sortableArr[i]).addClass('cursor-move1');
            $(sortableArr[i]).removeClass('cursor-move');
        }
    }
}

tabSignal.connect('guiLocalSettings.hideMenu', function(){

    setTimeout(function(){

        if(spajs.currentOpenMenu && spajs.currentOpenMenu.id == 'home')
        {
            guiDashboard.updateData()
        }
    }, 200)
})

/*
tabSignal.connect('hideLoadingProgress', function(){
    if(spajs.currentOpenMenu && spajs.currentOpenMenu.id == 'home')
    {
        guiDashboard.updateData()
    }
})*/

guiDashboard.updateData = function()
{
    var thisObj = this
    if(this.model.updateTimeoutId)
    {
        clearTimeout(this.model.updateTimeoutId)
        this.model.updateTimeoutId = undefined
    }

    $.when(guiDashboard.loadStats()).done(function()
    {
        //обновляем счетчики для виджетов
        pmwHostsCounter.updateCount();
        pmwTemplatesCounter.updateCount();
        pmwGroupsCounter.updateCount();
        pmwProjectsCounter.updateCount();
        pmwInventoriesCounter.updateCount();
        pmwUsersCounter.updateCount();

        //строим график
        //определяем текущий месяц и год
        var monthNum=moment().format("MM");
        var yearNum=moment().format("YYYY");
        var dayNum=moment().format("DD");
        var hourNum=",T00:00:00";
        var startTimeOrg="";

        switch (guiDashboard.statsDataMomentType) {
            case "year":
                startTimeOrg=yearNum+"-01-01"+hourNum;
                break;
            case "month":
                startTimeOrg=yearNum+"-"+monthNum+"-01"+hourNum;
                break;
            case "day":
                startTimeOrg=yearNum+"-"+monthNum+"-"+dayNum+hourNum;
                break;
        }

        //задаем стартовую дату для графика.
        //guiDashboard.statsDataLast - количество периодов назад
        //guiDashboard.statsDataMomentType - тип периода - месяц/год
        var startTime =+ moment(startTimeOrg).subtract(guiDashboard.statsDataLast-1, guiDashboard.statsDataMomentType).tz(window.timeZone).format("x");

        tasks_data = {};
        tasks_data_t = [];

        //формируем в цикле временные отрезки для графика относительно стартовой даты
        for(var i = 0; i< guiDashboard.statsDataLast; i++)
        {
            //идем на период вперед
            var time=+moment(startTime).add(i, guiDashboard.statsDataMomentType).tz(window.timeZone).format("x");
            tasks_data[time] = 0;
            tasks_data_t.push(time);
        }

        //массив для линий графика, которые необходимо отобразить на странице
        var linesForChartArr = [];
        //объект, хранящий в себе цвета этих линий
        var colorPaternForLines = {};
        for(var i in guiDashboard.model.ChartLineSettings)
        {
            var lineChart = guiDashboard.model.ChartLineSettings[i];

            //формируем массив значений для кривой all tasks
            if(lineChart.name == 'all_tasks')
            {
                for (var i in guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType]) {
                    var val = guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType][i];
                    var time = +moment(val[guiDashboard.statsDataMomentType]).tz(window.timeZone).format("x");
                    if (!tasks_data[time]) {
                        tasks_data[time] = val.all;
                        tasks_data_t.push(time)
                    }
                }
                chart_tasks_start_x = ['time'];
                chart_tasks_data = [lineChart.title];
                for (var j in tasks_data_t) {
                    var time = tasks_data_t[j]
                    chart_tasks_start_x.push(time / 1);
                    chart_tasks_data.push(tasks_data[time] / 1);
                }

                linesForChartArr.push(chart_tasks_start_x);
                if(lineChart.active == true)
                {
                    linesForChartArr.push(chart_tasks_data);
                    colorPaternForLines[lineChart.title]=lineChart.color;
                }
            }

            //формируем массив значений для кривой каждого статуса
            if(lineChart.name != 'all_tasks' && lineChart.active == true)
            {
                var chart_tasks_data_var = guiDashboard.getDataForStatusChart(tasks_data, tasks_data_t, lineChart.title);
                linesForChartArr.push(chart_tasks_data_var);
                colorPaternForLines[lineChart.title]=lineChart.color;
            }
        }

        //загружаем график, перечисляем массивы данных для графика и необходимые цвета для графиков
        guiDashboard.model.historyChart.load({
            columns: linesForChartArr,
            colors: colorPaternForLines
        });
    });

    this.model.updateTimeoutId = setTimeout(function(){
        guiDashboard.updateData()
    }, 1000*30)
}




guiDashboard.open  = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;

    return $.when(guiDashboard.getUserSettingsFromAPI()).always(function()
    {
        // Инициализация всех виджетов на странице
        for(var i in guiDashboard.model.widgets)
        {
            for(var j in guiDashboard.model.widgets[i])
            {
                if(guiDashboard.model.widgets[i][j].widget === undefined  )
                {
                    let name = guiDashboard.model.widgets[i][j]['name']
                    if(!window[name])
                    {
                        console.warn("widget name="+name+" not defined")
                        continue;
                    }
                    guiDashboard.model.widgets[i][j].widget = new window[guiDashboard.model.widgets[i][j]['name']](guiDashboard.model.widgets[i][j].opt);
                }
            }
        }

        thisObj.updateData()
        $(holder).insertTpl(spajs.just.render(thisObj.tpl_name, {guiObj:thisObj}))

        //pmwTasksTemplatesWidget.render();
        //pmwModulesTemplatesWidget.render();
        pmwAnsibleModuleWidget.render();
        pmwChartWidget.render();

        guiDashboard.model.historyChart = c3.generate({
            bindto: '#c3-history-chart',
            data: {
                x: 'time',
                columns: [
                    ['time'],
                    ['All tasks'],
                    ['OK'],
                    ['ERROR'],
                    ['INTERRUPTED'],
                    ['DELAY'],
                    ['OFFLINE']
                ],
                type: 'area',
                types: {
                    OK: 'line',
                    ERROR: 'line',
                    INTERRUPTED: 'line',
                    DELAY: 'line',
                    OFFLINE: 'line'
                },
            },
            axis: {
                x: {
                    type: 'timeseries',
                    tick: {
                        format: '%Y-%m-%d'
                    }
                }
            },
            color: {
                pattern: ['#1f77b4',  '#276900', '#333333', '#9b97e4', '#808419', '#9e9e9e', '#d62728',  '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']
            }
        });
        if($('select').is('#chart-period'))
        {
            $('#chart-period').val(guiDashboard.statsDataLastQuery).change();
        }

        //drag and drop для виджетов
        if($('div').is('#dnd-container'))
        {
            widget_sort = Sortable.create(document.getElementById("dnd-container"), {
                animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
                handle: ".dnd-block", // Restricts sort start click/touch to the specified element
                draggable: ".dnd-block", // Specifies which items inside the element should be sortable
                disabled: true,
                onUpdate: function (evt)
                {
                    // console.log("onUpdate[1]", evt);
                    var item = evt.item; // the current dragged HTMLElement
                    //запоминаем новый порядок сортировки
                    var divArr=$('.dnd-block');
                    var idArr=[];
                    for (var i=0; i<divArr.length; i++)
                    {
                        idArr.push(divArr[i].id);
                    }
                    for(var i=0; i<idArr.length; i++)
                    {
                        for(var j=0; j<guiDashboard.model.widgets[0].length; j++)
                        {
                            if(idArr[i].toLowerCase()==guiDashboard.model.widgets[0][j].name.toLowerCase())
                            {
                                guiDashboard.model.widgets[0][j].sort=i+1;
                                guiDashboard.model.widgets[0].sort(guiDashboard.sortCountWidget);
                            }
                        }
                    }
                    guiDashboard.putUserDashboardSettingsToAPI();
                }
            });
        }
    }).promise();

}

/**
 * Базовый класс виджета
 * @type Object
 */
guiDashboardWidget = {
    id:'',
    model:{
        test:1
    },
    render:function(){

    },
    init:function(opt){
        mergeDeep(this.model, opt)
    }
}

/**
 * Создание классов для виджетов: tasks history, run shell command, template tasks, template module
 * @type Object
 */

var pmwAnsibleModuleWidget = inheritance(guiDashboardWidget);
pmwAnsibleModuleWidget.render = function()
{
    var div_id="#pmwAnsibleModuleWidget";
    //pmAnsibleModule.fastCommandWidget($(div_id));
    return "";
}

var pmwChartWidget=inheritance(guiDashboardWidget);
pmwChartWidget.render = function()
{
    var div_id="#pmwChartWidget";
    var html=spajs.just.render('pmwChartWidget');
    $(div_id).html(html);
    return "";
}


/**
 * Базовый класс виджета показывающего количество элементов
 * @type Object
 */
var pmwItemsCounter = inheritance(guiDashboardWidget);

pmwItemsCounter.model.count = '-';
//pmwItemsCounter.model.countObject = pmItems;
pmwItemsCounter.model.nameInStats = "";

pmwItemsCounter.render = function()
{
    var html = spajs.just.render('pmwItemsCounter', {model:this.model});
    return window.JUST.onInsert(html, function(){});
}
pmwItemsCounter.updateCount = function()
{
    var thisObj = this;
    var statsData=guiDashboard.statsData;
    thisObj.model.count=statsData[thisObj.model.nameInStats];
}

/**
 * Класс виджета показывающий количество хостов
 * @type Object
 */
var pmwHostsCounter = inheritance(pmwItemsCounter);
//pmwHostsCounter.model.countObject = pmHosts;
pmwHostsCounter.model.nameInStats = "hosts";
pmwHostsCounter.model.path = "host";

/**
 * Класс виджета показывающий количество шаблонов
 * @type Object
 */
var pmwTemplatesCounter = inheritance(pmwItemsCounter);
//pmwTemplatesCounter.model.countObject = pmTemplates;
pmwTemplatesCounter.model.nameInStats = "templates";
pmwTemplatesCounter.model.path = "";

/**
 * Класс виджета показывающий количество групп
 * @type Object
 */
var pmwGroupsCounter = inheritance(pmwItemsCounter);
//pmwGroupsCounter.model.countObject = pmGroups;
pmwGroupsCounter.model.nameInStats = "groups";
pmwGroupsCounter.model.path = "group";

/**
 * Класс виджета показывающий количество проектов
 * @type Object
 */
var pmwProjectsCounter = inheritance(pmwItemsCounter);
//pmwProjectsCounter.model.countObject = pmProjects;
pmwProjectsCounter.model.nameInStats = "projects";
pmwProjectsCounter.model.path = "project";

/**
 * Класс виджета показывающий количество инвенториев
 * @type Object
 */
var pmwInventoriesCounter = inheritance(pmwItemsCounter);
//pmwInventoriesCounter.model.countObject = pmInventories;
pmwInventoriesCounter.model.nameInStats = "inventories";
pmwInventoriesCounter.model.path = "inventory";

/**
 * Класс виджета показывающий количество пользователей
 * @type Object
 */
var pmwUsersCounter = inheritance(pmwItemsCounter);
//pmwUsersCounter.model.countObject = pmUsers;
pmwUsersCounter.model.nameInStats = "users";
pmwUsersCounter.model.path = "user";

tabSignal.connect("loading.completed", function(){
    guiDashboard.getUserSettingsFromAPI();
})