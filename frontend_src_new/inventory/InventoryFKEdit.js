/** @vue/component */
export default {
    name: 'InventoryFKEdit',
    mixins: [spa.fields.fk.fk.FKFieldContentEditable],
    props: {
        disabled: { type: Boolean, default: false },
        show: { type: Boolean, default: false },
    },
    watch: {
        show: {
            immediate: true,
            handler(show) {
                if (this.$refs.select) {
                    this.$refs.select.nextElementSibling.hidden = !show;
                }
            },
        },
    },
    mounted() {
        window.$(this.$refs.select).select2({
            theme: window.SELECT2_THEME,
            dropdownCssClass: 'select2-inventory-dropdown',
            ajax: {
                delay: 350,
                transport: this.transport,
            },
            allowClear: this.field.nullable,
            placeholder: { id: undefined, text: '' },
        });
    },
    render(h) {
        return h('select', {
            ref: 'select',
            domProps: { disabled: this.disabled },
        });
    },
};
