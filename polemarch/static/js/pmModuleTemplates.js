
var pmModuleTemplates =  inheritance(pmTemplates)  

pmModuleTemplates.model.name = "templates"
pmModuleTemplates.model.page_name = "template"
pmModuleTemplates.model.selectedInventory = 0

// Поддерживаемые kind /api/v1/templates/supported-kinds/
pmModuleTemplates.model.kind = "Module"

pmTemplates.model.kindObjects[pmModuleTemplates.model.kind] = pmModuleTemplates


pmModuleTemplates.model.modulesDocs = {
    acl:{
       name:"acl",
       gitlink:"https://github.com/ansible/ansible-modules-core/blob/devel/files/acl.py",
       doclink:"http://docs.ansible.com/ansible/latest/acl_module.html",
       DOCUMENTATION:"---\
module: acl\
version_added: \"1.4\"\
short_description: Sets and retrieves file ACL information.\
description:\
    - Sets and retrieves file ACL information.\
options:\
  name:\
    required: true\
    default: null\
    description:\
      - The full path of the file or object.\
    aliases: ['path']\
  state:\
    required: false\
    default: query\
    choices: [ 'query', 'present', 'absent' ]\
    description:\
      - defines whether the ACL should be present or not.  The C(query) state gets the current acl without changing it, for use in 'register' operations.\
  follow:\
    required: false\
    default: yes\
    choices: [ 'yes', 'no' ]\
    description:\
      - whether to follow symlinks on the path if a symlink is encountered.\
  default:\
    version_added: \"1.5\"\
    required: false\
    default: no\
    choices: [ 'yes', 'no' ]\
    description:\
      - if the target is a directory, setting this to yes will make it the default acl for entities created inside the directory. It causes an error if name is a file.\
  entity:\
    version_added: \"1.5\"\
    required: false\
    description:\
      - actual user or group that the ACL applies to when matching entity types user or group are selected.\
  etype:\
    version_added: \"1.5\"\
    required: false\
    default: null\
    choices: [ 'user', 'group', 'mask', 'other' ]\
    description:\
      - the entity type of the ACL to apply, see setfacl documentation for more info.\
  permissions:\
    version_added: \"1.5\"\
    required: false\
    default: null\
    description:\
      - Permissions to apply/remove can be any combination of r, w and  x (read, write and execute respectively)\
  entry:\
    required: false\
    default: null\
    description:\
      - DEPRECATED. The acl to set or remove.  This must always be quoted in the form of '<etype>:<qualifier>:<perms>'.  The qualifier may be empty for some types, but the type and perms are always required. '-' can be used as placeholder when you do not care about permissions. This is now superseded by entity, type and permissions fields.\
  recursive:\
    version_added: \"2.0\"\
    required: false\
    default: no\
    choices: [ 'yes', 'no' ]\
    description:\
      - Recursively sets the specified ACL (added in Ansible 2.0). Incompatible with C(state=query).\
author:\
    - \"Brian Coca (@bcoca)\"\
    - \"Jérémie Astori (@astorije)\"\
notes:\
    - The \"acl\" module requires that acls are enabled on the target filesystem and that the setfacl and getfacl binaries are installed.\
    - As of Ansible 2.0, this module only supports Linux distributions.\
",
        EXAMPLES:"\
# Grant user Joe read access to a file\
- acl:\
    name: /etc/foo.conf\
    entity: joe\
    etype: user\
    permissions: r\
    state: present\
# Removes the acl for Joe on a specific file\
- acl:\
    name: /etc/foo.conf\
    entity: joe\
    etype: user\
    state: absent\
# Sets default acl for joe on foo.d\
- acl:\
    name: /etc/foo.d\
    entity: joe\
    etype: user\
    permissions: rw\
    default: yes\
    state: present\
# Same as previous but using entry shorthand\
- acl:\
    name: /etc/foo.d\
    entry: \"default:user:joe:rw-\"\
    state: present\
# Obtain the acl for a specific file\
- acl:\
    name: /etc/foo.conf\
  register: acl_info",
        RETURN:"acl:\
    description: Current acl on provided path (after changes, if any)\
    returned: success\
    type: list\
    sample: [ \"user::rwx\", \"group::rwx\", \"other::rwx\" ]",
    }
}


