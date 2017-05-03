
var pmUsers = {

}


pmUsers.showUsers = function(holder, menuInfo, data)
{
    return $.when(pmUsers.updateUsers()).done(function()
    {
        $(holder).html(spajs.just.render('users_list', {}))
    }).fail(function()
    {
        $.notify("", "error");
    })
}

/**
 * Обновляет поле модел polemarch.model.users и ложит туда список пользователей
 */
pmUsers.updateUsers = function()
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
            console.log(data)
            polemarch.model.users = data
        },
        error:function(e)
        {
            console.log(e)
            polemarch.showErrors(e)
        }
    });
}