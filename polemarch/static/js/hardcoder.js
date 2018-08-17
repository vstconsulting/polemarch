

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.owner", function(data)
{
    apiowner.view.defaultName = "username"
})

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.user", function(data)
{
    apiowner.view.defaultName = "username"
})

// Исключения харкод для назвпний в апи
tabSignal.connect("openapi.factory.variables", function(data)
{
    apiowner.view.defaultName = "key"
})
 