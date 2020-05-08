<template>
    <span :class="classes" :style="styles">{{ value }}</span>
</template>

<script>
    export default {
        mixins: [spa.fields.choices.ChoicesFieldContentReadonly],
        data() {
            return {
                class_list: [],
                styles_dict: {},
            };
        },
    };
</script>

<style scoped></style>
