
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

function loadTpl(name)
{  
    return jQuery.ajax({
       url: window.pmStaticPath+""+name+".html?v="+window.polemarch_version,
       type: "GET",
       success: function(res)
       {
            $("body").append(res)  
       }
    })
}

function loadTplArray(templatesArray)
{ 
    var def = new $.Deferred();
    var promiseArr = []
    for(var i in templatesArray)
    {
        promiseArr.push(loadTpl(templatesArray[i]))
    }

    $.when.apply($, promiseArr).done(function()
    {
        def.resolve();
    }).fail(function(e){ 
        def.reject(e);
    }) 
    
    return def.promise()
}

var polemarch = {

}

moment.tz.setDefault(window.timeZone);

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

    //spajs.ajax.setHeader("Authorization", "");
    spajs.ajax.setHeader("X-CSRFToken", getCookie('csrftoken'));

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

    tabSignal.emit("polemarch.start")

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
