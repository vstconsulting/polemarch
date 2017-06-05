
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

polemarch.model.userslist = []
polemarch.model.users = {}

polemarch.model.hostslist = []
polemarch.model.hosts = {}

polemarch.model.groupslist = []
polemarch.model.groups = {} 

polemarch.model.inventorieslist = []
polemarch.model.inventories = {}
            
polemarch.model.projectslist = []
polemarch.model.projects = {}


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
        urlregexp:[/^users$/, /^user$/],
        onOpen:pmUsers.showList
    })

    spajs.addMenu({
        id:"user",
        name:"user",
        urlregexp:[/^user\/([0-9]+)$/],
        onOpen:pmUsers.showItem
    })

    spajs.addMenu({
        id:"newuser",
        name:"newuser",
        urlregexp:[/^new-user$/],
        onOpen:pmUsers.showNewItemPage
    })

 
    // hosts
    spajs.addMenu({
        id:"hosts",
        name:"hosts",
        urlregexp:[/^hosts$/, /^host$/],
        onOpen:pmHosts.showList
    })

    spajs.addMenu({
        id:"host",
        name:"host",
        urlregexp:[/^host\/([0-9]+)$/],
        onOpen:pmHosts.showItem
    })

    spajs.addMenu({
        id:"newHost",
        name:"newHost",
        urlregexp:[/^new-host$/, /^([A-z0-9_]+)\/([0-9]+)\/new-host$/],
        onOpen:pmHosts.showNewItemPage
    })


    // groups
    spajs.addMenu({
        id:"groups",
        name:"groups",
        urlregexp:[/^groups$/, /^group$/],
        onOpen:pmGroups.showList
    })

    spajs.addMenu({
        id:"group",
        name:"group",
        urlregexp:[/^group\/([0-9]+)$/],
        onOpen:pmGroups.showItem
    })

    spajs.addMenu({
        id:"newGroup",
        name:"newGroup",
        urlregexp:[/^new-group$/, /^([A-z0-9_]+)\/([0-9]+)\/new-group$/],
        onOpen:pmGroups.showNewItemPage
    })
    
    // inventories
    spajs.addMenu({
        id:"inventories",
        name:"inventories",
        urlregexp:[/^inventories$/, /^inventory$/],
        onOpen:pmInventories.showList
    })

    spajs.addMenu({
        id:"inventory",
        name:"inventory",
        urlregexp:[/^inventory\/([0-9]+)$/],
        onOpen:pmInventories.showItem
    })

    spajs.addMenu({
        id:"newInventory",
        name:"newInventory",
        urlregexp:[/^new-inventory$/, /^([A-z0-9_]+)\/([0-9]+)\/new-inventory$/],
        onOpen:pmInventories.showNewItemPage
    })
    
    // inventories
    spajs.addMenu({
        id:"projects",
        name:"projects",
        urlregexp:[/^projects$/, /^project$/],
        onOpen:pmProjects.showList
    })
 
    spajs.addMenu({
        id:"project",
        name:"project",
        urlregexp:[/^project\/([0-9]+)$/],
        onOpen:pmProjects.showItem
    })

    spajs.addMenu({
        id:"newProject",
        name:"newProject",
        urlregexp:[/^new-project$/],
        onOpen:pmProjects.showNewItemPage
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