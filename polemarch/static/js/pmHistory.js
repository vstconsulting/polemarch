
var pmHistory = new pmItems()

pmHistory.model.name = "history"

pmHistory.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;
    return $.when(this.sendSearchQuery({playbook:decodeURIComponent(data.reg[1])})).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.search = function(project_id, query)
{
    if(!project_id)
    { 
        if(!query || !trim(query))
        {
            return spajs.open({ menuId:this.model.name, reopen:true});
        }

        return spajs.open({ menuId:this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
    }
    
    if(!query || !trim(query))
    {
        return spajs.open({ menuId:'project/' + project_id +"/" + this.model.name, reopen:true});
    }

    return spajs.open({ menuId:'project/' + project_id +"/" + this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
}
 
pmHistory.showListInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[2] > 0)
    {
        offset = this.pageSize*(data.reg[2] - 1);
    }
    var project_id = data.reg[1];

    return $.when(this.searchItems(project_id, 'project'), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_listInProjects', {query:"", project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmHistory.showSearchResultsInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    var project_id = data.reg[1];
    return $.when(this.sendSearchQuery({playbook: decodeURIComponent(data.reg[2]), project:project_id}), pmProjects.loadItem(project_id)).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_listInProjects', {query:decodeURIComponent(data.reg[2]), project_id:project_id}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}
