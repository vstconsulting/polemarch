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
})

tabSignal.connect("openapi.schema.definition.ChangePassword", addSettingsToChangePassword);