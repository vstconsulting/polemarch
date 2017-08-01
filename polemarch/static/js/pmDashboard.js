
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


pmDashboard.open  = function(holder, menuInfo, data)
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

    $.when(pmHistory.loadItems(1)).done(function(){
        thisObj.model.count.history = pmHistory.model.itemslist.count;
    })

    $(holder).html(spajs.just.render('dashboard_page', {}))


    $.when(pmHistory.loadItems(100)).done(function()
    {
        var history_chart = c3.generate({
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

        for(var i in tasks_data)
        {
            chart_tasks_start_x.push(i/1);
            chart_tasks_data.push(tasks_data[i]/1);
        }
        
        history_chart.load({
            columns: [
                chart_tasks_start_x,chart_tasks_data
            ]
        });
    })

}