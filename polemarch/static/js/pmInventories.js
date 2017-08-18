 /**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/

var Base64 = {

	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = Base64._utf8_encode(input);

		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

		}

		return output;
	},

	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}

		}

		output = Base64._utf8_decode(output);

		return output;

	},

	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	},

	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}

		return string;
	}

}
 
 
var pmInventories = inheritance(pmItems)
pmInventories.model.name = "inventories"
pmInventories.model.page_name = "inventory"
jsonEditor.options[pmInventories.model.name] = jsonEditor.options['item'];
 
pmInventoriesText = "IyBIb3N0cyAKMS4yLjMuWzE6MjU1XSAKMTI0LjMuNC5bNDQ6NTVdIAoxMjQuMy41LlsxOjI1MF0gYW5zaWJsZV9ob3N0PTEwLjIwLjAuMiBhbnNpYmxlX3VzZXI9cm9vdCBhbnNpYmxlX3NzaF9wYXNzPWVhZGdiZQoxMjQuMy41LlsxOjI1MF0gYW5zaWJsZV9ob3N0PSIxMC4yMC4wLjIiIGFuc2libGVfdXNlcj0ncm9vdCcgYW5zaWJsZV9zc2hfcGFzcz1lYWRnYmUKMTI0LjMuNS5bMToyNTBdIGFuc2libGVfaG9zdD0iMTAuXCIyMFwnLjAuMiIgYW5zaWJsZV91c2VyPSdyIm9cJ290JyBhbnNpYmxlX3NzaF9wYXNzPWVhZGdiZQogIAojIEdsb2JhbCB2YXJzClthbGw6dmFyc10KYW5zaWJsZV91c2VyPWdyZXkKYW5zaWJsZV9zc2hfcHJpdmF0ZV9rZXlfZmlsZT0vdG1wL3RtcFJROGVUYwphbnNpYmxlX3NzaF9leHRyYV9hcmdzPS1vIFN0cmljdEhvc3RLZXlDaGVja2luZz1ubyAtbyBVc2VyS25vd25Ib3N0c0ZpbGU9L2Rldi9udWxsCgojIEdyb3VwcyAKW2dpdDpjaGlsZHJlbl0KY2kKZ2l0LXNlcnZlcnMKCgpbY2xvdWQ6Y2hpbGRyZW5dCmdpdApzZXJ2aWNlcwp0ZXN0CgoKW3Rlc3RdCnRlc3QudnN0LmxhbiBhbnNpYmxlX3VzZXI9Y2VudG9zCnRlc3QyLnZzdC5sYW4gYW5zaWJsZV9ob3N0PTE3Mi4xNi4xLjI2CgoKW2NpXQpnaXQtY2ktMSBhbnNpYmxlX2hvc3Q9MTcyLjE2LjEuMTMKZ2l0LWNpLTIgYW5zaWJsZV9ob3N0PTE3Mi4xNi4xLjE0CgoKW2dpdC1zZXJ2ZXJzXQpnaXQudnN0LmxhbiAKICAKCltzZXJ2aWNlc10KY2hhdC52c3Rjb25zdWx0aW5nLm5ldCBhbnNpYmxlX2hvc3Q9MTcyLjE2LjEuMTYKcGlwYy52c3QubGFuIApyZWRtaW5lLnZzdC5sYW4gCgoKW29wZW5zdGFja10KZnVlbC52c3QubGFuIGFuc2libGVfaG9zdD0xMC4yMC4wLjIgYW5zaWJsZV91c2VyPXJvb3QgYW5zaWJsZV9zc2hfcGFzcz1lYWRnYmUKb3MtY29tcHV0ZS0xLnZzdC5sYW4gYW5zaWJsZV9ob3N0PTEwLjIwLjAuOQpvcy1jb21wdXRlLTIudnN0LmxhbiBhbnNpYmxlX2hvc3Q9MTAuMjAuMC4xMwpvcy1jb250cm9sbGVyLTEudnN0LmxhbiBhbnNpYmxlX2hvc3Q9MTAuMjAuMC42Cm9zLWNvbnRyb2xsZXItMi52c3QubGFuIGFuc2libGVfaG9zdD0xMC4yMC4wLjgK"
pmInventoriesText = Base64.decode(pmInventoriesText)
  
pmInventories.importFromText = function(text)
{
    text = pmInventoriesText
    var lines = text.split(/\n/g)
    
    cSection = "_hosts";
    inventory = {
        hosts:[],
        groups:[],
        vars:{}
    }
    
    var parseVarsLine = function(index, line)
    {
        var vars = {}
        do{
            if(line.length == 0)
            {
                break;
            }

            var params = /^([^=]+)=["'](.*?)["'] [^=]+=/.exec(line)
            if(params)
            {
                params[1] = trim(params[1])
                vars[params[1]] = params[2]
                line = trim(line.slice(params[1].length + params[2].length + 3))
                continue;
            }

            params = /^([^=]+)=["'](.*?)["']$/.exec(line)
            if(params)
            {
                params[1] = trim(params[1])
                vars[params[1]] = params[2]
                break;
            }

            params = /^([^=]+)=(.*?) [^=]+=/.exec(line)
            if(params)
            {
                params[1] = trim(params[1])
                vars[params[1]] = params[2]
                line = trim(line.slice(params[1].length + params[2].length + 1))
                continue;
            }
            
            params = /^([^=]+)=(.*?)$/.exec(line)
            if(params)
            {
                params[1] = trim(params[1])
                vars[params[1]] = params[2]
                line = trim(line.slice(params[1].length + params[2].length + 1))
                continue;
            }
            else
            {
                throw "Error in line "+index+" invalid varibles string ("+line+")"
            }
        }while(true)
        return vars;
    }
    
    var parseHostLine = function(index, line, section, inventory)
    {
        var params = /^([^ ]+)/.exec(line)
        if(!params)
        {
            throw "Error in line "+index+" ("+line+")"
        }
 
        var name = ""
        var type = ""
        if(pmItems.validateHostName(params[1]))
        {
            name = params[1]
            type = "HOST"
        }
        else if(pmItems.validateRangeName(params[1]))
        {
            name = params[1]
            type = "RANGE"
        }
        else
        {
            throw "Error in line "+index+" invalid host or range name ("+params[1]+")"
        }

        line = trim(line.slice(name.length))

        var host = {
            name:name,
            type:type,
            vars:parseVarsLine(index, line)
        }

        inventory.hosts.push(host)
    }
    
    var parseLine = function(index, line, section, inventory)
    {
        line = trim(line);
        
        if(section == "_hosts")
        {
            parseHostLine(index, line, section, inventory)
            return true;
        }
        
        if(section == "all:vars")
        {
            var vars = parseVarsLine(index, line)
            inventory.vars = Object.assign(inventory.vars, vars)
            return true;
        }
        
        if(/:vars$/.test(section))
        {
            section = section.substring(0, section.length - ":vars".length)
            
            if(!inventory.groups[section])
            {
                inventory.groups[section] = {
                    vars:{}
                }
            }
            
            inventory.groups[section].vars = Object.assign(inventory.groups[section].vars, parseVarsLine(index, line))
        }
        
        return false;
    }
    
    for(var i in lines)
    {
        line = lines[i]
        if(/^\s*$/ig.test(line))
        {
            continue;
        }
        if(/^\s*[#;]/ig.test(line))
        {
            continue;
        }
        
        console.log(i+":\t" + line)
        
        if(/^\[([A-z0-9\.:]+:vars)\]/ig.test(line))
        {   
            res = /^\[([A-z0-9\.:]+)\]/ig.exec(line)
            cSection = res[1]
            console.info("setSection:vars ", cSection)
            continue;
        }  
        if(/^\[([A-z0-9\.:]+:children)\]/ig.test(line))
        {   
            res = /^\[([A-z0-9\.:]+)\]/ig.exec(line)
            cSection = res[1]
            console.info("setSection:children ", cSection)
            continue;
        }  
        if(/^\[([A-z0-9\.:]+)\]/ig.test(line))
        {   
            res = /^\[([A-z0-9\.:]+)\]/ig.exec(line)
            cSection = res[1]
            console.info("setSection ", cSection)
            continue;
        }  
        
        parseLine(i, line, cSection, inventory)
    }

    console.log("\n\ninventory", inventory)
}

pmInventories.importFromFile = function(files_event)
{
    var def = new $.Deferred(); 
    this.model.files = files_event
    
    for(var i=0; i<files_event.target.files.length; i++)
    {
        var reader = new FileReader();
        reader.onload = (function(index_in_files_array)
        {
            return function(e)
            {
                console.log(e)
                pmInventories.importFromText(e.target.result) 
            };
        })(i);
        reader.readAsText(files_event.target.files[i]); 
        
        // Нет поддержки загрузки более одного файла за раз.
        break;
    }
    
    return def.promise(); 
}
 
pmInventories.copyItem = function(item_id)
{
    var def = new $.Deferred();
    var thisObj = this;

    $.when(this.loadItem(item_id)).done(function()
    {
        var data = thisObj.model.items[item_id];
        delete data.id;
        data.name = "copy from " + data.name
        $.ajax({
            url: "/api/v1/"+thisObj.model.name+"/",
            type: "POST",
            contentType:'application/json',
            data: JSON.stringify(data),
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(newItem)
            {
                thisObj.model.items[newItem.id] = newItem
                 
                    var groups = []
                    for(var i in data.groups)
                    {
                        groups.push(data.groups[i].id)
                    }
                    
                    var hosts = []
                    for(var i in data.hosts)
                    {
                        hosts.push(data.hosts[i].id)
                    } 

                    $.when(thisObj.setSubGroups(newItem.id, groups), thisObj.setSubHosts(newItem.id, hosts)).always(function(){
                        def.resolve(newItem.id)
                    })
            },
            error:function(e)
            {
                def.reject(e)
            }
        });
    })

    return def.promise();
} 
  
/** 
 * @return $.Deferred
 */
