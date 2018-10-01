var pmUsers = {}


/**
 *Функция открывает модальное окно с формой для изменения пароля.
 */
pmUsers.openChangePasswordForm = function(item_id)
{
    if($('div').is('#change_password_form'))
    {
        $('#change_password_form').empty();
        $('#change_password_form').html(pmUsers.renderModalWindow(item_id));
        $("#change_password_form").modal('show');
    }
    else
    {
        var t=$(".content")[0];
        $('<div>', { id: "change_password_form", class: "modal fade in"}).appendTo(t);
        $('#change_password_form').html(pmUsers.renderModalWindow(item_id));
        $("#change_password_form").modal('show');
    }
}

/**
 *Функция рендинга модального окна для смены пароля пользователя.
 */
pmUsers.renderModalWindow = function(item_id)
{
    var html=spajs.just.render('change_password_form', {item_id: item_id});
    return html;
}

/**
 *Функция смены пароля пользователя: пользователь вводит новый ароль дважды, чтобы исключить вероятность опечатки.
 *Если оба введенных значения идентичны друг другу, то новый пароль сохраняется.
 *В противном случае выводится сообщение об ошибке.
 */
pmUsers.changePassword = function(item_id)
{
    var thisObj = this;
    var def = new $.Deferred();
    var newPassword1 = $("#new_password").val();
    var newPassword2 = $("#new_password_confirm").val();
    if(newPassword1==newPassword2 && newPassword1==""){
        $.notify("Form is empty", "error");
        def.resolve();
        return def.promise();
    }
    if(newPassword1==newPassword2 && newPassword1!="")
    {
        var data={"password": newPassword1};
        spajs.ajax.Call({
            url: hostname + "/api/v2/"+thisObj.model.name+"/"+item_id+"/",
            type: "PATCH",
            contentType:'application/json',
            data: JSON.stringify(data),
            success: function(data)
            {

                if(my_user_id==item_id)
                {
                    return $.when(hidemodal(), $("#change_password_form").modal('hide')).done(function(){
                        def.resolve();
                        return spajs.openURL("/");
                    }).promise();
                }
                else
                {
                    $.notify("Password was successfully changed", "success");
                    $("#change_password_form").modal('hide');
                    def.resolve();
                }

            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    }
    else
    {
        $.notify("Confirm password value is not the same as new password one", "error");
        def.reject();
    }
    return def.promise();
}

tabSignal.connect("openapi.completed", function()
{
    let user_settings = guiSchema.path['/user/{pk}/settings/'];
    user_settings.canEdit = true;
    user_settings.methodEdit = 'post';
    ['chartLineSettings', 'widgetSettings'].forEach(function (name) {
        user_settings.schema.get.fields[name].format = 'inner_api_object';
    })
})