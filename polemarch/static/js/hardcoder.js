

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.owner", function(data)
{
    apiowner.view.defaultName = "username"
})

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.user", function(data)
{
    apiowner.view.defaultName = "username"
})

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.variables", function(data)
{
    apiowner.view.defaultName = "key"
})
 
tabSignal.connect("openapi.factory.project", function(data)
{
    apiproject.one.onBeforeadd = function(data)
    { 
        data.repository = $("#new_project_repository").val()
        data.vars = {
            repo_type:$("#new_project_type").val(),
            //repo_password:$("#new_project_password").val(),
        }

        if(data.repo_sync_on_run)
        {
            data.vars.repo_sync_on_run = true;
        }

        delete data.repo_sync_on_run;

        if(data.vars.repo_type == "GIT")
        {
            if($("#new_project_branch").val().trim()!="")
            {
                data.vars.repo_branch=$("#new_project_branch").val().trim();
            }

            if($("#new_project_password").val().trim()!="")
            {
                data.vars.repo_password=$("#new_project_password").val().trim();
            }
        }


        if(!data.repository)
        {
            if(data.vars.repo_type == "MANUAL")
            {
                data.repository = "MANUAL"
            }
            else
            {
                $.notify("Invalid value in field `Repository URL`", "error");
                return false;
            }
        }

        return data;
    }
     
})
