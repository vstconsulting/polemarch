
function pmDashboard()
{
    this.model = {};
    this.pageSize = 20;
    this.model.name = "dashboard" 
} 

pmDashboard.open  = function(holder, menuInfo, data)
{
    $(holder).html(spajs.just.render('dashboard_page', {}))
}