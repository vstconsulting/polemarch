
function jsonEditor() {

}

jsonEditor.model = {}
jsonEditor.model.isLoaded_cli_reference = false;
jsonEditor.model.isLoading_cli_reference = false;

jsonEditor.options = {};
jsonEditor.model.form = {}

jsonEditor.options['item'] = {}

////////////////////////////////////////////////
// item
////////////////////////////////////////////////

jsonEditor.options['item']['ansible_connection'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_connection',
    helpcontent: 'Connection type to the host. This can be the name of any of\
            ansible’s connection plugins. SSH protocol types are smart, ssh or\
            paramiko. The default is smart. Non-SSH based types are described\
            in the next section.'
}

jsonEditor.options['item']['ansible_host'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_host',
    helpcontent: 'The name of the host to connect to, if different from the alias you wish to give to it.'
}

jsonEditor.options['item']['ansible_port'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_port',
    helpcontent: 'The ssh port number, if not 22'
}

jsonEditor.options['item']['ansible_user'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_user',
    helpcontent: 'The default ssh user name to use.'
}

jsonEditor.options['item']['ansible_ssh_pass'] = {
    type: 'password',
    help: 'Inventory Parameter - ansible_ssh_pass',
    helpcontent: 'The ssh password to use (never store this variable in plain text; always use a vault.)'
}

jsonEditor.options['item']['ansible_ssh_private_key_file'] = {
    type: 'keyfile',
    help: 'Inventory Parameter - ansible_ssh_private_key_file',
    helpcontent: 'Private key file used by ssh. Useful if using multiple keys and you don’t want to use SSH agent.'
}

jsonEditor.options['item']['ansible_ssh_common_args'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_ssh_common_args',
    helpcontent: 'This setting is always appended to the default command line for sftp, scp, and ssh. Useful to configure a ProxyCommand for a certain host (or group).'
}

jsonEditor.options['item']['ansible_sftp_extra_args'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_sftp_extra_args',
    helpcontent: 'This setting is always appended to the default sftp command line.'
}

jsonEditor.options['item']['ansible_scp_extra_args'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_scp_extra_args',
    helpcontent: 'This setting is always appended to the default scp command line.'
}

jsonEditor.options['item']['ansible_ssh_extra_args'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_ssh_extra_args',
    helpcontent: 'This setting is always appended to the default ssh command line.'
}

jsonEditor.options['item']['ansible_ssh_pipelining'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_ssh_pipelining',
    helpcontent: 'Determines whether or not to use SSH pipelining. This can override the pipelining setting in ansible.cfg.'
}

jsonEditor.options['item']['ansible_ssh_executable'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_ssh_executable',
    helpcontent: 'This setting overrides the default behavior to use the system ssh. This can override the ssh_executable setting in ansible.cfg.'
}

jsonEditor.options['item']['ansible_become'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_become',
    helpcontent: 'Equivalent to ansible_sudo or ansible_su, allows to force privilege escalation'
}

jsonEditor.options['item']['ansible_become_method'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_become_method',
    helpcontent: 'Allows to set privilege escalation method'
}

jsonEditor.options['item']['ansible_become_user'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_become_user',
    helpcontent: 'Equivalent to ansible_sudo_user or ansible_su_user, allows to set the user you become through privilege escalation'
}

jsonEditor.options['item']['ansible_become_pass'] = {
    type: 'password',
    help: 'Inventory Parameter - ansible_become_pass',
    helpcontent: 'Equivalent to ansible_sudo_pass or ansible_su_pass, allows you to set the privilege escalation password (never store this variable in plain text; always use a vault.)'
}

jsonEditor.options['item']['ansible_shell_type'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_shell_type',
    helpcontent: 'The shell type of the target system. You should not use this \n\
                setting unless you have set the ansible_shell_executable to a \n\
                non-Bourne (sh) compatible shell. By default commands are \n\
                formatted using sh-style syntax. Setting this to csh or fish \n\
                will cause commands executed on target systems to follow those\n\
                shell’s syntax instead.'
}

jsonEditor.options['item']['ansible_python_interpreter'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_python_interpreter',
    helpcontent: 'The target host python path. This is useful for systems with \n\
               more than one Python or not located at /usr/bin/python such as\n\
               *BSD, or where /usr/bin/python is not a 2.X series Python.\n\
               We do not use the /usr/bin/env mechanism as that requires the\n\
               remote user’s path to be set right and also assumes the python\n\
               executable is named python, where the executable might be named\n\
               something like python2.6.'
}

