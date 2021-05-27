/* eslint-disable vue/one-component-per-file */
import './style.scss';
import OutputLines from './OutputLines.vue';

const HISTORY_MODELS = ['History', 'OneHistory', 'ProjectHistory'];
const HISTORY_LIST_PATHS = ['/history/', '/project/{id}/history/'];
const HISTORY_DETAIL_PATHS = ['/history/{id}/', '/project/{id}/history/{history_id}/'];

class InventoryField extends spa.fields.fk.fk.FKField {
    constructor(options) {
        options.additionalProperties = {
            model: { $ref: '#/definitions/Inventory' },
            value_field: 'id',
            view_field: 'name',
            makeLink: true,
            usePrefetch: true,
        };
        super(options);
    }
}
InventoryField.format = 'inventory';
spa.fields.globalFields.set(InventoryField.format, InventoryField);

const executorSchedulerField = new spa.fields.staticValue.StaticValueField({
    name: 'executor',
    format: 'static_value',
    additionalProperties: {
        staticValue: 'system',
        realField: 'string',
    },
});
const executorUserField = new spa.fields.fk.fk.FKField({
    name: 'executor',
    format: 'fk',
    additionalProperties: {
        model: { $ref: '#/definitions/User' },
        value_field: 'id',
        view_field: 'username',
        makeLink: true,
        usePrefetch: true,
    },
});

class ProjectBasedFkField extends spa.fields.fk.fk.FKField {
    _formatQuerysetPath(queryset) {
        return super
            ._formatQuerysetPath(queryset)
            .clone({ url: queryset.url.replace('{id}', this.props.projectId) });
    }
}
ProjectBasedFkField.format = 'project-fk';
spa.fields.globalFields.set(ProjectBasedFkField.format, ProjectBasedFkField);

const modePlaybookField = (projectId) => ({
    name: 'mode',
    format: ProjectBasedFkField.format,
    additionalProperties: {
        list_paths: ['/project/{id}/playbook/'],
        value_field: 'id',
        view_field: 'playbook',
        makeLink: true,
        usePrefetch: true,
        filter_field_name: 'pb_filter',
        projectId,
    },
});

const modeModuleField = (projectId) => ({
    name: 'mode',
    format: ProjectBasedFkField.format,
    additionalProperties: {
        list_paths: ['/project/{id}/module/'],
        value_field: 'id',
        view_field: 'name',
        filter_field_name: 'name',
        makeLink: true,
        usePrefetch: true,
        projectId,
    },
});

for (const modelName of HISTORY_MODELS) {
    spa.signals.once(`models[${modelName}].fields.beforeInit`, (fields) => {
        fields.executor.format = 'dynamic';
        fields.executor.additionalProperties = {
            types: {
                project: executorUserField,
                template: executorUserField,
                scheduler: executorSchedulerField,
            },
            field: 'initiator_type',
        };

        fields.inventory.format = InventoryField.format;

        fields.mode.format = 'dynamic';
        fields.mode.additionalProperties = {
            callback: ({ kind, project = app.application.$route.params.id }) => {
                if (kind === 'PLAYBOOK') {
                    return modePlaybookField(project);
                } else if (kind === 'MODULE') {
                    return modeModuleField(project);
                }
            },
            field: ['kind', 'project'],
        };

        for (const field of ['options', 'initiator_type', 'kind', 'project']) {
            if (fields[field]) fields[field].hidden = true;
        }
    });
}

spa.signals.once('models[OneHistory].fields.beforeInit', (fields) => {
    fields.execute_args.format = 'json';

    for (const field of ['raw_args', 'raw_stdout', 'inventory', 'raw_inventory']) {
        fields[field].hidden = true;
    }
});

spa.signals.once('allModels.created', ({ models }) => {
    const OneHistory = models.get('OneHistory');
    for (const field of ['kind', 'raw_args', 'raw_stdout', 'initiator_type']) {
        OneHistory.fields.get(field).hidden = true;
    }
});

/**
 * @vue/component
 */
const HistoryDetailView = {
    computed: {
        title() {
            return 'History';
        },
        afterFieldsGroupsComponent() {
            return OutputLines;
        },
    },
};

/**
 * @vue/component
 */
const HideDetailOperationsMixin = {
    computed: {
        sublinks() {
            return Array.from(this.view.sublinks.values()).filter((sublink) => {
                if (sublink.name === 'facts') {
                    return (
                        this.data.status === 'OK' && this.data.kind === 'MODULE' && this.data.mode === 'setup'
                    );
                }
                return true;
            });
        },
        actions() {
            return Array.from(this.view.actions.values()).filter((action) => {
                switch (action.name) {
                    case 'cancel':
                        return this.data.status === 'RUN' || this.data.status === 'DELAY';
                    case 'clear':
                        return false;
                }
                return true;
            });
        },
    },
};

/**
 * @vue/component
 */
const HideListOperationsMixin = {
    computed: {
        instanceSublinks() {
            return spa.components.list.ListViewComponent.computed.instanceSublinks
                .call(this)
                .filter((sublink) => sublink.name !== 'facts');
        },
        instanceActions() {
            return spa.components.list.ListViewComponent.computed.instanceActions
                .call(this)
                .filter((action) => action.name !== 'cancel' && action.name !== 'clear');
        },
    },
};

spa.signals.once('allViews.created', ({ views }) => {
    for (const detailPath of HISTORY_DETAIL_PATHS) {
        const detailView = views.get(detailPath);
        detailView.mixins.push(HistoryDetailView, HideDetailOperationsMixin);
    }
    for (const listPath of HISTORY_LIST_PATHS) {
        const listView = views.get(listPath);
        listView.mixins.push(HideListOperationsMixin);
        listView.multiActions.delete('cancel');
        listView.multiActions.delete('clear');
    }
});
