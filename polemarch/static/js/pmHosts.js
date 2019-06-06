/**
 * Function, that adds signal, that sets 'owner' field's property 'readOnly' equal to true.
 * @param {string} model Name of model.
 */
function addSignalOwnerReadOnly(model) {
    tabSignal.connect("models[" + model + "].fields.beforeInit", (fields) => {
        if(fields.owner) {
            fields.owner.readOnly = true;
        }
    });
}

/**
 * Variable, that stores array with Host paths,
 * options of those should be changed in the tabSignal.
 */
var host_paths = [
    '/host/', '/group/{' + path_pk_key + '}/host/', '/inventory/{' + path_pk_key + '}/host/',
    '/inventory/{' + path_pk_key + '}/group/{group_id}/host/',
    '/project/{' + path_pk_key + '}/inventory/{inventory_id}/host/',
];

/**
 * Changes 'type' filter type to 'choices'.
 */
host_paths.forEach(path => {
    tabSignal.connect("views[" + path + "].filters.beforeInit", filters => {
        for(let index in filters) {
            let filter = filters[index];

            if(filter.name == 'type') {
                filter.type = 'choices';
                filter.enum = [''].concat(app.models['Host'].fields.type.options.enum);
            }
        }
    });
});

/**
 * Sets 'owner' field's property 'readOnly' equal to true.
 */
['OneHost', 'OneInventory', 'GroupCreateMaster'].forEach(addSignalOwnerReadOnly);

/**
 * Signal, that creates views for paths, which do not exist in API:
 * - /inventory/{pk}/group/{group_id}/host/ and all paths, that nested in /group/{pk}/host/ path.
 */
tabSignal.connect('allViews.inited', obj => {
    let views = obj.views;
    let prefix = '/inventory/{' + path_pk_key + '}';
    let constr = new SubViewWithOutApiPathConstructor(openapi_dictionary, app.models, {prefix: prefix});
    let group_host_paths = Object.keys(views).filter(path => path.indexOf( "/group/{" + path_pk_key + "}/host/") == 0);

    group_host_paths.forEach(path => {
        let new_path = prefix + path.replace('{' + path_pk_key + '}', '{group_id}');
        let new_view = constr.generateSubView(views, path, new_path);
        views[new_path] = new_view;
    });
});

/**
 * Signal, that creates views for paths, which do not exist in API:
 * - /project/{pk}/inventory/{inventory_id}/group/{group_id}/host/ and all paths, that nested in /group/{pk}/host/ path.
 */
tabSignal.connect('allViews.inited', obj => {
    let views = obj.views;
    let prefix = '/project/{' + path_pk_key + '}/inventory/{inventory_id}';
    let constr = new SubViewWithOutApiPathConstructor(openapi_dictionary, app.models, {prefix: prefix});
    let group_host_paths = Object.keys(views).filter(path => path.indexOf( "/group/{" + path_pk_key + "}/host/") == 0);

    group_host_paths.forEach(path => {
        let new_path = prefix + path.replace('{' + path_pk_key + '}', '{group_id}');
        let new_view = constr.generateSubView(views, path, new_path);
        views[new_path] = new_view;
    });
});