jsonEditor.options['item']['ansible_shell_executable'] = {
    type: 'text',
    help: 'Inventory Parameter - ansible_shell_executable',
    helpcontent: 'This sets the shell the ansible controller will use on the \n\
                target machine, overrides executable in ansible.cfg which \n\
                defaults to /bin/sh. You should really only change it if is not\n\
                possible to use /bin/sh (i.e. /bin/sh is not installed on the\n\
                target machine or cannot be run from sudo.).'
}

jsonEditor.options['hosts'] = {};
mergeDeep(jsonEditor.options['hosts'], jsonEditor.options['item'])

jsonEditor.options['groups'] = {};
mergeDeep(jsonEditor.options['groups'], jsonEditor.options['item'])

jsonEditor.options['inventories'] = {};
mergeDeep(jsonEditor.options['inventories'], jsonEditor.options['item'])


////////////////////////////////////////////////
// jsonEditor
////////////////////////////////////////////////

/**
 * Хранит данные модели для всех редакторов на странице.
 * Ключ берётся как `opt.prefix`
 * @type Object
 */
jsonEditor.model.data = {}

/**
 * Строит форму заполнения vars
 * @param {Object} json объект для заполнения параметрами и их значениями (имеет двусторонний биндинг)
 * @param {Object} opt
 * @returns {string} текст шаблона формы
 */
jsonEditor.editor = function (json, opt)
{
    if (!opt)
    {
        opt = {}
    }

    if (!opt.title1)
    {
        opt.title1 = 'Variables'
    }

    if (!opt.title2)
    {
        opt.title2 = 'Adding new variable'
    }

    if (!opt.prefix)
    {
        opt.prefix = 'prefix'
    }

    opt.prefix = toIdString(opt.prefix)
    jsonEditor.model.data[opt.prefix] = json;
    jsonEditor.model.form[opt.prefix] = {
        showImportForm: false
    };

    return spajs.just.render('jsonEditor', {data: json, optionsblock: opt.block, opt: opt})
}

jsonEditor.jsonEditorScrollTo = function (param_name, prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }

    prefix = toIdString(prefix)
    $("body").scrollTo("#json_" + param_name + "_line" + prefix)
}

jsonEditor.jsonEditorGetValues = function (prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }
    prefix = toIdString(prefix)

    if (jsonEditor.model.data[prefix] === undefined)
    {
        return {}
    }

    return jsonEditor.model.data[prefix];
}

jsonEditor.jsonEditorRmVar = function (name, prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }

    prefix = toIdString(prefix)
    $('#json_' + name + '_line' + prefix + '').remove()
    if (!$(".jsonEditor-data" + prefix).length)
    {
        $("#jsonEditorVarListHolder" + prefix).hide()
    }

    delete jsonEditor.model.data[prefix][name]
    tabSignal.emit(prefix + ".jsonEditorUpdate", {name: name, value: undefined, prefix: prefix})
    tabSignal.emit("jsonEditorUpdate", {name: name, value: undefined, prefix: prefix})
}

/**
 * Тестовый метод как аналог jsonEditorAddVar только без проверок для тестирования заведомо ошибочных ситуаций
 * @param {string} name
 * @param {string} value
 * @param {string} optionsblock
 * @param {string} prefix
 */
jsonEditor.__devAddVar = function (name, value, optionsblock, prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }

    if (!optionsblock)
    {
        optionsblock = 'base'
    }

    jsonEditor.model.data[prefix][name] = value
    $("#jsonEditorVarList" + prefix).appendTpl(spajs.just.render('jsonEditorLine', {name: name, value: value, optionsblock: optionsblock, opt: {prefix: prefix}}))
    $("#jsonEditorVarListHolder" + prefix).show()

    tabSignal.emit(prefix + ".jsonEditorUpdate", {name: name, value: value, prefix: prefix})
    tabSignal.emit("jsonEditorUpdate", {name: name, value: value, prefix: prefix})
}

/**
 * Делает импорт переменных из формата инвентория
 */
