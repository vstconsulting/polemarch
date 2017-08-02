
function getCookie(name)
{
    var cookieValue = null;
    if (document.cookie && document.cookie != '')
    {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++)
        {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '='))
            {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

var polemarch = {

}

polemarch.opt = {}
polemarch.opt.holder = undefined
polemarch.opt.host = "//"+window.location.host

polemarch.model = {}

polemarch.model.nowTime = 0;
    
polemarch.start = function(options)
{
    for(var i in options)
    {
        if(polemarch.opt[i] && typeof(polemarch.opt[i]) == "object")
        {
            for(var j in options[i])
            {
                polemarch.opt[i][j] = options[i][j]
            }
        }
        polemarch.opt[i] = options[i]
    }

    spajs.init({
        holder: polemarch.opt.holder,
        menu_url: undefined,
        useHistoryApi:true
    })

    setInterval(function()
    {
        var t = new Date();
        polemarch.model.nowTime = t.getTime();
    }, 5001)


    $("body").touchwipe({
        wipingLeftEnd: function(e)
        {
            if(e.isFull && Math.abs(e.dx) >  Math.abs(e.dy))
            {
                $('body').removeClass('sidebar-open');
            }
        },
        wipingRightEnd:  function(e)
        {
            if(e.isFull && Math.abs(e.dx) >  Math.abs(e.dy))
            {
                $('body').addClass('sidebar-open');
            }
        },
        min_move_x: 120,
        min_move_y: 120,
        preventDefaultEvents: false
    });


    spajs.addMenu({
        id:"home", 
        urlregexp:[/^(home|)$/],
        onOpen:function(holder, menuInfo, data){return pmDashboard.open(holder, menuInfo, data);},
        onClose:function(){return pmDashboard.stopUpdates();},
    })
    
    // users
    spajs.addMenu({
        id:"users", 
        urlregexp:[/^users$/, /^user$/, /^users\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"users-search", 
        urlregexp:[/^users\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"user", 
        urlregexp:[/^user\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newuser", 
        urlregexp:[/^new-user$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showNewItemPage(holder, menuInfo, data);}
    })

 
    // hosts
    spajs.addMenu({
        id:"hosts", 
        urlregexp:[/^hosts$/, /^host$/, /^hosts\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"hosts-search", 
        urlregexp:[/^hosts\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"host", 
        urlregexp:[/^host\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newHost", 
        urlregexp:[/^new-host$/, /^([A-z0-9_]+)\/([0-9]+)\/new-host$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showNewItemPage(holder, menuInfo, data);}
    })


    // groups
    spajs.addMenu({
        id:"groups", 
        urlregexp:[/^groups$/, /^group$/, /^groups\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"groups-search", 
        urlregexp:[/^groups\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"group", 
        urlregexp:[/^group\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newGroup", 
        urlregexp:[/^new-group$/, /^([A-z0-9_]+)\/([0-9]+)\/new-group$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showNewItemPage(holder, menuInfo, data);}
    })
    
    // inventories
    spajs.addMenu({
        id:"inventories", 
        urlregexp:[/^inventories$/, /^inventory$/, /^inventories\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"inventories-search", 
        urlregexp:[/^inventories\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"inventory", 
        urlregexp:[/^inventory\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newInventory", 
        urlregexp:[/^new-inventory$/, /^([A-z0-9_]+)\/([0-9]+)\/new-inventory$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showNewItemPage(holder, menuInfo, data);}
    })
    
    // projects
    spajs.addMenu({
        id:"projects", 
        urlregexp:[/^projects$/, /^project$/, /^projects\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.showUpdatedList(holder, menuInfo, data);},
        onClose:function(){return pmProjects.stopUpdates();},
    })
 
    spajs.addMenu({
        id:"projects-search", 
        urlregexp:[/^projects\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.showSearchResults(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"project", 
        urlregexp:[/^project\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmProjects.openItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newProject", 
        urlregexp:[/^new-project$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openNewItemPage(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"project-run-playbook", 
        urlregexp:[/^project\/([0-9]+)\/playbook\/run$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openRunPlaybookPage(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"project-ansible-module-run", 
        urlregexp:[/^project\/([0-9]+)\/ansible-module\/run$/],
        onOpen:function(holder, menuInfo, data){return pmAnsibleModule.showInProject(holder, menuInfo, data);}
    })
    
    // tasks
    spajs.addMenu({
        id:"PeriodicTasks", 
        urlregexp:[/^project\/([0-9]+)\/periodic-tasks$/, /^project\/([0-9]+)\/periodic-task$/, /^project\/([0-9]+)\/periodic-tasks\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showList(holder, menuInfo, data);} 
    })
    
    spajs.addMenu({
        id:"PeriodicTasks-search", 
        urlregexp:[/^project\/([0-9]+)\/periodic-tasks\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showSearchResults(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"PeriodicTask", 
        urlregexp:[/^project\/([0-9]+)\/periodic-task\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newPeriodicTask", 
        urlregexp:[/^project\/([0-9]+)\/new-periodic-tasks$/],
        onOpen:function(holder, menuInfo, data){return pmPeriodicTasks.showNewItemPage(holder, menuInfo, data);}
    })
    
    // history
    spajs.addMenu({
        id:"history", 
        urlregexp:[/^history$/, /^history\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showUpdatedList(holder, menuInfo, data);}, 
        onClose:function(){return pmHistory.stopUpdates();},
    })
    
    spajs.addMenu({
        id:"history-search", 
        urlregexp:[/^history\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showSearchResults(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"history-item", 
        urlregexp:[/^history\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmHistory.showItem(holder, menuInfo, data);},
        onClose:function(){return pmHistory.stopUpdates();}
    })
    
    spajs.addMenu({
        id:"history-item-in-project", 
        urlregexp:[/^project\/([0-9]+)\/history\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmHistory.showItemInProjects(holder, menuInfo, data);},
        onClose:function(){return pmHistory.stopUpdates();}
    })
    
    spajs.addMenu({
        id:"project-history",  
        urlregexp:[/^project\/([0-9]+)\/history$/, /^project\/([0-9]+)\/history\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){
            return pmHistory.showUpdatedList(holder, menuInfo, data, "showListInProjects", function(menuInfo, data)
            {
                var offset = 0
                var limit = pmHistory.pageSize;
                if(data.reg && data.reg[2] > 0)
                {
                    offset = pmHistory.pageSize*(data.reg[2] - 1);
                }
                var project_id = data.reg[1];

                return pmHistory.sendSearchQuery({project:project_id}, limit, offset)
            });
        }, 
        onClose:function(){return pmHistory.stopUpdates();}, 
    })

    spajs.addMenu({
        id:"project-history-search", 
        urlregexp:[/^project\/([0-9]+)\/history\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHistory.showSearchResultsInProjects(holder, menuInfo, data);}
    })
    
    
    // Tasks Templates
    spajs.addMenu({
        id:"tasks", 
        urlregexp:[/^templates$/, /^tasks\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"tasks-search", 
        urlregexp:[/^templates\/search\/([A-z0-9 %\-.]+)$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showSearchResults(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"Task-item", 
        urlregexp:[/^template\/Task\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showItem(holder, menuInfo, data);}, 
    })
    
    spajs.addMenu({
        id:"task-new", 
        urlregexp:[/^template\/new-task$/],
        onOpen:function(holder, menuInfo, data){return pmTasksTemplates.showNewItemPage(holder, menuInfo, data);}
    })
     
    spajs.addMenu({
        id:"Module-item", 
        urlregexp:[/^template\/Module\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showItem(holder, menuInfo, data);}, 
    })
    
    spajs.addMenu({
        id:"module-new", 
        urlregexp:[/^template\/new-module$/],
        onOpen:function(holder, menuInfo, data){return pmModuleTemplates.showNewItemPage(holder, menuInfo, data);}
    })
    
    spajs.openMenuFromUrl()
}
 
polemarch.showErrors = function(res)
{
    if(!res)
    {
        return true;
    }
    
    if(res.responseJSON)
    {
        res = res.responseJSON
    }

    if(res && res.info && res.info.message)
    { 
        console.error('showErrors:' + res.info.message)
        $.notify(res.info.message, "error");
        return res.info.message;
    }
    else if(res && res.message)
    { 
        console.error('showErrors:' + res.message)
        $.notify(res.message, "error");
        return res.message;
    } 
    
    if(typeof res === "string")
    {
        console.error('showErrors:' + res)
        $.notify(res, "error");
        return res;
    }

    for(var i in res)
    {
        if(i == "error_type")
        {
            continue;
        }

        if(typeof res[i] === "string")
        {
            console.error('showErrors:' + res[i])
            $.notify(res[i], "error");
            return res[i];
        }
        else if(typeof res[i] === "object")
        {
            return polemarch.showErrors(res[i])
        }
    }
}