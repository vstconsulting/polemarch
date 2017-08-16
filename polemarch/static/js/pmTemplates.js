
var pmTemplates = inheritance(pmItems)
 
pmTemplates.model.name = "templates"


// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTemplates.model.kind = "Task,Module"

pmTemplates.copyAndEdit = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    return $.when(this.copyItem(item_id)).done(function(newItemId)
    {
        $.when(spajs.open({ menuId:thisObj.model.page_name + "/"+thisObj.model.items[item_id].kind+"/"+newItemId})).done(function(){
            $.notify("Item was duplicate", "success");
            def.resolve()
        }).fail(function(e){
            $.notify("Error in duplicate item", "error");
            polemarch.showErrors(e)
            def.reject()
        })
    }).fail(function(){
        def.reject()
    })

    return def.promise();
}
    
    
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

pmTemplates.showList = function(holder, menuInfo, data)
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
    }).fail(function()
    {
        $.notify("", "error");
    }).promise()
}
