<template>
    <div v-if="type === 'edit'">
        <component
            :is="inventoryTypeField.component"
            type="edit"
            :field="inventoryTypeField"
            :data="{ [inventoryTypeField.name]: field.selectedType }"
            @set-value="setInventoryType"
        />
        <component
            :is="realField.component"
            :field="realField"
            :data="data"
            type="edit"
            :hideable="hideable"
            @hide-field="$emit('hide-field', $event)"
            @set-value="$emit('set-value', $event)"
        />
    </div>
    <component
        :is="realField.component"
        v-else
        :field="realField"
        :data="data"
        :type="type"
        :hideable="hideable"
        @toggleHidden="$emit('toggleHidden')"
        @set-value="$emit('set-value', $event)"
    />
</template>

<script>
    export default {
        name: 'InventoryFieldMixin',
        mixins: [spa.fields.dynamic.DynamicFieldMixin],
        data() {
            const types = Object.keys(this.field.types);
            return {
                inventoryTypeField: new spa.fields.choices.ChoicesField({
                    name: this.field.props.field,
                    enum: types,
                }),
            };
        },
        methods: {
            setInventoryType({ value }) {
                if (value && this.selectedType !== value) {
                    this.field.selectedType = value;
                    this.realField = this.field.getRealField(this.data);
                }
            },
        },
    };
</script>
