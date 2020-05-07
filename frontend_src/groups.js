const path_pk_key = spa.utils.path_pk_key;

/**
 * Signal, that creates views for paths, which do not exist in API:
 * - /inventory/{pk}/group/{group_id}/group/ and all paths, that nested in /group/{pk}/group/ path.
 */
tabSignal.connect('allViews.inited', (obj) => {
    let views = obj.views;
    let prefix = '/inventory/{' + path_pk_key + '}';
    let constr = new spa.views.SubViewWithOutApiPathConstructor(spa.api.openapi_dictionary, app.models, {
        prefix: prefix,
    });
    let group_group_paths = Object.keys(views).filter(
        (path) => path.indexOf('/group/{' + path_pk_key + '}/group/') == 0,
    );

    group_group_paths.forEach((path) => {
        let new_path =
            prefix +
            path.replace('{group_id}', '{subgroup_id}').replace('{' + path_pk_key + '}', '{group_id}');
        let new_view = constr.generateSubView(views, path, new_path);
        views[new_path] = new_view;
    });
});

/**
 * Signal, that creates views for paths, which do not exist in API:
 * - /project/{pk}/inventory/{inventory_id}/group/{group_id}/group/ and all paths, that nested in /group/{pk}/group/ path.
 */
tabSignal.connect('allViews.inited', (obj) => {
    let views = obj.views;
    let prefix = '/project/{' + path_pk_key + '}/inventory/{inventory_id}';
    let constr = new spa.views.SubViewWithOutApiPathConstructor(spa.api.openapi_dictionary, app.models, {
        prefix: prefix,
    });
    let group_group_paths = Object.keys(views).filter(
        (path) => path.indexOf('/group/{' + path_pk_key + '}/group/') == 0,
    );

    group_group_paths.forEach((path) => {
        let new_path =
            prefix +
            path.replace('{group_id}', '{subgroup_id}').replace('{' + path_pk_key + '}', '{group_id}');
        let new_view = constr.generateSubView(views, path, new_path);
        views[new_path] = new_view;
    });
});

/**
 * Signal, that hides 'Host' button from children group views and hides 'Group' button from not children group views.
 */
tabSignal.connect('allViews.inited', (obj) => {
    let views = obj.views;
    let group_views = Object.values(views).filter((view) => {
        let obj = view.schema;
        if (obj.path.indexOf('group') != -1 && obj.name == 'group' && ['list', 'page'].includes(obj.type)) {
            return true;
        }
    });

    group_views.forEach((view) => {
        view.getViewSublinkButtons = function (type, buttons, instance) {
            let data = instance.data;
            let btns = $.extend(true, {}, buttons);

            if (!data) {
                return btns;
            }

            if (type == 'sublinks' || type == 'child_links') {
                if (data.children) {
                    if (btns.host) {
                        btns.host.hidden = true;
                    }
                } else {
                    if (btns.group) {
                        btns.group.hidden = true;
                    }
                }
            }

            return btns;
        };
    });
});
