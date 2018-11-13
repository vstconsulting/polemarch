
tabSignal.connect("openapi.schema", function(data)
{
    window.guiSchema.path["/group/{pk}/"].schema.edit.fields.children.readOnly = true

    // Adding links to the link scheme
    window.guiSchema.path["/group/{pk}/group/{group_id}/"].links['__link__group'] = "/group/{pk}/"
    window.guiSchema.path["/group/{pk}/group/"].sublinks_l2['__link__group'] = "/group/{pk}/"

    window.guiSchema.path["/group/{pk}/group/{group_id}/"].links['__link__host'] = "/host/{pk}/"
    window.guiSchema.path["/group/{pk}/group/"].sublinks_l2['__link__host'] = "/host/{pk}/"

    window.guiSchema.path["/inventory/{pk}/group/{group_id}/"].links['__link__group'] = "/group/{pk}/"
    window.guiSchema.path["/inventory/{pk}/group/"].sublinks_l2['__link__group'] = "/group/{pk}/"

    window.guiSchema.path["/inventory/{pk}/group/{group_id}/"].links['__link__host'] = "/host/{pk}/"
    window.guiSchema.path["/inventory/{pk}/group/"].sublinks_l2['__link__host'] = "/host/{pk}/"

    window.guiSchema.path["/project/{pk}/inventory/{inventory_id}/group/{group_id}/"].links['__link__group'] = "/group/{pk}/"
    window.guiSchema.path["/project/{pk}/inventory/{inventory_id}/group/"].sublinks_l2['__link__group'] = "/group/{pk}/"

    window.guiSchema.path["/project/{pk}/inventory/{inventory_id}/group/{group_id}/"].links['__link__host'] = "/host/{pk}/"
    window.guiSchema.path["/project/{pk}/inventory/{inventory_id}/group/"].sublinks_l2['__link__host'] = "/host/{pk}/"
})

tabSignal.connect("guiList.renderLine.group", function(obj){

    if(obj.dataLine.line.children)
    {
        if(obj.dataLine.sublinks_l2['host'])
        {
            obj.dataLine.sublinks_l2['host'].hidden = true
        }

        if(obj.dataLine.sublinks_l2['group'])
        {
            obj.dataLine.sublinks_l2['group'].hidden = false
        }
    }
    else
    {
        if(obj.dataLine.sublinks_l2['host'])
        {
        obj.dataLine.sublinks_l2['host'].hidden = false
        }

        if(obj.dataLine.sublinks_l2['group'])
        {
            obj.dataLine.sublinks_l2['group'].hidden = true
        }
    }

})

tabSignal.connect("guiList.renderPage.group", function(obj){

    if(obj.data.children)
    {
        if(obj.options.links['host'])
        {
            obj.options.links['host'].hidden = true
        }
        if(obj.options.links['group'])
        {
            obj.options.links['group'].hidden = false
        }
    }
    else
    {
        if(obj.options.links['host'])
        {
            obj.options.links['host'].hidden = false
        }
        if(obj.options.links['group'])
        {
            obj.options.links['group'].hidden = true
        }
    }

})
