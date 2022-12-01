<template>
    <p v-if="strValue !== null">
        {{ strValue }}
    </p>
    <component
        :is="$parent.fkField.component"
        v-else
        :field="$parent.fkField"
        hide-title
        :type="$parent.type"
        :data="{ [field.name]: value && value.value }"
        @set-value="({ field, value, ...args }) => $emit('set-value', { type: 'fk', value }, args)"
    />
</template>

<script>
    export default {
        name: 'InventoryFieldReadonly',
        mixins: [spa.fields.base.BaseFieldContentReadonlyMixin],
        computed: {
            strValue() {
                if (!this.value || !this.value.type) {
                    return '';
                }
                if (this.value.type === 'hosts') {
                    if (Array.isArray(this.value.value)) {
                        return this.value.value.join(', ');
                    }
                    return this.value.value || '';
                }
                if (this.value.type === 'path') {
                    return this.value.value || '';
                }
                return null;
            },
        },
    };
</script>
