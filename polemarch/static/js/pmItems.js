
var jsonEditor = {}

jsonEditor.options = {};

jsonEditor.options['item'] = {}
jsonEditor.options['item']['repo_password'] = {
    type:'password',
    help:'Password from repository',
    helpcontent:'Password from repository required for GIT'
}

jsonEditor.options['item']['ansible_ask-vault-pass'] = {
    type:'password',
    help:'--ask-vault-pass',
    helpcontent:'ask for vault password',
    alias:''
}

jsonEditor.options['item']['ansible_check'] = {
    type:'boolean',
    help:'--check',
    helpcontent:"don't make any changes; instead, try to predict some of the changes that may occur",
    alias:'C'
}

jsonEditor.options['item']['ansible_diff'] = {
    type:'boolean',
    help:'--diff',
    helpcontent:"when changing (small) files and templates, show the differences in those files; works great with --check",
    alias:'D'
}

jsonEditor.options['item']['ansible_extra-vars'] = {
    type:'textarea',
    help:'-e EXTRA_VARS, --extra-vars=EXTRA_VARS',
    helpcontent:"set additional variables as key=value or YAML/JSON",
    alias:'e'
}

jsonEditor.options['item']['ansible_flush-cache'] = {
    type:'boolean',
    help:'--flush-cache',
    helpcontent:"clear the fact cache",
    alias:''
}

jsonEditor.options['item']['ansible_force-handlers'] = {
    type:'boolean',
    help:'--force-handlers',
    helpcontent:"run handlers even if a task fails",
    alias:''
}

jsonEditor.options['item']['ansible_forks'] = {
    type:'textarea',
    help:'-f FORKS, --forks=FORKS',
    helpcontent:"specify number of parallel processes to use (default=5)",
    alias:'f'
}

jsonEditor.options['item']['ansible_help'] = {
    type:'boolean',
    help:'--help',
    helpcontent:"show ansible help message and exit",
    alias:'h'
}

jsonEditor.options['item']['ansible_inventory-file'] = {
    type:'text',
    help:'-i INVENTORY, --inventory-file=INVENTORY',
    helpcontent:"specify inventory host path (default=/etc/ansible/hosts) or comma separated host list.",
    alias:'i'
}

jsonEditor.options['item']['ansible_limit'] = {
    type:'text',
    help:'-l SUBSET, --limit=SUBSET',
    helpcontent:"further limit selected hosts to an additional pattern",
    alias:'l'
}

jsonEditor.options['item']['ansible_list-hosts'] = {
    type:'boolean',
    help:'--list-hosts',
    helpcontent:"outputs a list of matching hosts; does not execute anything else",
    alias:''
}

jsonEditor.options['item']['ansible_list-tags'] = {
    type:'boolean',
    help:'--list-tags',
    helpcontent:"list all available tags",
    alias:''
}

jsonEditor.options['item']['ansible_list-tasks'] = {
    type:'boolean',
    help:'--list-tasks',
    helpcontent:"list all tasks that would be executed",
    alias:''
}

jsonEditor.options['item']['ansible_module-path'] = {
    type:'text',
    help:'-M MODULE_PATH, --module-path=MODULE_PATH',
    helpcontent:"specify path(s) to module library (default=None)",
    alias:''
}

jsonEditor.options['item']['ansible_new-vault-password-file'] = {
    type:'textarea',
    help:'--new-vault-password-file=NEW_VAULT_PASSWORD_FILE',
    helpcontent:"new vault password file for rekey",
    alias:''
}

jsonEditor.options['item']['ansible_output'] = {
    type:'textarea',
    help:'--output=OUTPUT_FILE',
    helpcontent:"output file name for encrypt or decrypt; use - for stdout",
    alias:''
}

jsonEditor.options['item']['ansible_skip-tags'] = {
    type:'textarea',
    help:'--skip-tags=SKIP_TAGS',
    helpcontent:"only run plays and tasks whose tags do not match these values",
    alias:''
}

