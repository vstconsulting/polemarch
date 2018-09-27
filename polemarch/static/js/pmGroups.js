
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