jsonEditor.jsonEditorImportVars = function (optionsblock, prefix, varsText)
{
    if (!prefix)
    {
        prefix = "prefix"
    }
    prefix = toIdString(prefix)

    if (!optionsblock)
    {
        optionsblock = 'base'
    }

    if (varsText == undefined)
    {
        varsText = $('#new_json_vars' + prefix).val()
    }

    var vars = varsText.split(/\n/gm)
    var varsresult = {}

    for (var i in vars)
    {
        if (/^[\s \t]*$/.test(vars[i]))
        {
            continue;
        }

        var res = jsonEditor.parseMonoVarsLine(i, vars[i])
        if (res !== false)
        {

            if ($("#json_" + res.name.replace(/[^A-z0-9\-]/g, "_").replace(/[\[\]]/gi, "_") + "_value" + prefix).length)
            {
                $.notify("Var `" + res.name + "` already exists", "error");
                continue;
            }

            if (/^-[A-z0-9]$/.test(res.name))
            {
                for (var i in jsonEditor.options[optionsblock])
                {
                    if ("-" + jsonEditor.options[optionsblock][i].alias == res.name)
                    {
                        val.name = i
                        break;
                    }
                }
            }

            if (optionsblock && jsonEditor.options[optionsblock] && jsonEditor.options[optionsblock][res.name])
            {
                var optInfo = jsonEditor.options[optionsblock][res.name]
                if (optInfo.type == 'error')
                {
                    $.notify("Adding this variable will be the mistake", "error");
                    continue;
                }
            }

            varsText = varsText.replace(vars[i], "")
            varsresult[res.name] = res.value
        }
    }
    $('#new_json_vars' + prefix).val(varsText)

    console.log(varsresult)

    var opt = {
        prefix: prefix
    }

    for (var i in varsresult)
    {
        var val = varsresult[i]

        jsonEditor.model.data[prefix][i] = val
        $("#jsonEditorVarList" + prefix).appendTpl(spajs.just.render('jsonEditorLine', {name: i, value: val, optionsblock: optionsblock, opt: opt}))
        $("#jsonEditorVarListHolder" + prefix).show()

        tabSignal.emit(prefix + ".jsonEditorUpdate", {name: i, value: val, prefix: prefix})
        tabSignal.emit("jsonEditorUpdate", {name: i, value: val, prefix: prefix})
    }
}

/**
 * Парсит данные для импорта переменных из формата инвентория
 *
 *
 * Параметры из секции *:vars
 * Строка где после первого `=` всё остальное значение.
 */
jsonEditor.parseMonoVarsLine = function (index, line)
{
    var vars = {}
    var param = /^([^=]+)="(.*)"$/.exec(line)

    if (param)
    {
        vars.name = param[1]
        vars.value = param[2]
    } else
    {
        param = /^([^=]+)=(.*)$/.exec(line)
        if (param)
        {
            vars.name = param[1]
            vars.value = param[2]
        } else
        {
            param = /^([^:]+):(.*)$/.exec(line)
            if (param)
            {
                vars.name = param[1]
                vars.value = param[2]
            } else
            {
                return false;
                //throw "Error in line "+index+" invalid varibles string ("+line+")"
            }
        }
    }
    vars.name = trim(vars.name)
    vars.value = trim(vars.value)

    return vars;
}


jsonEditor.jsonEditorAddVar = function (optionsblock, prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }
    prefix = toIdString(prefix)

    if (!optionsblock)
    {
        optionsblock = 'base'
    }

    //для autocomplete.js
    var name = $('#new_json_name' + prefix).val()
    var value = $('#new_json_value' + prefix).val()
    
    if (!name)
    {
        $.notify("Empty varible name", "error");
        return;
    }

    if ($("#json_" + name.replace(/[^A-z0-9\-]/g, "_").replace(/[\[\]]/gi, "_") + "_value" + prefix).length)
    {
        $.notify("This var already exists", "error");
        return;
    }

    if (/^-[A-z0-9]$/.test(name))
    {
        for (var i in jsonEditor.options[optionsblock])
        {
            if ("-" + jsonEditor.options[optionsblock][i].alias == name)
            {
                name = i
                break;
            }
        }
    }

    if (optionsblock && jsonEditor.options[optionsblock] && jsonEditor.options[optionsblock][name])
    {
        var optInfo = jsonEditor.options[optionsblock][name]
        if (optInfo.type == 'error')
        {
            $.notify("Adding this variable will be the mistake", "error");
            return;
        }
    }

    $('#new_json_name' + prefix).val('')
    $('#new_json_value' + prefix).val('')

    var opt = {
        prefix: prefix
    }

    if (optionsblock
            && jsonEditor.options[optionsblock]
            && jsonEditor.options[optionsblock][name]
            && jsonEditor.options[optionsblock][name].type == 'boolean')
    {
        value = "";
    }

   removeLoadFileButton();

    jsonEditor.model.data[prefix][name] = value
    $("#jsonEditorVarList" + prefix).appendTpl(spajs.just.render('jsonEditorLine', {name: name, value: value, optionsblock: optionsblock, opt: opt}))
    $("#jsonEditorVarListHolder" + prefix).show()


    $("#new_json_name" + prefix).trigger('change');

    tabSignal.emit(prefix + ".jsonEditorUpdate", {name: name, value: value, prefix: prefix})
    tabSignal.emit("jsonEditorUpdate", {name: name, value: value, prefix: prefix})

}

