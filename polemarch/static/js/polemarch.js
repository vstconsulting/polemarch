
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
        menuId_url: "spa",
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
        id:"home",              // id комнаты должен соответсвовать регулярному выражению  [A-z9-0_]{ 4,64}
        name:"home",                        // Имя кнопки
        urlregexp:[/^(home|)$/],
        type:"custom",                  // Тип пункта меню (false|bottom|custom)
        menuHtml:'<a href="/?spa=home" onclick="return spajs.openURL(this.href);" ><i class="fa fa-wrench"></i> <span>Home</span></a>',
        priority: 100,
        /*
         *  callback вызываемый по открытии этого пункта меню
         *  @param object holder html элемент в списке меню
         *  @param object menuInfo Информация о том пункет меню на который совершён переход
         *  @param object data объект с доп параметрами (не обязательными)
         */
        onOpen:polemarch.showHome
    })

    spajs.addMenu({
        id:"users",              // id комнаты должен соответсвовать регулярному выражению  [A-z9-0_]{ 4,64}
        name:"users",                        // Имя кнопки
        urlregexp:[/^users$/],
        type:"custom",                  // Тип пункта меню (false|bottom|custom)
        menuHtml:'<a href="/?spa=users" onclick="return spajs.openURL(this.href);" ><i class="fa fa-wrench"></i> <span>Users</span></a>',
        priority: 100,
        /*
         *  callback вызываемый по открытии этого пункта меню
         *  @param object holder html элемент в списке меню
         *  @param object menuInfo Информация о том пункет меню на который совершён переход
         *  @param object data объект с доп параметрами (не обязательными)
         */
        onOpen:pmUsers.showUsers
    })
    
    spajs.openMenuFromUrl()
}

polemarch.showHome = function(holder, menuInfo, data)
{
    $(holder).html(spajs.just.render('home_page', {}))
}

polemarch.showError = function(res)
{
    if(res.responseJSON)
    {
        res = res.responseJSON
    }

    if(res && res.info && res.info.message)
    {
        //alert(res.info.message)
        $.notify(res.info.message, "error");
    }
    else if(res && res.message)
    {
        //alert(res.message)
        $.notify(res.message, "error");
    }
    else if(res)
    {
        //alert(res.message)
        $.notify(res, "error");
    }
}