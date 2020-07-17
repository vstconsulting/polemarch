import { project_connected_models_dict } from './projects.js';
const path_pk_key = spa.utils.path_pk_key;
const guiModels = spa.models.guiModels;
const guiQuerySets = spa.querySet.guiQuerySets;

/**
 * Variable, that stores properties for callbacks of OneTemplateVariable dynamic fields.
 */
const template_vars = {
    key: {},
    value: {},
};

/**
 * Mixin for template sublinks' Model classes.
 * @param Class_name
 */
const template_sublink_model_mixin = (Class_name) =>
    class extends Class_name {
        /**
         * Method - 'save' method callback.
         * @param {object} template_data Template instance data.
         * @param {object} instance_data Instance data.
         * @private
         */
        // eslint-disable-next-line no-unused-vars
        _onSave(template_data, instance_data) {}

        /**
         * Method - 'delete' method callback.
         * @param {object} template_data Template instance data.
         * @private
         */
        // eslint-disable-next-line no-unused-vars
        _onDelete(template_data) {}
    };

/**
 * Mixin for template sublinks' QuerySet classes.
 * @param Class_name
 */
const template_sublink_qs_mixin = (Class_name) =>
    class extends Class_name {
        filterQuery(query = this.query) {
            let filters = {};
            let allowed_filters = ['limit'];
            for (let key of allowed_filters) {
                if (query[key] !== undefined) {
                    filters[key] = query[key];
                }
            }
            return filters;
        }
        /**
         * Redefinition of 'items' method of guiQuerySets.QuerySet class.
         */
        async items() {
            if (this.cache) {
                return Promise.resolve(this.cache);
            }
            const { data } = await this.execute({
                method: 'get',
                path: this.getDataType(),
                query: this.filterQuery(),
            });
            this.template_instance = app.models.OneTemplate.getInstance(data, this.clone());

            let { filtered_instances, api_count } = this._getFilteredInstances(this._formInstances(data));

            this.api_count = api_count;
            this.cache = filtered_instances;
            return filtered_instances;
        }

        async get() {
            if (this.cache) {
                return Promise.resolve(this.cache);
            }

            const templateInstance = await this.getTemplateInstance(true);
            const inst_name = this.url.split('/').last;

            if (!this._instanceExists(templateInstance, inst_name)) {
                throw new spa.api.StatusError(404, 'Instance was not found.');
            }

            const instance = this.model.getInstance(
                this._formInstanceData(templateInstance.data, inst_name),
                this.clone(),
            );

            this.cache = instance;
            return instance;
        }

        // eslint-disable-next-line no-unused-vars
        async update(newDataInstance, instances = undefined, method = undefined) {
            if (instances === undefined) {
                instances = await this.items();
            }

            const templateInstance = await this.getTemplateInstance();

            const updatePromises = instances.map(async (instance) => {
                instance._onSave(templateInstance.data, instance.toInner(instance.data));

                const response = await this.execute({
                    method: 'patch',
                    data: templateInstance.data,
                    path: this.getDataType(),
                    query: this.query,
                });

                return this.model.getInstance(
                    this._formInstanceData(response.data, instance.getPkValue()),
                    this,
                );
            });

            return Promise.all(updatePromises);
        }

        async delete(instances = undefined) {
            if (instances === undefined) {
                instances = await this.items();
            }

            const templateInstance = await this.getTemplateInstance();

            const deletePromises = instances.map(async (instance) => {
                instance._onDelete(templateInstance.data);

                return this.execute({
                    method: 'patch',
                    data: templateInstance.data,
                    path: this.getDataType(),
                    query: this.query,
                });
            });

            return Promise.all(deletePromises);
        }

        async create(data, method) {
            const instance = this.model.getInstance(data, this);
            return (await this.update(instance, [instance], method))[0];
        }

        /**
         * Method, that returns promise, that returns parent template instance.
         * @param {boolean} reload Means, that data should be updated or not.
         */
        async getTemplateInstance(reload = false) {
            if (this.template_instance && !reload) {
                return Promise.resolve(this.template_instance);
            }

            const { data } = await this.execute({
                method: 'get',
                path: this.getDataType(),
                query: this.query,
            });

            this.template_instance = app.models.OneTemplate.getInstance(data, this.clone());
            return this.template_instance;
        }

        /**
         * Method, that filters instances and returns them and their api_count.
         * @param {array} instances Array of instances objects.
         * @private
         */
        _getFilteredInstances(instances) {
            if (instances.length === 0) {
                return { filtered_instances: instances, api_count: 0 };
            }
            let filters = this._getFilterNames();
            let filtered_instances = [...instances];

            for (let filter in this.query) {
                if (!filters.includes(filter)) {
                    continue;
                }

                let filter_value = this.query[filter];

                filtered_instances = filtered_instances.filter((instance) => {
                    if (typeof instance.data[filter] == 'string') {
                        if (instance.data[filter].match(filter_value) != null) {
                            return instance;
                        }
                    } else {
                        if (typeof instance.data[filter] == 'boolean' && typeof filter_value == 'string') {
                            filter_value = stringToBoolean(filter_value); /* globals stringToBoolean */
                        }

                        if (instance.data[filter] == filter_value) {
                            return instance;
                        }
                    }
                });
            }

            let api_count = filtered_instances.length;

            if (this.query.offset) {
                filtered_instances.splice(0, this.query.offset);
            }

            if (this.query.limit) {
                filtered_instances = filtered_instances.splice(0, this.query.limit);
            }

            return { filtered_instances: filtered_instances, api_count: api_count };
        }
        /**
         * Method, that returns Array with names of allowed filters.
         * @returns {array}
         * @private
         */
        _getFilterNames() {
            return ['name'];
        }
    };

