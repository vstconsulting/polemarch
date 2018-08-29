
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

if(window.moment && window.moment.tz)
{
    window.moment.tz.setDefault(window.timeZone);
}

polemarch.opt = {}
polemarch.opt.holder = undefined
polemarch.opt.host = "//"+hostname

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

    //spajs.ajax.setHeader("Authorization", "");
    spajs.ajax.setHeader(window.csrf_data.csrfHeaderName, window.csrf_data.token);

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

    if(window.cordova || ( window.parent && window.parent.cordova))
    {
        $("body").addClass('platform-cordova')
    }
    else
    {
        $("body").addClass('platform-web')
    }

    tabSignal.emit("webGui.start")
    tabSignal.emit("polemarch.start")

    try{
        $.when(spajs.openMenuFromUrl(undefined, {withoutFailPage:window.location.pathname != "/"})).always(function(){
            hideLoadingProgress();
            tabSignal.emit("hideLoadingProgress")
        })

    }
    catch (exception)
    {
        if(exception.code == 404)
        {
            return;
        }

        console.error("spajs.openMenuFromUrl exception", exception.stack)
        hideLoadingProgress();
        tabSignal.emit("hideLoadingProgress")
        debugger;
        //spajs.openURL("");
    }
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
        guiPopUp.error(res.info.message);
        return res.info.message;
    }
    else if(res && res.message)
    {
        console.error('showErrors:' + res.message)
        guiPopUp.error(res.message);
        return res.message;
    }

    if(typeof res === "string")
    {
        console.error('showErrors:' + res)
        guiPopUp.error(res)
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
            guiPopUp.error(res[i])
            return res[i];
        }
        else if(typeof res[i] === "object")
        {
            return polemarch.showErrors(res[i])
        }
    }
}

spajs.errorPage = function(holder, menuInfo, data, error_data)
{
    var error = {
        error_data:error_data
    }

    error.status = "520"
    if(error_data.status)
    {
        error.status = error_data.status
    }

    if(error_data.responseJSON)
    {
        error_data = error_data.responseJSON
    }

    error.text = "Unknown error";
    error.title = "Error"
    if(error_data == undefined){
        error.title = "Unknown error"
    }
    else
    {
        if(error_data.detail && error_data.detail.toString)
        {
            error.text = error_data.detail.toString()
        }
    }

    $(holder).insertTpl(spajs.just.render("errorPage", {error:error, data:data, menuInfo:menuInfo}))
}



tabSignal.connect("loading.completed", function()
{ 
    // Запуск полемарча
    polemarch.start({
        is_superuser:window.is_superuser,
        holder:'#spajs-body'
    })

})
