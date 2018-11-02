function addSettingsToChangePassword(obj)
{
    let properties = obj.definition.properties;
    ['old_password', 'password', 'password2'].forEach(function (name) {
        properties[name].format = 'password';
    })
}

tabSignal.connect("openapi.completed", function()
{
    let user_settings = guiSchema.path['/user/{pk}/settings/'];
    user_settings.canEdit = true;
    user_settings.methodEdit = 'post';
    ['chartLineSettings', 'widgetSettings'].forEach(function (name) {
        user_settings.schema.get.fields[name].format = 'inner_api_object';
        user_settings.schema.get.fields[name].readOnly = false;
    })
    user_settings.schema.get.fields['autoupdateInterval'].readOnly = false;
    user_settings.schema.get.fields['autoupdateInterval'].min = 1;
    user_settings.schema.get.fields['autoupdateInterval'].default = guiDashboard.model.autoupdateInterval / 1000;
    user_settings.schema.get.fields['autoupdateInterval'].title = 'Data autoupdate interval';
    user_settings.schema.get.fields['autoupdateInterval'].format = 'time_interval';

    user_settings.schema.post = {
        fields: user_settings.schema.get,
        operationId: 'user_settings_edit',
        query_type: 'post',
    }

    user_settings.method.post = 'post';

    let user = guiSchema.path['/user/'];
    user.schema.new.fields['password'].format = "password";
    user.schema.new.fields['password2'].format = "password";

})

tabSignal.connect("openapi.schema.definition.ChangePassword", addSettingsToChangePassword);

gui_user_settings = {
    update: function()
    {
        let base_update = gui_page_object.update.apply(this, arguments);
        return $.when(base_update).done(data => {
            guiDashboard.setUserSettingsFromApiAnswer(data.data)
        })
    }
}