/**
 * Function - that forms onchange callback of dynamic field - OneTemplate.fields.group.
 * @param {boolean} required Required field or not.
 */
function OneTemplate_group_callback(required = false) {
    let previous_inventory;

    /**
     * Function - onchange callback of dynamic field - OneTemplate.fields.group.
     * @param {object} parent_values Values of parent fields.
     */
    return function (parent_values = {}) {
        let kind = parent_values.kind;

        if (kind && kind.toLowerCase() == 'task') {
            return {
                format: 'hidden',
                required: false,
            };
        }

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
            return {
                format: 'group_autocomplete',
                required: required,
                save_value: save_value,
                additionalProperties: {
                    list_paths: [
                        '/project/{' + path_pk_key + '}/inventory/{inventory_id}/all_groups/',
                        '/project/{' + path_pk_key + '}/inventory/{inventory_id}/all_hosts/',
                    ],
                    value_field: 'name',
                    view_field: 'name',
                    url_params: { inventory_id: inventory },
                },
            };
        } else {
            return {
                save_value: save_value,
                format: 'autocomplete',
                required: required,
            };
        }
    };
}

/**
 * Function - that forms onchange callback of dynamic field - OneTemplate.fields.module.
 * @param {boolean} required Required field or not.
 */
function OneTemplate_module_callback(required = false) {
    /**
     * Function - onchange callback of dynamic field - OneTemplate.fields.module.
     * @param {object} parent_values Values of parent fields.
     */
    return function (parent_values = {}) {
        let key = 'kind';
        let obj = {
            format: 'hidden',
        };

        if (parent_values[key] && parent_values[key].toLowerCase() == 'module') {
            obj.format = 'module_autocomplete';
            obj.required = required;
            obj.additionalProperties = {
                list_paths: ['/project/{' + path_pk_key + '}/module/'],
                value_field: 'name',
                view_field: 'path',
            };
        }

        return obj;
    };
}

/**
 * Function - onchange callback of dynamic field - OneTemplate.fields.args.
 * @param {object} parent_values Values of parent fields.
 */
function OneTemplate_args_callback(parent_values = {}) {
    let key = 'kind';
    let obj = {
        format: 'hidden',
    };

    if (parent_values[key] && parent_values[key].toLowerCase() == 'module') {
        obj.format = 'string';
    }

    return obj;
}

/**
 * Function - that forms onchange callback of dynamic field - OneTemplate.fields.playbook.
 * @param {boolean} required Required field or not.
 */
function OneTemplate_playbook_callback(required = false) {
    /**
     * Function - onchange callback of dynamic field - OneTemplate.fields.playbook.
     * @param {object} parent_values Values of parent fields.
     */
    return function (parent_values = {}) {
        let key = 'kind';
        let obj = {
            format: 'hidden',
        };

        if (parent_values[key] && parent_values[key].toLowerCase() == 'task') {
            obj.format = 'playbook_autocomplete';
            obj.required = required;
            obj.additionalProperties = {
                list_paths: ['/project/{' + path_pk_key + '}/playbook/'],
                value_field: 'playbook',
                view_field: 'playbook',
            };
        }

        return obj;
    };
}

/**
 * Function - onchange callback of dynamic field - OneTemplateVariable.fields.key.
 * @param {object} parent_values Values of parent fields.
 */
function OneTemplateVariable_key_callback(parent_values = {}) {
    let obj = {
        format: 'choices',
        enum: [],
        save_value: true,
    };

    let p_v = parent_values.kind;

    if (p_v) {
        p_v = p_v.toLowerCase();
    }

    if (p_v == 'module') {
        obj.enum = [...template_vars.key.enum_module];
    } else if (p_v == 'task' || p_v == 'playbook') {
        obj.enum = [...template_vars.key.enum_task];
    }

    return obj;
}

/**
 * Function - onchange callback of dynamic field - OneTemplateVariable.fields.value.
 */
function OneTemplateVariable_value_callback() {
    /**
     * @param {object} parent_values Values of parent fields.
     */
    return function (parent_values = {}) {
        let key = parent_values.key;
        let inventory = parent_values.inventory;

        if (
            key &&
            (key.toLowerCase() == 'group' || key.toLowerCase() == 'limit') &&
            inventory &&
            !isNaN(Number(inventory))
        ) {
            return {
                format: 'group_autocomplete',
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
                save_value: true,
            };
        }
    };
}

/**
 * Function returns array with pk, template_id parameters for OpenApi path.
 * @returns {array}
 */
function getOpenApiPathParameters_template() {
    return [
        {
            name: path_pk_key,
            in: 'path',
            description: 'A unique integer value identifying this project.',
            required: true,
            type: 'integer',
        },
        {
            name: 'template_id',
            in: 'path',
            description: 'A unique integer value identifying instance of this template sublist.',
            required: true,
            type: 'integer',
        },
    ];
}

/**
 * Function returns array with option_id parameter for OpenApi path.
 * @returns {array}
 */
function getOpenApiPathParameters_option() {
    return [
        {
            name: 'option_id',
            in: 'path',
            description: 'A unique string value identifying instance of this option sublist.',
            required: true,
            type: 'string',
        },
    ];
}

/**
 * Function returns array with variables_id parameter for OpenApi path.
 * @returns {array}
 */
function getOpenApiPathParameters_variables() {
    return [
        {
            name: 'variables_id',
            in: 'path',
            required: true,
            type: 'string',
            description: 'A unique string value identifying instance of this variables sublist.',
        },
    ];
}

