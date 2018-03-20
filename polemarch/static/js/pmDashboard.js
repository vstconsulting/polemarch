var widget_sort={};

var pmDashboard = {
    pageSize:20,
    model:{
        name:"module"
    }
}

pmDashboard.model.className = "pmDashboard"

pmDashboard.model.count = {
    projects:'-',
    inventories:'-',
    hosts:'-',
    groups:'-',
    users:'-',
    history:'-',
}

pmDashboard.statsData={
    projects:'-',
    inventories:'-',
    hosts:'-',
    groups:'-',
    users:'-',
    templates:'-'
}

pmDashboard.statsDataLast=14;
pmDashboard.statsDataLastQuery=14;
pmDashboard.statsDataMomentType='day';

if(window.localStorage['selected-chart-period'] && window.localStorage['selected-chart-period-query'] &&  window.localStorage['selected-chart-period-type'])
{
    pmDashboard.statsDataLast=window.localStorage['selected-chart-period'];
    pmDashboard.statsDataLastQuery=window.localStorage['selected-chart-period-query'];
    pmDashboard.statsDataMomentType=window.localStorage['selected-chart-period-type'];
}

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
pmDashboard.model.widgets = [
    [

    ],
]

/*
*Двумерный массив, хранящий в себе настройки виджетов по умолчанию.
 */
pmDashboard.model.defaultWidgets = [
    [
        {
            name:'pmwTemplatesCounter',
            title:'Templates Counter',
            sortNum:0,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwProjectsCounter',
            title:'Projects Counter',
            sortNum:1,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwInventoriesCounter',
            title:'Inventories Counter',
            sortNum:2,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwHostsCounter',
            title:'Hosts Counter',
            sortNum:3,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwGroupsCounter',
            title:'Groups Counter',
            sortNum:4,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwUsersCounter',
            title:'Users Counter',
            sortNum:5,
            active:true,
            opt:{},
            type:1,
            collapse:false,
        },
        {
            name:'pmwAnsibleModuleWidget',
            title:'Run shell command',
            sortNum:6,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },
        {
            name:'pmwChartWidget',
            title:'Tasks history',
            sortNum:7,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },
        {
            name:'pmwTasksTemplatesWidget',
            title:'Templates Task',
            sortNum:8,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },
        {
            name:'pmwModulesTemplatesWidget',
            title:'Templates Module',
            sortNum:9,
            active:true,
            opt:{},
            type:0,
            collapse:false,
        },/**/
    ],
]


/**
 * Функция полностью копирует настройки по умолчанию для виджетов.
 * Подразумевается, что данная функция вызывается, когда пришел из API пустой JSON.
 */
pmDashboard.cloneDefaultWidgetsTotally = function(){
    for(var i in pmDashboard.model.defaultWidgets[0])
    {
        pmDashboard.model.widgets[0][i]={};
        for (var j in pmDashboard.model.defaultWidgets[0][i])
        {
            pmDashboard.model.widgets[0][i][j]=pmDashboard.model.defaultWidgets[0][i][j];
        }
    }
    console.log(pmDashboard.model.widgets[0]);
    return pmDashboard.model.widgets[0];
}

/**
 * Функция копирует "статичные" настройки по умолчанию для виджетов.
 * Под "статичными" понимается name, title, opt, type.
 * Данные настройки не меняются в ходе работы пользователя с интерфейсом.
 * Подразумевается, что данная функция вызывается, когда пришел из API непустой JSON.
 */
pmDashboard.cloneDefaultWidgetsStaticSettingsOnly = function(){
    for(var i in pmDashboard.model.defaultWidgets[0])
    {
        pmDashboard.model.widgets[0][i]={};
        pmDashboard.model.widgets[0][i].name=pmDashboard.model.defaultWidgets[0][i].name;
        pmDashboard.model.widgets[0][i].title=pmDashboard.model.defaultWidgets[0][i].title;
        pmDashboard.model.widgets[0][i].opt=pmDashboard.model.defaultWidgets[0][i].opt;
        pmDashboard.model.widgets[0][i].type=pmDashboard.model.defaultWidgets[0][i].type;
    }
    return pmDashboard.model.widgets[0];
}

/**
 * Функция добавляет виджету оставшиеся(не "статичные") настройки.
 * Функция проверяет есть ли соответсвуют ли пришедшие настройки для виджетов из API тем,
 * что хранятся в массиве с настройками по умолчанию.
 * Если данное свойство соответсвует, то его значение присваивается настройкам виджета.
 * В противном случае ему присваивается настройка по умолчанию.
 */