jsonEditor.options['item']['ansible_start-at-task'] = {
    type:'textarea',
    help:'--start-at-task=START_AT_TASK',
    helpcontent:"start the playbook at the task matching this name",
    alias:''
}

jsonEditor.options['item']['ansible_step'] = {
    type:'boolean',
    help:'--step',
    helpcontent:"one-step-at-a-time: confirm each task before running",
    alias:''
}

jsonEditor.options['item']['ansible_syntax-check'] = {
    type:'boolean',
    help:'--syntax-check',
    helpcontent:"perform a syntax check on the playbook, but do not execute it",
    alias:''
}

jsonEditor.options['item']['ansible_tags'] = {
    type:'boolean',
    help:'-t TAGS, --tags=TAGS',
    helpcontent:"only run plays and tasks tagged with these values",
    alias:'t'
}

jsonEditor.options['item']['ansible_vault-password-file'] = {
    type:'textarea',
    help:'--vault-password-file=VAULT_PASSWORD_FILE',
    helpcontent:"vault password file",
    alias:''
}

jsonEditor.options['item']['ansible_verbose'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'v'
}

jsonEditor.options['item']['ansible_vv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vv'
}

jsonEditor.options['item']['ansible_vvv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vvv'
}

jsonEditor.options['item']['ansible_vvvv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vvvv'
}

jsonEditor.options['item']['ansible_version'] = {
    type:'boolean',
    help:'--version',
    helpcontent:"show program's version number and exit",
    alias:''
}

jsonEditor.options['item']['ansible_ask-pass'] = {
    type:'boolean',
    help:'-k, --ask-pass',
    helpcontent:"ask for connection password\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'k'
}

jsonEditor.options['item']['ansible_private-key'] = {
    type:'textarea',
    help:'--private-key=PRIVATE_KEY_FILE, --key-file=PRIVATE_KEY_FILE',
    helpcontent:"use this file to authenticate the connection\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_user'] = {
    type:'text',
    help:'-u REMOTE_USER, --user=REMOTE_USER',
    helpcontent:"connect as this user (default=None)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'u'
}

jsonEditor.options['item']['ansible_connection'] = {
    type:'text',
    help:'-c CONNECTION, --connection=CONNECTION',
    helpcontent:"connection type to use (default=smart)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'c'
}

jsonEditor.options['item']['ansible_timeout'] = {
    type:'text',
    help:'-T TIMEOUT, --timeout=TIMEOUT',
    helpcontent:"override the connection timeout in seconds (default=10)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'T'
}

jsonEditor.options['item']['ansible_ssh-common-args'] = {
    type:'textarea',
    help:'--ssh-common-args=SSH_COMMON_ARGS',
    helpcontent:"specify common arguments to pass to sftp/scp/ssh (e.g. ProxyCommand)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_sftp-extra-args'] = {
    type:'textarea',
    help:'--sftp-extra-args=SFTP_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to sftp only (e.g. -f, -l)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_scp-extra-args'] = {
    type:'textarea',
    help:'--scp-extra-args=SCP_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to scp only (e.g. -l)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_ssh-extra-args'] = {
    type:'textarea',
    help:'--ssh-extra-args=SSH_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to ssh only (e.g. -R)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_sudo'] = {
    type:'boolean',
    help:'-s, --sudo',
    helpcontent:"run operations with sudo (nopasswd) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'s'
}

jsonEditor.options['item']['ansible_sudo'] = {
    type:'text',
    help:'-U SUDO_USER, --sudo-user=SUDO_USER',
    helpcontent:"desired sudo user (default=root) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'U'
}

jsonEditor.options['item']['ansible_su'] = {
    type:'text',
    help:'-S, --su',
    helpcontent:"run operations with su (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'S'
}

jsonEditor.options['item']['ansible_su-user'] = {
    type:'text',
    help:'-R SU_USER, --su-user=SU_USER',
    helpcontent:"run operations with su as this user (default=root) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'R'
}

