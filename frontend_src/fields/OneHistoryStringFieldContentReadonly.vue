<template>
    <span :class="classes" :style="styles">{{ value }}</span>
</template>

<script>
    export default {
        mixins: [spa.fields.base.BaseFieldContentReadonlyMixin],
        data() {
            return {
                class_list: ['text-data'],
                styles_dict: {
                    float: 'left',
                    width: '50%',
                },
            };
        },
    };
</script>

<style scoped></style>
