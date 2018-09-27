
tabSignal.connect("guiList.renderLine.group", function(obj){
    
    if(obj.dataLine.line.children)
    {
        obj.dataLine.sublinks_l2['host'].hidden = true
        obj.dataLine.sublinks_l2['group'].hidden = false
    }
    else
    {
        obj.dataLine.sublinks_l2['host'].hidden = false
        obj.dataLine.sublinks_l2['group'].hidden = true
    }
     
})
