
var pmProjects = new pmItems()
pmProjects.model.name = "projects"

jsonEditor.options['projects'] = {}
jsonEditor.options['projects'].repo_password = {
    type:'password',
    help:'Password from repository',
    helpcontent:'Password from repository required for GIT'
}

jsonEditor.options['projects']['ansible_ask-vault-pass'] = {
    type:'password',
    help:'--ask-vault-pass',
    helpcontent:'ask for vault password',
    alias:''
}

jsonEditor.options['projects']['ansible_check'] = {
    type:'boolean',
    help:'--check',
    helpcontent:"don't make any changes; instead, try to predict some of the changes that may occur",
    alias:'C'
}

jsonEditor.options['projects']['ansible_diff'] = {
    type:'boolean',
    help:'--diff',
    helpcontent:"when changing (small) files and templates, show the differences in those files; works great with --check",
    alias:'D'
}

jsonEditor.options['projects']['ansible_extra-vars'] = {
    type:'textarea',
    help:'-e EXTRA_VARS, --extra-vars=EXTRA_VARS',
    helpcontent:"set additional variables as key=value or YAML/JSON",
    alias:'e'
}

jsonEditor.options['projects']['ansible_flush-cache'] = {
    type:'boolean',
    help:'--flush-cache',
    helpcontent:"clear the fact cache",
    alias:''
}

jsonEditor.options['projects']['ansible_force-handlers'] = {
    type:'boolean',
    help:'--force-handlers',
    helpcontent:"run handlers even if a task fails",
    alias:''
}

jsonEditor.options['projects']['ansible_forks'] = {
    type:'textarea',
    help:'-f FORKS, --forks=FORKS',
    helpcontent:"specify number of parallel processes to use (default=5)",
    alias:'f'
}

jsonEditor.options['projects']['ansible_help'] = {
    type:'boolean',
    help:'--help',
    helpcontent:"show ansible help message and exit",
    alias:'h'
}

jsonEditor.options['projects']['ansible_inventory-file'] = {
    type:'text',
    help:'-i INVENTORY, --inventory-file=INVENTORY',
    helpcontent:"specify inventory host path (default=/etc/ansible/hosts) or comma separated host list.",
    alias:'i'
}

jsonEditor.options['projects']['ansible_limit'] = {
    type:'text',
    help:'-l SUBSET, --limit=SUBSET',
    helpcontent:"further limit selected hosts to an additional pattern",
    alias:'l'
}

jsonEditor.options['projects']['ansible_list-hosts'] = {
    type:'boolean',
    help:'--list-hosts',
    helpcontent:"outputs a list of matching hosts; does not execute anything else",
    alias:''
}

jsonEditor.options['projects']['ansible_list-tags'] = {
    type:'boolean',
    help:'--list-tags',
    helpcontent:"list all available tags",
    alias:''
}

jsonEditor.options['projects']['ansible_list-tasks'] = {
    type:'boolean',
    help:'--list-tasks',
    helpcontent:"list all tasks that would be executed",
    alias:''
}

jsonEditor.options['projects']['ansible_module-path'] = {
    type:'text',
    help:'-M MODULE_PATH, --module-path=MODULE_PATH',
    helpcontent:"specify path(s) to module library (default=None)",
    alias:''
}

jsonEditor.options['projects']['ansible_new-vault-password-file'] = {
    type:'textarea',
    help:'--new-vault-password-file=NEW_VAULT_PASSWORD_FILE',
    helpcontent:"new vault password file for rekey",
    alias:''
}

jsonEditor.options['projects']['ansible_output'] = {
    type:'textarea',
    help:'--output=OUTPUT_FILE',
    helpcontent:"output file name for encrypt or decrypt; use - for stdout",
    alias:''
}

jsonEditor.options['projects']['ansible_skip-tags'] = {
    type:'textarea',
    help:'--skip-tags=SKIP_TAGS',
    helpcontent:"only run plays and tasks whose tags do not match these values",
    alias:''
}

jsonEditor.options['projects']['ansible_start-at-task'] = {
    type:'textarea',
    help:'--start-at-task=START_AT_TASK',
    helpcontent:"start the playbook at the task matching this name",
    alias:''
}

jsonEditor.options['projects']['ansible_step'] = {
    type:'boolean',
    help:'--step',
    helpcontent:"one-step-at-a-time: confirm each task before running",
    alias:''
}

jsonEditor.options['projects']['ansible_syntax-check'] = {
    type:'boolean',
    help:'--syntax-check',
    helpcontent:"perform a syntax check on the playbook, but do not execute it",
    alias:''
}

jsonEditor.options['projects']['ansible_tags'] = {
    type:'boolean',
    help:'-t TAGS, --tags=TAGS',
    helpcontent:"only run plays and tasks tagged with these values",
    alias:'t'
}

jsonEditor.options['projects']['ansible_vault-password-file'] = {
    type:'textarea',
    help:'--vault-password-file=VAULT_PASSWORD_FILE',
    helpcontent:"vault password file",
    alias:''
}

