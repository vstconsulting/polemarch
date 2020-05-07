<template>
    <div style="display: contents;">
        <div :class="wrapper_classes" :style="wrapper_styles">
            <field_label :value="value" :field="field" :wrapper_opt="wrapper_opt" :data="data"></field_label>
            <button
                type="button"
                class="btn btn-card-tool btn-sm btn-light btn-icon"
                @click="execute_args_toggle = !execute_args_toggle"
            >
                <i class="fa fa-plus" :class="execute_args_toggle ? 'fa-minus' : 'fa-plus'"></i>
            </button>

            <transition name="fade">
                <field_content_readonly
                    v-show="execute_args_toggle"
                    :value="value"
                    :field="field"
                    :wrapper_opt="wrapper_opt"
                    :data="data"
                    @proxyEvent="proxyEvent"
                ></field_content_readonly>
            </transition>
        </div>
    </div>
</template>

<script>
    export default {
        data: function () {
            return {
                execute_args_toggle: false,
            };
        },
        components: {
            field_label: {
                mixins: [spa.fields.base.BaseFieldLabel],
                data() {
                    return {
                        styles_dict: {
                            paddingRight: '10px',
                        },
                    };
                },
            },
        },
    };
</script>

<style></style>