jsonEditor.options['item']['ansible_become'] = {
    type:'boolean',
    help:'-b, --become',
    helpcontent:"run operations with become (does not imply password prompting)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'b'
}

jsonEditor.options['item']['ansible_become-method'] = {
    type:'text',
    help:'--become-method=BECOME_METHOD',
    helpcontent:"privilege escalation method to use (default=sudo), valid choices: [ sudo | su | pbrun | pfexec | doas | dzdo | ksu ]\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_become-user'] = {
    type:'text',
    help:'--become-user=BECOME_USER',
    helpcontent:"run operations as this user (default=root)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_ask-sudo-pass'] = {
    type:'boolean',
    help:'--ask-sudo-pass',
    helpcontent:"ask for sudo password (deprecated, use become)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_ask-su-pass'] = {
    type:'boolean',
    help:'--ask-su-pass',
    helpcontent:"ask for su password (deprecated, use become)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['item']['ansible_ask-become-pass'] = {
    type:'boolean',
    help:'-K, --ask-become-pass',
    helpcontent:"ask for privilege escalation password\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'K'
}

////////////////////////////////////////////////
// jsonEditor
////////////////////////////////////////////////

jsonEditor.editor = function(json, optionsblock)
{ 
    return spajs.just.render('jsonEditor', {data:json, optionsblock:optionsblock}) 
}

jsonEditor.jsonEditorGetValues = function()
{
    var data = {}
    var arr = $(".jsonEditor-data")
    for(var i = 0; i< arr.length; i++)
    {
        var type = $(arr[i]).attr('data-type');
        var index = $(arr[i]).attr('data-json-name');
         
        if(type == "boolean")
        {
            data[index] = $(arr[i]).hasClass('selected')
        }
        else
        {
            data[index] = $(arr[i]).val()
        } 
    }

    return data
}

jsonEditor.jsonEditorAddVar = function(optionsblock)
{
    if(!optionsblock)
    {
        optionsblock = 'base'
    }
    
    var name = $('#new_json_name').val()
    var value = $('#new_json_value').val()

    if(!name)
    {
        $.notify("Empty varible name", "error");
        return;
    }

    if($("#json_"+name+"_value").length)
    {
        $.notify("This var already exists", "error");
        return;
    }
    
    if(/^--/.test(name))
    {
        name = name.replace(/^--/, "ansible_")
    }
    
    if(/^-[A-z]$/.test(name))
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

    $('#new_json_name').val('')
    $('#new_json_value').val('')

    $("#jsonEditorVarList").append(spajs.just.render('jsonEditorLine', {name:name, value:value, optionsblock:optionsblock}))  
}
 

