if(window.moment && window.moment.tz)
{
    window.moment.tz.setDefault(window.timeZone);
}

if(guiLocalSettings.get('hideMenu'))
{
    if(window.innerWidth>767){
        $("body").addClass('sidebar-collapse');
    }
}

function setActiveMenuLiBase()
{
    if(/\#\/project/.test(window.location.href))
    {
        $("#Projects").addClass("active active-li active-bold");
    }
    else if(/\#\/host/.test(window.location.href))
    {
        $("#menu-inventories").addClass("menu-treeview-active active active-li");
        $("#menu-inventories-hosts").addClass("active-bold");
        $("#menu-inventories").removeClass("menu-treeview");
    }
    else if(/\#\/group/.test(window.location.href))
    {
        $("#menu-inventories").addClass("menu-treeview-active active active-li");
        $("#menu-inventories-groups").addClass("active-bold");
        $("#menu-inventories").removeClass("menu-treeview");
    }
    else if(/\#\/inventory/.test(window.location.href))
    {
        $("#menu-inventories").addClass("menu-treeview-active active active-li active-bold");
        $("#menu-inventories-inventories").addClass("active-bold");
        $("#menu-inventories").removeClass("menu-treeview");
    }
    else if(/\#\/history/.test(window.location.href)){

        $("#History").addClass("active active-li active-bold");
    }
    else if(/\#\/hook/.test(window.location.href))
    {
        $("#menu-system").addClass("menu-treeview-active active active-li");
        $("#menu-system-hooks").addClass("active-bold");
        $("#menu-system").removeClass("menu-treeview");
    }
    else if(/\#\/team/.test(window.location.href))
    {
        $("#menu-system").addClass("menu-treeview-active active active-li");
        $("#menu-system-teams").addClass("active-bold");
        $("#menu-system").removeClass("menu-treeview");
    }
    else if(/\#\/user/.test(window.location.href) || /\#profile/.test(window.location.href))
    {
        $("#menu-system").addClass("menu-treeview-active active active-li");
        $("#menu-system-users").addClass("active-bold");
        $("#menu-system").removeClass("menu-treeview");
    }
    else
    {
        $("#menu-home").addClass("active active-li active-bold");
    }
}


function setActiveMenuLi()
{
    if($('li').is('.menu-treeview-active'))
    {
        var t=$(".menu-treeview-active");
        $(t).addClass("menu-treeview");
        $(t).removeClass("menu-treeview-active");
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

tabSignal.connect("spajs.open", setActiveMenuLi);

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
        var menuTreeviewMenues = $(".menu-treeview-menu");
        var bool = false;
        for(var i=0; i<menuTreeviewMenues.length; i++)
        {
            if($(menuTreeviewMenues[i]).is(':hover'))
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

// Добавляем файл тестов к списку файлов для тестов гуя
/**/
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHook.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHosts.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmUsers.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmGroups.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHistory.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmDashboard.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmInventories.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmProjects.js')

