import {
    OneTemplateVariable_key_callback,
    OneTemplateVariable_value_callback,
    template_vars,
} from './templates.js';
const path_pk_key = spa.utils.path_pk_key;

/**
 * Function - onchange callback of dynamic field -  OnePeriodictask.fields.inventory.
 * @param {object} parent_values Values of parent fields.
 */
function OnePeriodictask_inventory_callback(parent_values = {}) {
    let kind = parent_values.kind;

    if (kind && (kind.toLowerCase() == 'playbook' || kind.toLowerCase() == 'module')) {
        return {
            format: 'inventory_autocomplete',
            additionalProperties: {
                view_field: 'name',
                value_field: 'id',
                list_paths: ['/project/{' + path_pk_key + '}/inventory/'],
            },
            save_value: true,
        };
    }
}

/**
 * Function - onchange callback of dynamic field -  OnePeriodictask.fields.mode.
 * @param {object} parent_values Values of parent fields.
 */
function OnePeriodictask_mode_callback(parent_values = {}) {
    let kind = parent_values.kind;

    if (kind) {
        kind = kind.toLowerCase();
    }

    if (kind == 'playbook') {
        return {
            format: 'playbook_autocomplete',
            additionalProperties: {
                view_field: 'playbook',
                value_field: 'playbook',
                list_paths: ['/project/{' + path_pk_key + '}/playbook/'],
            },
            required: true,
        };
    } else if (kind == 'module') {
        return {
            format: 'module_autocomplete',
            additionalProperties: {
                // there is no 'name' filters
                view_field: 'path',
                value_field: 'name',
                list_paths: ['/project/{' + path_pk_key + '}/module/'],
            },
            required: true,
        };
    }
}

/**
 * Function - onchange callback of dynamic field -  OnePeriodictask.fields.template.
 * @param {object} parent_values Values of parent fields.
 */
function OnePeriodictask_template_callback(parent_values = {}) {
    let kind = parent_values.kind;

    if (kind) {
        kind = kind.toLowerCase();
    }

    if (kind == 'template') {
        return {
            format: 'fk',
            additionalProperties: {
                view_field: 'name',
                value_field: 'id',
                list_paths: ['/project/{' + path_pk_key + '}/template/'],
            },
            required: true,
        };
    }

    return {
        format: 'hidden',
    };
}

/**
 * Function - that forms onchange callback of dynamic field - OnePeriodictask.fields.template_opt.
 */
function OnePeriodictask_template_opt_callback() {
    /**
     * Variable, that saves previous values of template field.
     * This is needed to know: should we save template_field value or not.
     */
    let previous_template;

    /**
     * Function - onchange callback of dynamic field - OnePeriodictask.fields.template_opt.
     * @param {object} parent_values Values of parent fields.
     */
    return function (parent_values) {
        let kind = parent_values.kind;

        if (kind && kind.toLowerCase() !== 'template') {
            return {
                format: 'hidden',
            };
        }

        let template = parent_values.template;

        if (template && typeof template == 'object' && template.value !== undefined) {
            template = template.value;
        }

        let save_value = false;

        if (previous_template === undefined || previous_template == template) {
            save_value = true;
        }

        previous_template = template;

        if (template) {
            return {
                format: 'fk',
                default: {
                    id: '',
                    text: 'None',
                },
                additionalProperties: {
                    view_field: 'name',
                    value_field: 'name',
                    list_paths: ['/project/{' + path_pk_key + '}/template/{template_id}/option/'],
                    url_params: { template_id: template },
                },
                save_value: save_value,
            };
        } else {
            return {
                format: 'hidden',
            };
        }
    };
}
////////////////////////////////////////////////////////////////////////////////////
// Block of extensions for PERIODIC TASK entity
////////////////////////////////////////////////////////////////////////////////////
['Periodictask', 'OnePeriodictask'].forEach((model) => {
    let str = 'models[{0}].fields.beforeInit'.format([model]);
    spa.signals.connect(str, (fields) => {
        if (model == 'Periodictask') {
            ['mode', 'inventory', 'template', 'template_opt'].forEach((field) => {
                fields[field].hidden = true;
            });
        }

        fields.inventory.format = 'dynamic';
        fields.inventory.additionalProperties.callback = OnePeriodictask_inventory_callback;

        fields.mode.additionalProperties.callback = OnePeriodictask_mode_callback;

        fields.template.format = 'dynamic';
        fields.template.additionalProperties = {
            field: 'kind',
            callback: OnePeriodictask_template_callback,
        };

        fields.template_opt.additionalProperties.field = ['template'];
        fields.template_opt.additionalProperties.types.TEMPLATE = 'fk';
        fields.template_opt.additionalProperties.callback = OnePeriodictask_template_opt_callback();

        fields.schedule.additionalProperties.types.INTERVAL = 'uptime';
    });
});

