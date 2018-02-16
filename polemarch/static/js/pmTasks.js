
/**
 * Список playbook из всех проектов. 
 * Сейчас используется для автокомплитов при выборе playbook.
 * И для запуска конкретного playbook
 */
var pmTasks = inheritance(pmItems)

pmTasks.model.name = "tasks"
pmTasks.model.className = "pmTasks"

pmTasks.execute = function(project_id, inventory, playbook, group, data_vars)
{
    var def = new $.Deferred();
    if(!playbook)
    {
        $.notify("Playbook name is empty", "error");
        def.reject({text:"Playbook name is empty"});
        return def.promise();
    }
    
    if(!(project_id/1))
    {
        $.notify("Invalid field `project` ", "error");
        def.reject({text:"Invalid field `project` "});
        return def.promise();
    }    
   
    if(inventory=="./")
    {
        $.notify("Inventory name is empty", "error");
        def.reject({text:"Inventory name is empty"});
        return def.promise();
    }

    if(group=="")
    {
        $.notify("Group name is empty", "error");
        def.reject({text:"Group name is empty"});
        return def.promise();
    }

    if(data_vars == undefined)
    {
        data_vars = jsonEditor.jsonEditorGetValues();
    }
    
    data_vars.playbook = playbook
    data_vars.inventory = inventory
    spajs.ajax.Call({
        url: "/api/v1/projects/"+project_id+"/execute-playbook/",
        type: "POST",
        data:JSON.stringify(data_vars),
        contentType:'application/json',
                success: function(data) 
        {
            $.notify("Started", "success"); 
            if(data && data.history_id)
            { 
                $.when(spajs.open({ menuId:"project/"+project_id+"/history/"+data.history_id}) ).done(function(){
                    def.resolve()
                }).fail(function(e){
                    def.reject(e)
                })
            }
            else
            {
                def.reject({text:"No history_id", status:500})
            }
        },
        error:function(e)
        {
            def.reject(e)
            polemarch.showErrors(e.responseJSON)
        }
    })

    return def.promise();
}
 
/**
 * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
 * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
 */
pmTasks.loadItems = function(limit, offset)
{
    if(!limit)
    {
        limit = 30;
    }

    if(!offset)
    {
        offset = 0;
    }

    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/",
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
                success: function(data)
        {
            //console.log("update Items", data)
            data.limit = limit
            data.offset = offset
            thisObj.model.itemslist = data 

            for(var i in data.results)
            {
                data.results[i].id = data.results[i].playbook
                var val = data.results[i]
                thisObj.model.items.justWatch(val.id);
                thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)
            }
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}

pmTasks.sendSearchQuery = function(query, limit, offset)
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

    var thisObj = this;
    return spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/?"+q.join('&'),
        type: "GET",
        contentType:'application/json',
        data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
                success: function(data)
        {
            //console.log("update Items", data)
            thisObj.model.itemslist = data

            for(var i in data.results)
            {
                data.results[i].id = data.results[i].playbook

                var val = data.results[i]
                thisObj.model.items[val.id] = val
            }
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
        }
    });
}
