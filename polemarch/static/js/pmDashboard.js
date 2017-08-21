
var pmDashboard = {
    pageSize:20,
    model:{
        name:"module"
    }
}

pmDashboard.model.count = {
    projects:'-',
    inventories:'-',
    hosts:'-',
    groups:'-',
    users:'-',
    history:'-',
}

pmDashboard.stopUpdates = function()
{
    clearTimeout(this.model.updateTimeoutId)
    this.model.updateTimeoutId = undefined;
}

pmDashboard.updateData = function()
{
    var thisObj = this 
    $.when(pmProjects.loadItems(1)).done(function(){
        thisObj.model.count.projects = pmProjects.model.itemslist.count;
    })

    $.when(pmInventories.loadItems(1)).done(function(){
        thisObj.model.count.inventories = pmInventories.model.itemslist.count;
    })

    $.when(pmHosts.loadItems(1)).done(function(){
        thisObj.model.count.hosts = pmHosts.model.itemslist.count;
    })

    $.when(pmGroups.loadItems(1)).done(function(){
        thisObj.model.count.groups = pmGroups.model.itemslist.count;
    })

    $.when(pmUsers.loadItems(1)).done(function(){
        thisObj.model.count.users = pmUsers.model.itemslist.count;
    })

    $.when(pmTemplates.loadItems(1)).done(function(){
        thisObj.model.count.templates = pmTemplates.model.itemslist.count;
    }) 
    
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
        
        for(var i = 0; i< pmHistory.model.itemslist.results.length; i++)
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