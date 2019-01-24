
tabSignal.connect("openapi.schema.name.set_owner",  function(data)
{
    data.value.is_multi_action = true
})

tabSignal.connect("openapi.schema.name.clear",  function(data)
{
    data.value.is_multi_action = true
})