pmDashboard.clonetWidgetsSettingsFromApiAndVerify = function(data){
    pmDashboard.cloneDefaultWidgetsStaticSettingsOnly();
    for(var i in pmDashboard.model.defaultWidgets[0])
    {
        for(var j in data)
        {
            if(pmDashboard.model.defaultWidgets[0][i].name==j)
            {
                for (var k in pmDashboard.model.defaultWidgets[0][i])
                {
                    if(k in data[j]){
                        pmDashboard.model.widgets[0][i][k]=data[j][k];
                    }
                    else
                    {
                        pmDashboard.model.widgets[0][i][k]=pmDashboard.model.defaultWidgets[0][i][k];
                    }
                }
            }
        }
    }
    return pmDashboard.model.widgets[0];
}

/**
 * Функция проверяет необходимо ли посылать запрос к API для загрузки пользовательских настроек виджетов.
 * Если в модели отсутствует какой-либо виджет, либо у виджета отсутсвует какое-нибудь свойство,
 * то запрос к API будет отправлен.
 */
pmDashboard.checkWidgetSettings = function()
{
    var bool1=false, bool2=false;
    for (var i in pmDashboard.model.defaultWidgets[0]){
        for (var j in pmDashboard.model.widgets[0])
        {
            if(pmDashboard.model.defaultWidgets[0][i].name==pmDashboard.model.widgets[0][j].name)
            {
                for(var k in pmDashboard.model.defaultWidgets[0][i])
                {
                    if(!(k in pmDashboard.model.widgets[0][j])){
                        bool1=true;
                    }

                }
            }
        }
    }

    if(pmDashboard.model.defaultWidgets[0].length!=pmDashboard.model.widgets[0].length)
    {
        bool2=true;
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
 *на основе изменений, внесенных в pmDashboard.model.widgets[0][i].
 *localObj- pmDashboard.model.widgets[0][i]
 * @type Object
 */
pmDashboard.getNewWidgetSettings = function(localObj)
{
    var obj={};
    obj.sortNum=localObj.sortNum;
    obj.active=localObj.active;
    obj.collapse=localObj.collapse;
    return obj;
}

/**
 *Функция заправшивает у API пользовательские настройки виджетов.
 *Если они есть(пришел не пустой объект), то данные настройки добавляются в local storage.
 */
pmDashboard.getUserWidgetSettingsFromAPI = function()
{
    var userId=window.my_user_id;
    if(pmDashboard.checkWidgetSettings())
    {
        return spajs.ajax.Call({
            url: "/api/v1/users/" + userId + "/settings/",
            type: "GET",
            contentType: 'application/json',
            success: function (data)
            {
                if ($.isEmptyObject(data))
                {
                    console.log("empty object");
                    pmDashboard.cloneDefaultWidgetsTotally();
                }
                else
                {
                    console.log("not empty object");
                    pmDashboard.clonetWidgetsSettingsFromApiAndVerify(data);
                    pmDashboard.model.widgets[0].sort(pmDashboard.sortCountWidget);
                }
            },
            error: function (e)
            {
                console.warn(e)
                polemarch.showErrors(e)
            }
        });
    }
    else
    {
        return false;
    }


}

/**
 *Функция сохраняет в API пользовательские настройки виджетов.
 */
pmDashboard.putUserWidgetSettingsToAPI = function()
{
    var userId=window.my_user_id;
    var dataToPut= {};
    for(var i in  pmDashboard.model.widgets[0]){
        var objName=pmDashboard.model.widgets[0][i].name;
        dataToPut[objName]=pmDashboard.getNewWidgetSettings(pmDashboard.model.widgets[0][i]);
    }
    return spajs.ajax.Call({
        url: "/api/v1/users/" + userId + "/settings/",
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify(dataToPut),
        success: function (data)
        {
            //console.log("Data was posted");

        },
        error: function (e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });

}

/**
 *Функция, сортирующая массив объектов.
 */
pmDashboard.sortCountWidget=function(Obj1, Obj2)
{
    return Obj1.sortNum-Obj2.sortNum;
}

/**
 *Функция, меняющая свойство виджета active на false.
 */
pmDashboard.setNewWidgetActiveValue = function(thisButton)
{
    var widgetName=thisButton.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("id");
    for(var i in pmDashboard.model.widgets[0])
    {
        if(pmDashboard.model.widgets[0][i].name==widgetName)
        {
            pmDashboard.model.widgets[0][i].active=false;
        }
    }
    pmDashboard.putUserWidgetSettingsToAPI();
}

/**
 *Функция, меняющая свойство виджета collapse на противоположное (true-false).
 */
pmDashboard.setNewWidgetCollapseValue = function(thisButton)
{
    var widgetName=thisButton.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("id");
    for(var i in pmDashboard.model.widgets[0])
    {
        if(pmDashboard.model.widgets[0][i].name==widgetName)
        {
            pmDashboard.model.widgets[0][i].collapse=!pmDashboard.model.widgets[0][i].collapse;

            //скрываем селект с выбором периода на виджете-графике при его сворачивании
            if(widgetName=="pmwChartWidget")
            {
                if(pmDashboard.model.widgets[0][i].collapse==false)
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
    pmDashboard.putUserWidgetSettingsToAPI();
}

/**
 *Функция, сохраняющая настройки виджетов, внесенные в модальном окне.
 */
pmDashboard.saveWigdetsOptionsFromModal = function()
{
    var modalTable=document.getElementById("modal-table");
    var modalTableTr=modalTable.getElementsByTagName("tr");
    for(var i=1; i<modalTableTr.length; i++)
    {
        var widgetName=modalTableTr[i].getAttribute("rowname");
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
                for(var z in  pmDashboard.model.widgets[0])
                {
                    if(pmDashboard.model.widgets[0][z].name==widgetName)
                    {
                        pmDashboard.model.widgets[0][z][valueName]=selected;
                    }
                }
            }
        }
    }
    pmDashboard.putUserWidgetSettingsToAPI();

    return $.when(hidemodal(), pmDashboard.HideAfterSaveModalWindow()).done(function(){
        return spajs.openURL("/");
    }).promise();
}

/**
 * Функция, которая формирует массив данных для кривых графика по отдельному статусу
 */
pmDashboard.getDataForStatusChart = function(tasks_data, tasks_data_t, status)
{
    for(var i in tasks_data) {
        tasks_data[i]=0;
    }

    for(var i in pmDashboard.statsData.jobs[pmDashboard.statsDataMomentType])
    {
        var val = pmDashboard.statsData.jobs[pmDashboard.statsDataMomentType][i];
        var time =+ moment(val[pmDashboard.statsDataMomentType]).tz(window.timeZone).format("x");

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
 * Функция, отправляющая запрос /api/v1/stats/,
 * который дает нам информацию для виджетов класса pmwItemsCounter,
 * а также для графика на странице Dashboard.
 */
pmDashboard.loadStats=function()
{
    var limit=1;
    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/stats/?last="+pmDashboard.statsDataLastQuery,
        type: "GET",
        contentType: 'application/json',
        data: "limit=" + encodeURIComponent(limit)+"&rand="+Math.random(),
        success: function (data)
        {
            pmDashboard.statsData=data;
        },
        error: function (e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

/**
 *Функция вызывается, когда происходит изменение периода на графике(пользователь выбрал другой option в select).
 *Функция обновляет значения переменных, которые в дальнейшем используются для запроса к api/v1/stats и отрисовки графика.
 */
pmDashboard.updateStatsDataLast=function(thisEl)
{
    var newLast=thisEl.value;
    switch(newLast) {
        case '1095':
            pmDashboard.statsDataLast=3;
            pmDashboard.statsDataMomentType="year";
            window.localStorage['selected-chart-period']=3;
            window.localStorage['selected-chart-period-type']="year";
            break;
        case '365':
            pmDashboard.statsDataLast=13;
            pmDashboard.statsDataMomentType="month";
            window.localStorage['selected-chart-period']=13;
            window.localStorage['selected-chart-period-type']="month";
            break;
        case '90':
            pmDashboard.statsDataLast=3;
            pmDashboard.statsDataMomentType="month";
            window.localStorage['selected-chart-period']=3;
            window.localStorage['selected-chart-period-type']="month";
            break;
        default:
            pmDashboard.statsDataLast=+newLast;
            pmDashboard.statsDataMomentType="day";
            window.localStorage['selected-chart-period']=+newLast;
            window.localStorage['selected-chart-period-type']="day";
            break;
    }
    pmDashboard.statsDataLastQuery=+newLast;
    window.localStorage['selected-chart-period-query']=+newLast;
    pmDashboard.updateData();
}

/**
 * Ниже представлены 3 функции для работы с модальным окном - Set widget options
 * pmDashboard.showModalWindow - открывает модальное окно, предварительно обновляя данные
 * pmDashboard.HideAfterSaveModalWindow - скрывает модальное окно
 * pmDashboard.renderModalWindow - отрисовывает модальное окно
 */
pmDashboard.showModalWindow = function()
{
    if($('div').is('#modal-widgets-settings'))
    {
        pmDashboard.model.widgets[0].sort(pmDashboard.sortCountWidget);
        $('#modal-widgets-settings').empty();
        $('#modal-widgets-settings').html(pmDashboard.renderModalWindow());
        $("#modal-widgets-settings").modal('show');
    }
}

pmDashboard.HideAfterSaveModalWindow = function()
{
    if($('div').is('#modal-widgets-settings'))
    {
        return $("#modal-widgets-settings").modal('hide');
    }

}

pmDashboard.renderModalWindow = function()
{
    var html=spajs.just.render('modalWidgetsSettings');
    return html;
}



pmDashboard.stopUpdates = function()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;
}

pmDashboard.toggleSortable = function(thisButton)
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


tabSignal.connect('pmLocalSettings.hideMenu', function(){

    setTimeout(function(){

        if(spajs.currentOpenMenu && spajs.currentOpenMenu.id == 'home')
        {
            pmDashboard.updateData()
        }
    }, 200)
})

pmDashboard.updateData = function()
{
    var thisObj = this
    if(this.model.updateTimeoutId)
    {
        clearTimeout(this.model.updateTimeoutId)
        this.model.updateTimeoutId = undefined
    }

    $.when(pmDashboard.loadStats()).done(function()
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

        switch (pmDashboard.statsDataMomentType) {
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
        //pmDashboard.statsDataLast - количество периодов назад
        //pmDashboard.statsDataMomentType - тип периода - месяц/год
        var startTime =+ moment(startTimeOrg).subtract(pmDashboard.statsDataLast-1, pmDashboard.statsDataMomentType).tz(window.timeZone).format("x");

        tasks_data = {};
        tasks_data_t = [];

        //формируем в цикле временные отрезки для графика относительно стартовой даты
        for(var i = 0; i< pmDashboard.statsDataLast; i++)
        {
            //идем на период вперед
            var time=+moment(startTime).add(i, pmDashboard.statsDataMomentType).tz(window.timeZone).format("x");
            tasks_data[time] = 0;
            tasks_data_t.push(time);
        }

        //формируем массив значений для кривой all tasks
        for(var i in pmDashboard.statsData.jobs[pmDashboard.statsDataMomentType])
        {
            var val = pmDashboard.statsData.jobs[pmDashboard.statsDataMomentType][i];
            var time =+ moment(val[pmDashboard.statsDataMomentType]).tz(window.timeZone).format("x");
            if(!tasks_data[time])
            {
                tasks_data[time] = val.all;
                tasks_data_t.push(time)
            }
        }
        chart_tasks_start_x = ['time'];
        chart_tasks_data = ['All tasks'];
        for(var j in tasks_data_t)
        {
            var time = tasks_data_t[j]
            chart_tasks_start_x.push(time/1);
            chart_tasks_data.push(tasks_data[time]/1);
        }

        //формируем массив значений для кривой каждого статуса
        chart_tasks_data_OK=pmDashboard.getDataForStatusChart(tasks_data, tasks_data_t, "OK");
        chart_tasks_data_ERROR=pmDashboard.getDataForStatusChart(tasks_data, tasks_data_t, "ERROR");
        chart_tasks_data_INTERRUPTED=pmDashboard.getDataForStatusChart(tasks_data, tasks_data_t, "INTERRUPTED");
        chart_tasks_data_DELAY=pmDashboard.getDataForStatusChart(tasks_data, tasks_data_t, "DELAY");
        chart_tasks_data_OFFLINE=pmDashboard.getDataForStatusChart(tasks_data, tasks_data_t, "OFFLINE");

        //загружаем график, перечисляем массивы данных для графика
        pmDashboard.model.historyChart.load({
            columns: [
                chart_tasks_start_x,chart_tasks_data,

                chart_tasks_data_OK, chart_tasks_data_ERROR,
                chart_tasks_data_INTERRUPTED, chart_tasks_data_DELAY,
                chart_tasks_data_OFFLINE
            ]
        });
    });

    this.model.updateTimeoutId = setTimeout(function(){
        pmDashboard.updateData()
    }, 1000*30)
}




pmDashboard.open  = function(holder, menuInfo, data)
{
    var thisObj = this

    return $.when(pmDashboard.getUserWidgetSettingsFromAPI()).always(function()
    {
        // Инициализация всех виджетов на странице
        for(var i in pmDashboard.model.widgets)
        {
            for(var j in pmDashboard.model.widgets[i])
            {
                if(pmDashboard.model.widgets[i][j].widget === undefined  )
                {
                    pmDashboard.model.widgets[i][j].widget = new window[pmDashboard.model.widgets[i][j]['name']](pmDashboard.model.widgets[i][j].opt);
                }
            }
        }

        thisObj.updateData()
        $(holder).insertTpl(spajs.just.render('dashboard_page', {}))

        pmwTasksTemplatesWidget.render();
        pmwModulesTemplatesWidget.render();
        pmwAnsibleModuleWidget.render();
        pmwChartWidget.render();

        pmDashboard.model.historyChart = c3.generate({
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
            $('#chart-period').val(pmDashboard.statsDataLastQuery).change();
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
                        for(var j=0; j<pmDashboard.model.widgets[0].length; j++)
                        {
                            if(idArr[i].toLowerCase()==pmDashboard.model.widgets[0][j].name.toLowerCase())
                            {
                                pmDashboard.model.widgets[0][j].sortNum=i;
                                pmDashboard.model.widgets[0].sort(pmDashboard.sortCountWidget);
                            }
                        }
                    }
                    pmDashboard.putUserWidgetSettingsToAPI();
                }
            });
        }
    }).promise();

}

tabSignal.connect("polemarch.start", function()
{
    spajs.addMenu({
        id:"home",
        urlregexp:[/^(home|)$/],
        onOpen:function(holder, menuInfo, data){return pmDashboard.open(holder, menuInfo, data);},
        onClose:function(){return pmDashboard.stopUpdates();},
    })

})


/**
 * Базовый класс виджета
 * @type Object
 */
pmDashboardWidget = {
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

var pmwTasksTemplatesWidget = inheritance(pmDashboardWidget);
pmwTasksTemplatesWidget.render = function()
{
    var div_id="#pmwTasksTemplatesWidget";
    pmTasksTemplates.showTaskWidget($(div_id));
    return "";
}

var pmwModulesTemplatesWidget = inheritance(pmDashboardWidget);
pmwModulesTemplatesWidget.render = function()
{
    var div_id="#pmwModulesTemplatesWidget";
    pmTasksTemplates.showModuleWidget($(div_id));
    return "";
}

var pmwAnsibleModuleWidget = inheritance(pmDashboardWidget);
pmwAnsibleModuleWidget.render = function()
{
    var div_id="#pmwAnsibleModuleWidget";
    pmAnsibleModule.fastCommandWidget($(div_id));
    return "";
}

var pmwChartWidget=inheritance(pmDashboardWidget);
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
var pmwItemsCounter = inheritance(pmDashboardWidget);

pmwItemsCounter.model.count = '-';
pmwItemsCounter.model.countObject = pmItems;
pmwItemsCounter.model.nameInStats = "";

pmwItemsCounter.render = function()
{

    var thisObj = this;
    var html = spajs.just.render('pmwItemsCounter', {model:this.model});
    return window.JUST.onInsert(html, function(){});
}
pmwItemsCounter.updateCount = function()
{
    var thisObj = this;
    var statsData=pmDashboard.statsData;
    thisObj.model.count=statsData[thisObj.model.nameInStats];
}

/**
 * Класс виджета показывающий количество хостов
 * @type Object
 */
var pmwHostsCounter = inheritance(pmwItemsCounter);
pmwHostsCounter.model.countObject = pmHosts;
pmwHostsCounter.model.nameInStats = "hosts";

/**
 * Класс виджета показывающий количество шаблонов
 * @type Object
 */
var pmwTemplatesCounter = inheritance(pmwItemsCounter);
pmwTemplatesCounter.model.countObject = pmTemplates;
pmwTemplatesCounter.model.nameInStats = "templates";

/**
 * Класс виджета показывающий количество групп
 * @type Object
 */
var pmwGroupsCounter = inheritance(pmwItemsCounter);
pmwGroupsCounter.model.countObject = pmGroups;
pmwGroupsCounter.model.nameInStats = "groups";

/**
 * Класс виджета показывающий количество проектов
 * @type Object
 */
var pmwProjectsCounter = inheritance(pmwItemsCounter);
pmwProjectsCounter.model.countObject = pmProjects;
pmwProjectsCounter.model.nameInStats = "projects";

/**
 * Класс виджета показывающий количество инвенториев
 * @type Object
 */
var pmwInventoriesCounter = inheritance(pmwItemsCounter);
pmwInventoriesCounter.model.countObject = pmInventories;
pmwInventoriesCounter.model.nameInStats = "inventories";

/**
 * Класс виджета показывающий количество пользователей
 * @type Object
 */
var pmwUsersCounter = inheritance(pmwItemsCounter);
pmwUsersCounter.model.countObject = pmUsers;
pmwUsersCounter.model.nameInStats = "users";