/**
 * Changes 'kind' filter type to 'choices'.
 */
spa.signals.connect('views[/project/{' + path_pk_key + '}/periodic_task/].filters.beforeInit', (filters) => {
    for (let key in filters) {
        if (filters.hasOwnProperty(key)) {
            let filter = filters[key];

            if (filter.name == 'kind') {
                filter.type = 'choices';
                filter.enum = [''].concat(app.models.Periodictask.fields.kind.options.enum);
            }
        }
    }
});

/**
 * Hides 'variables' button from periodic_task views, where data.kind == 'TEMPLATE'.
 */
spa.signals.connect('allViews.inited', (obj) => {
    let views = obj.views;

    [
        '/project/{' + path_pk_key + '}/periodic_task/',
        '/project/{' + path_pk_key + '}/periodic_task/{periodic_task_id}/',
    ].forEach((path) => {
        views[path].getViewSublinkButtons = function (type, buttons, instance) {
            /* jshint unused: false */
            let data = instance.data;
            let btns = $.extend(true, {}, buttons);

            if (!data) {
                return btns;
            }

            if (data.kind == 'TEMPLATE' && btns.variables) {
                btns.variables.hidden = true;
            }

            return btns;
        };
    });
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of extensions for PERIODIC TASK entity
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of extensions for PERIODIC TASK VARIABLE entity
////////////////////////////////////////////////////////////////////////////////////
/**
 * Model class for OnePeriodicTaskVariable model.
 */
spa.models.guiModels.OnePeriodicTaskVariableModel = class OnePeriodicTaskVariableModel extends spa.models
    .Model {
    /**
     * Redefinition of guiModels.Model class's 'constructor'.
     */
    constructor(name, fields) {
        super(name, fields);

        this.view_name = 'key';
    }
};

/**
 * QuerySet class for OnePeriodicTaskVariable model's QuerySet.
 */
spa.querySet.guiQuerySets.OnePeriodicTaskVariableQuerySet = class OnePeriodicTaskVariableQuerySet extends spa
    .querySet.QuerySet {
    /**
     * Method, that returns data_type for parent instance bulk requests.
     */
    getParentInstanceDataType() {
        return this.url
            .replace(/^\/|\/$/g, '')
            .replace(/\/variables([A-z,0-9,_,\/]*)$/, '')
            .split('/');
    }
    /**
     * Method, that returns promise, that returns parent instance.
     */
    async getParentInstance() {
        if (this.parent_instance) {
            return Promise.resolve(this.parent_instance);
        }

        const response = await this.execute({ method: 'get', path: this.getParentInstanceDataType() });

        this.parent_instance = app.models.OnePeriodictask.getInstance(
            response.data,
            this.clone({ url: this.url.replace(/\/variables([A-z,0-9,_,\/]*)$/, '') }),
        );
        return this.parent_instance;
    }
    /**
     * Redefinition of 'get' method of guiQuerySets.QuerySet class.
     */
    async get() {
        if (this.cache) {
            return Promise.resolve(this.cache);
        }

        const parent_instance = await this.getParentInstance();

        const response = await this.execute({ method: 'get', path: this.getDataType(), query: this.query });

        let instance = this.model.getInstance(
            this._formInstanceData(parent_instance.data, response.data),
            this,
        );

        this.cache = instance;
        return instance;
    }

    async update(newDataInstance, instances = undefined, method = 'patch') {
        if (instances === undefined) {
            instances = await this.items();
        }
        const parentInstance = await this.getParentInstance();

        const updatePromises = instances.map(async (instance) => {
            let instanceData = instance.toInner(instance.data);
            delete instanceData.kind;
            if (instanceData.inventory) delete instanceData.inventory;

            const response = await this.execute({
                method,
                path: instance.queryset.getDataType(),
                query: instance.queryset.query,
                data: instanceData,
            });

            return this.model.getInstance(this._formInstanceData(parentInstance.data, response.data), this);
        });

        return Promise.all(updatePromises);
    }

    /**
     * Method, that returns periodic task variable data object.
     * @param {object} parent_data Data of periodic task instance.
     * @param {string} instance_data Data of periodic task variable instance.
     * @private
     */
    _formInstanceData(parent_data, instance_data) {
        return Object.assign({}, instance_data, { kind: parent_data.kind, inventory: parent_data.inventory });
    }
};

spa.signals.connect('openapi.loaded', (openapi) => {
    let copy = $.extend(true, {}, openapi.definitions.PeriodicTaskVariable);

    openapi.definitions.OnePeriodicTaskVariable = copy;

    let list = openapi.paths['/project/{' + path_pk_key + '}/periodic_task/{periodic_task_id}/variables/'];
    list.post.parameters[0].schema.$ref = '#/definitions/OnePeriodicTaskVariable';
    list.post.responses[201].schema.$ref = '#/definitions/OnePeriodicTaskVariable';

    let page =
        openapi.paths[
            '/project/{' + path_pk_key + '}/periodic_task/{periodic_task_id}/variables/{variables_id}/'
        ];
    page.get.responses[200].schema.$ref = '#/definitions/OnePeriodicTaskVariable';
    page.patch.responses[200].schema.$ref = '#/definitions/OnePeriodicTaskVariable';
    page.put.responses[200].schema.$ref = '#/definitions/OnePeriodicTaskVariable';
    page.patch.parameters[0].schema.$ref = '#/definitions/OnePeriodicTaskVariable';
    page.put.parameters[0].schema.$ref = '#/definitions/OnePeriodicTaskVariable';
});

spa.signals.connect('models[OnePeriodicTaskVariable].fields.beforeInit', function (fields) {
    fields.kind = {
        title: 'Kind',
        type: 'hidden',
        hidden: true,
    };

    fields.inventory = {
        title: 'Inventory',
        type: 'hidden',
        hidden: true,
    };

    fields.key.format = 'dynamic';
    fields.key.additionalProperties = {
        field: ['kind'],
        callback: OneTemplateVariable_key_callback,
    };

    fields.value.format = 'dynamic';
    fields.value.additionalProperties = {
        field: ['inventory', 'key'],
        types: template_vars.value.types,
        callback: OneTemplateVariable_value_callback(),
    };
});

spa.signals.connect(
    'views[/project/{' + path_pk_key + '}/periodic_task/{periodic_task_id}/variables/new/].afterInit',
    (obj) => {
        obj.view.mixins = obj.view.mixins.concat({
            methods: {
                fetchData() {
                    this.initLoading();
                    let qs = this.setAndGetQuerySetFromSandBox(this.view, this.qs_url);
                    qs.getParentInstance()
                        .then((parent_instance) => {
                            this.data.instance = qs.cache = qs.model.getInstance(
                                this._formInstanceData(parent_instance),
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

                _formInstanceData(parent_instance) {
                    return {
                        kind: parent_instance.data.kind,
                        inventory: parent_instance.data.inventory,
                    };
                },
            },
        });
    },
);
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of extensions for PERIODIC TASK VARIABLE entity
////////////////////////////////////////////////////////////////////////////////////

export { OnePeriodictask_template_opt_callback };
