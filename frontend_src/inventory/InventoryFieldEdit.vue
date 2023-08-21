<template>
    <div class="input-group mb-3">
        <div class="input-group-prepend" style="flex-wrap: nowrap">
            <button
                type="button"
                class="btn"
                :class="disabled ? 'btn-secondary' : 'btn-success'"
                @click="toggleDisabled"
            >
                <i class="fa fa-power-off" />
            </button>
            <button
                type="button"
                class="btn btn-secondary dropdown-toggle dropdown-toggle-split"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                style="margin-right: 1px"
                :disabled="disabled"
            >
                <span style="margin-right: 1ch">{{ $t(types[type]) }}</span>
            </button>
            <div class="dropdown-menu">
                <button
                    v-for="(title, menuType) in types"
                    :key="menuType"
                    class="dropdown-item"
                    type="button"
                    :data-type="menuType"
                    @click="setType"
                >
                    {{ $t(title) }}
                </button>
            </div>
        </div>
        <component
            :is="$parent.fkField.getComponent()"
            v-if="type === 'fk'"
            hide-title
            :field="$parent.fkField"
            :data="{ [$parent.fkField.name]: realValue }"
            type="edit"
            style="flex: 2"
            @set-value="({ field, value, ...args }) => $emit('set-value', { type: 'fk', value }, args)"
        />
        <template v-else-if="type === 'path'">
            <div class="input-group-prepend">
                <span class="input-group-text">./</span>
            </div>
            <input
                type="text"
                class="form-control"
                :value="realValue"
                @change="(e) => setValue({ type: 'path', value: e.target.value })"
            />
        </template>
        <TagsSelector
            v-else-if="type === 'hosts'"
            :value="realValue"
            :validator="validateHost"
            @change="(value) => setValue({ type: 'hosts', value })"
        />
    </div>
</template>

<script>
    export default {
        name: 'InventoryFieldEdit',
        components: {
            TagsSelector: spa.components.TagsSelector,
        },
        mixins: [spa.fields.base.BaseFieldContentEdit],
        data() {
            return {
                disabled: Boolean(!this.value),
                types: {
                    fk: 'Inventory',
                    hosts: 'Hosts list',
                    path: 'Inventory path',
                },
            };
        },
        computed: {
            type() {
                return this.value?.type || 'fk';
            },
            realValue() {
                return this.value?.value;
            },
        },
        mounted() {
            this.$watch(
                'disabled',
                (value) => {
                    if (this.type === 'fk') {
                        this.$el.querySelector('select').disabled = value;
                    }
                },
                { immediate: true },
            );
        },
        methods: {
            setType(e) {
                this.setValue({ type: e.target.dataset.type, value: undefined });
            },
            toggleDisabled() {
                if (this.disabled) {
                    this.disabled = false;
                } else {
                    this.disabled = true;
                    this.setValue(this.field.required ? null : undefined);
                }
            },
            validateHost(host) {
                if (host && !host.includes(',')) {
                    return host;
                }
            },
        },
    };
</script>

<style lang="scss">
    .field-component.format-inventory {
        .tags-selector {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            flex: 2;
        }
        .select2-selection {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }
        input {
            height: auto;
        }
    }
</style>
