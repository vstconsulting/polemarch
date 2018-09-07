tabSignal.connect("openapi.factory.user", function(data)
{
    apiuser.one.copy = function()
    {
        var def = new $.Deferred();
        var thisObj = this;

        $.when(this.loadItem(this.model.data.id)).done(function()
        {
            var data = thisObj.model.items[this.model.data.id];
            delete data.id;
            data.username = "copy-from-" + data.username

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
 
//создание страницы профиля текущего пользователя
//@todo нужно доделать
tabSignal.connect("openapi.completed", function()
{
    var page = new guiPage();

    // Настроили страницу
    page.blocks.push({
        id:'itemOne',
        render:(menuInfo, data)=>
        {
            var pageItem = new apisettings.one({
                url:{
                    page:'user/'+my_user_id+'/settings',
                    api_pk:my_user_id
                }
            })

            var def = new $.Deferred();
            $.when(pageItem.load(my_user_id)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        }
    })

    page.registerURL([/^profile\/settings$/], "profile_settings");
})


tabSignal.connect("openapi.completed", function()
{
    var page = new guiPage();

    // Настроили страницу
    page.blocks.push({
        id:'itemOne',
        render:(menuInfo, data)=>
        {
            var pageItem = new apiuser.one({
                url:{
                    page:'user/'+my_user_id,
                    api_pk:my_user_id
                }
            })

            var def = new $.Deferred();
            $.when(pageItem.load(my_user_id)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        }
    })

    page.registerURL([/^profile$/], "profile");
})