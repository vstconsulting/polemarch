
var pmUsers = inheritance(pmItems)

pmUsers.model.name = "users"
pmUsers.model.page_name = "user"
pmUsers.model.className = "pmUsers"

pmUsers.model.page_list = {
    title: "Users",
    short_title: "Users",
    fileds:[
        {
            title:'Name',
            name:'username',
        }
    ],
    actions:[
        {
            class:'btn btn-danger',
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+'));'},
            title:'Delete',
            link:function(){ return '#'}
        }
    ]
}
  
pmUsers.fileds = [
        [
            {
                filed: new filedsLib.filed.text(), 
                title:'User name',
                name:'username',
                placeholder:'Enter user name',
                help:'',
                validator:function(value){ return value != '' && value},
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new filedsLib.filed.password(), 
                title:'Password',
                name:'password',
                placeholder:'Enter user password',
                help:'',
                validator:function(value){ return value != '' && value},
                fast_validator:function(value){ return value != '' && value}
            },
        ],[
            {
                filed: new filedsLib.filed.text(), 
                title:'Email',
                name:'email',
                placeholder:'Enter user email',
                help:'',
                validator:function(value){ return value != '' && value},
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new filedsLib.filed.text(), 
                title:'First name',
                name:'first_name',
                placeholder:'Enter user first name',
                help:'',
                validator:function(value){ return value != '' && value},
                fast_validator:function(value){ return value != '' && value}
            },
        ],[
            {
                filed: new filedsLib.filed.text(), 
                title:'Last name',
                name:'last_name',
                placeholder:'Enter user last name',
                help:'',
                validator:function(value){ return value != '' && value},
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new filedsLib.filed.boolean(), 
                title:'Is active',
                name:'is_active', 
            }
        ]
    ]
    
pmUsers.model.page_new = {
    title: "New user",
    short_title: "New user",
    fileds:pmUsers.fileds,
    onCreate:function(result)
    { 
        var def = new $.Deferred();
        $.notify("User created", "success");
        $.when(spajs.open({ menuId:pmUsers.model.page_name+"/"+result.id})).always(function(){
            def.resolve()
        })
        
        return def.promise();
    }
}
 
pmUsers.model.page_item = {
    title: function(item_id){ 
        return "User "+pmUsers.model.items[item_id].justText('username')
    },
    short_title: function(item_id){ 
        return "User "+pmUsers.model.items[item_id].justText('username', function(v){return v.slice(0, 20)})
    },
    fileds:pmUsers.fileds,
    onUpdate:function(result)
    { 
        return true;
    }
}
 
   
pmUsers.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.username = "copy-from-" + data.username
        spajs.ajax.Call({
            url: "/api/v1/"+thisObj.model.name+"/",
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


    return def.promise();
}
   
 tabSignal.connect("polemarch.start", function()
 {
    // users
    spajs.addMenu({
        id:"users",
        urlregexp:[/^users$/, /^user$/, /^users\/search\/?$/, /^users\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"users-search",
        urlregexp:[/^users\/search\/([A-z0-9 %\-.:,=]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"user",
        urlregexp:[/^user\/([0-9]+)$/, /^users\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newuser",
        urlregexp:[/^new-user$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showNewItemPage(holder, menuInfo, data);}
    })

 })