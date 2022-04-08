/** @vue/component */
const RawInventoryFieldMixin = {
    mixins: [spa.fields.base.BaseFieldMixin],
    render(h) {
        return h('pre', { style: 'white-space: pre-wra' }, [this.value]);
    },
};

export class RawInventoryField extends spa.fields.base.BaseField {
    static get mixins() {
        return [RawInventoryFieldMixin];
    }
}
RawInventoryField.format = 'raw-inventory';
spa.signals.once('APP_CREATED', (app) => {
    app.fieldsResolver.registerField('string', RawInventoryField.format, RawInventoryField);
});
