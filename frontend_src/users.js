import { updateSettings } from './dashboard';

/**
 * Mixin for UserSettings page_edit view.
 */
const user_settings_page_edit_mixin = {
    methods: {
        saveInstance() {
            let data = this.getValidData();
            if (!data) {
                return;
            }

            let is_current_user_settings =
                this.qs_url.replace(/^\/|\/$/g, '') == 'user/' + app.api.getUserId() + '/settings';

            if (is_current_user_settings) {
                data.selectedSkin = spa.guiCustomizer.guiCustomizer.skin.name;
                data.skinsSettings = spa.guiCustomizer.guiCustomizer.skins_custom_settings;
            }

            let instance = this.data.instance;
            instance.data = data;
            let method = this.view.schema.query_type;
            this.loading = true;
            instance
                .save(method)
                .then((instance) => {
                    this.loading = false;
                    let qs = this.getQuerySet(this.view, this.qs_url).clone();
                    qs.cache = instance;
                    this.setQuerySet(this.view, this.qs_url, qs);

                    if (is_current_user_settings) {
                        updateSettings(instance.data);
                    }

                    spa.popUp.guiPopUp.success(this.$t('User settings were successfully saved.'));

                    let url = this.getRedirectUrl({ instance: instance });

                    this.$router.push({ path: url });
                })
                .catch((error) => {
                    this.loading = false;
                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = spa.popUp.pop_up_msg.instance.error.save.format([
                        'settings',
                        this.view.schema.name,
                        str,
                    ]);

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
    tabSignal.connect('views[' + path + '].beforeInit', function (obj) {
        obj.schema.query_type = 'post';
    });

    tabSignal.connect('views[' + path + '].afterInit', function (obj) {
        obj.view.mixins.push(user_settings_page_edit_mixin);
    });
}

/**
 * Function emits signal, that deletes UserSettings page_new view.
 * @param {string} path /user/{pk}/settings/new/.
 */
function deleteUserSettingsPageNewView(path) {
    tabSignal.connect('allViews.inited', function (obj) {
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
 * Function prepares fields of User Settings Model.
 * @param {string} model name of model.
 */
function prepareUserSettingsModelFields(model) {
    /**
     * Signal, that edits options of UserSettings model's fields.
     */
    tabSignal.connect('models[' + model + '].fields.beforeInit', (fields) => {
        if (fields.lang) {
            fields.lang.title = 'language';
            fields.lang.description = 'application interface language';
        }

        if (fields.autoupdateInterval) {
            fields.autoupdateInterval.format = 'time_interval';
            fields.autoupdateInterval.required = true;
            fields.autoupdateInterval.title = 'Auto update interval';
            fields.autoupdateInterval.description =
                'application automatically updates pages data' + ' with following interval (time in seconds)';
        }

        [
            { name: 'chartLineSettings', title: 'Dashboard chart lines settings' },
            { name: 'widgetSettings', title: 'Dashboard widgets settings' },
        ].forEach((item) => {
            if (fields[item.name]) {
                fields[item.name].format = 'inner_api_object';
                fields[item.name].title = item.title;
            }
        });

        if (fields.selectedSkin) {
            fields.selectedSkin = {
                title: 'Selected skin',
                format: 'hidden',
            };
        }

        if (fields.skinsSettings) {
            fields.skinsSettings = {
                title: 'Skin settings',
                format: 'hidden',
            };
        }
    });
}

/**
 * Variable, that stores name of user Settings model.
 */
const user_model_settings = {
    name: 'UserSettings',
};

/**
 * Prepares fields of user settings model.
 */
prepareUserSettingsModelFields(user_model_settings.name);

/**
 * Emits signals for UserSettings views.
 */
prepareUserSettingsViews('/user/{' + spa.utils.path_pk_key + '}/settings/');

export { prepareUserSettingsViews, prepareUserSettingsModelFields, user_model_settings };
