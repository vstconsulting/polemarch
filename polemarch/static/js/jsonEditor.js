
function jsonEditor(){

}
 
jsonEditor.options = {};
 
  
////////////////////////////////////////////////
// jsonEditor
////////////////////////////////////////////////

jsonEditor.editor = function(json, opt)
{
    if(!opt)
    {
        opt = {}
    }
    
    if(!opt.title1)
    {
        opt.title1 = 'Variables'
    }
    
    if(!opt.prefix)
    {
        opt.prefix = 'prefix'
    }
    opt.prefix = opt.prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    
    if(!opt.title2)
    {
        opt.title2 = 'Adding new variable'
    }
    
    return spajs.just.render('jsonEditor', {data:json, optionsblock:opt.block, opt:opt})
}

jsonEditor.jsonEditorScrollTo = function(param_name, prefix)
{ 
    if(!prefix)
    {
        prefix = "prefix"
    }
    
    prefix = prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    $("body").scrollTo("#json_"+param_name+"_line"+prefix) 
}

jsonEditor.jsonEditorGetValues = function(prefix)
{
    if(!prefix)
    {
        prefix = "prefix"
    }
    prefix = prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    
    var data = {}
    var arr = $(".jsonEditor-data"+prefix)
    for(var i = 0; i< arr.length; i++)
    {
        var type = $(arr[i]).attr('data-type');
        var index = $(arr[i]).attr('data-json-name');

        if(type == "boolean")
        {
            if($(arr[i]).hasClass('selected'))
            {
                data[index] = "";
            }
        }
        else
        {
            data[index] = $(arr[i]).val()
        }
    }

    return data
}

jsonEditor.jsonEditorRmVar = function(name, prefix)
{
    if(!prefix)
    {
        prefix = "prefix"
    }
    
    prefix = prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    $('#json_'+name+'_line'+prefix+'').remove()
    if(!$(".jsonEditor-data"+prefix).length)
    {
        $("#jsonEditorVarListHolder"+prefix).hide()
    }
}

jsonEditor.jsonEditorAddVar = function(optionsblock, prefix)
{
    if(!prefix)
    {
        prefix = "prefix"
    }
    prefix = prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    
    if(!optionsblock)
    {
        optionsblock = 'base'
    }

    var name = $('#new_json_name'+prefix).val()
    var value = $('#new_json_value'+prefix).val()

    if(!name)
    {
        $.notify("Empty varible name", "error");
        return;
    }

    if($("#json_"+name+"_value"+prefix).length)
    {
        $.notify("This var already exists", "error");
        return;
    }

    /*if(/^--/.test(name))
    {
        name = name.replace(/^--/, "ansible_")
    }*/

    if(/^-[A-z0-9]$/.test(name))
    {
        for(var i in jsonEditor.options[optionsblock])
        {
            if("-"+jsonEditor.options[optionsblock][i].alias == name)
            {
                name = i
                break;
            }
        }
    }
    
    if(jsonEditor.options[optionsblock][name])
    {
        var optInfo = jsonEditor.options[optionsblock][name]
        if(optInfo.type == 'error')
        {
            $.notify("Adding this variable will be the mistake", "error");
            return;
        }
    }

    $('#new_json_name'+prefix).val('')
    $('#new_json_value'+prefix).val('')
    
    var opt = {
        prefix:prefix
    }

    $("#jsonEditorVarList"+prefix).appendTpl(spajs.just.render('jsonEditorLine', {name:name, value:value, optionsblock:optionsblock, opt})) 
    $("#jsonEditorVarListHolder"+prefix).show()
}

jsonEditor.initAutoComplete = function(optionsblock, prefix)
{ 
    if(!prefix)
    {
        prefix = "prefix"
    }
    prefix = prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    
    console.log("initAutoComplete", optionsblock, prefix)
    
    new autoComplete({
        selector: '#new_json_name'+prefix,
        minChars: 0,
        cache:false,
        showByClick:true,
        menuClass:'new_json_name'+prefix,
        renderItem: function(item, search)
        {
            return '<div class="autocomplete-suggestion" data-value="' + item.value + '" >' + item.value + ' - <i style="color:#777">' + item.help + '</i></div>';
        },
        onSelect: function(event, term, item)
        {
            //console.log('onSelect', term, item);
            var value = $(item).attr('data-value'); 
            $("#new_json_name"+prefix).val(value);
        },
        source: function(term, response)
        {
            term = term.toLowerCase();

            var matches = []
            for(var i in jsonEditor.options[optionsblock])
            {
                var val = jsonEditor.options[optionsblock][i]
                if(i.toLowerCase().indexOf(term) != -1 
                        || (val['shortopts'] && val['shortopts'][0] && val['shortopts'][0].toLowerCase().indexOf(term) != -1) )
                {
                    val.value = i
                    matches.push(val)
                }
            }
            if(matches.length)
            {
                response(matches);
            }
        }
    });
}

jsonEditor.initForm = function(optionsblock, prefix)
{ 
    if(!prefix)
    {
        prefix = "prefix"
    }
    prefix = prefix.replace(/[^A-z0-9]/g, "_").replace(/[\[\]]/gi, "_")
    
    if(jsonEditor.options[optionsblock])
    {
        jsonEditor.initAutoComplete(optionsblock, prefix)
        return;
    }
     
    return jQuery.ajax({
        url: "/api/v1/ansible/cli_reference/",
        type: "GET",
        contentType:'application/json',
        data: "",
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            Object.assign(jsonEditor.options, data)
            jsonEditor.initAutoComplete(optionsblock, prefix)
        }
    }); 
}

jsonEditor.loadFile = function(event, element)
{
    console.log("jsonEditor.loadFile", event.target.files) 
    for(var i=0; i<event.target.files.length; i++)
    { 
        if( event.target.files[i].size > 1024*1024*1)
        { 
            $.notify("File too large", "error");
            console.log("File too large " + event.target.files[i].size) 
            continue;
        }

        var reader = new FileReader();
        reader.onload = function(e)
        {
            $(element).val(e.target.result)
        }
        
        reader.readAsText(event.target.files[i]); 
        return;
    }
}