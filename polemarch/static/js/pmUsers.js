 
var pmUsers = inheritance(pmItems)  
 
pmUsers.model.name = "users"
pmUsers.model.page_name = "user"
  
pmUsers.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.username = "copy-from-" + data.username
        $.ajax({
            url: "/api/v1/"+thisObj.model.name+"/",
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
                thisObj.model.items[data.id] = data
                def.resolve(data.id)
            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    })

    return def.promise();
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
    data.is_active = $("#new_user_is_active").hasClass('selected') 
    data.is_staff = true // $("#new_user_is_staff").val()
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
            $.notify("User created", "success");
            $.when(spajs.open({ menuId:"user/"+data.id})).always(function(){
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
    data.is_active = $("#user_"+item_id+"_is_active").hasClass('selected') 
    data.is_staff = true // $("#user_"+item_id+"_is_staff").val()

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
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.warn("user "+item_id+" update error - " + JSON.stringify(e)); 
            polemarch.showErrors(e.responseJSON)
        }
    });
}
 