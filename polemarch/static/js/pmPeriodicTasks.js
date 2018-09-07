tabSignal.connect("openapi.factory.periodic_rask", function(data)
{
    apiperiodic_task.one.copy = function()
    {
        if(!this.model.data.id)
        {
            throw "Error in pmPeriodicTasks.copyItem with item_id = `" + item_id + "`"
        }

        var def = new $.Deferred();
        var thisObj = this;

        $.when(this.loadItem(this.model.data.id)).done(function()
        {
            var data = thisObj.model.items[this.model.data.id];
            delete data.id;
            data.name = "copy from " + data.name
            data.vars.group = data.group
            data.vars.args = data.args

            delete data.group;
            delete data.args;

            $.when(encryptedCopyModal.replace(data)).done(function(data)
            {
                spajs.ajax.Call({
                    url: hostname + "/api/v2/"+thisObj.model.name+"/",
                    type: "POST",
                    contentType:'application/json',
                    data: JSON.stringify(data),
                    success: function(data)
                    {
                        thisObj.model.items[data.id] = data
                        def.resolve(data.id)
                    },
                    error:function(e)
                    {
                        def.reject(e)
                    }
                });
            }).fail(function(e)
            {
                def.reject(e)
            })

        }).fail(function(e)
        {
            def.reject(e)
        })


        return def.promise();
    }
})
 