/**
 * Function emits signal, that edits UserSettings page view.
 * @param {string} path /user/{pk}/settings/.
 */
function editUserSettingsPageInOpenApi(path) {
    tabSignal.connect('openapi.loaded', (openapi) => {
        let path_obj = openapi.paths[path];
        path_obj.post.operationId = path_obj.post.operationId.replace('_add', '_edit');
    });
}

/**
 * Function emits signal, that edits UserSettings page_edit view.
 * @param {string} path /user/{pk}/settings/edit/.
 */
function editUserSettingsPageEditView(path) {
    tabSignal.connect("views[" + path + "].beforeInit", function(obj){
        obj.schema.query_type = "post";
    });

    tabSignal.connect("views[" + path + "].afterInit", function(obj) {
        obj.view.mixins.push(user_settings_page_edit_mixin);
    });
}

/**
 * Function emits signal, that deletes UserSettings page_new view.
 * @param {string} path /user/{pk}/settings/new/.
 */
function deleteUserSettingsPageNewView(path) {
    tabSignal.connect("allViews.inited", function(obj){
        delete obj.views[path];
    });
}

/**
 * Function, that emits signals for UserSettings views.
 * @param {string} base_path /user/{pk}/settings/.
 */
function prepareUserSettingsViews(base_path) {
    editUserSettingsPageInOpenApi(base_path);

    editUserSettingsPageEditView(base_path + 'edit/');

    deleteUserSettingsPageNewView(base_path + 'new/');
}

/**
 * Mixin for UserSettings page_edit view.
 */
var user_settings_page_edit_mixin = {
    methods: {
        saveInstance() {
            let data = this.getValidData();
            if(!data) {
                return;
            }

            if(this.qs_url.replace(/^\/|\/$/g, "") == 'user/' + my_user_id + '/settings') {
                data.selectedSkin = guiCustomizer.skin.name;
                data.skinsSettings = guiCustomizer.skins_custom_settings;
            }

            let instance = this.data.instance;
            instance.data = data;
            let method = this.view.schema.query_type;
            instance.save(method).then(instance => {
                let qs = this.getQuerySet(this.view, this.qs_url).clone();
                qs.cache = instance;
                this.setQuerySet(this.view, this.qs_url, qs);

                guiDashboard.updateSettings(instance.data);

                guiPopUp.success('User settings were successfully saved.');

                let url = this.getRedirectUrl({instance:instance});

                this.$router.push({path: url});

            }).catch(error => {
                let str = app.error_handler.errorToString(error);

                let srt_to_show = pop_up_msg.instance.error.save.format(
                    ['settings', this.view.schema.name, str],
                );

                app.error_handler.showError(srt_to_show, str);
                debugger;
            });
        },

        getRedirectUrl() {
            return this.qs_url;
        },
    },
};

/**
 * Signal, that edits options of UserSettings model's fields.
 */
tabSignal.connect("models[UserSettings].fields.beforeInit", (fields => {
    [
        {name: 'chartLineSettings', title: "Dashboard chart lines settings", },
        {name: 'widgetSettings', title: "Dashboard widgets settings"},
    ].forEach((item) => {
        fields[item.name].format = 'inner_api_object';
        fields[item.name].title = item.title;
    });

    fields.autoupdateInterval.format = 'time_interval';
    fields.autoupdateInterval.required = true;
    fields.autoupdateInterval.title = 'Auto update interval';
    fields.autoupdateInterval.description = 'application automatically updates pages data' +
        ' with following interval (time in seconds)';

    fields.selectedSkin = {
        title: 'Selected skin',
        format: 'hidden',
    };
    fields.skinsSettings = {
        title: 'Skin settings',
        format: 'hidden',
    };
}));

/**
 * Emits signals for UserSettings views.
 */
prepareUserSettingsViews('/user/{' + path_pk_key + '}/settings/');