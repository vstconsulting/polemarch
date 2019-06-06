/**
 * Function - that forms onchange callback of dynamic field - AnsibleModule.fields.group/AnsiblePlaybook.fields.limit.
 */
function ExecuteModulePlaybook_group_limit_callback() {
    let previous_inventory;
    let previous_format;

    /**
     * Function - onchange callback of dynamic field - AnsibleModule.fields.group/AnsiblePlaybook.fields.limit.
     * @param {object} parent_values Values of parent fields.
     */
    return function (parent_values = {}) {
        let inventory = parent_values['inventory'];

        if (inventory && typeof inventory == 'object' && inventory.value !== undefined) {
            inventory = inventory.value;
        }

        let save_value = false;

        if(previous_inventory === undefined || previous_inventory == inventory) {
            save_value = true;
        }

        previous_inventory = inventory;

        if (inventory && !isNaN(Number(inventory))) {
            let format = 'group_autocomplete';

            if(previous_format && previous_format != format) {
                save_value = false;
            }

            previous_format = format;

            return {
                format: format,
                default: 'all',
                additionalProperties: {
                    list_paths: [
                        '/project/{' + path_pk_key + '}/inventory/{inventory_id}/all_groups/',
                        '/project/{' + path_pk_key + '}/inventory/{inventory_id}/all_hosts/',
                    ],
                    value_field: 'name',
                    view_field: 'name',
                    url_params: {inventory_id: inventory},
                },
                save_value: save_value,
            };
        } else {
            let format = 'autocomplete';

            if(previous_format && previous_format != format) {
                save_value = false;
            }

            previous_format = format;

            return {
                format: 'autocomplete',
                default: 'all',
                save_value: save_value,
            };
        }
    }
}

/**
 * Function, that connects to the signal, in that some manipulations with model's fields should be made.
 * This function is supposed to be called for AnsibleModule and AnsiblePlaybook models.
 * @param {string} model Name of model.
 */
function ansiblePlaybookAndAnsibleModuleModelsFieldsHandler(model) {
    let str = "models[{0}].fields.beforeInit".format([model]);

    tabSignal.connect(str, (fields) => {
        fields.inventory.format = "inventory_autocomplete";

        let prop;
        let type_props = ['module', 'playbook'];

        type_props.forEach(item => {
            if(model.toLowerCase().indexOf(item) !== -1) {
                prop = item;
            }
        });

        if(fields[prop]) {
            fields[prop].format = prop + "_autocomplete";
        }

        if(fields[prop] && fields[prop].additionalProperties && prop == 'playbook') {
            fields[prop].additionalProperties.view_field = "playbook";
        }

        let group_props = ['group', 'limit'];

        group_props.forEach(prop => {
            if(fields[prop]) {
                fields[prop].format = 'dynamic';
                fields[prop].additionalProperties = {
                    field: ['inventory'],
                    callback: ExecuteModulePlaybook_group_limit_callback(),
                };
            }
        });
    });
}

/**
 * Vue component of 'Run playbook form'.
 */
