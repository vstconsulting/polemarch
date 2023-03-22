import InventoryFieldEdit from './InventoryFieldEdit.vue';
import InventoryFieldReadonly from './InventoryFieldReadonly.vue';

/** @vue/component */
const InventoryFieldMixin = {
    components: {
        field_content_edit: InventoryFieldEdit,
        field_content_readonly: InventoryFieldReadonly,
        field_list_view: InventoryFieldReadonly,
    },
    mixins: [spa.fields.base.BaseFieldMixin],
    inject: ['view'],
    computed: {
        fkField() {
            const field = this.$app.fieldsResolver.resolveField({
                name: this.field.name,
                type: 'integer',
                format: 'fk',
                'x-options': {
                    model: { $ref: '#/definitions/Inventory' },
                    value_field: 'id',
                    view_field: 'name',
                    makeLink: true,
                    usePrefetch: true,
                    ...this.field.props,
                },
            });
            field.prepareFieldForView(this.view?.path);
            return field;
        },
    },
};

export class InventoryField extends spa.fields.base.BaseField {
    static get mixins() {
        return [InventoryFieldMixin];
    }
    toInner(data) {
        data = super.toInner(data);
        if (data && typeof data === 'object' && data.value) {
            if (data.type === 'fk') {
                if (typeof data.value === 'number') {
                    return data.value;
                }
                if (data.value.getPkValue) {
                    return data.value.getPkValue();
                }
                return null;
            }
            if (data.type === 'hosts') {
                let str = data.value;
                if (Array.isArray(data.value)) {
                    str = data.value.join(',');
                }
                if (str) {
                    str = str + ',';
                }
                return str;
            }
            return data.value;
        }
        return;
    }
    toRepresent(data) {
        const value = super.toRepresent(data);

        if (typeof value === 'number') {
            return { type: 'fk', value };
        }
        if (value && typeof value === 'string') {
            if (value.includes(',')) {
                return {
                    type: 'hosts',
                    value: value
                        .replace(/(^,)|(,$)/g, '')
                        .split(',')
                        .filter(Boolean),
                };
            }
            const num = Number(value);
            if (!Number.isNaN(num)) {
                return { type: 'fk', value: num };
            }
            return { type: 'path', value };
        }
        return;
    }
}
InventoryField.format = 'inventory';
spa.signals.once('APP_CREATED', (app) => {
    for (const type of ['integer', 'string']) {
        app.fieldsResolver.registerField(type, InventoryField.format, InventoryField);
    }
});

function filterSublinks({ path, detail }) {
    spa.signals.connect(`<${path}>filterSublinks`, (obj) => {
        if (!detail && !obj.isListItem) return;
        if (obj.data.state_managed) {
            obj.sublinks = obj.sublinks.filter(
                (sublink) =>
                    !['all_groups', 'all_hosts', 'group', 'hosts', 'variables'].includes(sublink.name),
            );
        } else {
            obj.sublinks = obj.sublinks.filter((sublink) => sublink.name != 'state');
        }
    });
}

for (const path of ['/inventory/{id}/', '/project/{id}/inventory/{inventory_id}/']) {
    filterSublinks({ path, detail: true });
}

for (const path of ['/inventory/', '/project/{id}/inventory/']) {
    filterSublinks({ path, detail: false });
}
