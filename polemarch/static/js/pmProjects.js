tabSignal.connect("openapi.paths",  function(){
    let paths = window.guiSchema.path;
    let exec_module_fields = paths['/project/{pk}/execute_module/'].schema['exec'].fields;
    let exec_playbook_fields = paths['/project/{pk}/execute_playbook/'].schema['exec'].fields;
    exec_module_fields['inventory'].type = 'string';
    exec_module_fields['inventory'].format = 'hybrid_autocomplete';
    exec_playbook_fields['inventory'].type = 'string';
    exec_playbook_fields['inventory'].format = 'hybrid_autocomplete';
});