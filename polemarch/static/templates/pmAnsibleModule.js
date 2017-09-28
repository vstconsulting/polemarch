/**
 * Класс для запуска модулей Ansible.
 *
 */ 

/**
 * Вернёт код для поля автокомплита модулей
 * @param {String} id
 * @returns HTML templte
 */
pmAnsibleModule.moduleAutocompleteFiled = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
    
    if(!opt.id)
    {
        opt.id = "module-autocomplete"
    }
    
    if(!opt.value)
    {
        opt.value = ""
    }
     
    var html = spajs.just.render('moduleAutocompleteFiled_template', opt)
    
    html = spajs.just.onInsert(html, function()
    {
        $.when(pmAnsibleModule.loadAllModule()).done(function()
        {
            new autoComplete({
                selector: '#'+opt.id,
                minChars: 0,
                cache:false,
                showByClick:false,
                menuClass:opt.id,
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
                    for(var i in pmAnsibleModule.model.ansible_modules)
                    {
                        var val = pmAnsibleModule.model.ansible_modules[i]
                        if(val.toLowerCase().indexOf(term) != -1)
                        {
                            matches.push(val)
                        }
                    }
                    if(matches.length)
                    {
                        response(matches);
                    }
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
 */
pmAnsibleModule.argsAutocompleteFiled = function(opt)
{
    if(opt === undefined)
    {
        opt = {}
    }
    
    if(!opt.id)
    {
        opt.id = "module-autocomplete"
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
pmAnsibleModule.moduleFileds = function(opt)
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