jsonEditor.initAutoComplete = function (optionsblock, prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }
    prefix = toIdString(prefix)

    new autoComplete({
        selector: '#new_json_name' + prefix,
        minChars: 0,
        cache: false,
        showByClick: false,
        menuClass: 'new_json_name' + prefix,
        renderItem: function (item, search)
        {
            return '<div class="autocomplete-suggestion" data-value="' + item.value + '" >' + item.value + ' - <i style="color:#777">' + item.help + '</i></div>';
        },
        onSelect: function (event, term, item)
        {
            //console.log('onSelect', term, item);
            var value = $(item).attr('data-value');
            $("#new_json_name" + prefix).val(value);
            var name = value;
            var varType = jsonEditor.options[optionsblock][name].type;
            removeLoadFileButton();
            if (varType == "keyfile" || varType == "textfile")
            {
                var elementVar = '"#new_json_value' + prefix + '"';
                var nameVar = '"ansible_ssh_private_key_file"';
                var prefixVar = '"prefix"';
                var inputVar = "<span id='loadFileId' class='btn btn-default btn-right textfile' style='float: right; margin-left: 10px;  margin-bottom:10px;'><input type='file' class='input-file' onchange='jsonEditor.loadFile(event, " + elementVar + ", " + nameVar + ", " + prefixVar + ");'>" +
                        "<span class='glyphicon glyphicon-file'></span></span>";
                $("#new_json_value" + prefix).before(inputVar);
            }

        },
        source: function (term, response)
        {
            term = term.toLowerCase();

            var matches = []
            for (var i in jsonEditor.options[optionsblock])
            {
                var val = jsonEditor.options[optionsblock][i]
                if (i.toLowerCase().indexOf(term) != -1
                        || (val['shortopts'] && val['shortopts'][0] && val['shortopts'][0].toLowerCase().indexOf(term) != -1))
                {
                    val.value = i
                    matches.push(val)
                }
            }
            if (matches.length)
            {
                response(matches.sort(jsonEditor.sortFunction));
            }            
        }
    });
    $("#new_json_name" + prefix).change(function ()
    {
        var name = $(this).val();
        if (jsonEditor.options[optionsblock][name] == undefined) {
            removeLoadFileButton();
        } else
        {
            var varType = jsonEditor.options[optionsblock][name].type;
            removeLoadFileButton();
            if (varType == "keyfile" || varType == "textfile")
            {
                var elementVar = '"#new_json_value' + prefix + '"';
                var nameVar = '"ansible_ssh_private_key_file"';
                var prefixVar = '"prefix"';
                var inputVar = "<span id='loadFileId' class='btn btn-default btn-right textfile' style='float: right; margin-left: 10px; margin-bottom:10px;'><input type='file' class='input-file' onchange='jsonEditor.loadFile(event, " + elementVar + ", " + nameVar + ", " + prefixVar + ");'>" +
                        "<span class='glyphicon glyphicon-file'></span></span>";
                $("#new_json_value" + prefix).before(inputVar);
            }
        }
    });
}

jsonEditor.sortFunction = function (a, b)
{
    a = a.value
    b = b.value
    for (var i in a)
    {
        if (b.length <= i)
        {
            return 1;
        }

        if (a.charCodeAt(i) != b.charCodeAt(i))
        {
            return a.charCodeAt(i) - b.charCodeAt(i)
        }
    }

    return 0;
}

jsonEditor.initForm = function (optionsblock, prefix)
{
    if (!prefix)
    {
        prefix = "prefix"
    }
    prefix = toIdString(prefix)

    //console.log(optionsblock, jsonEditor.options[optionsblock])
    if (jsonEditor.options[optionsblock])
    {
        jsonEditor.initAutoComplete(optionsblock, prefix)
        return;
    } else
    {
        return spajs.ajax.Call({
            url: "/api/v1/ansible/cli_reference/",
            type: "GET",
            contentType: 'application/json',
            data: "",
            success: function (data)
            {
                Object.assign(jsonEditor.options, data)
                jsonEditor.initAutoComplete(optionsblock, prefix)
                jsonEditor.model.isLoaded_cli_reference = true;
            }
        });
    }
}

