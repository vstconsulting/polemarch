<template>
    <div class="input-group mb-3">
        <div class="input-group-prepend" style="flex-wrap: nowrap">
            <button
                type="button"
                class="btn"
                :class="disabled ? 'btn-outline-secondary' : 'btn-success'"
                @click="toggleDisabled"
            >
                <i class="fa fa-power-off" />
            </button>
            <button
                type="button"
                class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                style="margin-right: 1px"
                :disabled="disabled"
            >
                <span style="margin-right: 1ch">{{ $t(realField.title) }}</span>
            </button>
            <div class="dropdown-menu">
                <button
                    v-for="field in field.types"
                    :key="field.title"
                    class="dropdown-item"
                    type="button"
                    :data-type="field.title"
                    @click="$emit('select-field', field)"
                >
                    {{ $t(field.title) }}
                </button>
            </div>
        </div>
        <InventoryFKEdit
            v-if="displayFk"
            type="edit"
            :field="field.types.Inventory"
            :data="data"
            :value="fkValue"
            :disabled="disabled"
            @set-value="setValue"
        />
        <input
            v-else
            type="text"
            class="form-control"
            :disabled="disabled"
            @[inputEventName]="setValue($event.target.value)"
        />
    </div>
</template>

<script>
    import InventoryFKEdit from './InventoryFKEdit.js';

    export default {
        name: 'InventoryFieldEdit',
        components: { InventoryFKEdit },
        mixins: [spa.fields.base.BaseFieldContentEdit],
        props: {
            realField: { type: Object, required: true },
        },
        data() {
            return {
                disabled: Boolean(!this.value),
                fkValue: null,
            };
        },
        computed: {
            displayFk() {
                return Boolean(this.realField.fkModel);
            },
        },
        watch: {
            value: {
                immediate: true,
                handler(value) {
                    if (this.realField.fkModel) {
                        this.fkValue = value;
                    }
                },
            },
        },
        methods: {
            toggleDisabled() {
                if (this.disabled) {
                    this.disabled = false;
                } else {
                    this.disabled = true;
                    this.setValue(null);
                }
            },
        },
    };
</script>

<style>
    .field-component.format-inventory .select2-selection {
        width: 100%;
    }
</style>