pmModuleTemplates.execute = function(item_id)
{
    var thisObj = this;
    var def = new $.Deferred();
    $.when(this.loadItem(item_id)).done(function()
    {
        var val = thisObj.model.items[item_id]
        $.when(pmAnsibleModule.execute(val.data.project, val.data.inventory, val.data.group, val.data.module, val.data.args, val.data.vars)).done(function()
        {
            def.resolve();
        }).fail(function()
        {
            def.reject();
        })

    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}


pmModuleTemplates.showItem = function(holder, menuInfo, data)
{ 
    var item_id = data.reg[1]

    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems(), pmModuleTemplates.loadItem(item_id)).done(function()
    {
        $.when(pmModuleTemplates.selectInventory(pmModuleTemplates.model.items[item_id].data.inventory)).done(function()
        {
            $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_module_page', {item_id:item_id}))

            $("#inventories-autocomplete").select2();
            $("#projects-autocomplete").select2();

            new autoComplete({
                selector: '#module-autocomplete',
                minChars: 0,
                cache:false,
                showByClick:true,
                menuClass:'module-autocomplete',
                renderItem: function(item, search)
                {
                    return '<div class="autocomplete-suggestion" data-value="' + item.name + '" >' + item.name + '</div>';
                },
                onSelect: function(event, term, item)
                {
                    $("#module-autocomplete").val($(item).text());
                },
                source: function(term, response)
                {
                    term = term.toLowerCase();

                    var matches = []
                    for(var i in thisObj.model.modulesDocs)
                    {
                        var val = thisObj.model.modulesDocs[i]
                        if(val.name.toLowerCase().indexOf(term) != -1)
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

            def.resolve();
        }).fail(function(){
            def.reject();
        });
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}

pmModuleTemplates.showNewItemPage = function(holder, menuInfo, data)
{
    var def = new $.Deferred();
    var thisObj = this;
    $.when(pmInventories.loadAllItems(), pmProjects.loadAllItems()).done(function()
    {
        $(holder).insertTpl(spajs.just.render(thisObj.model.name+'_new_module_page', {}))

        $("#inventories-autocomplete").select2();
        $("#projects-autocomplete").select2();

        new autoComplete({
            selector: '#module-autocomplete',
            minChars: 0,
            cache:false,
            showByClick:true,
            menuClass:'module-autocomplete',
            renderItem: function(item, search)
            {
                return '<div class="autocomplete-suggestion" data-value="' + item.name + '" >' + item.name + '</div>';
            },
            onSelect: function(event, term, item)
            {
                $("#module-autocomplete").val($(item).text());
            },
            source: function(term, response)
            {
                term = term.toLowerCase();

                var matches = []
                for(var i in thisObj.model.modulesDocs)
                {
                    var val = thisObj.model.modulesDocs[i]
                    if(val.name.toLowerCase().indexOf(term) != -1)
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

        def.resolve();
    }).fail(function()
    {
        def.reject();
    })

    return def.promise()
}


pmModuleTemplates.selectInventory = function(inventory_id)
{
    var def = new $.Deferred();
    var thisObj = this;
    inventory_id = inventory_id/1
    if(inventory_id)
    {
        $.when(pmInventories.loadItem(inventory_id)).done(function(){
            thisObj.model.selectedInventory = inventory_id;
            def.resolve();
        }).fail(function(){
            def.reject();
        });
    }
    else
    {
        thisObj.model.selectedInventory = 0;
        def.resolve();
    }
    return def.promise()
}

/**
 * @return $.Deferred
 */
pmModuleTemplates.addItem = function()
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        module:$("#module-autocomplete").val(),
        inventory:$("#inventories-autocomplete").val(),
        project:$("#projects-autocomplete").val(),
        group:$("#group-autocomplete").val(),
        args:$("#module-args-string").val(),
        vars:jsonEditor.jsonEditorGetValues(),
    }

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return;
    }

    var thisObj = this;
    $.ajax({
        url: "/api/v1/templates/",
        type: "POST",
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
            $.notify("template created", "success");
            $.when(spajs.open({ menuId:"template/"+thisObj.model.kind+"/"+data.id})).always(function(){
                def.resolve()
            })
        },
        error:function(e)
        {
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });

    return def.promise();
}

/**
 * @return $.Deferred
 */
pmModuleTemplates.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#Templates-name").val()
    data.kind = this.model.kind
    data.data = {
        module:$("#module-autocomplete").val(),
        inventory:$("#inventories-autocomplete").val(),
        project:$("#projects-autocomplete").val(),
        group:$("#group-autocomplete").val(),
        args:$("#module-args-string").val(),
        vars:jsonEditor.jsonEditorGetValues(),
    }

    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }
     
    return $.ajax({
        url: "/api/v1/templates/"+item_id+"/",
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
            console.warn("project "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