pmInventories.addItem = function(parent_type, parent_item)
{
    var def = new $.Deferred();
    var data = {}

    data.name = $("#new_inventory_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()
     
    if(!data.name)
    {
        $.notify("Invalid value in filed name", "error");
        def.reject()
        return def.promise();
    }
 
    var thisObj = this;
    $.ajax({
        url: "/api/v1/inventories/",
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
            $.notify("inventory created", "success");
            
            if(parent_item)
            {
                if(parent_type == 'project')
                {
                    $.when(pmProjects.addSubInventories(parent_item, [data.id])).always(function(){
                        $.when(spajs.open({ menuId:"project/"+parent_item})).always(function(){
                            def.resolve()
                        })
                    })
                }
            }
            else
            { 
                $.when(spajs.open({ menuId: thisObj.model.page_name + "/"+data.id})).always(function(){
                    def.resolve()
                })
            }
            
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
pmInventories.updateItem = function(item_id)
{
    var data = {}

    data.name = $("#inventory_"+item_id+"_name").val()
    data.vars = jsonEditor.jsonEditorGetValues()
    
    if(!data.name)
    {
        console.warn("Invalid value in filed name")
        $.notify("Invalid value in filed name", "error");
        return;
    }
 
    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/",
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
            console.warn("inventory "+item_id+" update error - " + JSON.stringify(e)); 
            polemarch.showErrors(e.responseJSON)
        }
    });
}
  
/**
 * Показывает форму со списком всех групп.
 * @return $.Deferred
 */
pmInventories.showAddSubGroupsForm = function(item_id, holder)
{
    return $.when(pmGroups.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").append(spajs.just.render('add_existing_groups_to_inventory', {item_id:item_id}))
        $("#polemarch-model-items-select").select2();
    }).fail(function(){

    }).promise()
}