var gui_project_page_additional = Vue.component('gui_project_page_additional', {
    mixins: [base_page_type_mixin, collapsable_card_mixin],
    template: "#template_project_page_additional",
    data() {
        return {
            /**
             * Property, that stores instance of guiField.form -
             * form with base fields of 'Run playbook form'.
             */
            base_fields: undefined,
            /**
             * Property, that stores value of base_fields form.
             */
            base_fields_value: {},

            /**
             * Property, that stores instance of guiField.form -
             * form with extra fields of 'Run playbook form'.
             */
            extra_vars: undefined,
            /**
             * Property, that stores value of extra_vars form.
             */
            extra_vars_value: {},
            /**
             * Property, that stores instance of guiField.form -
             * form with playbook buttons of 'Run playbook form'.
             */
            buttons: undefined,
            /**
             * Boolean property, that is responsible for showing/hiding collapse-button.
             */
            card_collapsed_button: true,
        };
    },
    created() {
        let instance = this.data.instance;

        // initialization of base_fields, extra_vars and buttons properties.
        if(instance && instance.data && instance.data.execute_view_data) {
            this.base_fields = new guiFields.form(this.getBaseFieldsFormOptions());

            this.extra_vars = new guiFields.form(this.getExtraVarsFormOptions(instance.data.execute_view_data));

            this.buttons = new guiFields.form(this.getButtonsForm(instance.data.execute_view_data));
        }
    },
    methods: {
        /**
         * Method, that returns options for base_fields form.
         */
        getBaseFieldsFormOptions() {
            return {
                name: 'base_fields',
                title: "Execute parameters",
                form: {
                    inventory: {
                        name: 'inventory',
                        title: 'inventory',
                        description: "inventory, on which playbook will be executed",
                        required: true,
                        format: 'inventory_autocomplete',
                        additionalProperties: {
                            view_field: 'name',
                            value_field: 'id',
                            list_paths: ['/project/{' + path_pk_key + '}/inventory/'],
                        }
                    },
                    user: {
                        name: 'user',
                        title: 'User',
                        description: "connect as this user (default=None)",
                        format: 'string',
                    },
                    key_file: {
                        name: 'key_file',
                        title: 'Key file',
                        description: "use this file to authenticate the connection",
                        format: 'secretfile',
                    },
                },
            };
        },
        /**
         * Method, that returns options for extra_vars form.
         * @param {object} data Schema of 'Run playbook form'.
         * @returns {object}.
         */
        getExtraVarsFormOptions(data) {
            if(!isEmptyObject(data.fields)) {
                return {
                    name: 'extra_vars',
                    title: "Additional execute parameters",
                    format: 'form',
                    form: data.fields,
                }
            }

            return {form: {}};
        },
        /**
         * Method, that returns options for buttons form.
         * @param {object} data Schema of 'Run playbook form'.
         * @returns {object}.
         */
        getButtonsForm(data) {
            if(isEmptyObject(data.playbooks)) {
                return {form: {}};
            }

            let buttons = {};

            for(let key in data.playbooks) {
                let val = data.playbooks[key];

                buttons[key] = {
                    name: key,
                    title: val.title,
                    description: val.help || val.description,
                    format:'button',
                    onclick: () => {
                        this.executePlaybook(key);
                    },
                }
            }

            return {name: 'buttons', title: ' ', form: buttons};
        },
        /**
         * Method, that returns validated data of 'Run playbook form'.
         * @return {object} Validated data or error.
         */
        getPolemarchYamlValidData() {
            try {
                let val_base_fields = this.base_fields.toInner({base_fields: this.base_fields_value});

                let valid_data = this.base_fields.validateValue({base_fields: val_base_fields});

                let val_extra_vars = this.extra_vars.toInner({extra_vars: this.extra_vars_value});

                let extra_vars = this.extra_vars.validateValue({extra_vars: val_extra_vars});

                if(!isEmptyObject(extra_vars)) {
                    valid_data['extra_vars'] = extra_vars;
                }

                return valid_data;

            } catch(e) {
                app.error_handler.defineErrorAndShow(e);
            }
        },
        /**
         * Method, that executes playbook.
         * @param {string} playbook.
         */
        executePlaybook(playbook) {
            let data = this.getPolemarchYamlValidData();

            if(!data) {
                return;
            }

            data.playbook = playbook;

            if(data.extra_vars) {
                data.extra_vars = JSON.stringify(data.extra_vars);
            }

            let qs = this.view.objects.clone();

            qs.url = (qs.url + "execute_playbook/").format(this.$route.params);
            qs.formQueryAndSend('post', data).then(res => {
                guiPopUp.success("Playbook was successfully executed.");

                if(res && res.data && res.data.history_id) {
                    let redirect_path = "/project/{" + path_pk_key + "}/history/{history_id}/";
                    let redirect_url;

                    try {
                        redirect_url = redirect_path.format(
                            $.extend(true, {}, this.$route.params, {history_id: res.data.history_id}),
                        );

                        if(redirect_url) {
                            this.$router.push({path: redirect_url.replace(/\/$/g, "")});
                        }

                    } catch(e) {}
                }
            }).catch(error => {
                debugger;
            });
        },
        /**
         * Method - handler for 'base_fields' and 'extra_vars' forms onChange event.
         * @param {string} prop 'base_fields' or 'extra_vars'.
         * @param {object} value New form value.
         */
        formOnChangeHandler(prop, value) {
            this[prop] = value;
            this[prop] = { ...this[prop] };
        },
    },
});

/**
 * Mixin for '/project/{pk}/' view.
 */
var project_pk_mixin = {
    watch: {
        'hasPolemarchYamlForm': function(value) {
            if(value && this.card_collapsed == false &&
                this.card_collapsed_button == false) {
                this.card_collapsed = true;
                this.card_collapsed_button = true;
            }
        },
    },
    computed: {
        hasPolemarchYamlForm() {
            let instance = this.data.instance;

            if(instance && instance.data && instance.data.execute_view_data) {
                return true;
            }

            return false;
        },

        content_additional() {
            if(this.hasPolemarchYamlForm) {
                return 'gui_project_page_additional';
            }
        },
    },
};

/**
 * Variable, that stores names of models, connected with project.
 * This is needed for easy redefinition in EE version.
 */
var project_connected_models_dict = {
    module:   'AnsibleModule',
    playbook: 'AnsiblePlaybook',
};

tabSignal.connect("views[/project/{" + path_pk_key + "}/].afterInit", (obj) => {
    obj.view.mixins = obj.view.mixins.concat(project_pk_mixin);
});

tabSignal.connect("models[OneProject].fields.beforeInit", (fields) => {
    fields.execute_view_data.format = 'hidden';
});

tabSignal.connect("models[OneModule].fields.beforeInit", (fields) => {
    fields['data'].format = 'ansible_json';
});

/**
 * Function, that adds signals to the AnsibleModule and AnsiblePlaybook models.
 */
function addSignalsForAnsibleModuleAndAnsiblePlaybookModels() {
    Object.entries(project_connected_models_dict).map(item => {
        if(['module', 'playbook'].includes(item[0])) {
            return item[1];
        }
    }).forEach(ansiblePlaybookAndAnsibleModuleModelsFieldsHandler);
}

addSignalsForAnsibleModuleAndAnsiblePlaybookModels();

/**
 * Changes 'status' filter type to 'choices'.
 */
tabSignal.connect("views[/project/].filters.beforeInit", filters => {
    for(let index in filters) {
        let filter = filters[index];

        if(filter.name == 'status' || filter.name == 'status__not') {
            filter.type = 'choices';
            filter.enum = [''].concat(app.models['Project'].fields.status.options.enum);
        }
    }
});