<template>
    <span :class="classes" :style="styles"></span>
</template>

<script>
    export default {
        mixins: [spa.fields.boolean.BooleanFieldContentEdit, spa.fields.boolean.BooleanFieldContentMixin],
        data() {
            return {
                class_list: [],
                styles_dict: {
                    float: 'left',
                    width: '50%',
                },
            };
        },
        computed: {
            selected: function () {
                return this.value ? 'boolean-true fa fa-check' : 'boolean-false fa fa-times';
            },
        },
    };
</script>

<style scoped></style>
