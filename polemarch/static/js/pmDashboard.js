
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
                type: 'area-spline',
            },
            axis: {
                x: {
                    type: 'timeseries',
                    tick: {
                        format: '%Y-%m-%d %H:%m:%S'
                    }
                }
            }
        });

        tasks_start_x = ['time'];
        tasks_start_data = ['tasks'];

        for(var i in pmHistory.model.items)
        {
            var val = pmHistory.model.items[i]
            var time = new Date(val.start_time)
            //tasks_start_x.push(moment(Math.floor(time.getTime()/3600)*3600).format("MM/DD/YYYY"));
            tasks_start_x.push(time.getTime());
            tasks_start_data.push(1);
        }

        history_chart.load({
            columns: [
                tasks_start_x,tasks_start_data
            ]
        });
    })

}