/**
 * Function returns Query properties for OpenApi PAGE path.
 * @param {string} entity_name Name of entity.
 * @param {string} operation_id Operation_id base string.
 * @param {string} model Model name.
 */
function getOpenApiPagePathQueryTypes(entity_name, operation_id, model) {
    return {
        get: {
            description: 'Return a ' + entity_name + ' of instance.',
            operationId: operation_id + '_get',
            parameters: [],
            tags: ['project'],
            responses: {
                200: {
                    description: 'Action accepted.',
                    schema: { $ref: '#/definitions/' + model },
                },
            },
        },
        put: {
            description: 'Update one or more fields on an existing ' + entity_name + '.',
            operationId: operation_id + '_edit',
            parameters: [
                {
                    in: 'body',
                    name: 'data',
                    required: true,
                    schema: { $ref: '#/definitions/' + model },
                },
            ],
            responses: {
                200: {
                    description: 'Action accepted.',
                    schema: { $ref: '#/definitions/' + model },
                },
            },
        },
        delete: {
            description: 'Remove an existing  ' + entity_name + '.',
            operationId: operation_id + '_remove',
            parameters: [],
            tags: ['project'],
            responses: {
                204: {
                    description: 'Action accepted.',
                },
            },
        },
    };
}

/**
 * Function returns Query properties for OpenApi LIST path.
 * @param {string} entity Name of entity.
 * @param {string} operation_id Operation_id base string.
 * @param {string} m_get Name of model for get query.
 * @param {string} m_post Name of model for post query.
 * @param {array} filters Array with filters for get query.
 */
function getOpenApiListPathQueryTypes(entity, operation_id, m_get, m_post, filters = []) {
    let f_params = [
        {
            name: 'limit',
            in: 'query',
            description: 'Number of results to return per page.',
            required: false,
            type: 'integer',
        },
        {
            name: 'offset',
            in: 'query',
            description: 'The initial index from which to return the results.',
            required: false,
            type: 'integer',
        },
    ].concat(filters);

    return {
        get: {
            description: 'Return all ' + entity + ' of instance.',
            operationId: operation_id + '_list',
            parameters: f_params,
            responses: {
                200: {
                    schema: {
                        results: {
                            items: { $ref: '#/definitions/' + m_get },
                        },
                    },
                },
            },
            tags: ['project'],
        },
        post: {
            description: 'Create a new ' + entity + ' of instance.',
            operationId: operation_id + '_add',
            parameters: [
                {
                    in: 'body',
                    name: 'data',
                    required: true,
                    schema: { $ref: '#/definitions/' + m_post },
                },
            ],
            responses: {
                201: {
                    description: 'Action accepted.',
                    schema: { $ref: '#/definitions/' + m_post },
                },
            },
        },
    };
}

/**
 * Function, that forms enum properties for template variables
 * and for template option variables.
 * @param {object} openapi OpenApi Schema.
 */
function formEnumForVariables(openapi) {
    if (template_vars.key.enum_module && template_vars.key.enum_task && template_vars.value.types) {
        return;
    }

    let ansible_module = openapi.definitions[project_connected_models_dict.module];
    let ansible_playbook = openapi.definitions[project_connected_models_dict.playbook];

    let exclude_keys = ['module', 'playbook', 'inventory'];

    function f_func(key) {
        if (!exclude_keys.includes(key)) {
            return key;
        }
    }

    function formTypes(obj) {
        let types = {};

        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (exclude_keys.includes(key)) {
                    continue;
                }
                types[key] = obj[key].format || obj[key].type;
            }
        }

        return types;
    }

    template_vars.key.enum_module = Object.keys(ansible_module.properties).filter(f_func);
    template_vars.key.enum_task = Object.keys(ansible_playbook.properties).filter(f_func);
    template_vars.value.types = Object.assign(
        formTypes(ansible_module.properties),
        formTypes(ansible_playbook.properties),
    );
}

/**
 * Function returns common fields for OneTemplate
 * and for OneTemplateOption models.
 */
function getTemplateCommonFields(set_required = false) {
    return {
        group: {
            name: 'group',
            title: 'Group',
            format: 'dynamic',
            default: 'all',
            additionalProperties: {
                callback: OneTemplate_group_callback(set_required),
                field: ['inventory', 'kind'],
            },
        },

        module: {
            name: 'module',
            title: 'Module',
            format: 'dynamic',
            minLength: 1,
            additionalProperties: {
                callback: OneTemplate_module_callback(set_required),
                field: 'kind',
            },
        },

        args: {
            name: 'args',
            title: 'Arguments',
            type: 'string',
            format: 'dynamic',
            additionalProperties: {
                callback: OneTemplate_args_callback,
                field: 'kind',
            },
        },

        playbook: {
            name: 'playbook',
            title: 'Playbook',
            type: 'string',
            format: 'dynamic',
            minLength: 1,
            additionalProperties: {
                callback: OneTemplate_playbook_callback(set_required),
                field: 'kind',
            },
        },
    };
}

/**
 * Function returns schema for OneTemplateVariable
 * and for OneTemplateOptionVariable models.
 */
function getOneTemplateVariableSchema() {
    return {
        properties: {
            kind: {
                title: 'Kind',
                type: 'hidden',
                hidden: true,
            },
            inventory: {
                title: 'Inventory',
                type: 'hidden',
                hidden: true,
            },
            key: {
                title: 'Key',
                format: 'dynamic',
                additionalProperties: {
                    field: 'kind',
                    callback: OneTemplateVariable_key_callback,
                },
            },
            value: {
                title: 'Value',
                type: 'String',
                format: 'dynamic',
                additionalProperties: {
                    field: ['inventory', 'key'],
                    types: template_vars.value.types,
                    callback: OneTemplateVariable_value_callback(),
                },
            },
        },
        required: ['key', 'value'],
        type: 'object',
    };
}

