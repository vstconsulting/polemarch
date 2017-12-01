
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
    
    var startTime = moment().subtract(14, 'days').format("YYYY-MM-DD")+"T00:00:00.000000Z"
    $.when(pmHistory.sendSearchQuery({start_time__gt:startTime})).done(function()
    { 
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
        
        for(var i in pmHistory.model.itemslist.results)
        {
            var val = pmHistory.model.itemslist.results[i]
            var time = new Date(val.start_time)
            time = Math.floor(time.getTime()/(1000*3600*24))*3600*1000*24;
            
            if(!tasks_data[time])
            {
                tasks_data[time] = 1
                tasks_data_t.push(time)
            }
            else
            {
                tasks_data[time] += 1
            } 
        } 
        
        //tasks_data_t.sort(function(a, b) {
        //    return a - b;
        //});

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
    })
    
    this.model.updateTimeoutId = setTimeout(function(){
        pmDashboard.updateData()
    }, 5001*30)
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
var pmwItemsCounter = inheritance(pmDashboardWidget)

pmwItemsCounter.model.count = '-'
pmwItemsCounter.model.countObject = pmItems
pmwItemsCounter.render = function()
{ 
    var thisObj = this;
    var html = spajs.just.render('pmwItemsCounter', {model:this.model})
    return window.JUST.onInsert(html, function()
    { 
        $.when(thisObj.model.countObject.loadItems(1)).done(function()
        {
            thisObj.model.count = thisObj.model.countObject.model.itemslist.count;
        })  
    })
} 
 
/**
 * Класс виджета показывающий количество хостов
 * @type Object
 */
var pmwHostsCounter = inheritance(pmwItemsCounter)
pmwHostsCounter.model.countObject = pmHosts
  
/**
 * Класс виджета показывающий количество шаблонов
 * @type Object
 */
var pmwTemplatesCounter = inheritance(pmwItemsCounter)
pmwTemplatesCounter.model.countObject = pmTemplates
  
/**
 * Класс виджета показывающий количество групп
 * @type Object
 */
var pmwGroupsCounter = inheritance(pmwItemsCounter)
pmwGroupsCounter.model.countObject = pmGroups
  
/**
 * Класс виджета показывающий количество проектов
 * @type Object
 */
var pmwProjectsCounter = inheritance(pmwItemsCounter)
pmwProjectsCounter.model.countObject = pmProjects
  
/**
 * Класс виджета показывающий количество инвенториев
 * @type Object
 */
var pmwInventoriesCounter = inheritance(pmwItemsCounter)
pmwInventoriesCounter.model.countObject = pmInventories
  
/**
 * Класс виджета показывающий количество пользователей
 * @type Object
 */
var pmwUsersCounter = inheritance(pmwItemsCounter)
pmwUsersCounter.model.countObject = pmUsers
   