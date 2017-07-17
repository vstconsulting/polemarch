
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

    return $.when(this.sendSearchQuery({project:project_id}, limit, offset), pmProjects.loadItem(project_id)).done(function()
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

    
pmHistory.showItemInProjects = function(holder, menuInfo, data)
{
    var thisObj = this;
    //console.log(menuInfo, data)

    return $.when(this.loadItem(data.reg[2]), pmProjects.loadItem(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render(thisObj.model.name+'_pageInProjects', {item_id:data.reg[2], project_id:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}


/**
 * Обновляет поле модел this.model.items[item_id] и ложит туда пользователя
 */
pmHistory.loadItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;
     
    jQuery.ajax({
        url: "/api/v1/"+this.model.name+"/"+item_id+"/",
        type: "GET",
        contentType:'application/json',
        data: "",
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            //console.log("loadUser", data)
            thisObj.model.items[item_id] = data
            $.when(pmProjects.loadItem(data.project)).done(function(){
                def.resolve()
            }).fail(function(){
                def.reject()
            }) 
        },
        error:function(e)
        {
            console.warn("pmHistory.loadItem", e)
            polemarch.showErrors(e)
            def.reject()
        }
    });
     
    return def.promise();
}

pmHistory.sendSearchQuery = function(query, limit, offset)
{ 
    if(!limit)
    {
        limit = 999;
    }

    if(!offset)
    {
        offset = 0;
    }

    var q = [];
    for(var i in query)
    {
        q.push(encodeURIComponent(i)+"="+encodeURIComponent(query[i])) 
    }

    var def = new $.Deferred();
    var thisObj = this;
    jQuery.ajax({
        url: "/api/v1/"+this.model.name+"/?"+q.join('&'),
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data
            //thisObj.model.items = {}

            var projects = [];
            for(var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items[val.id] = val
                
                if(!pmProjects.model.items[val.project] && projects.indexOf(val.project) == -1)
                {
                    projects.push(val.project)    
                }
            }
            
            $.when(pmProjects.sendSearchQuery({id:projects.join(',')})).done(function(){
                def.resolve()
            }).fail(function(){
                def.reject()
            }) 
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject()
        }
    });
     
    return def.promise();
}

/**
 * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
 * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
 */
pmHistory.loadItems = function(limit, offset)
{ 
    if(!limit)
    {
        limit = 30;
    }

    if(!offset)
    {
        offset = 0;
    }

    var def = new $.Deferred();
    var thisObj = this; 
    jQuery.ajax({
        url: "/api/v1/"+this.model.name+"/",
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data 
            //thisObj.model.items = {}

            var projects = [];
            for(var i in data.results)
            {
                var val = data.results[i]
                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)
                
                if(!pmProjects.model.items[val.project] && projects.indexOf(val.project) == -1)
                {
                    projects.push(val.project)    
                }
            }
            
            $.when(pmProjects.sendSearchQuery({id:projects.join(',')})).done(function(){
                def.resolve()
            }).fail(function(){
                def.reject()
            }) 
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject()
        }
    });
     
    return def.promise();
}
