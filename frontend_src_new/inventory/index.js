import InventoryFieldMixin from './InventoryFieldMixin.vue';

export class InventoryField extends spa.fields.dynamic.DynamicField {
    constructor(options) {
        options['x-options'] = {
            types: {
                Inventory: {
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
                    format: 'string',
                    description: 'Inventory host path',
                    'x-options': {
                        prependText: './',
                    },
                },
                'Hosts list': {
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
}
InventoryField.format = 'inventory';
spa.signals.once('APP_CREATED', (app) => {
    for (const type of ['integer', 'string']) {
        app.fieldsResolver.registerField(type, InventoryField.format, InventoryField);
    }
});

for (const modelName of ['AnsibleModule', 'AnsiblePlaybook']) {
    spa.signals.once(`models[${modelName}].fields.beforeInit`, (fields) => {
        fields.inventory.format = InventoryField.format;
    });
}
