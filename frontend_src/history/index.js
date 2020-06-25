import HistoryView from './HistoryView.vue';
const path_pk_key = spa.utils.path_pk_key;

/**
 * Variable, that stores array with History Models names,
 * fields of those should be changed in the tabSignal.
 */
const history_models = ['History', 'OneHistory', 'ProjectHistory'];

/**
 * Variable, that stores pairs (key, value), where:
 * - key - value of initiator_type field;
 * - value - path from which should be loaded prefetch data.
 */
const history_initiator_types = {
    project: '/project/',
    template: '/project/{' + path_pk_key + '}/template/',
    scheduler: '/project/{' + path_pk_key + '}/periodic_task/',
};

/**
 * Variable, that stores array with History paths,
 * options of those should be changed in the tabSignal.
 */
const history_paths = [
    '/history/',
    '/history/{' + path_pk_key + '}/',
    '/project/{' + path_pk_key + '}/history/',
    '/project/{' + path_pk_key + '}/history/{history_id}/',
];

/**
 * Variable, that stores object with additional properties for history_mode field's options.
 */
const history_mode_additionalProperties = {
    list_paths: ['/project/{' + path_pk_key + '}/playbook/', '/project/{' + path_pk_key + '}/module/'],
    value_field: 'id',
};

/**
 * Function, that adds signal for some history model's fields.
 * @param {string} model
 */
function historyModelsFieldsHandler(model) {
    let str = 'models[{0}].fields.beforeInit'.format([model]);
    spa.signals.connect(str, (fields) => {
        fields.start_time.format = 'one_history_date_time';
        fields.stop_time.format = 'one_history_date_time';

        if (fields.inventory) {
            fields.inventory.format = 'fk';
            fields.inventory.additionalProperties = {
                model: { $ref: '#/definitions/Inventory' },
                value_field: 'id',
                view_field: 'name',
            };
        }

        if (fields.executor) {
            fields.executor.format = 'history_executor';
            fields.executor.additionalProperties = {
                model: { $ref: '#/definitions/User' },
                value_field: 'id',
                view_field: 'username',
            };
        }

        ['options', 'initiator_type', 'kind', 'project'].forEach((field) => {
            if (fields[field]) {
                fields[field].hidden = true;
            }
        });

        if (fields.initiator) {
            fields.initiator.format = 'history_initiator';
            fields.initiator.additionalProperties = {
                list_paths: Object.values(history_initiator_types),
                view_field: 'name',
                value_field: 'id',
            };
        }

        if (fields.revision) {
            fields.revision.format = 'one_history_revision';
        }

        if (fields.mode) {
            fields.mode.format = 'history_mode';
            fields.mode.additionalProperties = { ...history_mode_additionalProperties };
        }
    });
}

/**
 * Function - onchange callback of dynamic field - OneHistory.fields.mode.
 */
function OneHistory_kind_mode_callback(parent_values = {}) {
    let obj = {
        save_value: true,
        format: 'one_history_mode',
        additionalProperties: { ...history_mode_additionalProperties },
    };

    if (parent_values.kind) {
        obj.title = parent_values.kind.toLowerCase();
    }

    return obj;
}

/**
 * Function, that adds signal for some OneHistory model's fields.
 * @param {string} model
 */
function OneHistoryFieldsHandler(model) {
    spa.signals.connect('models[' + model + '].fields.beforeInit', (fields) => {
        for (let field in fields) {
            if (fields.hasOwnProperty(field)) {
                fields[field].format = 'one_history_string';

                if (['kind', 'raw_args', 'raw_stdout', 'initiator_type'].includes(field)) {
                    fields[field].format = 'hidden';
                } else if (['start_time', 'stop_time'].includes(field)) {
                    fields[field].format = 'one_history_date_time';
                }
            }
        }

        fields.executor.format = 'one_history_executor';
        fields.initiator.format = 'one_history_initiator';
        fields.inventory.format = 'one_history_fk';
        fields.inventory.hidden = true;
        fields.execute_args.format = 'one_history_execute_args';
        fields.execution_time.format = 'one_history_uptime';
        fields.revision.format = 'one_history_revision';
        fields.status.format = 'one_history_choices';

        fields.raw_inventory.format = 'one_history_raw_inventory';
        fields.raw_inventory.hidden = true;

        fields.mode.format = 'dynamic';
        fields.mode.additionalProperties = {
            callback: OneHistory_kind_mode_callback,
            field: ['kind'],
        };
    });
}

/**
 * Function, that adds signal for some history view's filters.
 * @param {string} path
 */
function historyPathsFiltersHandler(path) {
    /**
     * Changes 'status' filter type to 'choices'.
     */
    spa.signals.connect('views[' + path + '].filters.beforeInit', (filters) => {
        for (let key in filters) {
            if (filters.hasOwnProperty(key)) {
                let filter = filters[key];

                if (filter.name == 'status') {
                    filter.type = 'choices';
                    filter.enum = app.models.History.fields.status.options.enum;
                }
            }
        }
    });
}

/**
 * Function, that adds signal for some history view modification.
 * @param {string} path
 */
function historyPathsViewsHandler(path) {
    spa.signals.connect('views[' + path + '].afterInit', (obj) => {
        if (obj.view.schema.type == 'page') {
            obj.view.mixins = obj.view.mixins.concat(HistoryView);
        }
    });

    spa.signals.connect('views[' + path + '].created', (obj) => {
        if (obj.view.schema.type == 'list' && obj.view.schema.operations && obj.view.schema.operations.add) {
            delete obj.view.schema.operations.add;
        }
    });
}

/**
 * Function, that adds signals for history models and history views.
 */
function addHistorySignals() {
    history_models.forEach(historyModelsFieldsHandler);

    history_paths.forEach(historyPathsViewsHandler);

    history_paths.forEach(historyPathsFiltersHandler);

    OneHistoryFieldsHandler('OneHistory');
}
// adds signal for history models and views.
addHistorySignals();

spa.signals.connect('allViews.inited', (obj) => {
    let views = obj.views;

    history_paths.forEach((path) => {
        views[path].getViewSublinkButtons = function (type, buttons, instance) {
            let data = instance.data;
            let btns = $.extend(true, {}, buttons);

            if (!data) {
                return btns;
            }

            if (type == 'actions' || type == 'child_links') {
                if (!['RUN', 'DELAY'].includes(data.status)) {
                    btns.cancel.hidden = true;
                }

                if (!(data.status == 'OK' && data.kind == 'MODULE' && data.mode == 'setup')) {
                    btns.facts.hidden = true;
                }

                btns.clear.hidden = true;
            }

            return btns;
        };
    });
});

export { history_initiator_types, HistoryView, history_models, history_paths, addHistorySignals };
