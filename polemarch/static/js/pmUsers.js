
var pmUsers = inheritance(pmItems)

pmUsers.model.name = "users"
pmUsers.model.page_name = "user"
pmUsers.model.className = "pmUsers"

pmUsers.model.page_list = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'new-"+this.model.page_name+"'}); return false;"},
            title:'Create',
            link:function(){ return '/?new-'+this.model.page_name},
        },
    ],
    title: "Users",
    short_title: "Users",
    fileds:[
        {
            title:'Name',
            name:'username',
        }
    ],
    actions:[
        {
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+')); return false;'},
            title:'Delete',
            link:function(){ return '#'}
        },
        {
            class:function(item){return 'change-activation-'+item.id;},
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.changeItemActivation('+item.id+')); return false;'},
            title:function(item){
                if(this.model.items[item.id].is_active==true)
                {
                    return "Deactivate";
                }
                else {
                    return "Activate";
                }
            },
            link:function(){ return '#'}
        },
    ]
}

pmUsers.model.page_new = {
    title: "New user",
    short_title: "New user",
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'User name',
                name:'username',
                placeholder:'Enter user name',
                help:'',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new filedsLib.filed.password(),
                title:'Password',
                name:'password',
                placeholder:'Enter user password',
                help:'',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Password')
                },
                fast_validator:function(value){ return value != '' && value}
            },
        ],[
            {
                filed: new filedsLib.filed.text(),
                title:'First name',
                name:'first_name',
                placeholder:'Enter user first name',
                help:'',
            },
            {
                filed: new filedsLib.filed.text(),
                title:'Last name',
                name:'last_name',
                placeholder:'Enter user last name',
                help:'',
            }
        ],[

            {
                filed: new filedsLib.filed.text(),
                title:'Email',
                name:'email',
                placeholder:'Enter user email',
                help:'',
            },
            {
                filed: new filedsLib.filed.boolean(),
                title:'Is active',
                name:'is_active',
                default:true,
            }
        ]
    ],
    onBeforeSave:function(data, item_id)
    {
        data.is_staff = true
        return data;
    },
    onCreate:function(result)
    {
        var def = new $.Deferred();
        $.notify("User created", "success");
        $.when(spajs.open({ menuId:pmUsers.model.page_name+"/"+result.id})).always(function(){
            def.resolve()
        })

        return def.promise();
    }
}

pmUsers.model.page_item = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-info',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.openChangePasswordForm('+item_id+'));  return false;'},
            title:'Change password',
            link:function(){ return '#'}
        },
        {
            class:function(item_id){return 'btn btn-warning change-activation-'+item_id;},
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.changeItemActivation('+item_id+'));  return false;'},
            title:function(item_id){
                if(this.model.items[item_id].is_active==true)
                {
                    return "Deactivate";
                }
                else {
                    return "Activate";
                }
            },
            link:function(){ return '#'},
            help:function(item_id){
                if(this.model.items[item_id].is_active==true)
                {
                    return "Deactivate account";
                }
                else {
                    return "Activate account";
                }
            }
        },
        /*
        {
            class:'btn btn-default copy-btn',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.copyAndEdit('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-duplicate" ></span>',
            link:function(){ return '#'},
            help:'Copy'
        },
        */
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    title: function(item_id){
        return "User "+pmUsers.model.items[item_id].justText('username')
    },
    short_title: function(item_id){
        return "User "+pmUsers.model.items[item_id].justText('username', function(v){return v.slice(0, 20)})
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'User name',
                name:'username',
                placeholder:'Enter user name',
                help:'',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new filedsLib.filed.text(),
                title:'Email',
                name:'email',
                placeholder:'Enter user email',
                help:'',
            }

        ],[

            {
                filed: new filedsLib.filed.text(),
                title:'First name',
                name:'first_name',
                placeholder:'Enter user first name',
                help:'',
            },
            {
                filed: new filedsLib.filed.text(),
                title:'Last name',
                name:'last_name',
                placeholder:'Enter user last name',
                help:'',
            }
        ]
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        if(!data.password)
        {
            delete data.password
        }
        data.is_staff = true

        return data;
    },
}

