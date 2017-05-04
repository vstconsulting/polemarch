
var pmUsers = {

}


pmUsers.showUsers = function(holder, menuInfo, data)
{
    return $.when(pmUsers.loadUsers()).done(function()
    {
        $(holder).html(spajs.just.render('users_list', {}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmUsers.showUser = function(holder, menuInfo, data)
{
    console.log(menuInfo, data)
    
    return $.when(pmUsers.loadUser(data.reg[1])).done(function()
    {
        $(holder).html(spajs.just.render('user_page', {user_id:data.reg[1]}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

pmUsers.showNewUserPage = function(holder, menuInfo, data)
{ 
    $(holder).html(spajs.just.render('new_user_page', {}))
}

/**
 * Обновляет поле модел polemarch.model.userslist и ложит туда список пользователей 
 * Обновляет поле модел polemarch.model.users и ложит туда список инфу о пользователях по их id
 */
pmUsers.loadUsers = function()
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
 * Обновляет поле модел polemarch.model.users[user_id] и ложит туда пользователя
 */
pmUsers.loadUser = function(user_id)
{
    return jQuery.ajax({
        url: "/api/v1/users/"+user_id+"/",
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
            polemarch.model.users[user_id] = data
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
pmUsers.addUser = function()
{
    var data = {}

    data.email = $("#new_user_email").val()
    data.first_name = $("#new_user_first_name").val()
    data.last_name = $("#new_user_last_name").val()
    data.username = $("#new_user_username").val()
    data.is_active = $("#new_user_is_active").val()
    data.password = $("#new_user_password").val()

    if(!data.username)
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }

    if(!data.password)
    {
        $.notify("Invalid value in filed password", "error");
        return;
    }
 
    return $.ajax({
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
            console.log("service add", data); 
            $.notify("User created", "success");
            spajs.open({ menuId:"user-"+data.id})
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    }); 
}

/** 
 * @return $.Deferred
 */
pmUsers.updateUser = function(user_id)
{
    var data = {}

    data.email = $("#user_"+user_id+"_email").val()
    data.first_name = $("#user_"+user_id+"_first_name").val()
    data.last_name = $("#user_"+user_id+"_last_name").val()
    data.username = $("#user_"+user_id+"_username").val()
    data.is_active = $("#user_"+user_id+"_is_active").val()

    if(!data.username)
    {
        $.notify("Invalid value in filed name", "error");
        return;
    }

    if($("#user_"+user_id+"_password").val())
    {
        data.password = $("#user_"+user_id+"_password").val()
    }

    return $.ajax({
        url: "/api/v1/users/"+user_id+"/",
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
            console.log("service add", data); 
            $.notify("Save", "success");
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/** 
 * @return $.Deferred
 */
pmUsers.deleteUser = function(user_id)
{
    if(!confirm("Are you sure?"))
    {
        return;
    }

    return $.ajax({
        url: "/api/v1/users/"+user_id+"/",
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
            spajs.open({ menuId:"users"})
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
        }
    });
}
