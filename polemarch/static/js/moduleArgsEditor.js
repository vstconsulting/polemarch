
var moduleArgsEditor = {}

moduleArgsEditor.model = {}


moduleArgsEditor.loadAllModule = function()
{
    var def = new $.Deferred();
    var thisObj = this;
    spajs.ajax.Call({
        url: "/api/v1/ansible/modules/",
        type: "GET",
        contentType:'application/json',
        success: function(data)
        {
            thisObj.model.ansible_modules = data
            def.resolve();
        },
        error:function(e)
        {
            console.warn(e)
            polemarch.showErrors(e)
            def.reject(e);
        }
    });
    return def.promise();
}

/**
 * Вернёт код для поля автокомплита модулей
 * @param {String} id
 * @returns HTML templte
 * @private
 */
moduleArgsEditor.moduleAutocompleteFiled = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
     
    if(!opt.value)
    {
        opt.value = ""
    }
     
    var html = spajs.just.render('moduleAutocompleteFiled_template', opt)
    
    html = spajs.just.onInsert(html, function()
    {
        $.when(moduleArgsEditor.loadAllModule()).done(function()
        {
            new autoComplete({
                selector: '#module-autocomplete',
                minChars: 0,
                cache:false,
                showByClick:false,
                menuClass:"module-autocomplete",
                renderItem: function(item, search)
                {
                    var name = item.replace(/^.*\.(.*?)$/, "$1")
                    return '<div class="autocomplete-suggestion" data-value="' + name + '" >' + name + " <i style='color:#777'>" + item + '</i></div>';
                },
                onSelect: function(event, term, item)
                {
                    $("#module-autocomplete").val($(item).attr('data-value'));
                    //console.log('onSelect', term, item);
                    //var value = $(item).attr('data-value');
                },
                source: function(term, response)
                {
                    term = term.toLowerCase();

                    var matches = []
                    for(var i in moduleArgsEditor.model.ansible_modules)
                    {
                        var val = moduleArgsEditor.model.ansible_modules[i]
                        if(val.toLowerCase().indexOf(term) != -1)
                        {
                            matches.push(val)
                        }
                    }
                    
                    response(matches); 
                }
            });
        })
    })
    
    return html;
}

/**
 * Вернёт код для поля ввода аргументов к запуску модуля
 * @param {String} id
 * @returns HTML templte
 * @private
 */
moduleArgsEditor.argsAutocompleteFiled = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    } 
    
    if(!opt.value)
    {
        opt.value = ""
    }
     
    var html = spajs.just.render('moduleArgsFiled_template', opt) 
    return html;
}

/**
 * Вернёт код для полей для выбора модуля и аргументов к запуску модуля
 * @param {String} id
 * @returns HTML templte
 */
moduleArgsEditor.moduleFileds = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
    
    if(!opt.module)
    {
        opt.module = {}
    }
    
    if(!opt.args)
    {
        opt.args = {}
    } 
    
    var html = spajs.just.render('moduleFileds_template', opt) 
    return html;
}


moduleArgsEditor.getModuleArgs = function(opt)
{
    return $("#module-args-string").val()
}

moduleArgsEditor.getSelectedModuleName = function(opt)
{
    return $("#module-autocomplete").val()
}