import InventoryFieldMixin from './InventoryFieldMixin.vue';

export class InventoryField extends spa.fields.dynamic.DynamicField {
    constructor(options) {
        options.additionalProperties = {
            types: {
                Inventory: {
                    format: 'fk',
                    additionalProperties: {
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
                    additionalProperties: {
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
spa.fields.globalFields.set(InventoryField.format, InventoryField);

for (const modelName of ['AnsibleModule', 'AnsiblePlaybook']) {
    spa.signals.once(`models[${modelName}].fields.beforeInit`, (fields) => {
        fields.inventory.format = InventoryField.format;
    });
}
