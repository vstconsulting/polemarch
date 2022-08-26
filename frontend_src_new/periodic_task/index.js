import './style.scss';
import { hideListColumns } from '../history';

const modelListFields = ['mode', 'inventory', 'template', 'template_opt'];

hideListColumns('Periodictask', modelListFields);

const variablesReadonlyMixin = {
    data() {
        return {
            kind: null,
        };
    },
    computed: {
        valueField() {
            return this.$app.fieldsResolver.resolveField({
                type: 'string',
                name: 'value',
                title: 'Value',
                format: 'dynamic',
                'x-options': {
                    field: 'key',
                    types:
                        this.kind === 'MODULE'
                            ? this.$app.schema.definitions.AnsibleModule.properties
                            : this.$app.schema.definitions.AnsiblePlaybook.properties,
                },
            });
        },
        fieldsGroups() {
            return [
                {
                    title: '',
                    fields: [this.model.fields.get('id'), this.model.fields.get('key'), this.valueField],
                },
            ];
        },
    },
    methods: {
        fetchKind() {
            return (
                this.view.type === spa.utils.ViewTypes.PAGE_EDIT
                    ? this.view.parent.parent.parent
                    : this.view.parent.parent
            ).objects
                .formatPath(this.$route.params)
                .get(this.$route.params.periodic_task_id)
                .then((task) => (this.kind = task.kind))
                .catch((error) => {
                    this.setLoadingError(error || {});
                });
        },
        onCreatedHandler() {
            this.fetchData().then(() => this.fetchKind());
        },
    },
};

const variablesEditMixin = {
    mixins: [variablesReadonlyMixin],
    data() {
        return {
            cachedValues: new Map(),
        };
    },
    computed: {
        keyField() {
            const model = this.$app.modelsResolver.get(
                this.kind === 'MODULE' ? 'AnsibleModule' : 'AnsiblePlaybook',
            );
            return this.$app.fieldsResolver.resolveField({
                type: 'string',
                name: 'key',
                title: 'Key',
                enum: Array.from(model.fields.keys()).filter((key) => {
                    if (this.kind === 'MODULE') {
                        return key !== 'module';
                    } else if (this.kind === 'PLAYBOOK') {
                        return key !== 'playbook';
                    }
                }),
            });
        },
        valueField() {
            const props =
                this.kind === 'MODULE'
                    ? this.$app.schema.definitions.AnsibleModule.properties
                    : this.$app.schema.definitions.AnsiblePlaybook.properties;
            return this.$app.fieldsResolver.resolveField({
                type: 'string',
                ...props[this.sandbox.key],
                name: 'value',
            });
        },
        fieldsGroups() {
            return [{ title: '', fields: [this.keyField, this.valueField] }];
        },
    },
    watch: {
        'sandbox.key'(key) {
            if (this.cachedValues.has(key)) {
                this.setFieldValue({ field: 'value', value: this.cachedValues.get(key) });
            } else {
                this.setFieldValue({ field: 'value', value: this.valueField.getInitialValue() });
            }
        },
        'sandbox.value'(value) {
            if (this.sandbox.key) {
                this.cachedValues.set(this.sandbox.key, value);
            }
        },
    },
    methods: {
        onCreatedHandler() {
            this.fetchData()
                .then(() => this.fetchKind())
                .then(() => {
                    this.commitMutation('setInstance', this.instance);
                    if (this.sandbox.key && this.sandbox.value) {
                        this.cachedValues.set(this.sandbox.key, this.sandbox.value);
                    }
                    this.setLoadingSuccessful();
                });
        },
    },
};

spa.signals.once('allViews.created', ({ views }) => {
    const variablesCreatePage = views.get('/project/{id}/periodic_task/{periodic_task_id}/variables/new/');
    const variablesEditPage = views.get(
        '/project/{id}/periodic_task/{periodic_task_id}/variables/{variables_id}/edit/',
    );
    const oneVariablesPage = views.get(
        '/project/{id}/periodic_task/{periodic_task_id}/variables/{variables_id}/',
    );

    variablesCreatePage.mixins.push(variablesEditMixin);
    variablesEditPage.mixins.push(variablesEditMixin);
    oneVariablesPage.mixins.push(variablesReadonlyMixin);
});

const HideSublinksMixin = {
    computed: {
        sublinks() {
            return Array.from(this.view.sublinks.values()).filter((sublink) => {
                if (sublink.name === 'variables') {
                    return this.data.kind === 'MODULE' || this.data.kind === 'PLAYBOOK';
                }
                return true;
            });
        },
    },
};

spa.signals.once('allViews.created', ({ views }) => {
    const periodicTaskPage = views.get('/project/{id}/periodic_task/{periodic_task_id}/');
    periodicTaskPage.mixins.push(HideSublinksMixin);
});