pmUsers.model.profile_page = {
    buttons:[
        {
            class:'btn btn-primary',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.updateItem('+item_id+'));  return false;'},
            title:'Save',
            link:function(){ return '#'},
        },
        {
            class:'btn btn-info',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.openChangePasswordForm('+item_id+'));  return false;'},
            title:'Change password',
            link:function(){ return '#'}
        },
        {
            class:function(item_id){return 'btn btn-warning change-activation-'+item_id;},
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.changeItemActivation('+item_id+'));  return false;'},
            title:function(item_id){
                if(this.model.items[item_id].is_active==true)
                {
                    return "Deactivate";
                }
                else {
                    return "Activate";
                }
            },
            link:function(){ return '#'},
            help:function(item_id){
                if(this.model.items[item_id].is_active==true)
                {
                    return "Deactivate account";
                }
                else {
                    return "Activate account";
                }
            }
        },
        {
            class:'btn btn-danger danger-right',
            function:function(item_id){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item_id+'));  return false;'},
            title:'<span class="glyphicon glyphicon-remove" ></span> <span class="hidden-sm hidden-xs" >Remove</span>',
            link:function(){ return '#'},
        },
    ],
    title: function(item_id){
        return pmUsers.model.items[item_id].justText('username').replace(/\b\w/g, function(l){ return l.toUpperCase() }) + " profile";
    },
    short_title: function(item_id){
        return pmUsers.model.items[item_id].justText('username', function(v){return v.slice(0, 20)}).replace(/\b\w/g, function(l){ return l.toUpperCase() }) + " profile";
    },
    fileds:[
        [
            {
                filed: new filedsLib.filed.text(),
                title:'User name',
                name:'username',
                placeholder:'Enter user name',
                help:'',
                validator:function(value){
                    return filedsLib.validator.notEmpty(value, 'Name')
                },
                fast_validator:function(value){ return value != '' && value}
            },
            {
                filed: new filedsLib.filed.text(),
                title:'Email',
                name:'email',
                placeholder:'Enter user email',
                help:'',
            }

        ],[

            {
                filed: new filedsLib.filed.text(),
                title:'First name',
                name:'first_name',
                placeholder:'Enter user first name',
                help:'',
            },
            {
                filed: new filedsLib.filed.text(),
                title:'Last name',
                name:'last_name',
                placeholder:'Enter user last name',
                help:'',
            }
        ]
    ],
    sections:[
        function(){
             return spajs.just.render("WidgetsSettingsFromProfile");
        }
    ],
    onUpdate:function(result)
    {
        return true;
    },
    onBeforeSave:function(data, item_id)
    {
        if(!data.password)
        {
            delete data.password
        }
        data.is_staff = true

        return data;
    },
}


pmUsers.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.username = "copy-from-" + data.username

        $.when(encryptedCopyModal.replace(data)).done(function(data)
        {
            spajs.ajax.Call({
                url: "/api/v1/"+thisObj.model.name+"/",
                type: "POST",
                contentType:'application/json',
                data: JSON.stringify(data),
                success: function(data)
                {
                    thisObj.model.items[data.id] = data
                    def.resolve(data.id)
                },
                error:function(e)
                {
                    def.reject(e)
                }
            });
        }).fail(function(e)
        {
            def.reject(e)
        })
    }).fail(function(e)
    {
        def.reject(e)
    })


    return def.promise();
}


pmUsers.changeItemActivation = function(item_id) {
    if(pmUsers.model.items[item_id].is_active==true)
    {
        return pmUsers.deactivateItem(item_id);
    }
    else
    {
        return pmUsers.activateItem(item_id);
    }
}

pmUsers.deactivateItem = function(item_id, force) {
    var thisObj = this;
    var def = new $.Deferred();
    if (!force && !confirm("Are you sure, that you want to deactivate this account? Only superuser will be able to activate it again."))
    {
        def.reject();
        return def.promise()
    }
    pmUsers.model.items[item_id].is_active=!pmUsers.model.items[item_id].is_active;
    var data={ "is_active": false }
    spajs.ajax.Call({
        url: "/api/v1/"+thisObj.model.name+"/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data: JSON.stringify(data),
        success: function(data)
        {
            if(my_user_id==item_id)
            {
                spajs.openURL(window.location.protocol+"//"+window.location.host);
            }
            else {
                $.notify("Account was deactivated", "success");
                var t=$(".change-activation-"+item_id)[0];
                $(t).html("Activate");
                $(t).attr("title", "Activate account");
            }
            def.resolve()
        },
        error:function(e)
        {
            def.reject(e)
        }
    });

    return def.promise();
}

