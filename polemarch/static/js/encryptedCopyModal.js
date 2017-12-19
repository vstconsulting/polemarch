
var encryptedCopyModal = {}
encryptedCopyModal.find = function(data, prefix)
{
    if(!prefix)
    {
        prefix = "";
    }

    for(var i in data)
    {
        if(typeof data[i] == "string" && data[i] == "[~~ENCRYPTED~~]")
        {
            this.encryptedFileds.push(prefix+i)
        }
        else if(typeof data[i] == "object" && data[i] != null)
        {
            this.find(data[i], prefix + i + ".")
        }
    }

    return this.encryptedFileds;
}

encryptedCopyModal.setNewValues = function()
{
    var encryptedFileds = $(".encryptedFiled")

    this.newObjectData = $.extend(true, {}, this.objectData)

    for(var i = 0; i<encryptedFileds.length; i++)
    {
        var key = $(encryptedFileds[i]).attr('data-key-name')
        key = "['"+key.replace(/\./mg, "']['") + "']"
        
        if($(encryptedFileds[i]).val() == "")
        {
            eval('delete encryptedCopyModal.newObjectData'+key+'')
        }
        else
        {
            eval('encryptedCopyModal.newObjectData'+key+'=$(".encryptedFiled")['+i+'].value')
        }
    }

    $('#replaceEncryptedModal').modal('hide')
}

encryptedCopyModal.replace = function(objectData)
{
    if(this.def && this.def.reject)
    {
        this.def.reject()
    }

    this.newObjectData = undefined
    $("#replaceEncryptedModal").remove()

    this.objectData = objectData
    this.def = new $.Deferred();

    this.encryptedFileds = []
    this.encryptedFileds = this.find(objectData)
    if(!this.encryptedFileds.length)
    {
        this.def.resolve(objectData)
        return this.def.promise();
    }

    $("body").appendTpl(spajs.just.render("replaceEncryptedModal", {encryptedFileds:this.encryptedFileds}))
    $('#replaceEncryptedModal').modal()

    var thisObj = this;
    $('#replaceEncryptedModal').on('hidden.bs.modal', function ()
    {
        $("#replaceEncryptedModal").remove()

        if(!thisObj.newObjectData)
        {
            thisObj.def.reject()
        }
        else
        {
            thisObj.def.resolve(thisObj.newObjectData)
        }
    })

    return this.def.promise();
}
 
encryptedCopyModal.loadFile = function(event, element)
{
    console.log("encryptedCopyModal.loadFile", event.target.files)
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
            $(element)[0].setAttribute("value", e.target.result)
            $(element).val(e.target.result)
        }

        reader.readAsText(event.target.files[i]);
        return;
    }
}