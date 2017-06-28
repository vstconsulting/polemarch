
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
    }, 1000)


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
        name:"home",
        urlregexp:[/^(home|)$/],
        onOpen:polemarch.showHome
    })


    // users
    spajs.addMenu({
        id:"users",
        name:"users",
        urlregexp:[/^users$/, /^user$/, /^users\/(page)\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"users-search",
        name:"users-search",
        urlregexp:[/^users\/search\/([A-z0-9 \-]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"user",
        name:"user",
        urlregexp:[/^user\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newuser",
        name:"newuser",
        urlregexp:[/^new-user$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showNewItemPage(holder, menuInfo, data);}
    })

 
    // hosts
    spajs.addMenu({
        id:"hosts",
        name:"hosts",
        urlregexp:[/^hosts$/, /^host$/, /^hosts\/(page)\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"hosts-search",
        name:"hosts",
        urlregexp:[/^hosts\/search\/([A-z0-9 \-]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"host",
        name:"host",
        urlregexp:[/^host\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newHost",
        name:"newHost",
        urlregexp:[/^new-host$/, /^([A-z0-9_]+)\/([0-9]+)\/new-host$/],
        onOpen:function(holder, menuInfo, data){return pmHosts.showNewItemPage(holder, menuInfo, data);}
    })


    // groups
    spajs.addMenu({
        id:"groups",
        name:"groups",
        urlregexp:[/^groups$/, /^group$/, /^groups\/(page)\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"groups-search",
        name:"groups-search",
        urlregexp:[/^groups\/search\/([A-z0-9 \-]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"group",
        name:"group",
        urlregexp:[/^group\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newGroup",
        name:"newGroup",
        urlregexp:[/^new-group$/, /^([A-z0-9_]+)\/([0-9]+)\/new-group$/],
        onOpen:function(holder, menuInfo, data){return pmGroups.showNewItemPage(holder, menuInfo, data);}
    })
    
    // inventories
    spajs.addMenu({
        id:"inventories",
        name:"inventories",
        urlregexp:[/^inventories$/, /^inventory$/, /^inventories\/(page)\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showList(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"inventories-search",
        name:"inventories-search",
        urlregexp:[/^inventories\/search\/([A-z0-9 \-]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"inventory",
        name:"inventory",
        urlregexp:[/^inventory\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newInventory",
        name:"newInventory",
        urlregexp:[/^new-inventory$/, /^([A-z0-9_]+)\/([0-9]+)\/new-inventory$/],
        onOpen:function(holder, menuInfo, data){return pmInventories.showNewItemPage(holder, menuInfo, data);}
    })
    
    // projects
    spajs.addMenu({
        id:"projects",
        name:"projects",
        urlregexp:[/^projects$/, /^project$/, /^projects\/(page)\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openList(holder, menuInfo, data);},
        onClose:function(){return pmProjects.closeList();},
    })
 
    spajs.addMenu({
        id:"projects-search",
        name:"projects-search",
        urlregexp:[/^projects\/search\/([A-z0-9 \-]+)$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.showSearchResults(holder, menuInfo, data);}
    })
    
    spajs.addMenu({
        id:"project",
        name:"project",
        urlregexp:[/^project\/([0-9]+)$/], 
        onOpen:function(holder, menuInfo, data){return pmProjects.openItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newProject",
        name:"newProject",
        urlregexp:[/^new-project$/],
        onOpen:function(holder, menuInfo, data){return pmProjects.openNewItemPage(holder, menuInfo, data);}
    })
    
    spajs.openMenuFromUrl()
}

polemarch.showHome = function(holder, menuInfo, data)
{
    $(holder).html(spajs.just.render('home_page', {}))
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