
var pmTemplates = inheritance(pmItems)
 
pmTemplates.model.name = "templates"


// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmTemplates.model.kind = "Task,Module"
pmTemplates.model.page_name = "templates"
pmTemplates.model.bulk_name = "template"
pmTemplates.model.className = "pmTemplates"

pmTemplates.copyAndEdit = function(item_id)
{
    if(!item_id)
    {
        throw "Error in pmTemplates.copyAndEdit with item_id = `" + item_id + "`"
    }
    
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
    
pmTemplates.execute = function(item_id)
{ 
    var def = new $.Deferred(); 
    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/" + item_id+"/execute/",
        type: "POST",
        data:JSON.stringify({}),
        contentType:'application/json',
                success: function(data)
        {
            $.notify("Started", "success");
            if(data && data.history_id)
            {
                $.when(spajs.open({ menuId:"history/"+data.history_id}) ).done(function(){
                    def.resolve()
                }).fail(function(){
                    def.reject()
                })
            }
            else
            {
                def.reject()
            }
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    })

    return def.promise(); 
}

    
// Содержит соответсвия разных kind к объектами с ними работающими.
pmTemplates.model.kindObjects = {}

 
pmTemplates.exportToFile = function(item_ids)
{
    var def = new $.Deferred();
    if(!item_ids)
    {
        $.notify("No data for export", "error");
        def.reject();
        return def.promise();
    }

    var data = {
        "filter": {
            "id__in": item_ids,
        },
    }

    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/"+this.model.name+"/filter/?detail=1",
        type: "POST",
        contentType:'application/json',
        data:JSON.stringify(data),
                success: function(data)
        {
            var filedata = []
            for(var i in data.results)
            {
                var val = data.results[i]
                delete val['id'];
                delete val['url'];

                filedata.push({ 
                    item: thisObj.model.page_name,
                    data: val
                })
            }
            
            var fileInfo = {
                data:filedata,
                count:filedata.length,
                version:"1"
            }
            
            var textFileAsBlob = new Blob([JSON.stringify(fileInfo)], {
              type: 'text/plain'
            });

            var newLink = document.createElement('a')
            newLink.href = window.URL.createObjectURL(textFileAsBlob)
            newLink.download = thisObj.model.name+"-"+Date()+".json"
            newLink.target = "_blanl"
            var event = new MouseEvent("click");
            newLink.dispatchEvent(event);


            def.resolve();
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject();
        }
    });

    return def.promise();
}

pmTemplates.importFromFile = function(files_event, project_id)
{  
    var def = new $.Deferred(); 
    this.model.files = files_event
    
    for(var i=0; i<files_event.target.files.length; i++)
    {
        var reader = new FileReader();
        reader.onload = (function(index_in_files_array)
        {
            return function(e)
            {
                console.log(e)
                var bulkdata = []
                var filedata = JSON.parse(e.target.result)
                
                if(filedata.version/1 > 1)
                {
                    polemarch.showErrors("Error file version is "+filedata.version)
                    def.reject();
                    return;
                }
                
                for(var i in filedata.data)
                {
                    var val = filedata.data[i]
                    val.data.data.project = project_id
                    val.type = "add"
                    bulkdata.push(val)
                }
                console.log(bulkdata)
                 
                spajs.ajax.Call({
                    url: "/api/v1/_bulk/",
                    type: "POST",
                    contentType:'application/json',
                    data:JSON.stringify(bulkdata),
                                        success: function(data)
                    { 
                        def.resolve();
                        spajs.openURL(window.location.href);
                    },
                    error:function(e)
                    {
                        console.warn(e)
                        polemarch.showErrors(e)
                        def.reject();
                    }
                });
            };
        })(i);
        reader.readAsText(files_event.target.files[i]); 
        
        // Нет поддержки загрузки более одного файла за раз.
        break;
    }
    
    return def.promise();
}