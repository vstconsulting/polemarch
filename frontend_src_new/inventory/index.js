import InventoryFieldEdit from './InventoryFieldEdit.vue';

/** @vue/component */
const InventoryFieldMixin = {
    components: {
        field_content_edit: InventoryFieldEdit,
    },
    mixins: [spa.fields.dynamic.DynamicFieldMixin],
    methods: {
        selectField(field) {
            this.savedValues.set(this.realField, this.value);
            this.realField = field;
            this.setValue(this.savedValues.get(field));
        },
        renderReadonly() {
            return this.$createElement(this.realField.component, {
                props: { data: this.data, field: this.realField, type: this.type },
            });
        },
        renderEdit() {
            return this.$createElement('div', { class: this.wrapperClasses }, [
                this.$createElement(spa.fields.base.BaseFieldLabel, {
                    props: {
                        type: this.type,
                        value: this.value,
                        field: this.field,
                        data: this.data,
                        error: this.error,
                    },
                }),
                this.$createElement(InventoryFieldEdit, {
                    props: {
                        field: this.field,
                        data: this.data,
                        value: this.value,
                        realField: this.realField,
                    },
                    on: {
                        'set-value': this.setValue.bind(this),
                        'select-field': this.selectField.bind(this),
                    },
                }),
            ]);
        },
    },
    render() {
        return this.type === 'list' || this.type === 'readonly' ? this.renderReadonly() : this.renderEdit();
    },
};

export class InventoryField extends spa.fields.dynamic.DynamicField {
    constructor(options) {
        options['x-options'] = {
            types: {
                Inventory: {
                    title: 'Inventory',
                    format: 'fk',
                    'x-options': {
                        model: { $ref: '#/definitions/Inventory' },
                        value_field: 'id',
                        view_field: 'name',
                        makeLink: true,
                        usePrefetch: true,
                    },
                },
                'Inventory path': {
                    title: 'Inventory path',
                    format: 'string',
                    description: 'Inventory host path',
                    'x-options': {
                        prependText: './',
                    },
                },
                'Hosts list': {
                    title: 'Hosts list',
                    format: 'string',
                    description: 'Comma separated host list',
                },
            },
            field: 'inventory_type',
        };
        super(options);
        this.selectedType = Object.keys(this.props.types)[0];
    }
    static get mixins() {
        return [InventoryFieldMixin];
    }
    resolveTypes() {
        super.resolveTypes();

        this.types['Hosts list'].toInner = function (data) {
            const value = data[this.name];
            if (value && !value.endsWith(',')) {
                return value + ',';
            }
            return value;
        };
    }
    _getParentValues() {
        return { [this.props.field]: this.selectedType };
    }
    getRealField({ inventory }) {
        if (typeof inventory === 'string' && inventory.includes(',')) {
            return this.types['Hosts list'];
        }
        return super.getRealField(arguments[0]);
    }
}
InventoryField.format = 'inventory';
spa.signals.once('APP_CREATED', (app) => {
    for (const type of ['integer', 'string']) {
        app.fieldsResolver.registerField(type, InventoryField.format, InventoryField);
    }
});

for (const modelName of ['AnsibleModule', 'AnsiblePlaybook', 'CreateExecutionTemplate']) {
    spa.signals.once(`models[${modelName}].fields.beforeInit`, (fields) => {
        fields.inventory.format = InventoryField.format;
    });
}