/**
 * Function returns part of filters for TemplateVariable
 * and for TemplateOptionVariable models.
 */
function getFiltersForTemplateVariable() {
    return [
        {
            name: 'key',
            in: 'query',
            description: 'A key name string value (or comma separated list) of instance.',
            required: false,
            type: 'string',
        },
        {
            name: 'value',
            in: 'query',
            description: 'A value of instance.',
            required: false,
            type: 'string',
        },
    ];
}

/**
 * Mixin for Vue component of TemplateVariable 'list' View.
 */
const tmp_vars_list_mixin = {
    methods: {
        /**
         * Redefinition of 'removeInstances' method of list view.
         */
        async removeInstances() {
            const selections = this.$store.getters.getSelections(this.qs_url.replace(/^\/|\/$/g, ''));
            let qs = this.getQuerySet(this.view, this.qs_url);

            const template_instance = await qs.getTemplateInstance();

            const selected = [];
            for (let key in selections) {
                if (!selections[key]) continue;
                selected.push(key);
                this._removeInstance(template_instance, key);
            }

            await qs.execute({ method: 'patch', path: qs.getDataType(), data: template_instance.data });

            return this.removeInstances_callback_custom(selected);
        },
        /**
         * Method, that removes template variable.
         * @param {object} template_instance Template instance.
         * @param {string} child_id Variable key.
         * @private
         */
        _removeInstance(template_instance, child_id) {
            delete template_instance.data.data.vars[child_id];
        },
        /**
         * Redefinition of 'removeInstances_callback' method of list view.
         */
        removeInstances_callback_custom(selected) {
            selected.forEach((item) => {
                spa.popUp.guiPopUp.success(
                    spa.popUp.pop_up_msg.instance.success.remove.format([item, this.view.schema.name]),
                );

                let url = this.qs_url.replace(/^\/|\/$/g, '') + '/' + item;

                this.deleteQuerySet(url);

                let ids = {};

                ids[item] = false;

                this.$store.commit('setSelectionValuesByIds', {
                    url: this.qs_url.replace(/^\/|\/$/g, ''),
                    ids: ids,
                });

                let new_qs = this.getQuerySet(this.view, this.qs_url).copy();

                if (!new_qs.cache) {
                    return;
                }

                for (let index = 0; index < new_qs.cache.length; index++) {
                    let list_instance = new_qs.cache[index];

                    if (list_instance.getPkValue() == item) {
                        new_qs.cache.splice(index, 1);

                        this.setQuerySet(this.view, this.qs_url, new_qs);

                        this.getInstancesList(this.view, this.qs_url).then((instances) => {
                            this.setInstancesToData(instances);
                        });
                    }
                }
            });
        },
    },
};

/**
 * Mixin for Vue component of TemplateVariable 'page_new' View.
 */
const tmp_vars_new_mixin = {
    methods: {
        fetchData() {
            this.initLoading();
            let qs = this.setAndGetQuerySetFromSandBox(this.view, this.qs_url);
            qs.getTemplateInstance()
                .then((template_instance) => {
                    this.data.instance = qs.cache = qs.model.getInstance(
                        this._formInstanceData(template_instance),
                        qs,
                    );
                    this.setLoadingSuccessful();
                    this.getParentInstancesForPath();
                })
                .catch((error) => {
                    debugger;
                    throw error;
                });
        },

        _formInstanceData(template_instance) {
            return {
                kind: template_instance.data.kind,
                inventory: template_instance.data.data.inventory,
            };
        },
    },
};

////////////////////////////////////////////////////////////////////////////////////
// Block of extensions for TEMPLATE entity
////////////////////////////////////////////////////////////////////////////////////
/**
 * Model class for OneTemplate model.
 */
guiModels.OneTemplateModel = class OneTemplateModel extends spa.models.Model {
    /**
     * Redefinition of 'toInner' method of guiModels.Model class.
     * @param {object} form_data Data from form with fields.
     */
    toInner(form_data = this.data) {
        let data = {};

        for (let item in form_data) {
            if (this.fields[item]) {
                data[item] = this.fields[item].toInner(form_data);
            }
        }

        if (!data.data) {
            data.data = {};
        }

        let arr_data_fields = [];
        let delete_data_fields = [];

        let common_fields = ['inventory'];
        let module_fields = ['module', 'args', 'group'];
        let playbook_fields = ['playbook'];

        if (data.kind && data.kind.toLowerCase() == 'module') {
            arr_data_fields = module_fields;
            delete_data_fields = playbook_fields;
        } else {
            arr_data_fields = playbook_fields;
            delete_data_fields = module_fields;
        }

        arr_data_fields = arr_data_fields.concat(common_fields);

        // filters fields for this current kind
        arr_data_fields.forEach((value) => {
            if (data[value]) {
                data.data[value] = data[value];
                delete data[value];
            }
        });

        if (!data.data.vars) {
            data.data.vars = {};
        }

        if (!data.options) {
            data.options = {};
        }

        // deletes fields from opposite kind
        delete_data_fields.forEach((value) => {
            if (data[value]) {
                delete data[value];
            }

            if (data.data[value]) {
                delete data.data[value];
            }
        });

        return data;
    }
};

/**
 * QuerySet class for OneTemplate model's QuerySet.
 */