jsonEditor.options['projects']['ansible_verbose'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'v'
}

jsonEditor.options['projects']['ansible_vv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vv'
}

jsonEditor.options['projects']['ansible_vvv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vvv'
}

jsonEditor.options['projects']['ansible_vvvv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vvvv'
}

jsonEditor.options['projects']['ansible_version'] = {
    type:'boolean',
    help:'--version',
    helpcontent:"show program's version number and exit",
    alias:''
}

jsonEditor.options['projects']['ansible_ask-pass'] = {
    type:'boolean',
    help:'-k, --ask-pass',
    helpcontent:"ask for connection password\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'k'
}

jsonEditor.options['projects']['ansible_private-key'] = {
    type:'textarea',
    help:'--private-key=PRIVATE_KEY_FILE, --key-file=PRIVATE_KEY_FILE',
    helpcontent:"use this file to authenticate the connection\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_user'] = {
    type:'text',
    help:'-u REMOTE_USER, --user=REMOTE_USER',
    helpcontent:"connect as this user (default=None)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'u'
}

jsonEditor.options['projects']['ansible_connection'] = {
    type:'text',
    help:'-c CONNECTION, --connection=CONNECTION',
    helpcontent:"connection type to use (default=smart)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'c'
}

jsonEditor.options['projects']['ansible_timeout'] = {
    type:'text',
    help:'-T TIMEOUT, --timeout=TIMEOUT',
    helpcontent:"override the connection timeout in seconds (default=10)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'T'
}

jsonEditor.options['projects']['ansible_ssh-common-args'] = {
    type:'textarea',
    help:'--ssh-common-args=SSH_COMMON_ARGS',
    helpcontent:"specify common arguments to pass to sftp/scp/ssh (e.g. ProxyCommand)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_sftp-extra-args'] = {
    type:'textarea',
    help:'--sftp-extra-args=SFTP_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to sftp only (e.g. -f, -l)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_scp-extra-args'] = {
    type:'textarea',
    help:'--scp-extra-args=SCP_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to scp only (e.g. -l)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_ssh-extra-args'] = {
    type:'textarea',
    help:'--ssh-extra-args=SSH_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to ssh only (e.g. -R)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_sudo'] = {
    type:'boolean',
    help:'-s, --sudo',
    helpcontent:"run operations with sudo (nopasswd) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'s'
}

jsonEditor.options['projects']['ansible_sudo'] = {
    type:'text',
    help:'-U SUDO_USER, --sudo-user=SUDO_USER',
    helpcontent:"desired sudo user (default=root) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'U'
}

jsonEditor.options['projects']['ansible_su'] = {
    type:'text',
    help:'-S, --su',
    helpcontent:"run operations with su (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'S'
}

jsonEditor.options['projects']['ansible_su-user'] = {
    type:'text',
    help:'-R SU_USER, --su-user=SU_USER',
    helpcontent:"run operations with su as this user (default=root) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'R'
}

jsonEditor.options['projects']['ansible_become'] = {
    type:'boolean',
    help:'-b, --become',
    helpcontent:"run operations with become (does not imply password prompting)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'b'
}

jsonEditor.options['projects']['ansible_become-method'] = {
    type:'text',
    help:'--become-method=BECOME_METHOD',
    helpcontent:"privilege escalation method to use (default=sudo), valid choices: [ sudo | su | pbrun | pfexec | doas | dzdo | ksu ]\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_become-user'] = {
    type:'text',
    help:'--become-user=BECOME_USER',
    helpcontent:"run operations as this user (default=root)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_ask-sudo-pass'] = {
    type:'boolean',
    help:'--ask-sudo-pass',
    helpcontent:"ask for sudo password (deprecated, use become)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_ask-su-pass'] = {
    type:'boolean',
    help:'--ask-su-pass',
    helpcontent:"ask for su password (deprecated, use become)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['projects']['ansible_ask-become-pass'] = {
    type:'boolean',
    help:'-K, --ask-become-pass',
    helpcontent:"ask for privilege escalation password\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'K'
}

pmProjects.openList = function(holder, menuInfo, data)
{
    return $.when(pmProjects.showList(holder, menuInfo, data)).always(function()
    {
        var offset = 0
        var limit = this.pageSize;
        if(data.reg && data.reg[1] > 0)
        {
            offset = this.pageSize*(data.reg[1] - 1);
        }
        pmProjects.model.updateTimeoutId = setTimeout(pmProjects.updateList, 1000, limit, offset)

    }).promise();
}

pmProjects.openItem = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    $.when(pmProjects.supportedRepos()).always(function()
    {
        $.when(pmProjects.showItem(holder, menuInfo, data)) .always(function()
        {
            def.resolve();
        })
    }).promise();

    return def.promise();
}

