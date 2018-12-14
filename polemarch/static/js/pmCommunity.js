tabSignal.connect('openapi.schema', function(obj){
    let path = obj.schema.path['/community_template/{pk}/use_it/'];
    path.schema.exec.fields.project_id.hidden = true;
});
