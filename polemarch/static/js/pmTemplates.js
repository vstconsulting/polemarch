
var pmTemplates = new pmItems()
pmTemplates.model.name = "templates" 


// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTemplates.model.kind = "Task,Module"

// Содержит соответсвия разных kind к объектами с ними работающими.
pmTemplates.model.kindObjects = {}
 
pmTemplates.showSearchResults = function(holder, menuInfo, data)
{
    var thisObj = this;
    var query = decodeURIComponent(data.reg[1]) 
    
    return $.when(this.sendSearchQuery({kind:thisObj.model.kind, name:query})).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:query}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmTasksTemplates.showList = function(holder, menuInfo, data)
{
    var thisObj = this;
    var offset = 0
    var limit = this.pageSize;
    if(data.reg && data.reg[1] > 0)
    {
        offset = this.pageSize*(data.reg[1] - 1);
    }

    return $.when(this.sendSearchQuery({kind:thisObj.model.kind}, limit, offset)).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:""}))

        thisObj.model.selectedCount = $('.multiple-select .selected').length;

    }).fail(function()
    {
        $.notify("", "error");
    })
}

   