guiQuerySets.OneTemplateQuerySet = class OneTemplateQuerySet extends guiQuerySets.QuerySet {
    /**
     * Method - callback, that handles API response.
     * @param response
     * @private
     */
    _get_responseHandler(response) {
        let data = response.data;
        let fields = this.model.fields;

        for (let key in data.data) {
            if (fields[key]) {
                data[key] = data.data[key];
            }
        }

        return response;
    }

    /**
     * Redefinition of 'get' method of guiQuerySets.QuerySet class.
     */
    async get() {
        if (this.cache) {
            return Promise.resolve(this.cache);
        }

        let response = await this.execute({
            method: 'get',
            path: this.getDataType(),
            query: this.query,
        });

        if (this._get_responseHandler) {
            response = this._get_responseHandler(response);
        }

        let instance = this.model.getInstance(response.data, this);
        let prefetch_fields = this._getPrefetchFields();

        // if prefetch fields exist, loads prefetch data.
        if (prefetch_fields && prefetch_fields.length > 0) {
            await this._loadPrefetchData(prefetch_fields, [instance]);
        }

        this.cache = instance;
        return instance;
    }

    async update(newDataInstance, instances = undefined, method = 'patch') {
        if (instances === undefined) {
            instances = await this.items();
        }

        const updatePromises = instances.map(async (instance) => {
            let response = await this.execute({
                method,
                path: instance.queryset.getDataType(),
                data: newDataInstance,
                query: this.query,
            });

            if (this._get_responseHandler) {
                response = this._get_responseHandler(response);
            }

            return this.model.getInstance(response.data, this);
        });

        return Promise.all(updatePromises);
    }
};

spa.signals.connect('models[Template].fields.beforeInit', function (fields) {
    ['data', 'options'].forEach((item) => {
        fields[item].hidden = true;
    });
    fields.options_list.format = 'string_array';
    fields.options_list.title = 'Options';
});

spa.signals.connect('models[OneTemplate].fields.beforeInit', function (fields) {
    fields.options.hidden = true;
    fields.options_list.hidden = true;
    fields.data.hidden = true;
    fields.data.required = false;

    fields.inventory = {
        name: 'inventory',
        title: 'Inventory',
        enable_button: true,
        format: 'inventory_autocomplete',
        additionalProperties: {
            list_paths: ['/project/{' + path_pk_key + '}/inventory/'],
            value_field: 'id',
            view_field: 'name',
        },
    };

    fields = Object.assign(fields, getTemplateCommonFields(true));
});

spa.signals.connect('models[TemplateExec].fields.beforeInit', function (fields) {
    let option = fields.option;
    option.format = 'fk';
    option.default = {
        id: '',
        text: 'None',
    };
    option.additionalProperties = {
        list_paths: ['/project/{' + path_pk_key + '}/template/{template_id}/option/'],
        value_field: 'name',
        view_field: 'name',
    };
});

/**
 * Adds question before saving of existent template.
 * If type of template was changed, user will see the message about deleting of vars and options,
 * and he also will se a question 'Does he really want to do it?'.
 */
spa.signals.connect('views[/project/{' + path_pk_key + '}/template/{template_id}/edit/].afterInit', (obj) => {
    let mixins = [...obj.view.mixins].reverse();
    let baseSaveInstance = spa.router.mixins.routesComponentsTemplates.page_edit.methods.saveInstance;

    for (let index = 0; index < mixins.length; index++) {
        let item = mixins[index];

        if (item.methods && item.methods.saveInstance) {
            baseSaveInstance = item.methods.saveInstance;

            break;
        }
    }

    obj.view.mixins = obj.view.mixins.concat({
        methods: {
            baseSaveInstance: baseSaveInstance,

            saveInstance() {
                let api_data = this.getQuerySet(this.view, this.qs_url).cache.data;
                let current_data = this.getQuerySetFromSandBox(this.view, this.qs_url).cache.data;

                if (api_data.kind == current_data.kind) {
                    return this.baseSaveInstance();
                }

                let question = `You have changed type of current template -
                all existing template <b> 'variables' </b> and <b>'options' will be deleted</b> during saving. <br>
                Do you really want to do it?`;

                spa.popUp.guiPopUp.question(question, ['Yes', 'No']).then((answer) => {
                    if (answer == 'Yes') {
                        let qs = this.getQuerySetFromSandBox(this.view, this.qs_url);

                        qs.cache.data.data.vars = {};
                        qs.cache.data.options = {};

                        return this.baseSaveInstance();
                    }
                });
            },
        },
    });
});

/**
 * Changes 'kind' filter type to 'choices'.
 */