/**
 * Показывает форму со списком всех хостов.
 * @return $.Deferred
 */
pmInventories.showAddSubHostsForm = function(item_id, holder)
{
    return $.when(pmHosts.loadAllItems()).done(function(){
        $("#add_existing_item_to_inventory").remove()
        $(".content").append(spajs.just.render('add_existing_hosts_to_inventory', {item_id:item_id}))
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
pmInventories.hasHosts = function(item_id, host_id)
{
    if(pmInventories.model.items[item_id])
    {
        for(var i in pmInventories.model.items[item_id].hosts)
        {
            if(pmInventories.model.items[item_id].hosts[i].id == host_id)
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
pmInventories.hasGroups = function(item_id, group_id)
{
    if(pmInventories.model.items[item_id])
    {
        for(var i in pmInventories.model.items[item_id].groups)
        {
            if(pmInventories.model.items[item_id].groups[i].id == group_id)
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
pmInventories.setSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/groups/",
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
            if(pmInventories.model.items[item_id])
            {
                pmInventories.model.items[item_id].groups = []
                for(var i in groups_ids)
                {
                    pmInventories.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }  
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}
 
/**
 * @return $.Deferred
 */
pmInventories.setSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    return $.ajax({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
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
            if(pmInventories.model.items[item_id])
            {
                pmInventories.model.items[item_id].hosts = []
                for(var i in hosts_ids)
                {
                    pmInventories.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }  
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
        }
    });
}

/**
 * @return $.Deferred
 */
pmInventories.addSubGroups = function(item_id, groups_ids)
{
    if(!groups_ids)
    {
        groups_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/inventories/"+item_id+"/groups/",
        type: "POST",
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
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }
            
            if(pmInventories.model.items[item_id])
            { 
                if(!pmInventories.model.items[item_id].groups)
                {
                    pmInventories.model.items[item_id].groups = []
                }
                
                for(var i in groups_ids)
                {
                    pmInventories.model.items[item_id].groups.push(pmGroups.model.items[groups_ids[i]])
                }
            }
            
            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}
 
/**
 * @return $.Deferred
 */
pmInventories.addSubHosts = function(item_id, hosts_ids)
{
    if(!hosts_ids)
    {
        hosts_ids = []
    }

    var def = new $.Deferred();
    $.ajax({
        url: "/api/v1/inventories/"+item_id+"/hosts/",
        type: "POST",
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
            if(data.not_found > 0)
            {
                $.notify("Item not found", "error");
                def.reject()
                return;
            }
            
            if(pmInventories.model.items[item_id])
            { 
                if(!pmInventories.model.items[item_id].hosts)
                {
                    pmInventories.model.items[item_id].hosts = []
                }
                
                for(var i in hosts_ids)
                {
                    pmInventories.model.items[item_id].hosts.push(pmHosts.model.items[hosts_ids[i]])
                }
            }
            
            $.notify("Save", "success");
            def.resolve()
        },
        error:function(e)
        {
            console.warn("group "+item_id+" update error - " + JSON.stringify(e));
            polemarch.showErrors(e.responseJSON)
            def.reject()
        }
    });
    return def.promise();
}