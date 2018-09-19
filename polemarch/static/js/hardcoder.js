 
tabSignal.connect("openapi.schema", function(data)
{ 
    window.guiSchema.path["/group/{pk}/"].schema.edit.fields.children.readOnly = true 
})
 