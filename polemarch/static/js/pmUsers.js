 
var pmUsers = new pmItems()  

pmUsers.showList = function(holder, menuInfo, data)
{
    return $.when(pmUsers.loadAllItems()).done(function()
    {
        $(holder).html(spajs.just.render('users_list', {}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmUsers.showItem = function(holder, menuInfo, data)
{
    console.log(menuInfo, data)
    
    return $.when(pmUsers.loadItem(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('user_page', {item_id:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmUsers.showNewItemPage = function(holder, menuInfo, data)
{ 
    $(holder).html(spajs.just.render('new_user_page', {}))
}

/**
 * Обновляет поле модел polemarch.model.userslist и ложит туда список пользователей 
 * Обновляет поле модел polemarch.model.users и ложит туда список инфу о пользователях по их id
 */
pmUsers.loadAllItems = function()
{
    return jQuery.ajax({
        url: "/api/v1/users/",
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
            console.log("updateUsers", data)
            polemarch.model.userslist = data
            polemarch.model.users = {}
            
            for(var i in polemarch.model.users.results)
            {
                var val = polemarch.model.users.results[i]
                polemarch.model.users[val.id] = val
            }
        },
        error:function(e)
        {
            console.log(e)
            polemarch.showErrors(e)
        }
    });
}

/**
 * Обновляет поле модел polemarch.model.users[item_id] и ложит туда пользователя
 */
pmUsers.loadItem = function(item_id)
{
    return jQuery.ajax({
        url: "/api/v1/users/"+item_id+"/",
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
            console.log("loadUser", data)
            polemarch.model.users[item_id] = data
        },
        error:function(e)
        {
            console.log(e)
            polemarch.showErrors(e)
        }
    });
}


/** 
 * @return $.Deferred
 */
pmUsers.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.email = $("#new_user_email").val()
    data.first_name = $("#new_user_first_name").val()
    data.last_name = $("#new_user_last_name").val()
    data.username = $("#new_user_username").val()
    data.is_active = $("#new_user_is_active").val()
    data.is_staff = $("#new_user_is_staff").val()
    data.password = $("#new_user_password").val()

    if(!data.username)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }

    if(!data.password)
    {
        $.notify("Invalid value in filed password", "error");
        def.reject()
        return def.promise();
    }
 
    $.ajax({
        url: "/api/v1/users/",
        type: "POST",
        contentType:'application/json',
        data: JSON.stringify(data),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            console.log("user add", data); 
            $.notify("User created", "success");
            $.when(spajs.open({ menuId:"user-"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    }); 
    
    return def.promise();
}

/** 
 * @return $.Deferred
 */
pmUsers.updateItem = function(item_id)
{
    var data = {}

    data.email = $("#user_"+item_id+"_email").val()
    data.first_name = $("#user_"+item_id+"_first_name").val()
    data.last_name = $("#user_"+item_id+"_last_name").val()
    data.username = $("#user_"+item_id+"_username").val()
    data.is_active = $("#user_"+item_id+"_is_active").val()
    data.is_staff = $("#user_"+item_id+"_is_staff").val()

    if(!data.username)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }

    if($("#user_"+item_id+"_password").val())
    {
        data.password = $("#user_"+item_id+"_password").val()
    }

    return $.ajax({
        url: "/api/v1/users/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data:JSON.stringify(data),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            console.log("user update", data); 
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("user "+item_id+" update error - " + JSON.stringify(e)); 
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/** 
 * @return $.Deferred
 */
pmUsers.deleteItem = function(item_id, force)
{
    var def = new $.Deferred();
    if(!force && !confirm("Are you sure?"))
    {
        def.reject()
        return def.promise();
    }

    $.ajax({
        url: "/api/v1/users/"+item_id+"/",
        type: "DELETE",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            console.log("users delete", data);  
            $.when(spajs.open({ menuId:"users"})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    });
    
    return def.promise();
}