spa.signals.connect('views[/project/{' + path_pk_key + '}/template/].filters.beforeInit', (filters) => {
    for (let index in filters) {
        if (filters.hasOwnProperty(index)) {
            let filter = filters[index];

            if (filter.name == 'kind') {
                filter.type = 'choices';
                filter.enum = [''].concat(app.models.Template.fields.kind.options.enum);
            }
        }
    }
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of extensions for TEMPLATE entity
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of extensions for TEMPLATE VARIABLE entity
////////////////////////////////////////////////////////////////////////////////////
/**
 * Model class for TemplateVariable model.
 */
guiModels.TemplateVariableModel = class TemplateVariableModel extends template_sublink_model_mixin(
    guiModels.Model,
) {
    /**
     * Redefinition of guiModels.Model class's 'constructor'.
     */
    constructor(name, fields) {
        super(name, fields);

        this.pk_name = 'key';
        this.view_name = 'key';
    }

    /**
     * Redefinition of '_onSave' method of template_sublink_model_mixin.
     */
    _onSave(template_data, instance_data) {
        if (!template_data.data.vars) {
            template_data.data.vars = {};
        }

        template_data.data.vars[instance_data.key] = instance_data.value;
    }

    /**
     * Redefinition of '_onDelete' method of template_sublink_model_mixin.
     */
    _onDelete(template_data) {
        if (template_data && template_data.data && template_data.data.vars) {
            delete template_data.data.vars[this.getPkValue()];
        }
    }
};

/**
 * QuerySet class for TemplateVariable model's QuerySet.
 */
guiQuerySets.TemplateVariableQuerySet = class TemplateVariableQuerySet extends template_sublink_qs_mixin(
    guiQuerySets.QuerySet,
) {
    /**
     * Redefinition of 'getDataType' method of guiQuerySets.QuerySet class.
     */
    getDataType() {
        return this.url
            .replace(/^\/|\/$/g, '')
            .replace(/\/variables([A-z,0-9,_,\/]*)$/, '')
            .split('/');
    }
    /**
     * Method, that forms instances, based on data.
     * @param {object} data Template instance data.
     * @returns {Array}
     * @private
     */
    _formInstances(data) {
        let instances = [];

        if (!(data && data.data && data.data.vars)) {
            return instances;
        }

        for (let item in data.data.vars) {
            if (data.data.vars.hasOwnProperty(item)) {
                instances.push(
                    this.model.getInstance(
                        {
                            kind: data.kind,
                            inventory: data.data.inventory,
                            key: item,
                            value: data.data.vars[item],
                        },
                        this.clone(),
                    ),
                );
            }
        }

        return instances;
    }
    /**
     * Method, that checks existence of instance.
     * @param {object} template_instance Template instance.
     * @param {string} instance_name Name of instance.
     * @returns {boolean}
     * @private
     */
    _instanceExists(template_instance, instance_name) {
        if (
            template_instance.data &&
            template_instance.data.data &&
            template_instance.data.data.vars &&
            template_instance.data.data.vars[instance_name] !== undefined
        ) {
            return true;
        }

        return false;
    }
    /**
     * Method, that returns option data object.
     * @param {object} template_data Data of template instance.
     * @param {string} instance_name Name of instance.
     * @private
     */
    _formInstanceData(template_data, instance_name) {
        return {
            kind: template_data.kind,
            inventory: template_data.data.inventory,
            key: instance_name,
            value: template_data.data.vars[instance_name],
        };
    }
    /**
     * Method, that returns Array with names of allowed filters.
     * @returns {array}
     * @private
     */
    _getFilterNames() {
        return ['key', 'value'];
    }
};

/**
 * Model class for OneTemplateVariable model's QuerySet.
 */
guiModels.OneTemplateVariableModel = class OneTemplateVariableModel extends guiModels.TemplateVariableModel {};

/**
 * QuerySet class for OneTemplateVariable model's QuerySet.
 */
guiQuerySets.OneTemplateVariableQuerySet = class OneTemplateVariableQuerySet extends guiQuerySets.TemplateVariableQuerySet {};

spa.signals.connect('openapi.loaded', (openapi) => {
    formEnumForVariables(openapi);

    let template_variable = getOneTemplateVariableSchema();

    openapi.definitions.TemplateVariable = template_variable;
    openapi.definitions.OneTemplateVariable = template_variable;

    let list_path = '/project/{' + path_pk_key + '}/template/{template_id}/variables/';
    openapi.paths[list_path] = Object.assign(
        {
            parameters: [].concat(getOpenApiPathParameters_template()),
        },
        getOpenApiListPathQueryTypes(
            'variables',
            'project_template_variables',
            'TemplateVariable',
            'OneTemplateVariable',
            getFiltersForTemplateVariable(),
        ),
    );

    let page_path = '/project/{' + path_pk_key + '}/template/{template_id}/variables/{variables_id}/';
    openapi.paths[page_path] = Object.assign(
        {
            parameters: [].concat(getOpenApiPathParameters_template(), getOpenApiPathParameters_variables()),
        },
        getOpenApiPagePathQueryTypes('variables', 'project_template_variables', 'OneTemplateVariable'),
    );
});

spa.signals.connect(
    'views[/project/{' + path_pk_key + '}/template/{template_id}/variables/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat(tmp_vars_list_mixin);
    },
);

spa.signals.connect(
    'views[/project/{' + path_pk_key + '}/template/{template_id}/variables/new/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat(tmp_vars_new_mixin);
    },
);
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of extensions for TEMPLATE VARIABLE entity
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of extensions for TEMPLATE OPTION entity
////////////////////////////////////////////////////////////////////////////////////
/**
 * Model class for TemplateOption model.
 */
guiModels.TemplateOptionModel = class TemplateOptionModel extends template_sublink_model_mixin(
    guiModels.Model,
) {
    /**
     * Redefinition of guiModels.Model class's 'constructor'.
     */
    constructor(name, fields) {
        super(name, fields);

        this.pk_name = 'name';
    }
    /**
     * Redefinition of '_onSave' method of template_sublink_model_mixin.
     */
    _onSave(template_data, instance_data) {
        let exclude_props = ['name', 'inventory', 'kind'];

        exclude_props.forEach((prop) => delete instance_data[prop]);

        if (!template_data.options) {
            template_data.options = {};
        }

        template_data.options[this.getPkValue()] = instance_data;
    }
    /**
     * Redefinition of '_onDelete' method of template_sublink_model_mixin.
     */
    _onDelete(template_data) {
        if (template_data && template_data.options) {
            delete template_data.options[this.getPkValue()];
        }
    }
};

/**
 * QuerySet class for TemplateOption model's QuerySet.
 */
