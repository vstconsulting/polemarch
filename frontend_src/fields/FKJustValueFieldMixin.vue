<template>
    <field_content_readonly
        :value="value"
        :field="field"
        :wrapper_opt="wrapper_opt"
        :data="data"
        @proxyEvent="proxyEvent"
    ></field_content_readonly>
</template>

<script>
    export default {
        components: {
            field_content_readonly: {
                mixins: [
                    spa.fields.base.BaseFieldContentReadonlyMixin,
                    spa.fields.fk.fk.FKFieldContentReadonlyComponent,
                ],
                data() {
                    return {
                        class_list: ['revers-color'],
                        styles_dict: { display: 'contents' },
                    };
                },
            },
        },
    };
</script>

<style scoped></style>
