tabSignal.connect("openapi.factory.host", function(data)
{
    apihost.one.copy = function()
    {
        var def = new $.Deferred();
        var thisObj = this;

        $.when(this.loadItem(this.model.data.id)).done(function()
        {
            var data = thisObj.model.items[this.model.data.id];
            $.when(encryptedCopyModal.replace(data)).done(function(data)
            {
                delete data.id;
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
 