function pmItems()
{
    this.pageSize = 20;
    this.model = {};
    this.model.selectedItems = {};

    this.model.itemslist = []
    this.model.items = {}
    this.model.name = "based"

    this.toggleSelect = function(item_id, mode)
    {
        if(mode === undefined)
        {
            this.model.selectedItems[item_id] = !this.model.selectedItems[item_id]
        }
        else
        {
            this.model.selectedItems[item_id] = mode
        }

        this.model.selectedCount = $('.multiple-select .item-row.selected').length;
        return this.model.selectedItems[item_id];
    }

    this.toggleSelectAll = function(elements, mode)
    {
        for(var i=0; i< elements.length; i++)
        {
            this.toggleSelect($(elements[i]).attr('data-id'), mode)
        }
    }

    this.validateHostName = function(name)
    {
        if(!name)
        {
            return false;
        }

        var regexp = {
            ipTest : /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
            ip6Test : /((^|:)([0-9a-fA-F]{0,4})){1,8}$/,
            domenTest : /^((\.{0,1}[a-z0-9][a-z0-9-]{0,62}[a-z0-9]\.{0,1})*)$/
        }

        if(regexp.ipTest.test(name))
        {
            return true;
        }

        if(regexp.ip6Test.test(name))
        {
            return true;
        }

        if(regexp.domenTest.test(name))
        {
            return true;
        }

        return false;
    }

    this.validateRangeName = function(name)
    {
        if(!name)
        {
            return false;
        }

        return name.replace(/\[([0-9A-z]+):([0-9A-z]+)\]/g, "$1") && name.replace(/\[([0-9A-z]+):([0-9A-z]+)\]/g, "$2")
    }


    this.showList = function(holder, menuInfo, data)
    {
        var thisObj = this;
        var offset = 0
        var limit = this.pageSize;
        if(data.reg && data.reg[1] > 0)
        {
            offset = this.pageSize*(data.reg[1] - 1);
        }

        return $.when(this.loadItems(limit, offset)).done(function()
        {
            $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:""}))

            thisObj.model.selectedCount = $('.multiple-select .selected').length;

        }).fail(function()
        {
            $.notify("", "error");
        })
    }

    this.search = function(query)
    {
        if(!query || !trim(query))
        {
            return spajs.open({ menuId:this.model.name, reopen:true});
        }

        return spajs.open({ menuId:this.model.name+"/search/"+encodeURIComponent(trim(query)), reopen:true});
    }

    this.showSearchResults = function(holder, menuInfo, data)
    {
        var thisObj = this;
        return $.when(this.searchItems(data.reg[1])).done(function()
        {
            $(holder).html(spajs.just.render(thisObj.model.name+'_list', {query:decodeURIComponent(data.reg[1])}))
        }).fail(function()
        {
            $.notify("", "error");
        })
    }

    this.showItem = function(holder, menuInfo, data)
    {
        var thisObj = this;
        console.log(menuInfo, data)

        return $.when(this.loadItem(data.reg[1])).done(function()
        {
            $(holder).html(spajs.just.render(thisObj.model.name+'_page', {item_id:data.reg[1]}))
        }).fail(function()
        {
            $.notify("", "error");
        })
    }

    this.showNewItemPage = function(holder, menuInfo, data)
    {
        $(holder).html(spajs.just.render(this.model.name+'_new_page', {parent_item:data.reg[2], parent_type:data.reg[1]}))
    }

    /**
     * Обновляет поле модел this.model.itemslist и ложит туда список пользователей
     * Обновляет поле модел this.model.items и ложит туда список инфу о пользователях по их id
     */
    this.loadItems = function(limit, offset)
    {
        if(!limit)
        {
            limit = 30;
        }

        if(!offset)
        {
            offset = 0;
        }

        var thisObj = this;
        return jQuery.ajax({
            url: "/api/v1/"+this.model.name+"/",
            type: "GET",
            contentType:'application/json',
            data: "limit="+encodeURIComponent(limit)+"&offset="+encodeURIComponent(offset),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(data)
            {
                console.log("update Items", data)
                thisObj.model.itemslist = data
                thisObj.model.itemslist.limit = limit
                thisObj.model.itemslist.offset = offset
                //thisObj.model.items = {}

                for(var i in data.results)
                {
                    var val = data.results[i]
                    thisObj.model.items.justWatch(val.id);
                    thisObj.model.items[val.id] = mergeDeep(thisObj.model.items[val.id], val)
                }
            },
            error:function(e)
            {
                console.log(e)
                polemarch.showErrors(e)
            }
        });
    }

    this.searchItems = function(query)
    {
        var thisObj = this;
        return jQuery.ajax({
            url: "/api/v1/"+this.model.name+"/?name="+encodeURIComponent(query),
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
                console.log("update Items", data)
                thisObj.model.itemslist = data
                //thisObj.model.items = {}

                for(var i in data.results)
                {
                    var val = data.results[i]
                    thisObj.model.items[val.id] = val
                }
            },
            error:function(e)
            {
                console.log(e)
                polemarch.showErrors(e)
            }
        });
    }

    /**
     * Обновляет поле модел this.model.items[item_id] и ложит туда пользователя
     */
    this.loadItem = function(item_id)
    {
        var thisObj = this;
        return jQuery.ajax({
            url: "/api/v1/"+this.model.name+"/"+item_id+"/",
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
                console.log("loadUser", data)
                thisObj.model.items[item_id] = data
            },
            error:function(e)
            {
                console.log(e)
                polemarch.showErrors(e)
            }
        });
    }

    /**
     * @return $.Deferred
     */
    this.deleteItem = function(item_id, force)
    {
        if(!force && !confirm("Are you sure?"))
        {
            return;
        }
        var thisObj = this;
        return $.when(this.deleteItemQuery(item_id)).done(function(data){
            console.log("deleteItem", data);
            spajs.open({ menuId:thisObj.model.name})
        }).fail(function(e){
            polemarch.showErrors(e.responseJSON)
        }).promise()
    }

    this.multiOperationsOnEachRow = function(elements, operation)
    {
        var def = new $.Deferred();
        var item_ids = []
        for(var i=0; i< elements.length; i++)
        {
            item_ids.push($(elements[i]).attr('data-id'))
        }

        $.when(this.multiOperationsOnItems(operation, item_ids)).always(function(){
            def.resolve()
        })

        return def.promise();
    }

    this.deleteRows = function(elements)
    {
        $.when(this.multiOperationsOnEachRow(elements, 'deleteItemQuery')).always(function(){
            spajs.openURL(window.location.href);
        })
    }

    this.multiOperationsOnItems = function(operation, item_ids, force, def)
    {
        if(!force && !confirm("Are you sure?"))
        {
            return;
        }

        if(def === undefined)
        {
            def = new $.Deferred();
        }

        if(!item_ids || !item_ids.length)
        {
            def.resolve()
            return def.promise();
        }

        var thisObj = this;
        $.when(this[operation](item_ids[0])).always(function(){
            item_ids.splice(0, 1)
            thisObj.multiOperationsOnItems(operation, item_ids, true, def);
        })

        return def.promise();
    }

    /**
     * @return $.Deferred
     */
    this.deleteItemQuery = function(item_id)
    {
        $(".item-"+item_id).remove();
        this.toggleSelect(item_id, false);

        return $.ajax({
            url: "/api/v1/"+this.model.name+"/"+item_id+"/",
            type: "DELETE",
            contentType:'application/json',
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            }
        });
    }

    this.updateList = function(limit, offset)
    {
        var thisObj = this;
        $.when(this.loadItems(limit, offset)).always(function(){
            thisObj.model.updateTimeoutId = setTimeout(
                    function(limit, offset){
                        thisObj.updateList(limit, offset)
                    }, 1000, limit, offset)
        })
    }

    this.stopUpdates = function()
    {
        clearTimeout(this.model.updateTimeoutId)
        this.model.updateTimeoutId = undefined;
    }
    
    this.showUpdatedList = function(holder, menuInfo, data)
    {
        var thisObj = this;
        return $.when(this.showList(holder, menuInfo, data)).always(function()
        {
            var offset = 0
            var limit = this.pageSize;
            if(data.reg && data.reg[1] > 0)
            {
                offset = this.pageSize*(data.reg[1] - 1);
            }
            thisObj.model.updateTimeoutId = setTimeout(function(limit, offset){
                thisObj.updateList(limit, offset);
            }, 1000, limit, offset) 
        }).promise();
    }

    ////////////////////////////////////////////////
    // pagination
    ////////////////////////////////////////////////

    this.paginationHtml = function(list)
    {
        var totalPage = list.count / list.limit
        if(totalPage > Math.floor(totalPage))
        {
            totalPage = Math.floor(totalPage) + 1
        }

        var currentPage = 0;
        if(list.offset)
        {
            currentPage = Math.floor(list.offset / list.limit)
        }
        var url = window.location.href
        return  spajs.just.render('pagination', {
            totalPage:totalPage,
            currentPage:currentPage,
            url:url})
    }

    this.getTotalPages = function(list)
    {
        var totalPage = list.count / list.limit
        return  totalPage
    }
}


/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}