guiQuerySets.TemplateOptionQuerySet = class TemplateOptionQuerySet extends template_sublink_qs_mixin(
    guiQuerySets.QuerySet,
) {
    /**
     * Redefinition of 'getDataType' method of guiQuerySets.QuerySet class.
     */
    getDataType() {
        return this.url
            .replace(/^\/|\/$/g, '')
            .replace(/\/option([A-z,0-9,_,\/]*)$/, '')
            .split('/');
    }
    /**
     * Method, that forms instances, based on data.
     * @param {object} data Template instance data.
     * @returns {Array}
     * @private
     */
    _formInstances(data) {
        let instances = [];

        if (!(data && data.options)) {
            return instances;
        }

        for (let item in data.options) {
            if (data.options.hasOwnProperty(item)) {
                instances.push(this.model.getInstance({ name: item }, this.clone()));
            }
        }

        return instances;
    }
    /**
     * Method, that checks existence of instance.
     * @param {object} template_instance Template instance.
     * @param {string} instance_name Name of instance.
     * @returns {boolean}
     * @private
     */
    _instanceExists(template_instance, instance_name) {
        if (
            template_instance.data &&
            template_instance.data.options &&
            template_instance.data.options[instance_name] !== undefined
        ) {
            return true;
        }

        return false;
    }
    /**
     * Method, that returns Array with names of allowed filters.
     * @returns {array}
     * @private
     */
    _getFilterNames() {
        return ['name'];
    }
    /**
     * Method, that returns option data object.
     * @param {object} template_data Data of template instance.
     * @param {string} option_name Name of option.
     * @private
     */
    _formInstanceData(template_data, option_name) {
        let tmp = {};
        let option_data = {};

        tmp.kind = template_data.kind;
        tmp.inventory = template_data.data.inventory;

        if (template_data.options && template_data.options[option_name]) {
            option_data = template_data.options[option_name];
        }

        return $.extend(true, {}, option_data, tmp, { name: option_name });
    }
};

/**
 * Model class for OneTemplateOption model's QuerySet.
 */
guiModels.OneTemplateOptionModel = class OneTemplateOptionModel extends guiModels.TemplateOptionModel {};

/**
 * QuerySet class for OneTemplateOption model's QuerySet.
 */
guiQuerySets.OneTemplateOptionQuerySet = class OneTemplateOptionQuerySet extends guiQuerySets.TemplateOptionQuerySet {};

spa.signals.connect('openapi.loaded', (openapi) => {
    let template_option = {
        properties: {
            name: {
                title: 'Name',
                type: 'string',
            },
        },
        required: ['name'],
        type: 'object',
    };

    let props = Object.assign(
        {
            name: {
                title: 'Name',
                type: 'string',
                format: 'string_id',
                required: true,
            },
            inventory: {
                title: 'Inventory',
                format: 'hidden',
            },
            kind: {
                title: 'Kind',
                type: 'hidden',
            },
        },
        getTemplateCommonFields(),
    );

    let one_template_option = {
        properties: props,
        required: ['name'],
        type: 'object',
    };

    openapi.definitions.TemplateOption = template_option;
    openapi.definitions.OneTemplateOption = one_template_option;

    let list_path = '/project/{' + path_pk_key + '}/template/{template_id}/option/';
    openapi.paths[list_path] = Object.assign(
        {
            parameters: [].concat(getOpenApiPathParameters_template()),
        },
        getOpenApiListPathQueryTypes(
            'option',
            'project_template_option',
            'TemplateOption',
            'OneTemplateOption',
            [
                {
                    name: 'name',
                    in: 'query',
                    description: 'A name string value (or comma separated list) of instance.',
                    required: false,
                    type: 'string',
                },
            ],
        ),
    );

    let page_path = '/project/{' + path_pk_key + '}/template/{template_id}/option/{option_id}/';
    openapi.paths[page_path] = Object.assign(
        {
            parameters: [].concat(getOpenApiPathParameters_template(), getOpenApiPathParameters_option()),
        },
        getOpenApiPagePathQueryTypes('option', 'project_template_option', 'OneTemplateOption'),
    );
});

spa.signals.connect(
    'views[/project/{' + path_pk_key + '}/template/{template_id}/option/new/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat(tmp_vars_new_mixin, {
            methods: {
                _formInstanceData(template_instance) {
                    return {
                        kind: template_instance.data.kind,
                        inventory: template_instance.data.data.inventory,
                    };
                },
            },
        });
    },
);

spa.signals.connect(
    'views[/project/{' + path_pk_key + '}/template/{template_id}/option/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat({
            mixins: [tmp_vars_list_mixin],
            methods: {
                /**
                 * Method, that removes template option.
                 * @param {object} template_instance Template instance.
                 * @param {string} child_id Option name.
                 * @private
                 */
                _removeInstance(template_instance, child_id) {
                    delete template_instance.data.options[child_id];
                },
            },
        });
    },
);
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of extensions for TEMPLATE OPTION entity
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of extensions for TEMPLATE OPTION VARIABLE entity
////////////////////////////////////////////////////////////////////////////////////
/**
 * Model class for TemplateOptionVariable model.
 */
guiModels.TemplateOptionVariableModel = class TemplateOptionVariableModel extends template_sublink_model_mixin(
    guiModels.Model,
) {
    /**
     * Redefinition of guiModels.Model class's 'constructor'.
     */
    constructor(name, fields) {
        super(name, fields);

        this.pk_name = 'key';
        this.view_name = 'key';
    }
    /**
     * Redefinition of '_onSave' method of template_sublink_model_mixin.
     */
    _onSave(template_data, instance_data) {
        let option = this.queryset.getOptionName();

        if (!template_data.options[option].vars) {
            template_data.options[option].vars = {};
        }

        template_data.options[option].vars[instance_data.key] = instance_data.value;
    }
    /**
     * Redefinition of '_onDelete' method of template_sublink_model_mixin.
     */
    _onDelete(template_data) {
        let option = this.queryset.getOptionName();

        if (
            template_data &&
            template_data.options &&
            template_data.options[option] &&
            template_data.options[option].vars
        ) {
            delete template_data.options[option].vars[this.getPkValue()];
        }
    }
};

