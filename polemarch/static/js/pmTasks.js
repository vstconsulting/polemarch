
var pmTasks = new pmItems()

pmTasks.model.name = "tasks"


pmTasks.execute = function(project_id, inventory, playbook)
{ 
    var def = new $.Deferred(); 
    if(!playbook)
    { 
        $.notify("Playbook name is empty", "error");
        def.reject();
        return def.promise();
    }
    
    $.ajax({
        url: "/api/v1/projects/"+project_id+"/execute/",
        type: "POST",
        data:JSON.stringify({
            playbook:playbook,
            inventory:inventory,
            vars:jsonEditor.jsonEditorGetValues()
        }),
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            $.notify("Started", "success");
            def.resolve();
        },
        error:function(e)
        {
            def.reject() 
            polemarch.showErrors(e.responseJSON)
        }
    })
    
    return def.promise();
}
