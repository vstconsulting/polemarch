
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
    
    $.when(pmHistory.sendSearchQuery({start_time__lt:moment().subtract(14, 'days').format("YYYY-MM-DD")+"T00:00:00.000000Z"})).done(function()
    { 
        tasks_data = {} 
        for(var i in pmHistory.model.items)
        {
            var val = pmHistory.model.items[i]
            var time = new Date(val.start_time)
            time = Math.floor(time.getTime()/(1000*3600*24))*3600*1000*24;
            
            if(!tasks_data[time])
            {
                tasks_data[time] = 1
            }
            else
            {
                tasks_data[time] += 1
            } 
        } 
        
        chart_tasks_start_x = ['time'];
        chart_tasks_data = ['tasks'];

        var last_tasks_data_index = 0;
        for(var i in tasks_data)
        {
            while (chart_tasks_data.length < 14)
            { 
                if(last_tasks_data_index == 0)
                {
                    break;
                }
                
                var next_tasks_data_index = last_tasks_data_index/1+(3600*24*1000) 
                if(next_tasks_data_index < i/1)
                { 
                    chart_tasks_start_x.push(next_tasks_data_index/1);
                    chart_tasks_data.push(0);
                }
                else
                {
                    break;
                } 
                last_tasks_data_index = next_tasks_data_index;
            }
            chart_tasks_start_x.push(i/1);
            chart_tasks_data.push(tasks_data[i]/1);
            last_tasks_data_index = i;
        }
        
        pmDashboard.model.historyChart.load({
            columns: [
                chart_tasks_start_x,chart_tasks_data
            ]
        });
    })
    
    this.model.updateTimeoutId = setTimeout(function(){
        pmDashboard.updateData()
    }, 1000*30)
}

pmDashboard.open  = function(holder, menuInfo, data)
{
    var thisObj = this 
    pmDashboard.updateData()
    $(holder).html(spajs.just.render('dashboard_page', {})) 
    
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