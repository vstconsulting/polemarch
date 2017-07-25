
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
}