pmProjects.openNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    $.when(pmProjects.supportedRepos()).always(function()
    {
        $.when(pmProjects.showNewItemPage(holder, menuInfo, data)) .always(function()
        {
            def.resolve();
        })
    }).promise();

    return def.promise();
}

pmProjects.updateList = function(limit, offset)
{
    $.when(pmProjects.loadItems(limit, offset)).always(function(){
        pmProjects.model.updateTimeoutId = setTimeout(pmProjects.updateList, 1000, limit, offset)
    })
}

pmProjects.closeList = function()
{
    clearTimeout(pmProjects.model.updateTimeoutId)
    pmProjects.model.updateTimeoutId = undefined;
}

/**
 * @return $.Deferred
 */
pmProjects.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_project_name").val()
    data.repository = $("#new_project_repository").val()
    data.vars = jsonEditor.jsonEditorGetValues()

    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }

    $.ajax({
        url: "/api/v1/projects/",
        type: "POST",
        contentType:'application/json',
        data: JSON.stringify(data),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            $.notify("project created", "success");
            $.when(spajs.open({ menuId:"project/"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            def.reject()
            polemarch.showErrors(e.responseJSON)
        }
    });

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmProjects.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#project_"+item_id+"_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }

    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data:JSON.stringify(data),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmProjects.showAddSubInventoriesForm = function(item_id, holder)
{
    return $.when(pmInventories.loadItems(99999)).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_inventories_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmProjects.showAddSubInventoriesForm = function(item_id, holder)
{
    return $.when(pmInventories.loadItems(99999)).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_inventories_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmProjects.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadItems(99999)).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_groups_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmProjects.showAddSubHostsForm = function(item_id, holder)
{
    return $.when(pmHosts.loadItems(99999)).done(function(){
        $("#add_existing_item_to_project").remove()
        $(".content").append(spajs.just.render('add_existing_hosts_to_project', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Проверяет принадлежит ли host_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} host_id
 * @returns {Boolean}
 */
pmProjects.hasHosts = function(item_id, host_id)
{
    if(pmProjects.model.items[item_id])
    {
        for(var i in pmProjects.model.items[item_id].hosts)
        {
            if(pmProjects.model.items[item_id].hosts[i].id == host_id)
            {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет принадлежит ли host_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} host_id
 * @returns {Boolean}
 */
pmProjects.hasGroups = function(item_id, group_id)
{
    if(pmProjects.model.items[item_id])
    {
        for(var i in pmProjects.model.items[item_id].groups)
        {
            if(pmProjects.model.items[item_id].groups[i].id == group_id)
            {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет принадлежит ли Inventory_id к группе item_id
 * @param {Integer} item_id
 * @param {Integer} inventory_id
 * @returns {Boolean}
 */
pmProjects.hasInventories = function(item_id, inventory_id)
{
    if(pmProjects.model.items[item_id])
    {
        for(var i in pmProjects.model.items[item_id].inventories)
        {
            if(pmProjects.model.items[item_id].inventories[i].id == inventory_id)
            {
                return true;
            }
        }
    }
    return false;
}


/**
 * @return $.Deferred
 */
pmProjects.setSubInventories = function(item_id, inventories_ids)
{
    if(!inventories_ids)
    {
        inventories_ids = []
    }

    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/inventories/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(inventories_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(pmProjects.model.items[item_id])
            {
                pmProjects.model.items[item_id].inventories = []
                for(var i in inventories_ids)
                {
                    pmProjects.model.items[item_id].inventories.push(pmInventories.model.items[inventories_ids[i]])
                }
            }
            console.log("inventories update", data);
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("inventories "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.setSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/groups/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(groups_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(pmProjects.model.items[item_id])
            {
                pmProjects.model.items[item_id].groups = []
                for(var i in groups_ids)
                {
                    pmProjects.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
            console.log("group update", data);
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.setSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }
    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/hosts/",
        type: "PUT",
        contentType:'application/json',
        data:JSON.stringify(hosts_ids),
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            if(pmProjects.model.items[item_id])
            {
                pmProjects.model.items[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    pmProjects.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            $.notify("Save", "success");
        },
        error:function(e)
        {
            console.log("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.syncRepo = function(item_id)
{
    return $.ajax({
        url: "/api/v1/projects/"+item_id+"/sync/",
        type: "POST",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            $.notify("Send sync query", "success");
        },
        error:function(e)
        {
            console.log("project "+item_id+" sync error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmProjects.supportedRepos = function()
{
    return $.ajax({
        url: "/api/v1/projects/supported-repos/",
        type: "GET",
        contentType:'application/json',
        beforeSend: function(xhr, settings) {
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },
        success: function(data)
        {
            pmProjects.model.supportedRepos = data;
            jsonEditor.options['projects'].repo_type = {
                type:'select',
                options:pmProjects.model.supportedRepos,
                required:true,
            }
        },
        error:function(e)
        {
            console.log("project "+item_id+" sync error - " + JSON.stringify(e));
        }
    });
}