/**
 * QuerySet class for TemplateOptionVariable model's QuerySet.
 */
guiQuerySets.TemplateOptionVariableQuerySet = class TemplateOptionVariableQuerySet extends template_sublink_qs_mixin(
    guiQuerySets.QuerySet,
) {
    /**
     * Redefinition of 'getDataType' method of guiQuerySets.QuerySet class.
     */
    getDataType() {
        return this.url
            .replace(/^\/|\/$/g, '')
            .replace(/\/option([A-z,0-9,_,\/]+)\/variables([A-z,0-9,_,\/]*)$/, '')
            .split('/');
    }
    getOptionName() {
        try {
            return this.url.split('/option')[1].split('/')[1];
        } catch (e) {
            debugger;
            throw new spa.api.StatusError(404, 'Instance was not found');
        }
    }
    /**
     * Method, that forms instances, based on data.
     * @param {object} data Template instance data.
     * @returns {Array}
     * @private
     */
    _formInstances(data) {
        let instances = [];
        let option_name = this.getOptionName();

        if (!(data && data.options && data.options[option_name] && data.options[option_name].vars)) {
            return instances;
        }

        for (let item in data.options[option_name].vars) {
            if (data.options[option_name].vars.hasOwnProperty(item)) {
                instances.push(
                    this.model.getInstance(
                        {
                            kind: data.kind,
                            inventory: data.data.inventory,
                            key: item,
                            value: data.options[option_name].vars[item],
                        },
                        this.clone(),
                    ),
                );
            }
        }

        return instances;
    }
    /**
     * Method, that checks existence of instance.
     * @param {object} template_instance Template instance.
     * @param {string} instance_name Name of instance.
     * @returns {boolean}
     * @private
     */
    _instanceExists(template_instance, instance_name) {
        let option = this.getOptionName();

        if (
            template_instance.data &&
            template_instance.data.options &&
            template_instance.data.options[option] &&
            template_instance.data.options[option].vars &&
            template_instance.data.options[option].vars[instance_name] !== undefined
        ) {
            return true;
        }

        return false;
    }
    /**
     * Method, that returns option data object.
     * @param {object} template_data Data of template instance.
     * @param {string} instance_name Name of instance.
     * @private
     */
    _formInstanceData(template_data, instance_name) {
        let option_name = this.getOptionName();

        return {
            kind: template_data.kind,
            inventory: template_data.data.inventory,
            key: instance_name,
            value: template_data.options[option_name].vars[instance_name],
        };
    }
    /**
     * Method, that returns Array with names of allowed filters.
     * @returns {array}
     * @private
     */
    _getFilterNames() {
        return ['key', 'value'];
    }
};

/**
 * Model class for OneTemplateOptionVariable model's QuerySet.
 */
guiModels.OneTemplateOptionVariableModel = class OneTemplateOptionVariableModel extends guiModels.TemplateOptionVariableModel {};

/**
 * QuerySet class for OneTemplateOptionVariable model's QuerySet.
 */
guiQuerySets.OneTemplateOptionVariableQuerySet = class OneTemplateOptionVariableQuerySet extends guiQuerySets.TemplateOptionVariableQuerySet {};

spa.signals.connect('openapi.loaded', (openapi) => {
    formEnumForVariables(openapi);

    let template_option_variable = getOneTemplateVariableSchema();

    openapi.definitions.TemplateOptionVariable = template_option_variable;
    openapi.definitions.OneTemplateOptionVariable = template_option_variable;

    let list_path = '/project/{' + path_pk_key + '}/template/{template_id}/option/{option_id}/variables/';
    openapi.paths[list_path] = Object.assign(
        {
            parameters: [].concat(getOpenApiPathParameters_template(), getOpenApiPathParameters_option()),
        },
        getOpenApiListPathQueryTypes(
            'variables',
            'project_template_option_variables',
            'TemplateOptionVariable',
            'OneTemplateOptionVariable',
            getFiltersForTemplateVariable(),
        ),
    );

    let page_path =
        '/project/{' + path_pk_key + '}/template/{template_id}/option/{option_id}/variables/{variables_id}/';
    openapi.paths[page_path] = Object.assign(
        {
            parameters: [].concat(
                getOpenApiPathParameters_template(),
                getOpenApiPathParameters_option(),
                getOpenApiPathParameters_variables(),
            ),
        },
        getOpenApiPagePathQueryTypes(
            'variables',
            'project_template_option_variables',
            'OneTemplateOptionVariable',
        ),
    );
});

spa.signals.connect(
    'views[/project/{' +
        path_pk_key +
        '}/template/{template_id}/option/{option_id}/variables/new/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat(tmp_vars_new_mixin);
    },
);

spa.signals.connect(
    'views[/project/{' + path_pk_key + '}/template/{template_id}/option/{option_id}/variables/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat({
            mixins: [tmp_vars_list_mixin],
            methods: {
                /**
                 * Method, that removes template option.
                 * @param {object} template_instance Template instance.
                 * @param {string} child_id Option name.
                 * @private
                 */
                _removeInstance(template_instance, child_id) {
                    let option = this.getQuerySet(this.view, this.qs_url).getOptionName();

                    delete template_instance.data.options[option].vars[child_id];
                },
            },
        });
    },
);
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of extensions for TEMPLATE OPTION VARIABLE entity
////////////////////////////////////////////////////////////////////////////////////

export { OneTemplateVariable_key_callback, OneTemplateVariable_value_callback, template_vars };
