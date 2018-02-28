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
    $("body").addClass('sidebar-collapse')
}


function toIdString(str)
{
    return str.replace(/[^A-z0-9\-]/img, "_").replace(/[\[\]]/gi, "_");
}

function hidemodal() {


    var def= new $.Deferred();
    $(".modal.fade.in").on('hidden.bs.modal', function (e) {
      def.resolve();
    })
    $(".modal.fade.in").modal('hide');

    return def.promise();
}