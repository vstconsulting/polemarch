import ProjectPageAdditional from './ProjectPageAdditional.vue';
const path_pk_key = spa.utils.path_pk_key;

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
        let inventory = parent_values.inventory;

        if (inventory && typeof inventory == 'object' && inventory.value !== undefined) {
            inventory = inventory.value;
        }

        let save_value = false;

        if (previous_inventory === undefined || previous_inventory == inventory) {
            save_value = true;
        }

        previous_inventory = inventory;

        if (inventory && !isNaN(Number(inventory))) {
            let format = 'group_autocomplete';

            if (previous_format && previous_format != format) {
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
                    url_params: { inventory_id: inventory },
                },
                save_value: save_value,
            };
        } else {
            let format = 'autocomplete';

            if (previous_format && previous_format != format) {
                save_value = false;
            }

            previous_format = format;

            return {
                format: 'autocomplete',
                default: 'all',
                save_value: save_value,
            };
        }
    };
}

/**
 * Function, that connects to the signal, in that some manipulations with model's fields should be made.
 * This function is supposed to be called for AnsibleModule and AnsiblePlaybook models.
 * @param {string} model Name of model.
 */
function ansiblePlaybookAndAnsibleModuleModelsFieldsHandler(model) {
    spa.signals.connect(`models[${model}].fields.beforeInit`, (fields) => {
        fields.inventory.format = 'inventory_autocomplete';

        let prop;
        let type_props = ['module', 'playbook'];

        type_props.forEach((item) => {
            if (model.toLowerCase().indexOf(item) !== -1) {
                prop = item;
            }
        });

        if (fields[prop]) {
            fields[prop].format = prop + '_autocomplete';
        }

        if (fields[prop] && fields[prop].additionalProperties && prop == 'playbook') {
            fields[prop].additionalProperties.view_field = 'playbook';
        }

        let group_props = ['group', 'limit'];

        group_props.forEach((prop) => {
            if (fields[prop]) {
                fields[prop].format = 'dynamic';
                fields[prop].additionalProperties = {
                    field: ['inventory'],
                    callback: ExecuteModulePlaybook_group_limit_callback(),
                };
            }
        });
    });
}

spa.globalComponentsRegistrator.add(ProjectPageAdditional);

/**
 * Mixin for '/project/{pk}/' view.
 */
const project_pk_mixin = {
    watch: {
        hasPolemarchYamlForm: function (value) {
            if (value && this.card_collapsed == false && this.card_collapsed_button == false) {
                this.card_collapsed = true;
                this.card_collapsed_button = true;
            }
        },
    },
    computed: {
        hasPolemarchYamlForm() {
            let instance = this.data.instance;

            if (instance && instance.data && instance.data.execute_view_data) {
                return true;
            }

            return false;
        },

        content_additional() {
            if (this.hasPolemarchYamlForm) {
                return ProjectPageAdditional.name;
            }
        },
    },
};

/**
 * Variable, that stores names of models, connected with project.
 * This is needed for easy redefinition in EE version.
 */
let project_connected_models_dict = {
    module: 'AnsibleModule',
    playbook: 'AnsiblePlaybook',
};

spa.signals.connect('views[/project/{' + path_pk_key + '}/].afterInit', (obj) => {
    obj.view.mixins = obj.view.mixins.concat(project_pk_mixin);
});

spa.signals.connect('models[OneProject].fields.beforeInit', (fields) => {
    fields.execute_view_data.format = 'hidden';
});

spa.signals.connect('models[OneModule].fields.beforeInit', (fields) => {
    fields.data.format = 'ansible_json';
    fields.data.readOnly = true;
});

/**
 * Function, that adds signals to the AnsibleModule and AnsiblePlaybook models.
 */
function addSignalsForAnsibleModuleAndAnsiblePlaybookModels() {
    Object.entries(project_connected_models_dict)
        .map((item) => {
            if (['module', 'playbook'].includes(item[0])) {
                return item[1];
            }
        })
        .forEach(ansiblePlaybookAndAnsibleModuleModelsFieldsHandler);
}

addSignalsForAnsibleModuleAndAnsiblePlaybookModels();

/**
 * Changes 'status' filter type to 'choices'.
 */
spa.signals.connect('views[/project/].filters.beforeInit', (filters) => {
    for (let filter of Object.values(filters)) {
        if (filter.name == 'status' || filter.name == 'status__not') {
            filter.type = 'choices';
            filter.enum = [''].concat(app.models.Project.fields.status.options.enum);
        }
    }
});

/**
 * Variable, that stores pairs (key, value), where:
 * - key - value of the 'key' field of ProjectVariable model;
 * - value - value of the 'value' field of ProjectVariable model.
 */
const ProjectVariable_value_from_key = {
    ci_template: {
        additionalProperties: {
            list_paths: ['/project/{' + path_pk_key + '}/template/'],
            view_field: 'name',
            value_field: 'id',
        },
    },
};

/**
 * Function - onchange callback of dynamic field - ProjectVariable.fields.value.
 * @param {object} parent_values Values of parent fields.
 */
function ProjectVariable_value_callback(parent_values = {}) {
    if (parent_values.key && Object.keys(ProjectVariable_value_from_key).includes(parent_values.key)) {
        return ProjectVariable_value_from_key[parent_values.key];
    }

    return {};
}

/**
 * Adds callback for dynamic 'value' field of ProjectVariable model.
 */
spa.signals.connect('models[ProjectVariable].fields.beforeInit', (fields) => {
    if (fields.value && fields.value.additionalProperties) {
        fields.value.additionalProperties.callback = ProjectVariable_value_callback;
    }
});

/**
 * Hides 'pb_filter' filter on the playbook list view.
 */
spa.signals.connect(`views[/project/{${path_pk_key}}/playbook/].filters.beforeInit`, (filters) => {
    for (let filter of Object.values(filters)) {
        if (filter.name == 'pb_filter') {
            filter.hidden = true;
        }
    }
});

export {
    project_connected_models_dict,
    addSignalsForAnsibleModuleAndAnsiblePlaybookModels,
    ProjectVariable_value_from_key,
};
