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
 * Two-dimensional array with structure of Dashboard widgets.
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

/**
 * Two-dimensional array with default structure of Dashboard widgets.
 */
guiDashboard.model.defaultWidgets = [
    [
        {
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

/**
 * Array with Dashboard's Chart line settings.
 */
guiDashboard.model.ChartLineSettings = [

]

/**
 * Array with default Dashboard's Chart line settings.
 */
guiDashboard.model.defaultChartLineSettings = [
    {
        name: "all_tasks",
        title: "All tasks",
        color: "#1f77b4",
        bg_color:"rgba(31, 119, 180, 0.3)",
        active: true
    },
    {
        name: "ok",
        title: "OK",
        color: "#276900",
        bg_color:"rgba(39, 105, 0, 0.3)",
        active: true
    },
    {
        name: "error",
        title: "ERROR",
        color: "#dc3545",
        bg_color:"rgba(220, 53, 69, 0.3)",
        active: true
    },
    {
        name: "interrupted",
        title: "INTERRUPTED",
        color: "#9b97e4",
        bg_color:"rgba(155, 151, 228, 0.3)",
        active: true
    },
    {
        name: "delay",
        title: "DELAY",
        color: "#808419",
        bg_color:"rgba(128, 132, 25, 0.3)",
        active: true
    },
    {
        name: "offline",
        title: "OFFLINE",
        color: "#9e9e9e",
        bg_color:"rgba(158, 158, 158, 0.3)",
        active: true
    }
]

guiDashboard.model.autoupdateInterval = 15000;

guiDashboard.model.skinsSettings = {};

/**
 * Function copies all properties of default chart line settings.
 * This function is supposed to be called when empty JSON was received from API.
 */
guiDashboard.cloneChartLineSettingsTotally = function(){
    guiDashboard.model.ChartLineSettings = JSON.parse(JSON.stringify(guiDashboard.model.defaultChartLineSettings));
    return guiDashboard.model.ChartLineSettings;
}

/**
 * Function updates properties of chart line settings, info about which was received from API.
 * This function is supposed to be called when not empty JSON was received from API.
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
 * Function copies all properties of default widget settings.
 * This function is supposed to be called when empty JSON was received from API.
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
 * Function copies all properties of default 'static' widget settings.
 * 'Static' settings - settings, that don't change during user work with GUI.
 * For example, name, title, opt, type.
 * This function is supposed to be called when not empty JSON was received from API.
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
 * Function adds not static properties to widget.
 * Function sets value from API if it is, otherwise, it sets default value.
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
 * Function checks Necessity to send API request for loading of user's dashboard settings.
 * For example, if some property is missed in current widget object
 * or even if widget is missed, request will be sent.
 * @param {Object} defaultObj - object with default settings.
 * @param {Object} currentObj - object with current settings.
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
        // request will be sent
        return true;
    }
    else
    {
        // request will not be sent
        return false;
    }
}

/**
 * Function creates object with current widget settings,
 * based on changes in guiDashboard.model.widgets[0][i].
 * @param localObj(Object) - guiDashboard.model.widgets[0][i].
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
 * Function sends request to API for getting user's settings
 * (dashboard settings, chartline settings, autoupdate interval).
 * If request answer is not empty, API settings will be added to Dashboard model.
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

    if(data.skinsSettings)
    {
        guiDashboard.cloneDataSkinsFromApi(data.skinsSettings);
    }
    else
    {
        let skin = guiCustomizer.getSkin();
        if(skin)
        {
            skin.setValue(guiDashboard.model.skinsSettings);
            skin.saveSettings();
        }

        // guiLocalSettings.set('skins_settings', guiDashboard.model.skinsSettings);
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


guiDashboard.cloneDataSkinsFromApi = function(skins)
{
    guiDashboard.model.skinsSettings = $.extend(true, {}, skins);

    guiLocalSettings.set('skins_settings', guiDashboard.model.skinsSettings);

}

/**
 * Function sends request to API for putting user's settings
 * (dashboard settings, chartline settings, autoupdate interval).
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
        data:{
            autoupdateInterval: guiDashboard.model.autoupdateInterval,
            widgetSettings:widgetSettings,
            chartLineSettings:chartLineSettings,
            skinsSettings: guiDashboard.model.skinsSettings,
        }
    }

    let def = new $.Deferred();

    $.when(api.query(query, true)).done(d => {
        def.resolve();
    }).fail(e => {
        console.warn(e)
        webGui.showErrors(e)
        def.reject()
    })

    return def.promise()
}

/**
 * Function sorts widgets array.
 */
guiDashboard.sortCountWidget=function(Obj1, Obj2)
{
    return Obj1.sort-Obj2.sort;
}

/**
 * Function toggles 'active' widget property to false.
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
 * Function toggles 'collapse' widget property to opposite (true/false).
 */
guiDashboard.setNewWidgetCollapseValue = function(thisButton)
{
    var widgetName=thisButton.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("id");
    for(var i in guiDashboard.model.widgets[0])
    {
        if(guiDashboard.model.widgets[0][i].name==widgetName)
        {
            guiDashboard.model.widgets[0][i].collapse=!guiDashboard.model.widgets[0][i].collapse;

            // hides select with period value on chart widget during its collapsing
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
 * Function gets dashboard settings from table in modal.
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
 * Function gets dashboard settings from modal and send them to API.
 */
guiDashboard.saveWigdetsOptions = function()
{
    guiDashboard.getOptionsFromTable("modal-table",guiDashboard.model.widgets[0]);
    guiDashboard.putUserDashboardSettingsToAPI();
}

/**
 * Function saves dashboard settings from modal.
 */
guiDashboard.saveWigdetsOptionsFromModal = function()
{
    return $.when(guiDashboard.saveWigdetsOptions()).done(function(){
        guiModal.modalClose();
        return spajs.openURL("/");
    }).promise();
}

/**
 * Function generates array with data for chart lines.
 */
guiDashboard.getDataForStatusChart = function(tasks_data, tasks_data_t, status, date_format)
{

    for(var i in tasks_data) {
        tasks_data[i]=0;
    }

    for(var i in guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType])
    {
        var val = guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType][i];
        var time =+ moment(val[guiDashboard.statsDataMomentType]).tz(window.timeZone).format("x");
        time = moment(time).tz(window.timeZone).format(date_format);

        if(val.status==status){
            tasks_data[time] = val.sum;
        }
    }

    var chart_tasks_data1 = [];

    for(var j in tasks_data_t)
    {
        var time = tasks_data_t[j]
        chart_tasks_data1.push(tasks_data[time]/1);
    }
    return chart_tasks_data1;

}

/**
 * Function sends API request (/api/v2/stats/).
 */
guiDashboard.loadStats=function()
{
    var thisObj = this;

    let query = {
        type: "get",
        item: "stats",
        filters:"last="+guiDashboard.statsDataLastQuery,
    }

    let def = new $.Deferred();
    $.when(api.query(query, true)).done(function(answer)
    {
        thisObj.statsData=answer.data;
        def.resolve()
    }).fail(function(e){

        def.reject(e)
    })

    return def.promise();
}

/**
 * Function is supposed to be called when period value was changed on Chart widget.
 * Function updates values of variables that are used for API request (api/v2/stats) and for chart rendering.
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
    guiLocalSettings.set('chart_period', +newLast);
    guiDashboard.updateData();
}

guiDashboard.stopUpdates = function()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;
}

/**
 * Turn on/off drag-and-drop property of Dashboard widgets.
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

guiDashboard.updateData = function()
{
    if(this.model.updateTimeoutId)
    {
        clearTimeout(this.model.updateTimeoutId)
        this.model.updateTimeoutId = undefined
    }

    $.when(guiDashboard.loadStats()).done(function()
    {
        // updates counters of widgets
        pmwHostsCounter.updateCount();
        pmwTemplatesCounter.updateCount();
        pmwGroupsCounter.updateCount();
        pmwProjectsCounter.updateCount();
        pmwInventoriesCounter.updateCount();
        pmwUsersCounter.updateCount();

        // renders chart
        // defines current months and year
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

        // sets start date for chart
        // guiDashboard.statsDataLast - amount of previous periods (periods to reduce)
        // guiDashboard.statsDataMomentType - period type - month/year
        var startTime =+ moment(startTimeOrg).subtract(guiDashboard.statsDataLast-1, guiDashboard.statsDataMomentType).tz(window.timeZone).format("x");
        var date_format = 'DD.MM.YY';

        tasks_data = {};
        tasks_data_t = [];

        // forms chart time intervals based on start date
        for(var i = -1; i< guiDashboard.statsDataLast; i++)
        {
            // period up
            var time=+moment(startTime).add(i, guiDashboard.statsDataMomentType).tz(window.timeZone).format("x");
            time = moment(time).tz(window.timeZone).format(date_format);
            tasks_data[time] = 0;
            tasks_data_t.push(time);
        }

        // array for chartlines, that are needed to render
        var linesForChartArr = [];
        // object, that is storing line colors
        var colorPaternForLines = {};
        let chart_data_obj = {datasets:[], labels:[]};
        for(var i in guiDashboard.model.ChartLineSettings)
        {
            var lineChart = guiDashboard.model.ChartLineSettings[i];

            // forms array with values for 'all tasks' line
            if(lineChart.name == 'all_tasks')
            {
                for (var i in guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType]) {
                    var val = guiDashboard.statsData.jobs[guiDashboard.statsDataMomentType][i];
                    var time = +moment(val[guiDashboard.statsDataMomentType]).tz(window.timeZone).format("x");
                    time = moment(time).tz(window.timeZone).format(date_format);
                    if(tasks_data[time] !== undefined)
                    {
                        tasks_data[time] = val.all;
                    }
                }

                let chart_tasks_data = [];
                for (var j in tasks_data_t) {
                    var time = tasks_data_t[j]
                    chart_tasks_data.push(tasks_data[time] / 1);
                    chart_data_obj.labels.push(time);
                }

                if(lineChart.active == true)
                {
                    linesForChartArr.push(chart_tasks_data);
                    colorPaternForLines[lineChart.title]=lineChart.color;

                    chart_data_obj.datasets.push({
                        label: 'All tasks',
                        data: chart_tasks_data,
                        borderColor: lineChart.color,
                        backgroundColor: lineChart.bg_color,
                    })
                }
            }

            // forms array with values for others line
            if(lineChart.name != 'all_tasks' && lineChart.active == true)
            {
                var chart_tasks_data_var = guiDashboard.getDataForStatusChart(tasks_data, tasks_data_t, lineChart.title, date_format);
                linesForChartArr.push(chart_tasks_data_var);
                colorPaternForLines[lineChart.title]=lineChart.color;


                chart_data_obj.datasets.push({
                    label: lineChart.title,
                    data: chart_tasks_data_var,
                    borderColor: lineChart.color,
                    backgroundColor: lineChart.bg_color,
                })
            }
        }

        // renders chart
        let ctx = document.getElementById("chart_js_canvas");

        try
        {
            ctx = ctx.getContext('2d');
            guiDashboard.model.historyChart.destroy();
        }
        catch{}

        guiDashboard.model.historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: chart_data_obj.datasets,
                labels: chart_data_obj.labels,
            },

            options:{
                maintainAspectRatio: false,
                legend: {
                    labels: {
                        fontColor: guiCustomizer.skin.value.chart_legend_text_color,
                    },
                },
            }

        });

        guiDashboard.renderChartProgressBars();
    });

    this.model.updateTimeoutId = setTimeout(function(){
        guiDashboard.updateData()
    }, 1000*30)
}

guiDashboard.renderChartProgressBars = function()
{
    let opt = {
        settings: guiDashboard.model.ChartLineSettings,
        stats_data: guiDashboard.statsData,
    }

    let html = spajs.just.render('chart_progress_bars', {opt: opt});

    $("#chart_progress_bars").html(html);
};

guiDashboard.open  = function(holder, menuInfo, data)
{
    setActiveMenuLi();
    var thisObj = this;

    return $.when(guiDashboard.getUserSettingsFromAPI()).always(function()
    {
        // inits all widgets
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

        if($('select').is('#chart-period'))
        {
            let chart_period = guiLocalSettings.get('chart_period') || guiDashboard.statsDataLastQuery;
            $('#chart-period').val(chart_period).change();
        }

        //drag and drop for widgets
        if($('div').is('#dnd-container'))
        {
            widget_sort = Sortable.create(document.getElementById("dnd-container"), {
                animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
                handle: ".dnd-block", // Restricts sort start click/touch to the specified element
                draggable: ".dnd-block", // Specifies which items inside the element should be sortable
                disabled: true,
                onUpdate: function (evt)
                {
                    var item = evt.item; // the current dragged HTMLElement
                    // saves new sorting order
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
 * Base widget class
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
 * Creating classes for tasks history, run shell command, template tasks, template module
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
 * Base class for counter widget
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
 * Class for hosts counter widget
 * @type Object
 */
var pmwHostsCounter = inheritance(pmwItemsCounter);
//pmwHostsCounter.model.countObject = pmHosts;
pmwHostsCounter.model.nameInStats = "hosts";
pmwHostsCounter.model.path = "host";

/**
 * Class for templates counter widget
 * @type Object
 */
var pmwTemplatesCounter = inheritance(pmwItemsCounter);
//pmwTemplatesCounter.model.countObject = pmTemplates;
pmwTemplatesCounter.model.nameInStats = "templates";
pmwTemplatesCounter.model.path = "";

/**
 * Class for group counter widget
 * @type Object
 */
var pmwGroupsCounter = inheritance(pmwItemsCounter);
//pmwGroupsCounter.model.countObject = pmGroups;
pmwGroupsCounter.model.nameInStats = "groups";
pmwGroupsCounter.model.path = "group";

/**
 * Class for projects counter widget
 * @type Object
 */
var pmwProjectsCounter = inheritance(pmwItemsCounter);
//pmwProjectsCounter.model.countObject = pmProjects;
pmwProjectsCounter.model.nameInStats = "projects";
pmwProjectsCounter.model.path = "project";

/**
 * Class for inventories counter widget
 * @type Object
 */
var pmwInventoriesCounter = inheritance(pmwItemsCounter);
//pmwInventoriesCounter.model.countObject = pmInventories;
pmwInventoriesCounter.model.nameInStats = "inventories";
pmwInventoriesCounter.model.path = "inventory";

/**
 * Class for users counter widget
 * @type Object
 */
var pmwUsersCounter = inheritance(pmwItemsCounter);
//pmwUsersCounter.model.countObject = pmUsers;
pmwUsersCounter.model.nameInStats = "users";
pmwUsersCounter.model.path = "user";

tabSignal.connect("webGui.start", function(){
    guiDashboard.getUserSettingsFromAPI();
})

guiDashboard.showWidgetSettingsModal = function ()
{
    let opt = {
        title: 'Widget settings',
    };

    let html = spajs.just.render('widget_settings_modal');
    guiModal.setModalHTML(html, opt);
    guiModal.modalOpen();
}

tabSignal.connect("guiSkins.save", function(obj)
{
    guiDashboard.model.skinsSettings[obj.skin.name] = obj.skin.value;
    guiDashboard.putUserDashboardSettingsToAPI();
})

tabSignal.connect("guiSkins.deleteSettings", function(obj)
{
     delete guiDashboard.model.skinsSettings[obj.skin.name];
     guiDashboard.putUserDashboardSettingsToAPI();

});