jsonEditor.loadFile = function (event, element, name, prefix)
{
    console.log("jsonEditor.loadFile", event.target.files)
    for (var i = 0; i < event.target.files.length; i++)
    {
        if (event.target.files[i].size > 1024 * 1024 * 1)
        {
            $.notify("File too large", "error");
            console.log("File too large " + event.target.files[i].size)
            continue;
        }

        var reader = new FileReader();
        reader.onload = function (e)
        {
            $(element)[0].setAttribute("value", e.target.result)
            $(element).val(e.target.result)
            tabSignal.emit(prefix + ".jsonEditorUpdate", {name: name, value: e.target.result, prefix: prefix})
            tabSignal.emit("jsonEditorUpdate", {name: name, value: e.target.result, prefix: prefix})
        }

        reader.readAsText(event.target.files[i]);
        return;
    }
}

/**
 * Функция, убирающая кнопку-инпут для загрузки текстового файла/файла ключа
 * при добавлении vars 
 */
function removeLoadFileButton()
{
    if ($("#loadFileId")) {
        $("#loadFileId").remove();
    }
}

/**
 * Функция, скрывающая textarea, при добавлении vars 
 */
function removeNewJsonValueTeaxarea()
{
    if ($("#new_json_value_block")) {
        $("#new_json_value_block").hide();
    }
}

/**
 * Функция, показывающая textarea, при добавлении vars 
 */
function addNewJsonValueTeaxarea()
{
    $("#new_json_value_block").show();
}

/**
 * Функция, изменяющая параметры textarea, в зависимости от типа инпута,
 * при добавлении vars 
 */
function changeTextareaSettings(element, options, prefix)
{
    var thisElement = $(element);
    var thisOptions = options;
    var name = thisElement.val();
    var prefix = prefix;
    removeLoadFileButton();
    addNewJsonValueTeaxarea();
    if (name != undefined)
    {
        var inputType = jsonEditor.options[thisOptions][name].type;
        console.log(inputType);
        var textareaEl = $("#new_json_value" + prefix);
        if (inputType == "textfile" || inputType == "keyfile")
        {
            var elementVar = '"#new_json_value' + prefix + '"';
            var nameVar = '"' + name + '"';
            var prefixVar = '"' + prefix + '"';
            var inputVar = "<span id='loadFileId' class='btn btn-default btn-right textfile' style='float: right; margin-left: 10px;  margin-bottom:10px;'><input type='file' class='input-file' onchange='jsonEditor.loadFile(event, " + elementVar + ", " + nameVar + ", " + prefixVar + ");'>" +
                    "<span class='glyphicon glyphicon-file'></span></span>";
            $("#new_json_value" + prefix).before(inputVar);
            makeNotOnlyNumberInput('new_json_value', prefix);
        } else if (inputType == "boolean")
        {
            removeNewJsonValueTeaxarea(prefix);
            makeNotOnlyNumberInput('new_json_value', prefix);
        } else if (inputType == "integer")
        {
            makeNumberInputOnly('new_json_value', prefix);

        } else {
            makeNotOnlyNumberInput('new_json_value', prefix);
        }
    }
}

/**
 * Функция, позволяющая вводить в инпут только цифры
 */
function makeNumberInputOnly(element, prefix)
{
    var element = element;
    var prefix = prefix;
    $('#' + element + prefix).val("");
    document.getElementById(element + prefix).onkeypress = function (e)
    {
        e = e || event;
        if (e.ctrlKey || e.altKey || e.metaKey)
            return;
        var chr = getChar(e);
        if (chr == null)
            return;
        if (chr < '0' || chr > '9') {
            return false;
        }
    }

    function getChar(event)
    {
        if (event.which == null) {
            if (event.keyCode < 32)
                return null;
            return String.fromCharCode(event.keyCode)
        }
        if (event.which != 0 && event.charCode != 0) {
            if (event.which < 32)
                return null;
            return String.fromCharCode(event.which)
        }
        return null;
    }

}

/**
 * Функция, снимающая ограничение на ввод только цифр
 */
function makeNotOnlyNumberInput(element, prefix)
{
    var element = element;
    var prefix = prefix;
    document.getElementById('new_json_value' + prefix).onkeypress = function ()
    {
        //console.log("не integer");
    }
}