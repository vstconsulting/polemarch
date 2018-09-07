tabSignal.connect("openapi.factory.group", function(data)
{
  apigroup.one.copy = function()
  {
        var def = new $.Deferred();
        var thisObj = this;

        $.when(this.loadItem(this.model.data.id)).done(function()
        {
            var data = thisObj.model.items[this.model.data.id];
            delete data.id;
            data.name = "copy-from-" + data.name
            $.when(encryptedCopyModal.replace(data)).done(function(data)
            {
                spajs.ajax.Call({
                    url: hostname + "/api/v2/"+thisObj.model.name+"/",
                    type: "POST",
                    contentType:'application/json',
                    data: JSON.stringify(data),
                    success: function(newItem)
                    {
                        thisObj.model.items[newItem.id] = newItem

                        if(data.children)
                        {
                            var groups = []
                            for(var i in data.groups)
                            {
                                groups.push(data.groups[i].id)
                            }
                            $.when(thisObj.setSubGroups(newItem.id, groups)).always(function(){
                                def.resolve(newItem.id)
                            })
                        }
                        else
                        {
                            var hosts = []
                            for(var i in data.hosts)
                            {
                                hosts.push(data.hosts[i].id)
                            }

                            $.when(thisObj.setSubHosts(newItem.id, hosts)).always(function(){
                                def.resolve(newItem.id)
                            })
                        }
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
 