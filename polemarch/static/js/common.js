function loadQUnitTests()
{

    $('body').append('<script src=\'' + window.pmStaticPath + 'js/tests/qUnitTest.js\'></script>');

    var intervaId = setInterval(function()
    {
        if(window.injectQunit !== undefined)
        {
            clearInterval(intervaId)
            injectQunit()
        }
    }, 1000)
}


function addslashes(string) {
    return string.replace(/\\/g, '\\\\').
    replace(/\u0008/g, '\\b').
    replace(/\t/g, '\\t').
    replace(/\n/g, '\\n').
    replace(/\f/g, '\\f').
    //replace(/\r/g, '\\r').
    //replace(/\a/g, '\\a').
    replace(/\v/g, '\\v').
    //replace(/\e/g, '\\e').
    replace(/'/g, '\\\'').
    replace(/"/g, '\\"');
}

function stripslashes (str) {
    //       discuss at: http://locutus.io/php/stripslashes/
    //      original by: Kevin van Zonneveld (http://kvz.io)
    //      improved by: Ates Goral (http://magnetiq.com)
    //      improved by: marrtins
    //      improved by: rezna
    //         fixed by: Mick@el
    //      bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    //      bugfixed by: Brett Zamir (http://brett-zamir.me)
    //         input by: Rick Waldron
    //         input by: Brant Messenger (http://www.brantmessenger.com/)
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    //        example 1: stripslashes('Kevin\'s code')
    //        returns 1: "Kevin's code"
    //        example 2: stripslashes('Kevin\\\'s code')
    //        returns 2: "Kevin\'s code"
    return (str + '')
        .replace(/\\(.?)/g, function (s, n1) {
            switch (n1) {
                case '\\':
                    return '\\'
                case '0':
                    return '\u0000'
                case 't':
                    return "\t"
                case 'n':
                    return "\n"
                case 'f':
                    return "\f"
                //case 'e':
                //  return "\e"
                case 'v':
                    return "\v"
                //case 'a':
                //  return "\a"
                case 'b':
                    return "\b"
                //case 'r':
                //  return "\r"
                case '':
                    return ''
                default:
                    return n1
            }
        })
}
/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}


function inheritance(obj, constructor)
{
    var object = undefined;
    var item = function()
    {
        if(constructor)
        {
            return constructor.apply(jQuery.extend(true, item, object), arguments);
        }

        return jQuery.extend(true, item, object);
    }

    object = jQuery.extend(true, item, obj)

    return object
}

var pmLocalSettings = {
    __settings:{},
    get:function(name){
        return this.__settings[name];
    },
    set:function(name, value){
        this.__settings[name] = value;
        window.localStorage['pmLocalSettings'] = JSON.stringify(this.__settings)
        tabSignal.emit('pmLocalSettings.'+name, {type:'set', name:name, value:value})
    }
}


if(window.localStorage['pmLocalSettings'])
{
    try{
        pmLocalSettings.__settings = window.localStorage['pmLocalSettings'];
        pmLocalSettings.__settings = JSON.parse(pmLocalSettings.__settings)

    }catch (e)
    {

    }
}


if(pmLocalSettings.get('hideMenu'))
{
    if(window.innerWidth>767){
        $("body").addClass('sidebar-collapse');
    }
}


function toIdString(str)
{
    return str.replace(/[^A-z0-9\-]/img, "_").replace(/[\[\]]/gi, "_");
}

function hidemodal()
{
    var def= new $.Deferred();
    $(".modal.fade.in").on('hidden.bs.modal', function (e) {
        def.resolve();
    })
    $(".modal.fade.in").modal('hide');

    return def.promise();
}


function capitalizeString(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function isEmptyObject(obj) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            return false;
        }
    }
    return true;
}

window.onresize=function ()
{
    if(window.innerWidth>767)
    {
        if(pmLocalSettings.get('hideMenu'))
        {
            $("body").addClass('sidebar-collapse');
        }
        if ($("body").hasClass('sidebar-open'))
        {
            $("body").removeClass('sidebar-open');
        }
    }
    else
    {
        if ($("body").hasClass('sidebar-collapse')){
            $("body").removeClass('sidebar-collapse');
        }
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