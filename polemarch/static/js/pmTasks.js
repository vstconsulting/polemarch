
var pmTasks = new pmItems()

pmTasks.model.name = "tasks"



pmTasks.execute = function(item_id, inventory)
{
    var thisObj = this;
    var def = new $.Deferred();
    $.when(pmTasks.loadItem(item_id)).always(function()
    {
        $.when($.ajax({
            url: "/api/v1/projects/"+thisObj.model.items[item_id].project+"/execute/",
            type: "POST",
            data:JSON.stringify({
                playbook:thisObj.model.items[item_id].playbook,
                inventory:inventory
            }),
            contentType:'application/json',
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            }
        })).always(function(){
            def.resolve();
        })
    }).promise();

    return def.promise();
}
