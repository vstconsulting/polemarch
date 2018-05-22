
function inAppLogout()
{
    return spajs.ajax.Call({
        url: polemarch_logout_url,
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify({next:"/app-login"}),
        success: function (data)
        {
            inAppClose();
        },
        error: function (e)
        {
            inAppClose();
        }
    });
}

function inAppClose()
{
    window.parent.spajs.openURL('?');
}