pmUsers.activateItem = function(item_id, force) {
    var thisObj = this;
    var def = new $.Deferred();
    pmUsers.model.items[item_id].is_active=!pmUsers.model.items[item_id].is_active;
    var data={ "is_active": true }
    spajs.ajax.Call({
        url: "/api/v1/"+thisObj.model.name+"/"+item_id+"/",
        type: "PATCH",
        contentType:'application/json',
        data: JSON.stringify(data),
        success: function(data)
        {
            $.notify("Account was activated", "success");
            var t=$(".change-activation-"+item_id)[0];
            $(t).html("Deactivate");
            $(t).attr("title", "Deactivate account");
            def.resolve()
        },
        error:function(e)
        {
            def.reject(e)
        }
    });

    return def.promise();
}

pmUsers.openChangePasswordForm = function(item_id)
{
    if($('div').is('#change_password_form'))
    {
        $('#change_password_form').empty();
        $('#change_password_form').html(pmUsers.renderModalWindow(item_id));
        $("#change_password_form").modal('show');
    }
    else
    {
        var t=$(".content")[0];
        $('<div>', { id: "change_password_form", class: "modal fade in"}).appendTo(t);
        $('#change_password_form').html(pmUsers.renderModalWindow(item_id));
        $("#change_password_form").modal('show');
    }
}

pmUsers.renderModalWindow = function(item_id)
{
    var html=spajs.just.render('change_password_form', {item_id: item_id});
    return html;
}

pmUsers.changePassword = function(item_id)
{
    var thisObj = this;
    var def = new $.Deferred();
    var newPassword1 = $("#new_password").val();
    var newPassword2 = $("#new_password_confirm").val();
    if(newPassword1==newPassword2 && newPassword1==""){
        $.notify("Form is empty", "error");
        def.resolve();
        return def.promise();
    }
    if(newPassword1==newPassword2 && newPassword1!="")
    {
        var data={"password": newPassword1};
        spajs.ajax.Call({
            url: "/api/v1/"+thisObj.model.name+"/"+item_id+"/",
            type: "PATCH",
            contentType:'application/json',
            data: JSON.stringify(data),
            success: function(data)
            {

                if(my_user_id==item_id)
                {
                    return $.when(hidemodal(), $("#change_password_form").modal('hide')).done(function(){
                        def.resolve();
                        return spajs.openURL("/");
                    }).promise();
                }
                else
                {
                    $.notify("Password was successfully changed", "success");
                    $("#change_password_form").modal('hide');
                    def.resolve();
                }

            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    }
    else
    {
        $.notify("New password value is not the same as the confirm value", "error");
        def.reject();
    }
    return def.promise();
}

pmUsers.showProfile = function (holder, menuInfo, data)
{
    var thisObj = this;
    //console.log(menuInfo, data)

    return $.when(pmDashboard.getUserWidgetSettingsFromAPI(), this.loadItem(data.reg[1])).done(function ()
    {
        var tpl = "profile_page"
        if (!spajs.just.isTplExists(tpl))
        {
            tpl = 'items_page'
        }

        $(holder).insertTpl(spajs.just.render(tpl, {item_id: data.reg[1], pmObj: thisObj, opt: {}}))
    }).fail(function ()
    {
        $.notify("", "error");
    }).promise()
}



tabSignal.connect("polemarch.start", function()
{
    // users
    spajs.addMenu({
        id:"users",
        urlregexp:[/^users$/, /^user$/, /^users\/search\/?$/, /^users\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showList(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"users-search",
        urlregexp:[/^users\/search\/([A-z0-9 %\-.:,=]+)$/, /^users\/search\/([A-z0-9 %\-.:,=]+)\/page\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showSearchResults(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"user",
        urlregexp:[/^user\/([0-9]+)$/, /^users\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showItem(holder, menuInfo, data);}
    })

    spajs.addMenu({
        id:"newuser",
        urlregexp:[/^new-user$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showNewItemPage(holder, menuInfo, data);}
    })

     spajs.addMenu({
        id:"profile",
        urlregexp:[/^profile\/([0-9]+)$/],
        onOpen:function(holder, menuInfo, data){return pmUsers.showProfile(holder, menuInfo, data);}
    })

})
