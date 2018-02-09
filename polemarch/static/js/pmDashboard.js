
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
        {
            name:'pmwTemplatesCounter',
            opt:{},
        },
        {
            name:'pmwProjectsCounter',
            opt:{},
        },
        {
            name:'pmwInventoriesCounter',
            opt:{},
        },
        {
            name:'pmwHostsCounter',
            opt:{},
        },
        {
            name:'pmwGroupsCounter',
            opt:{},
        },
        {
            name:'pmwUsersCounter',
            opt:{},
        }, /**/
    ],
]

pmDashboard.stopUpdates = function()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;
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
        var startTime = moment().subtract(14, 'days').format("YYYY-MM-DD")+"T00:00:00.000000Z"

        tasks_data = {}
        tasks_data_t = []

        var time = new Date(startTime)
        time = Math.floor(time.getTime()/(1000*3600*24))*3600*1000*24;
        for(var i = 0; i< 14; i++)
        {
            tasks_data[time] = 0;
            tasks_data_t.push(time)
            time+=(3600*24*1000)
        }

        for(var i in pmDashboard.statsData.jobs.day)
        {
            var val = pmDashboard.statsData.jobs.day[i];
            var time = new Date(val.day)
            time = Math.floor(time.getTime()/(1000*3600*24))*3600*1000*24;

            if(!tasks_data[time])
            {
                tasks_data[time] = val.all;
                tasks_data_t.push(time)
            }
        }

        chart_tasks_start_x = ['time'];
        chart_tasks_data = ['tasks'];

        for(var j in tasks_data_t)
        {
            var time = tasks_data_t[j]
            chart_tasks_start_x.push(time/1);
            chart_tasks_data.push(tasks_data[time]/1);
        }

        pmDashboard.model.historyChart.load({
            columns: [
                chart_tasks_start_x,chart_tasks_data
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

    // Инициализация всех виджетов на странице
    for(var i in pmDashboard.model.widgets)
    {
        for(var j in pmDashboard.model.widgets[i])
        {
            if(pmDashboard.model.widgets[i][j].widget === undefined)
            {
                pmDashboard.model.widgets[i][j].widget = new window[pmDashboard.model.widgets[i][j]['name']](pmDashboard.model.widgets[i][j].opt);
            }
        }
    }

    this.updateData()
    $(holder).insertTpl(spajs.just.render('dashboard_page', {}))

    pmTasksTemplates.showTaskWidget($("#pmTasksTemplates-showTaskWidget"));
    pmTasksTemplates.showModuleWidget($("#pmTasksTemplates-showModuleWidget"));
    pmAnsibleModule.fastCommandWidget($("#pmAnsibleModule-fastCommandWidget"))

    pmDashboard.model.historyChart = c3.generate({
        bindto: '#c3-history-chart',
        data: {
            x: 'time',
            columns: [
                ['time']
            ],
            //type: 'area-spline',
            type: 'area',
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: '%Y-%m-%d'
                }
            }
        }
    });
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
 * Функция, отправляющая запрос /api/v1/stats/,
 * который дает нам информацию для виджетов класса pmwItemsCounter,
 * а также для графика на странице Dashboard.
 */
pmDashboard.loadStats=function()
{
    var limit=1;
    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/stats/",
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
