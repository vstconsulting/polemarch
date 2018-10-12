 
tabSignal.connect("openapi.schema.is_multi_action",  function(data)
{ 
    // {path:action.path, action:action});
    if(data.action.name == "set_owner")
    {
        data.action.is_multi_action = true
    }
})