 
if(window.moment && window.moment.tz)
{ 
    window.moment.tz.setDefault(window.timeZone);
}
 
var guiLocalSettings = {
    __settings:{},
    get:function(name){
        return this.__settings[name];
    },
    set:function(name, value){
        this.__settings[name] = value;
        window.localStorage['guiLocalSettings'] = JSON.stringify(this.__settings)
        tabSignal.emit('guiLocalSettings.'+name, {type:'set', name:name, value:value})
    }
}


if(window.localStorage['guiLocalSettings'])
{
    try{
        guiLocalSettings.__settings = window.localStorage['guiLocalSettings'];
        guiLocalSettings.__settings = JSON.parse(guiLocalSettings.__settings)

    }catch (e)
    {

    }
}


if(guiLocalSettings.get('hideMenu'))
{
    if(window.innerWidth>767){
        $("body").addClass('sidebar-collapse');
    }
}


function setActiveMenuLiBase()
{
    if(/\?projects/.test(window.location.href) || /\?project/.test(window.location.href) ||
        /\?new-project/.test(window.location.href))
    {
        $("#menu-projects").addClass("pm-treeview-active active active-li active-bold");
        $("#menu-projects-projects").addClass("active-bold");
        $("#menu-projects").removeClass("pm-treeview");
    }
    else if(/\?templates/.test(window.location.href) ||
        /\?template/.test(window.location.href))
    {
        $("#menu-projects").addClass("pm-treeview-active active active-li");
        $("#menu-projects-templates").addClass("active-bold");
        $("#menu-projects").removeClass("pm-treeview");
    }
    else if(/\?hosts/.test(window.location.href) || /\?host/.test(window.location.href) ||
        /\?new-host/.test(window.location.href))
    {
        $("#menu-inventories").addClass("pm-treeview-active active active-li");
        $("#menu-inventories-hosts").addClass("active-bold");
        $("#menu-inventories").removeClass("pm-treeview");
    }
    else if(/\?new-group/.test(window.location.href) || /\?groups/.test(window.location.href) ||
        /\?group/.test(window.location.href))
    {
        $("#menu-inventories").addClass("pm-treeview-active active active-li");
        $("#menu-inventories-groups").addClass("active-bold");
        $("#menu-inventories").removeClass("pm-treeview");
    }
    else if(/\?inventories/.test(window.location.href) || /\?inventory/.test(window.location.href) ||
        /\?new-inventory/.test(window.location.href))
    {
        $("#menu-inventories").addClass("pm-treeview-active active active-li active-bold");
        $("#menu-inventories-inventories").addClass("active-bold");
        $("#menu-inventories").removeClass("pm-treeview");
    }
    else if(/\?history/.test(window.location.href)){

        $("#menu-history").addClass("active active-li active-bold");
    }
    else if(/\?hooks/.test(window.location.href) || /\?hook/.test(window.location.href) ||
        /\?new-hook/.test(window.location.href))
    {
        $("#menu-system").addClass("pm-treeview-active active active-li");
        $("#menu-system-hooks").addClass("active-bold");
        $("#menu-system").removeClass("pm-treeview");
    }
    else if(/\?users/.test(window.location.href) || /\?user/.test(window.location.href) ||
        /\?new-user/.test(window.location.href) || /\?profile/.test(window.location.href))
    {
        $("#menu-system").addClass("pm-treeview-active active active-li");
        $("#menu-system-users").addClass("active-bold");
        $("#menu-system").removeClass("pm-treeview");
    }
    else
    {
        $("#menu-home").addClass("active active-li active-bold");
    }
}

function setActiveMenuLi()
{
    if($('li').is('.pm-treeview-active'))
    {
        var t=$(".pm-treeview-active");
        $(t).addClass("pm-treeview");
        $(t).removeClass("pm-treeview-active");
    }

    if($('li').is('.active-li'))
    {
        var t=$(".active-li");
        $(t).removeClass("active");
        $(t).removeClass("active-li");
    }

    if($('li').is('.active-bold'))
    {
        var g=$(".active-bold");
        $(g).removeClass("active-bold");
    }

    return setActiveMenuLiBase();
}

/*
 * Функция добавляет элементу меню (при наведении на него)
 * css-класс hover-li, который добавляет необходимые стили.
 * Добавление класса происходит не сразу, а после небольшой паузы.
 * Это необходимо для того, чтобы выпавшее подменю быстро не пропадало
 * при попытке навести курсор на него.
 */
$(".sidebar-menu > li").mouseenter(function () {
    var thisEl = this;
    setTimeout(function () {
        var pmTreeviewMenues = $(".pm-treeview-menu");
        var bool = false;
        for(var i=0; i<pmTreeviewMenues.length; i++)
        {
            if($(pmTreeviewMenues[i]).is(':hover'))
            {
                bool = true;
            }
        }

        if(bool==false)
        {
            $(".hover-li").removeClass("hover-li");
            $(thisEl).addClass("hover-li");
        }
    }, 200);
})

/*
 * Два обработчика событий, удаляющих класс hover-li у элементов меню, после того
 * как с меню убрали курсор.
 */
$(".content-wrapper").hover(function () {
    $(".hover-li").removeClass("hover-li");
})

$(".navbar").hover(function () {
    $(".hover-li").removeClass("hover-li");
})

tabSignal.connect("loading.completed", function()
{
    setActiveMenuLiBase();
})

//remove this string, when android app code be ready and after that check correct work on PC
setActiveMenuLiBase();